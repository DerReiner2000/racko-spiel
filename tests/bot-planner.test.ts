import test from "node:test";
import assert from "node:assert/strict";
import { applyGameAction, canDeclareRacko, startRound } from "../shared/game";
import type { CoreGameState, DirectRunRequirement } from "../shared/game";
import { observeForBot } from "../shared/bots";
import { analyzeHand } from "../shared/bot-reference";
import { createConfiguredReferenceBot } from "../shared/bot-reference";
import { analyzeTargetSpace, buildRackPlan, createPlanningBot } from "../shared/bot-planner";

function fixture(): CoreGameState {
  return startRound({ players: ["p0", "p1"].map((id) => ({ id, name: id, hand: [], roundScore: 0,
    totalScore: 0, rackos: 0 })), playerCount: 2, directRunRequirement: 3, currentRound: 1, totalRounds: 3,
    startingPlayerIndex: 0, status: "playing", deck: [], discard: [], turnIndex: 0, drawnCard: null,
    drawnFrom: null, roundResults: [], gameWinnerIds: [], message: "" }, () => 0.37);
}

test("planner counts optimal targets exactly, without double-counting overlapping runs", () => {
  for (const h of [[14,2,11,4,9,6,7,8,5,10], [1,3,4,6,7,8,10,11,13,14], [14,13,12,11,10,9,8,7,6,5]]) {
    for (const requirement of [0, 3, 4] as const) {
      let maximum = -1, ways = 0;
      const visit = (target: number[], first: number) => {
        if (target.length === 10) {
          if (!canDeclareRacko([...target].reverse(), requirement)) return;
          const matches = target.filter((v, i) => v === h[i]).length;
          if (matches > maximum) { maximum = matches; ways = 1; }
          else if (matches === maximum) ways++;
          return;
        }
        for (let v = first; v <= 14 - (9 - target.length); v++) visit([...target, v], v + 1);
      };
      visit([], 1);
      const hand = [...h].reverse();
      const space = analyzeTargetSpace(hand, 14, requirement);
      assert.equal(space.keptCards, maximum); assert.equal(space.completionCount, ways);
      const plan = buildRackPlan(hand, 14, requirement);
      assert.ok(canDeclareRacko(plan.targetHand, requirement));
      assert.equal(plan.anchors.length, maximum);
      assert.equal(plan.replaceSlots.length, 10 - maximum);
      for (const range of plan.slotRanges) {
        assert.ok(range.min <= plan.targetHand[range.slot] && range.max >= plan.targetHand[range.slot]);
      }
    }
  }
});

test("planner retains a feasible spaced subsequence and rejects compressed false anchors", () => {
  const h = [2,49,12,45,22,41,32,37,42,47].reverse();
  const plan = buildRackPlan(h, 50, 0);
  assert.deepEqual(plan.anchors.map((a) => a.value).sort((a,b) => a-b), [2,12,22,32,37,42,47]);
  assert.equal(plan.optimisticReplacements, 3);
  const compressed = buildRackPlan([10,11,12,13,14,15,16,17,18,19].reverse(), 50, 0);
  assert.equal(compressed.keptCards, 10);
  // 25 and 27 with two intermediate slots cannot both be anchors.
  const impossibleGap = buildRackPlan([1,5,10,25,40,41,27,35,45,50].reverse(), 50, 0);
  assert.ok(![25,27].every((v) => impossibleGap.anchors.some((a) => a.value === v)));
});

test("initial preparation works off-turn and is independent of the first offered/drawn card", () => {
  const state = fixture(); state.turnIndex = 1;
  const bot = createPlanningBot();
  const observation = observeForBot(state, "p0", { roundId: "opaque" });
  bot.prepare!(observation);
  const before = bot.getPlanningState();
  bot.prepare!({ ...observation, topDiscard: 27, drawnCard: 26, drawnFrom: "deck", deckCount: 1 });
  assert.deepEqual(bot.getPlanningState(), before);
  assert.equal(before?.replans, 0);
  assert.throws(() => bot.decide(observation), /Phase/);
});

