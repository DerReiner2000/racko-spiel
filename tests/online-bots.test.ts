import assert from "node:assert/strict";
import test from "node:test";
import { addOnlineBot, advanceOnlineBots, applyOnlineAction, botDifficulty, changeOnlineBot, fallbackBotAction, initializeBotRound, isBot } from "../lib/online-bots";
import type { BotGameStore, LoadedOnlineGame } from "../lib/online-bots";
import { startRound } from "../shared/game";
import { createConfiguredReferenceBot } from "../shared/bot-reference";
import { observeForBot } from "../shared/bots";
import type { BotObservation } from "../shared/bots";
import type { GameState } from "../lib/types";

function lobby(humans = 1): GameState {
  return {
    code: "ABCDE", hostId: "h0", playerCount: 2, directRunRequirement: 0, totalRounds: 1,
    currentRound: 1, startingPlayerIndex: 0, status: "lobby", deck: [], discard: [], turnIndex: 0,
    drawnCard: null, drawnFrom: null, awaitingRacko: false, roundResults: [], extraRoundVotes: [], gameWinnerIds: [], message: "",
    players: (["Max", "Tom"] as const).slice(0, humans).map((name, i) => ({
      id: `h${i}`, name, token: `token-${i}`, connectedAt: "2026-11-06", hand: [], roundScore: 0, totalScore: 0, rackos: 0,
    })),
  };
}
function mixed(bots = 1, requirement: 0 | 3 | 4 = 0) {
  let state = lobby();
  for (let i = 0; i < bots; i++) state = addOnlineBot(state, i % 2 === 0 ? "easy" : "medium");
  state = { ...state, playerCount: state.players.length as 2 | 3 | 4, directRunRequirement: requirement, startingPlayerIndex: 1 };
  let seed = 123;
  return initializeBotRound(startRound(state, () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }), 10);
}
function memory(initial: GameState, version = 10) {
  let committed: LoadedOnlineGame = { state: structuredClone(initial), version };
  const writes: LoadedOnlineGame[] = [];
  let notifications = 0;
  const store: BotGameStore = {
    load: async () => structuredClone(committed),
    save: async (state, version) => {
      if (version !== committed.version) return false;
      committed = { state: structuredClone(state), version: version + 1 };
      writes.push(structuredClone(committed));
      return true;
    },
    notify: async () => { notifications++; },
  };
  return { store, writes, latest: () => structuredClone(committed), notifications: () => notifications };
}
function inventory(state: GameState) {
  return [...state.deck, ...state.discard, ...state.players.flatMap((player) => player.hand), ...(state.drawnCard === null ? [] : [state.drawnCard])].sort((a,b) => a-b);
}

test("lobby adds only implemented profiles and never assigns bot credentials", () => {
  let state = lobby(2);
  state = addOnlineBot(state, botDifficulty("easy"));
  state = addOnlineBot(state, botDifficulty("medium"));
  assert.deepEqual(state.players.filter(isBot).map((bot) => [bot.name, bot.botSettings.difficulty, bot.strategyId]), [
    ["Bot 1", "easy", "easy-situational-v1"], ["Bot 2", "medium", "medium-situational-v1"],
  ]);
  assert.ok(state.players.filter(isBot).every((bot) => !("token" in bot)));
  assert.throws(() => addOnlineBot(state, "easy"), /voll/);
  for (const difficulty of ["hard", "expert", undefined, {}, "EASY"]) assert.throws(() => botDifficulty(difficulty));
  assert.throws(() => changeOnlineBot(state, "h0"), /nicht gefunden/);
  state = changeOnlineBot(state, state.players[2].id, "medium");
  assert.equal(state.players.filter(isBot)[0].botSettings.difficulty, "medium");
  state = changeOnlineBot(state, state.players[2].id);
  assert.equal(state.players.length, 3);
  assert.equal(addOnlineBot(state, "easy").players.at(-1)?.name, "Bot 1");
});

for (const requirement of [0, 3, 4] as const) {
  test(`server completes consecutive bot turns without a browser, run requirement ${requirement}`, async () => {
    const initial = mixed(3, requirement);
    const m = memory(initial);
    const latest = await advanceOnlineBots(m.latest(), m.store);
    assert.ok(latest.state.status === "round_end" || latest.state.players[latest.state.turnIndex].id === "h0");
    assert.ok(m.writes.length > 0 && m.writes.length <= 6);
    assert.equal(m.notifications(), m.writes.length);
    assert.deepEqual(inventory(latest.state), inventory(initial));
    for (const saved of m.writes) {
      const round = saved.state.botRound!;
      assert.ok(round.events.every((event) => event.revision <= saved.version));
      assert.ok(round.events.every((event) => !("slot" in event) && !("token" in event)));
      assert.ok(round.events.filter((event) => event.type === "draw" && event.source === "deck").every((event) => event.type === "draw" && event.card === null));
    }
  });
}

