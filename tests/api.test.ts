import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as rules from "../lib/game";
import * as types from "../lib/types";
import * as onlineBots from "../lib/online-bots";
import type { GameState } from "../lib/types";
import { OnlineApi } from "../racko-offline-app/src/online/client";

function game(): GameState {
  return {
    code: "TEST1", hostId: "p0", playerCount: 2, totalRounds: 1,
    currentRound: 1, startingPlayerIndex: 0, directRunRequirement: 0, status: "playing",
    players: (["Max", "Tom"] as const).map((name, i) => ({
      id: `p${i}`, name, token: `test-token-${i}`, connectedAt: "2026-01-01T00:00:00Z",
      hand: i === 0 ? [40, 35, 30, 25, 20, 15, 10, 4, 3, 2] : [39, 34, 29, 24, 19, 14, 9, 8, 7, 6],
      roundScore: 0, totalScore: 0, rackos: 0,
    })),
    deck: [45, 46, 47], discard: [48], turnIndex: 0, drawnCard: null, drawnFrom: null,
    awaitingRacko: false, roundResults: [], extraRoundVotes: [], gameWinnerIds: [], message: "",
  };
}

// Run the actual compiled API with an in-memory database. No network, credentials
// or Next.js server is needed; permission checks and response projection stay real.
function server(initial = game()) {
  let state = structuredClone(initial);
  let version = 1;
  let saves = 0;
  let statistics = 0;
  let conflict = false;
  class Query {
    values: Record<string, unknown> | undefined;
    filters: Record<string, unknown> = {};
    select() { return this; }
    update(values: Record<string, unknown>) { this.values = values; return this; }
    async insert(values: { state: GameState }) { state = structuredClone(values.state); version = 1; saves++; return { error: null }; }
    eq(key: string, value: unknown) { this.filters[key] = value; return this; }
    async single() {
      if ((this.filters.code && this.filters.code !== state.code) || (this.values?.state && conflict)) {
        conflict = false;
        return { data: null, error: { code: "PGRST116" } };
      }
      if (this.values?.state) {
        assert.equal(this.filters.code, state.code);
        assert.equal(this.filters.version, version);
        state = structuredClone(this.values.state as GameState);
        version = this.values.version as number;
        saves++;
      }
      return { data: { state: structuredClone(state), version }, error: null };
    }
  }
  const exports: { POST?: (request: { json: () => Promise<unknown> }) => Promise<Response> } = {};
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
    "@/lib/game": rules,
    "@/lib/types": types,
    "@/lib/online-bots": onlineBots,
    "@/lib/supabase-admin": { getSupabaseAdmin: () => ({
      from: () => new Query(),
      rpc: async () => { statistics++; return { error: null }; },
    }) },
  };
  runInNewContext(readFileSync(path.join(__dirname, "../app/api/game/route.js"), "utf8"), {
    exports,
    require: (name: string) => {
      assert.ok(name in dependencies, `Unexpected API dependency: ${name}`);
      return dependencies[name];
    },
    process: { env: {} },
    console: { error: () => undefined },
    crypto,
  });
  return {
    state: () => state,
    saves: () => saves,
    statistics: () => statistics,
    conflictNextSave: () => { conflict = true; },
    post: (action: string, player = "p0", extra: Record<string, unknown> = {}) => exports.POST!({
      json: async () => ({ action, code: "TEST1", playerId: player, token: `test-token-${player.slice(1)}`, ...extra }),
    }),
  };
}

test("API snapshots preserve own-hand visibility and omit player credentials", async () => {
  const api = server();
  const response = await api.post("snapshot");
  assert.equal(response.status, 200);
  const { game: view } = await response.json();
  assert.deepEqual(view.players[0].hand, game().players[0].hand);
  assert.equal(view.players[1].hand, undefined);
  assert.ok(view.players.every((player: Record<string, unknown>) => !("token" in player) && !("connectedAt" in player)));
  assert.equal(view.deck, undefined);
  assert.equal(view.deckCount, 3);
  assert.equal(view.isHost, true);
  assert.equal(view.isMyTurn, true);
  assert.equal(api.saves(), 0);
});

test("API applies shared moves and retains optimistic version checks", async () => {
  const api = server();
  assert.equal((await api.post("draw", "p0", { source: "deck" })).status, 200);
  assert.equal(api.state().drawnCard, 47);
  assert.equal((await api.post("swap", "p0", { slot: 0, declareRacko: false })).status, 200);
  assert.equal(api.state().players[0].hand[0], 47);
  assert.equal(api.state().turnIndex, 1);
  assert.equal(api.saves(), 2);
});

