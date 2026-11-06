import assert from "node:assert/strict";
import test from "node:test";
import type { GameResponse, GameSession, GameView } from "../shared/online";
import { OnlineApi, OnlineError, isExpiredSession, normalizeServerUrl, parseStoredSession } from "../racko-offline-app/src/online/client";
import { OnlineGameSession } from "../racko-offline-app/src/online/session";
import type { ConnectRealtime, SessionApi } from "../racko-offline-app/src/online/session";
import { observeForBot } from "../shared/bots";
import { startRound } from "../shared/game";

const identity: GameSession = { code: "ABCDE", playerId: "p0", token: "test-session-token" };
function view(message = "Max ist am Zug."): GameView {
  return {
    ...identity, hostId: "p0", myPlayerId: "p0", isHost: true, isMyTurn: true,
    playerCount: 2, totalRounds: 3, currentRound: 1, startingPlayerIndex: 0, directRunRequirement: 0,
    status: "playing", turnIndex: 0, deckCount: 30, discard: [], drawnCard: null, drawnFrom: null,
    roundResults: [], extraRoundVotes: [], gameWinnerIds: [], message,
    players: [
      { id: "p0", name: "Max", hand: [40,35,30,25,20,15,10,4,3,2], roundScore: 0, totalScore: 0, rackos: 0 },
      { id: "p1", name: "Tom", roundScore: 0, totalScore: 0, rackos: 0 },
    ],
  };
}
function response(version = 1, message?: string): GameResponse { return { game: view(message), version }; }
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function harness(connect?: ConnectRealtime) {
  const calls = { reads: 0, writes: 0, heartbeats: 0 };
  let read: () => Promise<GameResponse> = async () => response();
  let write: () => Promise<GameResponse> = async () => response(2);
  const timers = new Map<number, () => void>();
  const api: SessionApi = {
    snapshot: () => { calls.reads++; return read(); },
    act: () => { calls.writes++; return write(); },
    heartbeat: async () => { calls.heartbeats++; },
  };
  const session = new OnlineGameSession(api, identity, connect, (callback, ms) => {
    timers.set(ms, callback);
    return () => { timers.delete(ms); };
  });
  return {
    session, calls, timers,
    read: (handler: typeof read) => { read = handler; },
    write: (handler: typeof write) => { write = handler; },
  };
}

test("normalizes HTTPS origins and rejects credentials, subpages and insecure URLs", () => {
  assert.equal(normalizeServerUrl(" https://racko-spiel.vercel.app/ "), "https://racko-spiel.vercel.app");
  for (const url of ["example.com", "http://example.com", "https://x:y@example.com", "https://example.com/api/game", "https://example.com/?key=secret"]) {
    assert.throws(() => normalizeServerUrl(url), OnlineError);
  }
});

test("stored sessions keep their own server and tolerate damaged storage", () => {
  assert.deepEqual(parseStoredSession(JSON.stringify({ ...identity, serverUrl: "https://example.test/" })), { ...identity, serverUrl: "https://example.test" });
  for (const value of [null, "{", "null", "{}", JSON.stringify({ ...identity, token: "", serverUrl: "https://example.test" })]) assert.equal(parseStoredSession(value), null);
});

test("transport encodes lobby names and uses the existing game's action protocol", async () => {
  const calls: { url: string; options?: RequestInit }[] = [];
  const api = new OnlineApi("https://example.test", async (url, options) => {
    calls.push({ url: String(url), options });
    return Response.json(String(url).includes("/api/games") ? { games: [] } : response(2));
  });
  await api.games("Gast 1");
  await api.act(identity, { type: "swap", slot: 2, declareRacko: false });
  assert.equal(calls[0].url, "https://example.test/api/games?name=Gast%201");
  assert.deepEqual(JSON.parse(String(calls[1].options?.body)), { action: "swap", slot: 2, declareRacko: false, ...identity });
  assert.equal(calls[1].options?.cache, "no-store");
});

test("transport handles HTTP, malformed JSON and unavailable networks without retries", async () => {
  let attempts = 0;
  const api = new OnlineApi("https://example.test", async () => { attempts++; return Response.json({ error: "Konflikt", code: "VERSION_CONFLICT" }, { status: 409 }); });
  await assert.rejects(api.snapshot(identity), (error: unknown) => error instanceof OnlineError && error.status === 409);
  assert.equal(attempts, 1);
  const html = new OnlineApi("https://example.test", async () => new Response("<html>Login</html>"));
  await assert.rejects(html.snapshot(identity), OnlineError);
  const offline = new OnlineApi("https://example.test", async () => { throw new TypeError("Network request failed"); });
  await assert.rejects(offline.snapshot(identity), (error: unknown) => error instanceof OnlineError && error.code === "NETWORK_ERROR");
});