test("medium registration prepares a plan automatically before its first decision", () => {
  const bot = createConfiguredReferenceBot({ difficulty: "medium", considerMatchScore: false });
  assert.equal(bot.id, "medium-situational-v1");
  assert.equal(typeof bot.prepare, "function");
  const state = fixture();
  assert.doesNotThrow(() => bot.decide(observeForBot(state, "p0")));
});

test("changed hand replans, snapshots are isolated, new round resets the initial plan", () => {
  const state = fixture(); const bot = createPlanningBot();
  const observation = observeForBot(state, "p0", { roundId: "first" });
  bot.prepare!(observation);
  const initial = bot.getPlanningState()!.initialPlan;
  const changed = [...observation.hand];
  const available = Array.from({ length: 50 }, (_, i) => i + 1).find((v) => !changed.includes(v))!;
  changed[0] = available;
  bot.prepare!({ ...observation, hand: changed });
  const next = bot.getPlanningState()!;
  assert.equal(next.replans, 1); assert.deepEqual(next.initialPlan, initial);
  assert.deepEqual(next.currentPlan.sourceHand, changed);
  next.initialPlan.sourceHand[0] = -100;
  assert.notEqual(bot.getPlanningState()!.initialPlan.sourceHand[0], -100);
  bot.prepare!({ ...observation, roundId: "second", hand: changed });
  assert.equal(bot.getPlanningState()!.replans, 0);
  assert.deepEqual(bot.getPlanningState()!.initialPlan.sourceHand, changed);
});

test("a new opportunity can release an anchor that still exists in the hand", () => {
  const state = fixture(); state.directRunRequirement = 0;
  state.players[0].hand = [2,10,8,49,22,27,32,37,42,47].reverse();
  const bot = createPlanningBot();
  bot.prepare!(observeForBot(state, "p0"));
  assert.ok(bot.getPlanningState()!.currentPlan.anchors.some((a) => a.value === 10));
  state.players[0].hand[6] = 9;
  bot.prepare!(observeForBot(state, "p0"));
  const plan = bot.getPlanningState()!.currentPlan;
  assert.ok(!plan.anchors.some((a) => a.value === 10));
  assert.ok([8,9].every((v) => plan.anchors.some((a) => a.value === v)));
  assert.ok(state.players[0].hand.includes(10));
});

test("planner agrees on repair bounds, handles mandatory runs, and does not see match context", () => {
  for (const count of [2,3,4] as const) for (const requirement of [0,3,4] as const) {
    const max = count === 2 ? 50 : count === 3 ? 60 : 75;
    const hand = [3,8,13,19,25,41,44,46,48,50].reverse();
    const plan = buildRackPlan(hand, max, requirement);
    assert.equal(plan.keptCards, analyzeHand(hand, max, requirement).keptWithRequiredRun);
    assert.equal(plan.run?.slots.length ?? 0, requirement);
  }
  const state = fixture(); const bot = createPlanningBot();
  const a = bot.decide(observeForBot(state, "p0"));
  state.currentRound = 3; state.players[0].totalScore = 500;
  assert.deepEqual(bot.decide(observeForBot(state, "p0")), a);
});

test("planning bot produces legal trajectories under every player count and rule", () => {
  for (const count of [2,3,4] as const) for (const requirement of [0,3,4] as DirectRunRequirement[]) {
    const input = fixture(); input.playerCount = count; input.directRunRequirement = requirement;
    input.players = Array.from({ length: count }, (_, i) => ({ ...input.players[0], id: `p${i}`, name: `p${i}` }));
    let state = startRound(input, () => 0.37);
    const bots = state.players.map(() => createPlanningBot());
    bots.forEach((bot, seat) => bot.prepare!(observeForBot(state, `p${seat}`)));
    for (let action = 0; action < 100 && state.status === "playing"; action++) {
      const actor = state.turnIndex;
      const decision = bots[actor].explain(observeForBot(state, `p${actor}`));
      state = applyGameAction(state, `p${actor}`, decision.action, () => 0.37);
    }
  }
});