test("API rejects out-of-turn and invalid Rack'o moves with 400 and no write", async () => {
  const api = server();
  assert.equal((await api.post("draw", "p1", { source: "deck" })).status, 400);
  assert.equal(api.saves(), 0);
  await api.post("draw", "p0", { source: "deck" });
  assert.equal((await api.post("swap", "p0", { slot: 9, declareRacko: true })).status, 400);
  assert.equal(api.saves(), 1);
  assert.equal(api.state().drawnCard, 47);
});

test("API keeps authentication and host permissions around the shared rules", async () => {
  const lobby = game();
  lobby.status = "lobby";
  const api = server(lobby);
  assert.equal((await api.post("start", "p1")).status, 400);
  assert.equal((await api.post("start", "p0", { token: "invalid" })).status, 401);
  assert.equal(api.saves(), 0);
  assert.equal((await api.post("start", "p0")).status, 200);
  assert.equal(api.state().status, "playing");
  const ended = rules.applyGameAction(game(), "p0", { type: "racko" });
  ended.totalRounds = 2;
  const roundApi = server(ended);
  assert.equal((await roundApi.post("nextRound", "p1")).status, 400);
  assert.equal((await roundApi.post("nextRound", "p0")).status, 200);
  assert.equal(roundApi.state().currentRound, 2);
});

test("API extra-round votes remain individual and do not write match statistics", async () => {
  const api = server(rules.applyGameAction(game(), "p0", { type: "racko" }));
  await api.post("voteExtraRound", "p0");
  assert.equal(api.state().status, "round_end");
  assert.equal(api.state().currentRound, 1);
  await api.post("voteExtraRound", "p1");
  assert.equal(api.state().status, "playing");
  assert.equal(api.state().currentRound, 2);
  assert.equal(api.statistics(), 0);
});

test("API match completion still records statistics and reveals final hands", async () => {
  const api = server(rules.applyGameAction(game(), "p0", { type: "racko" }));
  const response = await api.post("finishGame", "p1");
  assert.equal(response.status, 200);
  const { game: view } = await response.json();
  assert.equal(view.status, "finished");
  assert.deepEqual(view.gameWinnerIds, ["p0"]);
  assert.ok(view.players.every((player: { hand?: number[] }) => player.hand?.length === 10));
  assert.equal(api.statistics(), 2);
  assert.equal(api.saves(), 1);
});

test("hidden draws never appear in an opponent's API snapshot", async () => {
  const api = server();
  await api.post("draw", "p0", { source: "deck" });
  const mine = await (await api.post("snapshot", "p0")).json();
  const other = await (await api.post("snapshot", "p1")).json();
  assert.equal(mine.game.drawnCard, 47);
  assert.equal(other.game.drawnCard, null);
  assert.equal(mine.version, 2);
  assert.equal(other.version, 2);
});

test("missing games and concurrent changes return distinguishable status codes", async () => {
  const api = server();
  const missing = await api.post("snapshot", "p0", { code: "NOPE1" });
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).code, "GAME_NOT_FOUND");
  api.conflictNextSave();
  const conflict = await api.post("draw", "p0", { source: "deck" });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, "VERSION_CONFLICT");
  assert.equal(api.saves(), 0);
  assert.equal(api.state().drawnCard, null);
});

test("browser-shaped and mobile clients create, join and play the same server game", async () => {
  const api = server();
  const fetcher: typeof fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    return api.post(body.action, body.playerId ?? "p0", body);
  };
  const mobile = new OnlineApi("https://example.test", fetcher);
  const host = await mobile.create("Max", 3, 0);
  const browser = await (await api.post("join", "p0", { code: host.code, name: "Tom" })).json();
  const sessions = [host, browser];
  await mobile.act(host, { type: "start" });
  for (let turn = 0; turn < 12; turn++) {
    const state = api.state();
    const actor = sessions.find((entry) => entry.playerId === state.players[state.turnIndex].id)!;
    const waiting = sessions.find((entry) => entry.playerId !== actor.playerId)!;
    const draw = await mobile.act(actor, { type: "draw", source: "deck" });
    const snapshot = await mobile.snapshot(waiting);
    assert.equal(snapshot.game.drawnCard, null);
    assert.ok(snapshot.game.players.find((entry) => entry.id === waiting.playerId)?.hand);
    assert.equal(snapshot.game.players.find((entry) => entry.id === actor.playerId)?.hand, undefined);
    assert.notEqual(draw.game.drawnCard, null);
    await mobile.act(actor, { type: "swap", slot: turn % 10, declareRacko: false });
  }
  assert.equal(api.state().status, "playing");
  assert.equal(api.state().players.length, 2);
  assert.equal(api.statistics(), 0);
});