test("transport enforces a request timeout", async () => {
  const api = new OnlineApi("https://example.test", async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
  }), 5);
  await assert.rejects(api.snapshot(identity), /Server antwortet nicht/);
});

test("expired-session detection also supports the previously deployed API", () => {
  assert.equal(isExpiredSession(new OnlineError("Spiel nicht gefunden.", 500)), true);
  assert.equal(isExpiredSession(new OnlineError("Deine Spielanmeldung ist nicht mehr gültig.", 500)), true);
  assert.equal(isExpiredSession(new OnlineError("Datenbank vorübergehend nicht erreichbar.", 500)), false);
  assert.equal(isExpiredSession(new OnlineError("Keine Verbindung", 0)), false);
});

test("successful snapshots from older servers do not require a version field", async () => {
  const api = new OnlineApi("https://example.test", async () => Response.json({ game: view() }));
  const snapshot = await api.snapshot(identity);
  assert.equal(snapshot.version, undefined);
  assert.equal(snapshot.game.myPlayerId, identity.playerId);
});

test("session opens, falls back to HTTP, heartbeats and releases all timers", async () => {
  const h = harness();
  h.session.start(); await flush();
  assert.equal(h.session.getState().connection, "connected");
  h.timers.get(15000)!(); await flush();
  h.timers.get(300000)!(); await flush();
  assert.equal(h.calls.reads, 2);
  assert.equal(h.calls.heartbeats, 1);
  h.session.stop();
  assert.equal(h.timers.size, 0);
});

test("late snapshots cannot reveal a game after the app was paused or left", async () => {
  const h = harness();
  const slow = deferred<GameResponse>();
  h.read(() => slow.promise);
  h.session.start(); h.session.pause();
  slow.resolve(response()); await flush();
  assert.equal(h.session.getState().game, null);
  assert.equal(h.session.getState().connection, "paused");
  assert.equal(h.timers.size, 0);
});

test("resuming the app reloads the server before another move is allowed", async () => {
  const h = harness(); h.session.start(); await flush(); h.session.pause();
  const slow = deferred<GameResponse>(); h.read(() => slow.promise);
  h.session.start();
  await h.session.act({ type: "draw", source: "deck" });
  assert.equal(h.calls.writes, 0);
  assert.equal(h.session.getState().connection, "reconnecting");
  slow.resolve(response(2)); await flush();
  assert.equal(h.session.getState().connection, "connected");
  h.session.stop();
});

test("a late pre-move snapshot never replaces the move response", async () => {
  const h = harness(); h.session.start(); await flush();
  const slow = deferred<GameResponse>(); h.read(() => slow.promise);
  const old = h.session.refresh();
  await h.session.act({ type: "draw", source: "deck" });
  slow.resolve(response(1, "old")); await old;
  assert.equal(h.session.getState().game?.message, view().message);
  assert.equal(h.session.getState().connection, "connected");
  h.session.stop();
});

test("rapid double taps cause one mutation, and old versions cannot move the UI back", async () => {
  const h = harness(); h.session.start(); await flush();
  const slow = deferred<GameResponse>(); h.write(() => slow.promise);
  const first = h.session.act({ type: "draw", source: "deck" });
  await h.session.act({ type: "draw", source: "deck" });
  assert.equal(h.calls.writes, 1);
  slow.resolve(response(3, "new")); await first;
  h.read(async () => response(2, "old")); await h.session.refresh();
  assert.equal(h.session.getState().game?.message, "new");
  h.session.stop();
});

test("an uncertain move is never replayed and requires a fresh snapshot", async () => {
  const h = harness(); h.session.start(); await flush();
  const slow = deferred<GameResponse>(); h.read(() => slow.promise);
  h.write(async () => { throw new OnlineError("Zeitüberschreitung"); });
  await h.session.act({ type: "draw", source: "deck" });
  assert.equal(h.session.getState().connection, "reconnecting");
  await h.session.act({ type: "draw", source: "deck" });
  assert.equal(h.calls.writes, 1);
  slow.resolve(response(2, "accepted on server")); await flush();
  assert.equal(h.session.getState().connection, "connected");
  assert.equal(h.session.getState().game?.message, "accepted on server");
  h.session.stop();
});

