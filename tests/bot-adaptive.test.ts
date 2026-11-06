import test from "node:test";
import assert from "node:assert/strict";
import { applyGameAction, deckSizeFor, startRound } from "../shared/game";
import type { CoreGameState } from "../shared/game";
import { observeForBot, publicEventsForAction } from "../shared/bots";
import type { BotPublicEvent } from "../shared/bots";
import { createAdaptiveBot } from "../shared/bot-adaptive";
import { assessRoundSituation, enumerateFinishCards, knownBuriedCards, summarizeOwnHand } from "../shared/bot-situation";

function fixture(): CoreGameState {
  return startRound({ players: ["p0", "p1"].map((id) => ({ id, name: id, hand: [], roundScore: 0, totalScore: 0, rackos: 0 })),
    playerCount: 2, directRunRequirement: 3, currentRound: 1, totalRounds: 3, startingPlayerIndex: 0,
    status: "playing", deck: [], discard: [], turnIndex: 0, drawnCard: null, drawnFrom: null,
    roundResults: [], gameWinnerIds: [], message: "" }, () => 0.37);
}

test("easy receives aggregate time without opponent card history, missing time stays unknown", () => {
  const state = fixture();
  const events: BotPublicEvent[] = [
    { roundId: "r", revision: 1, type: "draw", playerId: "p0", source: "deck", card: null },
    { roundId: "r", revision: 2, type: "discard", playerId: "p0", card: 26 },
    { roundId: "r", revision: 3, type: "swap", playerId: "p1", discardedCard: 47 },
  ];
  const observation = observeForBot(state, "p0", { roundId: "r", revision: 3, events, settings: { difficulty: "easy" } });
  assert.deepEqual(observation.events, []);
  assert.deepEqual(observation.roundProgress, { historyComplete: true, completedTurns: 2, completedOwnTurns: 1, reshuffles: 0 });
  assert.equal(observeForBot(state, "p0").roundProgress?.completedTurns, null);
  assert.equal(observeForBot(state, "p0", { roundId: "r", revision: 3, events, historyComplete: false }).roundProgress?.completedTurns, null);
});

test("urgency separates a lucky own start from elapsed time and accounts for player count", () => {
  const state = fixture();
  const start = observeForBot(state, "p0", { events: [] });
  const lucky = assessRoundSituation(start, 1);
  const later = assessRoundSituation({ ...start, roundProgress: { historyComplete: true, completedTurns: 44, completedOwnTurns: 22, reshuffles: 1 } }, 0.5);
  assert.ok(later.pressure > lucky.pressure);
  assert.equal(lucky.roundAge, 0);
  assert.equal(later.source, "public-turn-count");
  const four = assessRoundSituation({ ...start, playerCount: 4,
    roundProgress: { historyComplete: true, completedTurns: 88, completedOwnTurns: 22, reshuffles: 1 } }, 0.5);
  assert.ok(four.pressure > later.pressure);
  const replenished = assessRoundSituation({ ...start, deckCount: 30,
    roundProgress: { historyComplete: true, completedTurns: 44, completedOwnTurns: 22, reshuffles: 1 } }, 0.5);
  assert.equal(replenished.pressure, later.pressure);
});

test("concrete one-card finishes respect the rule and own cards", () => {
  const twoEnds = [3,8,13,19,24,25,44,46,48,50].reverse();
  assert.deepEqual(enumerateFinishCards(twoEnds, 50, 3).map((c) => c.card), [23,26]);
  const gap = [3,8,13,19,25,41,27,46,48,50].reverse();
  assert.deepEqual(enumerateFinishCards(gap, 50, 3), [{ card: 26, slots: [4] }]);
  assert.deepEqual(enumerateFinishCards(gap, 50, 4), []);
  assert.ok(!enumerateFinishCards(twoEnds, 50, 0).some((c) => twoEnds.includes(c.card)));
});

test("easy can recognize two open ends of a simple pair without an optimal plan", () => {
  const hand = [3,8,13,19,24,25,44,46,48,50].reverse();
  assert.deepEqual(summarizeOwnHand(hand, 50, 3).runExtensionCards, [23,26]);
  assert.deepEqual(summarizeOwnHand(hand, 50, 0).runExtensionCards, []);
  const sortedWithoutRun = [3,8,13,19,25,30,35,40,45,50].reverse();
  assert.ok(summarizeOwnHand(sortedWithoutRun, 50, 3).simpleProgress < summarizeOwnHand(sortedWithoutRun, 50, 0).simpleProgress);
});