test("concurrent server workers commit each bot action exactly once", async () => {
  const m = memory(mixed());
  const stale = m.latest();
  await Promise.all([advanceOnlineBots(stale, m.store), advanceOnlineBots(stale, m.store), advanceOnlineBots(stale, m.store)]);
  assert.equal(m.writes.length, 2);
  assert.equal(m.latest().state.players[m.latest().state.turnIndex].id, "h0");
  assert.equal(m.latest().state.botRound?.events.length, 2);
  assert.deepEqual(m.writes.map((write) => write.version), [11, 12]);
});

test("a server restart resumes placement from the committed draw and initial plan", async () => {
  const initial = mixed();
  const bot = initial.players[initial.turnIndex];
  const drawn = applyOnlineAction(initial, bot.id, { type: "draw", source: "deck" }, 11);
  const m = memory(drawn, 11);
  const prepared: BotObservation[] = [];
  const latest = await advanceOnlineBots(m.latest(), m.store, (player) => {
    const strategy = createConfiguredReferenceBot(player.botSettings);
    return { ...strategy, prepare: (observation) => { prepared.push(structuredClone(observation)); strategy.prepare?.(observation); } };
  });
  assert.equal(m.writes.length, 1);
  assert.equal(latest.state.drawnCard, null);
  assert.deepEqual(prepared[0].hand, initial.players[initial.turnIndex].hand);
  assert.equal(prepared[0].drawnCard, null);
  assert.equal(prepared[0].roundId, initial.botRound!.id);
});

test("invalid or unavailable strategies fall back without losing cards or stalling", async () => {
  for (const mode of ["throw", "invalid"] as const) {
    const initial = mixed();
    const m = memory(initial);
    const latest = await advanceOnlineBots(m.latest(), m.store, (bot) => ({
      id: bot.strategyId,
      decide: (observation) => {
        observation.hand[0] = -999;
        if (mode === "throw") throw new Error("Test strategy failure");
        return { type: "swap", slot: 999, declareRacko: false };
      },
    }));
    assert.equal(latest.state.players[latest.state.turnIndex].id, "h0");
    assert.deepEqual(inventory(latest.state), inventory(initial));
  }
});

test("a fallback must swap an openly drawn card", () => {
  let state = mixed();
  state = { ...state, discard: [state.deck.pop()!] };
  const id = state.players[state.turnIndex].id;
  const drawn = applyOnlineAction(state, id, { type: "draw", source: "discard" }, 11);
  const action = fallbackBotAction(observeForBot(drawn, id));
  assert.equal(action.type, "swap");
  assert.doesNotThrow(() => applyOnlineAction(drawn, id, action, 12));
});

test("bots automatically agree to an extra round; only human votes are needed", () => {
  const state = mixed(2);
  state.turnIndex = 0;
  state.players[0].hand = [40,35,30,25,20,15,10,4,3,2];
  const ended = applyOnlineAction(state, "h0", { type: "racko" }, 11);
  assert.deepEqual(ended.extraRoundVotes, ended.players.filter(isBot).map((bot) => bot.id));
  const oldId = ended.botRound!.id;
  const next = applyOnlineAction(ended, "h0", { type: "voteExtraRound" }, 12);
  assert.equal(next.status, "playing");
  assert.equal(next.currentRound, 2);
  assert.equal(next.totalRounds, 2);
  assert.notEqual(next.botRound!.id, oldId);
  assert.deepEqual(next.botRound!.events, []);
  assert.equal(next.botRound!.historyComplete, true);
  assert.ok(Object.values(next.botRound!.initialObservations).every((observation) => observation.drawnCard === null && observation.events.length === 0));
});

test("human public events are persisted too, while old missing history stays incomplete", () => {
  const state = mixed(); state.turnIndex = 0;
  const drawn = applyOnlineAction(state, "h0", { type: "draw", source: "deck" }, 11);
  const next = applyOnlineAction(drawn, "h0", { type: "discard" }, 12);
  assert.deepEqual(next.botRound!.events.map((event) => event.type), ["draw", "discard"]);
  const { botRound, ...old } = next; void botRound;
  const oldHumanTurn = { ...old, turnIndex: 0 };
  const resumed = applyOnlineAction(oldHumanTurn, "h0", { type: "draw", source: "deck" }, 13);
  assert.equal(resumed.botRound!.historyComplete, false);
});

test("old human-only games gain no bot state or changed turn behavior", async () => {
  const state = startRound(lobby(2), () => 0.5);
  const next = applyOnlineAction(state, "h0", { type: "draw", source: "deck" }, 11);
  assert.equal(next.botRound, undefined);
  const m = memory(next);
  await advanceOnlineBots(m.latest(), m.store);
  assert.equal(m.writes.length, 0);
  assert.equal(next.players.length, 2);
  assert.equal(next.drawnFrom, "deck");
});