test("transient outages preserve the session; permanent expiry stops it", async () => {
  const h = harness(); h.session.start(); await flush();
  h.read(async () => { throw new OnlineError("Offline"); }); await h.session.refresh();
  assert.equal(h.session.getState().connection, "reconnecting");
  assert.ok(h.session.getState().game);
  h.read(async () => { throw new OnlineError("Spiel nicht gefunden.", 404, "GAME_NOT_FOUND"); }); await h.session.refresh();
  assert.equal(h.session.getState().connection, "ended");
  assert.equal(h.session.getState().game, null);
  assert.equal(h.timers.size, 0);
});

test("a move completing during unlock is resynchronized and releases its busy state", async () => {
  const h = harness(); h.session.start(); await flush();
  const slow = deferred<GameResponse>(); h.write(() => slow.promise);
  const write = h.session.act({ type: "draw", source: "deck" });
  h.session.pause(); h.read(async () => response(4, "resumed")); h.session.start();
  slow.resolve(response(2, "old foreground")); await write; await flush();
  assert.equal(h.session.getState().busy, false);
  assert.equal(h.session.getState().connection, "connected");
  assert.equal(h.session.getState().game?.message, "resumed");
  h.session.stop();
});

test("realtime updates trigger snapshots; disconnects restore polling", async () => {
  let changed!: () => void; let healthy!: (value: boolean) => void; let disposed = 0;
  const h = harness(async (change, status) => { changed = change; healthy = status; return () => { disposed++; }; });
  h.session.start(); await flush();
  healthy(true); await flush(); const before = h.calls.reads;
  h.timers.get(15000)!(); await flush(); assert.equal(h.calls.reads, before);
  changed(); await flush(); assert.equal(h.calls.reads, before + 1);
  healthy(false); h.timers.get(15000)!(); await flush(); assert.equal(h.calls.reads, before + 2);
  h.session.stop(); assert.equal(disposed, 1);
});

test("a move completed while backgrounded cannot leave controls permanently busy", async () => {
  const h = harness(); h.session.start(); await flush();
  const slow = deferred<GameResponse>(); h.write(() => slow.promise);
  const write = h.session.act({ type: "draw", source: "deck" });
  h.session.pause(); slow.resolve(response(2)); await write;
  h.read(async () => response(3)); h.session.start(); await flush();
  assert.equal(h.session.getState().busy, false);
  assert.equal(h.session.getState().connection, "connected");
  h.session.stop();
});

test("a rejected move stays readable after the corrective snapshot", async () => {
  const h = harness(); h.session.start(); await flush();
  h.write(async () => { throw new OnlineError("Du bist gerade nicht am Zug.", 400); });
  await h.session.act({ type: "draw", source: "deck" }); await flush();
  assert.equal(h.session.getState().error, "Du bist gerade nicht am Zug.");
  assert.equal(h.session.getState().connection, "connected");
  h.session.stop();
});

test("realtime setup failure retains HTTP fallback and late setup is disposed", async () => {
  const failed = harness(async () => { throw new Error("old server has no bootstrap route"); });
  failed.session.start(); await flush(); failed.timers.get(15000)!(); await flush();
  assert.equal(failed.calls.reads, 2); failed.session.stop();
  let disposed = 0;
  const setup = deferred<() => void>();
  const late = harness(() => setup.promise); late.session.start(); late.session.stop();
  setup.resolve(() => { disposed++; }); await flush(); assert.equal(disposed, 1);
});

test("bot integration receives only a copy of permitted observations", () => {
  const state = startRound({
    players: ["Max", "Tom"].map((name, i) => ({ id: `p${i}`, name, hand: [] as number[], roundScore: 0, totalScore: 0, rackos: 0, token: `secret-${i}` })),
    playerCount: 2 as const, directRunRequirement: 0 as const, currentRound: 1, totalRounds: 3,
    startingPlayerIndex: 0, status: "playing" as const, deck: [] as number[], discard: [] as number[],
    drawnCard: 12 as number | null, drawnFrom: "deck" as "deck" | null, turnIndex: 0, roundResults: [], gameWinnerIds: [], message: "",
  });
  state.drawnCard = 12; state.drawnFrom = "deck";
  const observation = observeForBot(state, "p0");
  assert.deepEqual(observation.hand, state.players[0].hand);
  assert.equal(observation.drawnCard, 12);
  assert.ok(!("deck" in observation));
  assert.ok(observation.players.every((player) => !("hand" in player) && !("token" in player)));
  observation.hand[0] = -1;
  assert.notEqual(state.players[0].hand[0], -1);
  assert.equal(observeForBot(state, "p1").drawnCard, null);
  assert.throws(() => observeForBot(state, "missing"));
});