test("medium remembers burial but a reshuffle clears old discard locations", () => {
  const state = fixture(); state.discard = [26,47];
  state.players[0].hand = [3,8,13,19,25,41,27,46,48,50].reverse();
  const events: BotPublicEvent[] = [
    { roundId: "r", revision: 1, type: "discard", playerId: "p1", card: 26 },
    { roundId: "r", revision: 2, type: "discard", playerId: "p0", card: 47 },
  ];
  const observation = observeForBot(state, "p0", { roundId: "r", revision: 2, events });
  assert.deepEqual([...knownBuriedCards(observation)], [26]);
  assert.deepEqual(createAdaptiveBot("medium").explain(observation).finishCards,
    [{ card: 26, slots: [4], availability: "buried" }]);
  const after = { ...observation, events: [...events, { roundId: "r", revision: 3, type: "reshuffle" } as const] };
  assert.deepEqual([...knownBuriedCards(after)], []);
  assert.equal(createAdaptiveBot("medium").explain(after).finishCards?.[0].availability, "unknown");
  assert.deepEqual([...knownBuriedCards({ ...observation, roundProgress: { historyComplete: false,
    completedTurns: null, completedOwnTurns: null, reshuffles: null } })], []);
});

test("easy never inspects enemy events even if a custom caller supplies them", () => {
  const observation = observeForBot(fixture(), "p0");
  Object.defineProperty(observation, "events", { get: () => { throw new Error("Enemy history read"); } });
  assert.doesNotThrow(() => createAdaptiveBot("easy").explain(observation));
});

test("repeated turns without a hand change still refresh urgency and evaluation", () => {
  const state = fixture();
  const opening = observeForBot(state, "p0", { events: [] });
  for (const level of ["easy", "medium"] as const) {
    const bot = createAdaptiveBot(level);
    const first = bot.explain(opening);
    const late = bot.explain({ ...opening, roundProgress: { historyComplete: true,
      completedTurns: 60, completedOwnTurns: 30, reshuffles: 1 } });
    assert.ok(late.situation.pressure > first.situation.pressure);
    assert.notEqual(late.score, first.score);
  }
});

test("a medium plan does not treat its own outgoing card as an available new draw", () => {
  const state = fixture();
  state.players[0].hand = [3,8,13,19,25,27,44,46,48,50].reverse();
  state.drawnCard = 26; state.drawnFrom = "deck";
  const decision = createAdaptiveBot("medium").explain(observeForBot(state, "p0"));
  assert.equal(decision.action.type, "swap");
  assert.ok(decision.resultingFinishCards?.some((card) => card.availability === "just-discarded"));
});

test("both levels finish promptly and ignore total-score and round context by default", () => {
  const state = fixture();
  for (const level of ["easy", "medium"] as const) {
    const bot = createAdaptiveBot(level);
    const action = bot.decide(observeForBot(state, "p0"));
    state.currentRound = 3; state.totalRounds = 20; state.players[1].totalScore = 10000;
    assert.deepEqual(bot.decide(observeForBot(state, "p0")), action);
    const ready = structuredClone(state);
    ready.players[0].hand = [3,8,13,19,25,26,27,46,48,50].reverse();
    assert.deepEqual(bot.decide(observeForBot(ready, "p0")), { type: "racko" });
  }
});

test("situational strategies preserve rules and every card in mixed trajectories", () => {
  for (const count of [2,3,4] as const) for (const requirement of [0,3,4] as const) {
    const input = fixture(); input.playerCount = count; input.directRunRequirement = requirement;
    input.players = Array.from({ length: count }, (_, i) => ({ ...input.players[0], id: `p${i}`, name: `p${i}` }));
    let state = startRound(input, () => 0.37);
    const bots = state.players.map((_, i) => createAdaptiveBot(i % 2 ? "easy" : "medium"));
    const events: BotPublicEvent[] = [];
    for (let revision = 1; revision <= 160 && state.status === "playing"; revision++) {
      const actor = state.players[state.turnIndex].id;
      const observation = observeForBot(state, actor, { roundId: "r", revision: revision - 1, events,
        settings: { difficulty: state.turnIndex % 2 ? "easy" : "medium" } });
      const action = bots[state.turnIndex].explain(observation).action;
      const before = state;
      state = applyGameAction(state, actor, action, () => 0.37);
      events.push(...publicEventsForAction(before, action, state, { roundId: "r", revision }));
      const allCards = [...state.deck, ...state.discard, ...state.players.flatMap((p) => p.hand),
        ...(state.drawnCard === null ? [] : [state.drawnCard])];
      assert.equal(allCards.length, deckSizeFor(count));
      assert.equal(new Set(allCards).size, allCards.length);
    }
  }
});