test("mobile bootstrap returns only the public realtime settings", async () => {
  const exports: { GET?: () => Promise<Response> } = {};
  runInNewContext(readFileSync(path.join(__dirname, "../app/api/mobile-config/route.js"), "utf8"), {
    exports,
    require: () => ({ NextResponse: { json: (value: unknown, init?: ResponseInit) => Response.json(value, init) } }),
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://public.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-test-key", SUPABASE_SERVICE_ROLE_KEY: "must-never-be-returned" } },
  });
  const response = await exports.GET!();
  assert.deepEqual(await response.json(), { url: "https://public.supabase.co", publishableKey: "public-test-key" });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("only the host can manage bots in the lobby and unsupported levels are rejected", async () => {
  const state = game(); state.status = "lobby";
  const api = server(state);
  assert.equal((await api.post("addBot", "p1", { difficulty: "easy" })).status, 400);
  assert.equal((await api.post("addBot", "p0", { difficulty: "expert" })).status, 400);
  const added = await (await api.post("addBot", "p0", { difficulty: "medium" })).json();
  const bot = added.game.players.find((player: { kind?: string }) => player.kind === "bot");
  assert.equal(bot.botDifficulty, "medium");
  assert.equal(added.game.statisticsMode, "training");
  assert.equal((await api.post("configureBot", "p0", { botId: bot.id, difficulty: "easy" })).status, 200);
  assert.equal((await api.post("removeBot", "p0", { botId: "p1" })).status, 400);
  assert.equal((await api.post("snapshot", "p0", { playerId: bot.id, token: undefined })).status, 401);
  assert.equal((await api.post("removeBot", "p0", { botId: bot.id })).status, 200);
  assert.equal(api.state().players.length, 2);
});

test("a non-host snapshot resumes a pending bot turn and exposes no private bot state", async () => {
  const initial = game(); initial.status = "lobby";
  let state = onlineBots.addOnlineBot(initial, "easy");
  state = onlineBots.initializeBotRound(rules.startRound({ ...state, playerCount: 3, startingPlayerIndex: 2 }, () => 0.5), 1);
  const api = server(state);
  const response = await api.post("snapshot", "p1");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.game.players[data.game.turnIndex].id, "p0");
  assert.equal(data.game.botRound, undefined);
  assert.equal(data.game.players[2].kind, "bot");
  assert.equal(data.game.players[2].hand, undefined);
  assert.equal(data.game.players[2].token, undefined);
  assert.equal(data.game.players[2].botSettings, undefined);
  assert.equal(data.version, 3);
  assert.equal(api.state().botRound!.events.length, 2);
  assert.equal((await api.post("removeBot", "p0", { botId: state.players[2].id })).status, 400);
});

test("training matches never alter the existing leaderboard", async () => {
  const initial = game(); initial.status = "lobby";
  const state = onlineBots.addOnlineBot(initial, "easy");
  state.status = "playing";
  const ended = onlineBots.applyOnlineAction(state, "p0", { type: "racko" }, 2);
  const api = server(ended);
  const response = await api.post("finishGame");
  assert.equal(response.status, 200);
  assert.equal(api.statistics(), 0);
  assert.equal((await response.json()).game.statisticsMode, "training");
});

test("mixed extra rounds still wait for every human participant", async () => {
  const initial = game(); initial.status = "lobby";
  let state = onlineBots.addOnlineBot(initial, "medium");
  state = onlineBots.initializeBotRound(rules.startRound({ ...state, playerCount: 3 }, () => 0.5), 1);
  state.players[0].hand = game().players[0].hand;
  state = onlineBots.applyOnlineAction(state, "p0", { type: "racko" }, 2);
  const previousRoundId = state.botRound!.id;
  const api = server(state);
  const first = await (await api.post("voteExtraRound", "p0")).json();
  assert.equal(first.game.status, "round_end");
  assert.equal(first.game.extraRoundVotes.length, 2);
  const second = await (await api.post("voteExtraRound", "p1")).json();
  assert.equal(second.game.status, "playing");
  assert.equal(second.game.currentRound, 2);
  assert.equal(second.game.totalRounds, 2);
  assert.notEqual(api.state().botRound!.id, previousRoundId);
});

test("a rejected finish cannot double-write human statistics", async () => {
  const api = server(rules.applyGameAction(game(), "p0", { type: "racko" }));
  api.conflictNextSave();
  assert.equal((await api.post("finishGame")).status, 409);
  assert.equal(api.statistics(), 0);
});
