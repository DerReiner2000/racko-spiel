import { NextRequest, NextResponse } from "next/server";
import { createPlayer, GameRuleError, startRound } from "@/lib/game";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GameState, GameView, PLAYER_NAMES, PlayerName } from "@/lib/types";
import { addOnlineBot, advanceOnlineBots, applyOnlineAction, BOT_GAMES_RANKED, botDifficulty, changeOnlineBot, initializeBotRound, isBot } from "@/lib/online-bots";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); }
}

function responseError(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function viewFor(state: GameState, playerId: string): GameView {
  const mine = state.players.find((player) => player.id === playerId);
  if (!mine) throw new Error("Du gehörst nicht zu diesem Spiel.");
  const { deck, players, botRound, ...publicState } = state;
  void botRound;
  return {
    ...publicState,
    drawnCard: state.players[state.turnIndex]?.id === playerId || state.drawnFrom === "discard" ? state.drawnCard : null,
    deckCount: deck.length,
    ...(!BOT_GAMES_RANKED && players.some(isBot) ? { statisticsMode: "training" as const } : {}),
    players: players.map((player) => ({
      id: player.id,
      name: player.name,
      roundScore: player.roundScore,
      totalScore: player.totalScore,
      rackos: player.rackos,
      ...(isBot(player) ? { kind: "bot" as const, botDifficulty: player.botSettings.difficulty } : {}),
      ...(player.id === playerId || state.status === "round_end" || state.status === "finished" ? { hand: player.hand } : {}),
    })),
    isHost: state.hostId === playerId,
    isMyTurn: state.status === "playing" && state.players[state.turnIndex]?.id === playerId,
    myPlayerId: playerId,
  };
}

async function loadGame(code: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("games").select("state, version").eq("code", code.toUpperCase()).single();
  if (error?.code === "PGRST116" || (!error && !data)) throw new ApiError("Spiel nicht gefunden.", 404, "GAME_NOT_FOUND");
  if (error) throw error;
  return { state: data.state as GameState, version: data.version as number };
}

async function markActive(code: string) {
  await getSupabaseAdmin().from("games").update({ last_active_at: new Date().toISOString() }).eq("code", code);
}

async function notifyGame(code: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/realtime/v1/api/broadcast/game-${code}/events/changed`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ changedAt: Date.now() }),
    });
  } catch (error) {
    console.error("Realtime-Benachrichtigung fehlgeschlagen", error);
  }
}

async function deletePreviousGame(previous: unknown) {
  if (!previous || typeof previous !== "object") return;
  const candidate = previous as { code?: string; playerId?: string; token?: string };
  if (!candidate.code || !candidate.playerId || !candidate.token) return;
  try {
    const code = candidate.code.toUpperCase();
    const { state } = await loadGame(code);
    authenticate(state, candidate.playerId, candidate.token);
    await getSupabaseAdmin().from("games").delete().eq("code", code);
    await notifyGame(code);
  } catch {
    // Die frühere Partie kann bereits automatisch entfernt worden sein.
  }
}

async function saveGame(code: string, state: GameState, version: number) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("games").update({ state, version: version + 1, updated_at: now, last_active_at: now }).eq("code", code).eq("version", version).select("version").single();
  if (error?.code === "PGRST116" || (!error && !data)) throw new ApiError("Das Spiel wurde gleichzeitig geändert. Bitte erneut versuchen.", 409, "VERSION_CONFLICT");
  if (error) throw error;
}

function authenticate(state: GameState, playerId?: string, token?: string) {
  const player = state.players.find((item) => !isBot(item) && item.id === playerId && typeof token === "string" && !!token && item.token === token);
  if (!player) throw new ApiError("Deine Spielanmeldung ist nicht mehr gültig.", 401, "SESSION_INVALID");
  return player;
}

async function updateStats(state: GameState) {
  if (!BOT_GAMES_RANKED && state.players.some(isBot)) return;
  const supabase = getSupabaseAdmin();
  const max = Math.max(...state.players.map((player) => player.totalScore));
  for (const player of state.players) {
    if (isBot(player)) continue;
    const { error } = await supabase.rpc("record_game_result", {
      p_player_name: player.name,
      p_games: 1,
      p_rounds: state.totalRounds,
      p_wins: player.totalScore === max ? 1 : 0,
      p_points: player.totalScore,
    });
    if (error) throw error;
  }
}

async function runBots(loaded: { state: GameState; version: number }) {
  const code = loaded.state.code;
  return advanceOnlineBots(loaded, {
    load: () => loadGame(code),
    save: async (state, version) => {
      try { await saveGame(code, state, version); return true; }
      catch (error) { if (error instanceof ApiError && error.status === 409) return false; throw error; }
    },
    notify: () => notifyGame(code),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === "create") {
      const name = body.name as PlayerName;
      if (!PLAYER_NAMES.includes(name)) return responseError("Unbekannter Spieler.");
      const totalRounds = Number(body.totalRounds);
      const directRunRequirement = Number(body.directRunRequirement ?? 0) as 0 | 3 | 4;
      if (!Number.isInteger(totalRounds) || totalRounds < 1 || totalRounds > 20 || ![0, 3, 4].includes(directRunRequirement)) return responseError("Ungültige Spieleinstellungen.");
      const host = createPlayer(name);
      const code = makeCode();
      const state: GameState = { code, hostId: host.id, playerCount: 2, directRunRequirement, totalRounds, currentRound: 1, startingPlayerIndex: 0, status: "lobby", players: [host], deck: [], discard: [], turnIndex: 0, drawnCard: null, drawnFrom: null, awaitingRacko: false, roundResults: [], extraRoundVotes: [], gameWinnerIds: [], message: `${name} hat das Spiel erstellt.` };
      const { error } = await getSupabaseAdmin().from("games").insert({ code, state });
      if (error) throw error;
      await deletePreviousGame(body.previousSession);
      return NextResponse.json({ code, playerId: host.id, token: host.token, game: viewFor(state, host.id), version: 1 });
    }

    const code = String(body.code ?? "").toUpperCase();
    const loaded = await loadGame(code);
    let state = loaded.state;

    if (body.action === "join") {
      const name = body.name as PlayerName;
      if (!PLAYER_NAMES.includes(name)) return responseError("Unbekannter Spieler.");
      const existing = state.players.find((player) => !isBot(player) && player.name === name);
      if (existing) {
        const token = crypto.randomUUID() + crypto.randomUUID();
        state = { ...state, players: state.players.map((player) => player.id === existing.id && !isBot(player) ? { ...player, token, connectedAt: new Date().toISOString() } : player), message: `${name} ist wieder da.` };
        await saveGame(code, state, loaded.version);
        await notifyGame(code);
        return NextResponse.json({ code, playerId: existing.id, token, game: viewFor(state, existing.id), version: loaded.version + 1 });
      }
      if (state.status !== "lobby") return responseError("Dieses Spiel hat bereits begonnen. Nur frühere Teilnehmer können zurückkehren.");
      if (state.players.length >= 4) return responseError("Das Spiel ist bereits voll.");
      const player = createPlayer(name);
      state = { ...state, players: [...state.players, player], message: `${name} ist beigetreten.` };
      await saveGame(code, state, loaded.version);
      await notifyGame(code);
      return NextResponse.json({ code, playerId: player.id, token: player.token, game: viewFor(state, player.id), version: loaded.version + 1 });
    }

    const player = authenticate(state, body.playerId, body.token);
    const isHost = player.id === state.hostId;

    if (body.action === "snapshot") {
      const latest = await runBots(loaded);
      authenticate(latest.state, body.playerId, body.token);
      await markActive(code);
      return NextResponse.json({ game: viewFor(latest.state, player.id), version: latest.version });
    } else if (body.action === "heartbeat") {
      await markActive(code);
      await runBots(loaded);
      return NextResponse.json({ ok: true });
    } else if (body.action === "addBot" || body.action === "removeBot" || body.action === "configureBot") {
      if (!isHost) return responseError("Nur der Gastgeber kann Bots verwalten.");
      state = body.action === "addBot"
        ? addOnlineBot(state, botDifficulty(body.difficulty))
        : changeOnlineBot(state, String(body.botId ?? ""), body.action === "configureBot" ? botDifficulty(body.difficulty) : undefined);
    } else if (body.action === "start") {
      if (!isHost) return responseError("Nur der Gastgeber kann starten.");
      if (state.status !== "lobby" || state.players.length < 2 || state.players.length > 4) return responseError("Zum Start werden 2 bis 4 Spieler benötigt.");
      state = initializeBotRound(startRound({ ...state, playerCount: state.players.length as 2 | 3 | 4, startingPlayerIndex: Math.floor(Math.random() * state.players.length) }), loaded.version + 1);
    } else if (body.action === "draw") {
      state = applyOnlineAction(state, player.id, { type: "draw", source: body.source === "discard" ? "discard" : "deck" }, loaded.version + 1);
    } else if (body.action === "swap") {
      state = applyOnlineAction(state, player.id, { type: "swap", slot: Number(body.slot), declareRacko: body.declareRacko === true }, loaded.version + 1);
    } else if (body.action === "discard" || body.action === "racko") {
      state = applyOnlineAction(state, player.id, { type: body.action }, loaded.version + 1);
    } else if (body.action === "nextRound") {
      if (!isHost) return responseError("Die nächste Runde kann noch nicht gestartet werden.");
      state = applyOnlineAction(state, player.id, { type: "nextRound" }, loaded.version + 1);
    } else if (body.action === "voteExtraRound") {
      state = applyOnlineAction(state, player.id, { type: "voteExtraRound" }, loaded.version + 1);
    } else if (body.action === "finishGame") {
      state = applyOnlineAction(state, player.id, { type: "finishGame" }, loaded.version + 1);
    } else {
      return responseError("Unbekannte Aktion.");
    }

    await saveGame(code, state, loaded.version);
    if (body.action === "finishGame") await updateStats(state);
    await notifyGame(code);
    const latest = await runBots({ state, version: loaded.version + 1 });
    return NextResponse.json({ game: viewFor(latest.state, player.id), version: latest.version });
  } catch (error) {
    if (error instanceof ApiError) return responseError(error.message, error.status, error.code);
    if (error instanceof GameRuleError) return responseError(error.message);
    console.error(error);
    return responseError(error instanceof Error ? error.message : "Unbekannter Fehler.", 500);
  }
}
