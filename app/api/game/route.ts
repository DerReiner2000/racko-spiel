import { NextRequest, NextResponse } from "next/server";
import { createPlayer, finishRound, isRacko, nextTurn, shuffle, startRound } from "@/lib/game";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GameState, GameView, PLAYER_NAMES, PlayerName } from "@/lib/types";

export const dynamic = "force-dynamic";

function responseError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function viewFor(state: GameState, playerId: string): GameView {
  const mine = state.players.find((player) => player.id === playerId);
  if (!mine) throw new Error("Du gehörst nicht zu diesem Spiel.");
  const { deck, players, ...publicState } = state;
  return {
    ...publicState,
    deckCount: deck.length,
    players: players.map((player) => ({
      id: player.id,
      name: player.name,
      roundScore: player.roundScore,
      totalScore: player.totalScore,
      rackos: player.rackos,
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
  if (error || !data) throw new Error("Spiel nicht gefunden.");
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
  if (error || !data) throw new Error("Das Spiel wurde gleichzeitig geändert. Bitte erneut versuchen.");
}

function authenticate(state: GameState, playerId?: string, token?: string) {
  const player = state.players.find((item) => item.id === playerId && item.token === token);
  if (!player) throw new Error("Deine Spielanmeldung ist nicht mehr gültig.");
  return player;
}

async function updateStats(state: GameState) {
  const supabase = getSupabaseAdmin();
  const max = Math.max(...state.players.map((player) => player.totalScore));
  for (const player of state.players) {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === "create") {
      const name = body.name as PlayerName;
      if (!PLAYER_NAMES.includes(name)) return responseError("Unbekannter Spieler.");
      const playerCount = Number(body.playerCount) as 2 | 3 | 4;
      const totalRounds = Number(body.totalRounds);
      if (![2, 3, 4].includes(playerCount) || totalRounds < 1 || totalRounds > 20) return responseError("Ungültige Spieleinstellungen.");
      const host = createPlayer(name);
      const code = makeCode();
      const state: GameState = { code, hostId: host.id, playerCount, totalRounds, currentRound: 1, startingPlayerIndex: 0, status: "lobby", players: [host], deck: [], discard: [], turnIndex: 0, drawnCard: null, drawnFrom: null, awaitingRacko: false, roundResults: [], gameWinnerIds: [], message: `${name} hat das Spiel erstellt.` };
      const { error } = await getSupabaseAdmin().from("games").insert({ code, state });
      if (error) throw error;
      await deletePreviousGame(body.previousSession);
      return NextResponse.json({ code, playerId: host.id, token: host.token, game: viewFor(state, host.id) });
    }

    const code = String(body.code ?? "").toUpperCase();
    const loaded = await loadGame(code);
    let state = loaded.state;

    if (body.action === "join") {
      const name = body.name as PlayerName;
      if (state.status !== "lobby") return responseError("Dieses Spiel hat bereits begonnen.");
      if (!PLAYER_NAMES.includes(name)) return responseError("Unbekannter Spieler.");
      if (state.players.some((player) => player.name === name)) return responseError(`${name} ist bereits im Spiel.`);
      if (state.players.length >= state.playerCount) return responseError("Das Spiel ist bereits voll.");
      const player = createPlayer(name);
      state = { ...state, players: [...state.players, player], message: `${name} ist beigetreten.` };
      await saveGame(code, state, loaded.version);
      await notifyGame(code);
      return NextResponse.json({ code, playerId: player.id, token: player.token, game: viewFor(state, player.id) });
    }

    const player = authenticate(state, body.playerId, body.token);
    const isHost = player.id === state.hostId;

    if (body.action === "snapshot") {
      await markActive(code);
      return NextResponse.json({ game: viewFor(state, player.id) });
    } else if (body.action === "heartbeat") {
      await markActive(code);
      return NextResponse.json({ ok: true });
    } else if (body.action === "start") {
      if (!isHost) return responseError("Nur der Gastgeber kann starten.");
      if (state.status !== "lobby" || state.players.length !== state.playerCount) return responseError("Das Spiel ist noch nicht vollständig.");
      state = startRound({ ...state, startingPlayerIndex: Math.floor(Math.random() * state.players.length) });
    } else if (body.action === "draw") {
      if (state.status !== "playing" || state.players[state.turnIndex].id !== player.id || state.drawnCard !== null || state.awaitingRacko) return responseError("Du kannst gerade keine Karte ziehen.");
      const source = body.source as "deck" | "discard";
      if (source === "discard") {
        if (!state.discard.length) return responseError("Der Ablagestapel ist leer.");
        const discard = [...state.discard];
        state = { ...state, drawnCard: discard.pop()!, drawnFrom: "discard", discard, message: `${player.name} hat die offene Karte genommen.` };
      } else {
        let deck = [...state.deck];
        let discard = [...state.discard];
        if (!deck.length) {
          if (discard.length <= 1) return responseError("Es sind keine Karten mehr verfügbar.");
          const top = discard.pop()!;
          deck = shuffle(discard);
          discard = [top];
        }
        state = { ...state, drawnCard: deck.pop()!, drawnFrom: "deck", deck, discard, message: `${player.name} hat verdeckt gezogen.` };
      }
    } else if (body.action === "swap") {
      if (state.status !== "playing" || state.players[state.turnIndex].id !== player.id || state.drawnCard === null) return responseError("Du hast keine Karte zum Tauschen.");
      const slot = Number(body.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot > 9) return responseError("Ungültiger Kartenplatz.");
      const players = state.players.map((item) => item.id === player.id ? { ...item, hand: item.hand.map((card, index) => index === slot ? state.drawnCard! : card) } : item);
      const oldCard = player.hand[slot];
      const updated = { ...state, players, discard: [...state.discard, oldCard], drawnCard: null, drawnFrom: null };
      const completedHand = players.find((item) => item.id === player.id)!.hand;
      if (body.declareRacko === true) {
        if (!isRacko(completedHand)) return responseError("Diese Reihe ist noch nicht vollständig aufsteigend.");
        state = finishRound(updated, player.id);
      } else {
        state = nextTurn(updated);
      }
    } else if (body.action === "discard") {
      if (state.status !== "playing" || state.players[state.turnIndex].id !== player.id || state.drawnCard === null || state.drawnFrom !== "deck") return responseError("Diese Karte kann nicht abgelegt werden.");
      state = nextTurn({ ...state, discard: [...state.discard, state.drawnCard] });
    } else if (body.action === "racko") {
      if (state.status !== "playing" || state.players[state.turnIndex].id !== player.id || state.drawnCard !== null) return responseError("Rack’o kann nur während deines Zuges vor dem Ziehen ausgerufen werden.");
      if (!isRacko(player.hand)) return responseError("Deine Karten sind noch nicht vollständig aufsteigend.");
      state = finishRound(state, player.id);
    } else if (body.action === "nextRound") {
      if (!isHost || state.status !== "round_end") return responseError("Die nächste Runde kann noch nicht gestartet werden.");
      if (state.currentRound >= state.totalRounds) {
        const max = Math.max(...state.players.map((item) => item.totalScore));
        state = { ...state, status: "finished", gameWinnerIds: state.players.filter((item) => item.totalScore === max).map((item) => item.id), message: "Das Spiel ist beendet." };
        await updateStats(state);
      } else {
        state = startRound({ ...state, currentRound: state.currentRound + 1 });
      }
    } else {
      return responseError("Unbekannte Aktion.");
    }

    await saveGame(code, state, loaded.version);
    await notifyGame(code);
    return NextResponse.json({ game: viewFor(state, player.id) });
  } catch (error) {
    console.error(error);
    return responseError(error instanceof Error ? error.message : "Unbekannter Fehler.", 500);
  }
}
