import test from "node:test";
import assert from "node:assert/strict";
import { applyGameAction, canDeclareRacko, startRound } from "../shared/game";
import type { CoreGameState, DirectRunRequirement } from "../shared/game";
import { observeForBot, publicEventsForAction, resolveBotSettings } from "../shared/bots";
import type { BotPublicEvent } from "../shared/bots";
import { analyzeHand, createConfiguredReferenceBot, createReferenceBot, explainReferenceDecision } from "../shared/bot-reference";

function fixture(): CoreGameState {
  return startRound({ players: ["p0", "p1"].map((id) => ({ id, name: id,
    hand: [], roundScore: 0, totalScore: id === "p0" ? 10 : 400, rackos: 0 })),
    playerCount: 2, directRunRequirement: 3, totalRounds: 7, currentRound: 3,
    startingPlayerIndex: 0, status: "playing", deck: [], discard: [], turnIndex: 0,
    drawnCard: null, drawnFrom: null, roundResults: [], gameWinnerIds: [], message: "",
  }, () => 0.5);
}

test("default bot view is invariant to match scores and round numbers", () => {
  const state = fixture();
  const other = structuredClone(state);
  other.currentRound = 1; other.totalRounds = 20;
  other.players[0].totalScore = 9000; other.players[1].totalScore = -100;
  assert.deepEqual(observeForBot(state, "p0"), observeForBot(other, "p0"));
  const observation = observeForBot(state, "p0");
  assert.equal(observation.matchContext, null);
  assert.equal(observation.currentRound, 1);
  assert.ok(observation.players.every((p) => p.totalScore === 0));
  for (const policy of ["easy", "repair"] as const) {
    assert.deepEqual(explainReferenceDecision(observation, { policy }),
      explainReferenceDecision(observeForBot(other, "p0"), { policy }));
  }
});

test("match context is opt-in and unsupported optimization is explicit", () => {
  const state = fixture();
  const observation = observeForBot(state, "p0", { settings: { considerMatchScore: true } });
  assert.equal(observation.matchContext?.totalRounds, 7);
  assert.equal(observation.matchContext?.scores[1].totalScore, 400);
  assert.throws(() => explainReferenceDecision(observation, { policy: "repair" }), /Gesamtwertungs/);
});

test("settings are whitelisted and unfinished difficulty levels cannot masquerade as expert", () => {
  const input = { difficulty: "easy" as const, considerMatchScore: false, token: "secret" };
  assert.deepEqual(resolveBotSettings(input), { difficulty: "easy", considerMatchScore: false });
  assert.throws(() => resolveBotSettings({ difficulty: "invalid" } as never));
  assert.throws(() => createConfiguredReferenceBot({ difficulty: "expert", considerMatchScore: false }), /Kalibrierung/);
  assert.throws(() => createConfiguredReferenceBot({ difficulty: "medium", considerMatchScore: true }), /Gesamtwertungs/);
  assert.match(createConfiguredReferenceBot({ difficulty: "easy", considerMatchScore: false }).id, /easy/);
});

test("easy receives no opponent history; other views filter old/future events and copy whitelist fields", () => {
  const state = fixture();
  const event = { roundId: "opaque", revision: 2, type: "draw", playerId: "p1", source: "deck", card: 49,
    secret: state.players[1].hand } as BotPublicEvent;
  const events: BotPublicEvent[] = [event, { ...event, roundId: "old" }, { ...event, revision: 5 }];
  const observation = observeForBot(state, "p0", { roundId: "opaque", revision: 2, events });
  assert.deepEqual(observation.events, [{ roundId: "opaque", revision: 2, type: "draw", playerId: "p1", source: "deck", card: null }]);
  observation.events[0].revision = 100;
  assert.equal(event.revision, 2);
  assert.deepEqual(observeForBot(state, "p0", {
    roundId: "opaque", revision: 2, events, settings: { difficulty: "easy" },
  }).events, []);
});

test("public transition events never reveal a hidden draw or opponent slot", () => {
  const state = fixture();
  const drawn = applyGameAction(state, "p0", { type: "draw", source: "deck" });
  const stamp = { roundId: "opaque", revision: 1 };
  assert.deepEqual(publicEventsForAction(state, { type: "draw", source: "deck" }, drawn, stamp),
    [{ ...stamp, type: "draw", playerId: "p0", source: "deck", card: null }]);
  const swapped = applyGameAction(drawn, "p0", { type: "swap", slot: 4, declareRacko: false });
  assert.deepEqual(publicEventsForAction(drawn, { type: "swap", slot: 4, declareRacko: false }, swapped, stamp),
    [{ ...stamp, type: "swap", playerId: "p0", discardedCard: drawn.players[0].hand[4] }]);
  assert.equal(observeForBot(drawn, "p1").drawnCard, null);
  const widerAdapterContext = { ...stamp, deck: state.deck, token: "server-secret" };
  assert.deepEqual(publicEventsForAction(state, { type: "draw", source: "deck" }, drawn, widerAdapterContext),
    [{ ...stamp, type: "draw", playerId: "p0", source: "deck", card: null }]);
});

test("open draws and reshuffles have usable public events", () => {
  const state = fixture(); state.discard = [47, 48];
  const action = { type: "draw", source: "discard" } as const;
  let next = applyGameAction(state, "p0", action);
  assert.equal(publicEventsForAction(state, action, next, { roundId: "x", revision: 1 })[0].type, "draw");
  assert.deepEqual(publicEventsForAction(state, action, next, { roundId: "x", revision: 1 })[0],
    { roundId: "x", revision: 1, type: "draw", playerId: "p0", source: "discard", card: 48 });
  state.deck = [];
  next = applyGameAction(state, "p0", { type: "draw", source: "deck" }, () => 0.5);
  assert.deepEqual(publicEventsForAction(state, { type: "draw", source: "deck" }, next,
    { roundId: "x", revision: 2 }).map((e) => e.type), ["reshuffle", "draw"]);
});

test("structural bound agrees with exhaustive legal target hands", () => {
  const hands = [
    [14, 2, 11, 4, 9, 6, 7, 8, 5, 10],
    [1, 3, 4, 6, 7, 8, 10, 11, 13, 14],
    [14, 13, 12, 11, 10, 9, 8, 7, 6, 5],
  ];
  for (const h of hands) {
    for (const requirement of [0, 3, 4] as const) {
      let maximumMatches = -1;
      const visit = (target: number[], first: number) => {
        if (target.length === 10) {
          if (!canDeclareRacko([...target].reverse(), requirement)) return;
          maximumMatches = Math.max(maximumMatches, target.filter((v, i) => v === h[i]).length);
          return;
        }
        for (let v = first; v <= 14 - (9 - target.length); v++) visit([...target, v], v + 1);
      };
      visit([], 1);
      assert.equal(analyzeHand([...h].reverse(), 14, requirement).keptWithRequiredRun, maximumMatches);
    }
  }
});

test("25/27 gap costs points but reduces the optimistic repairs from two to one", () => {
  const original = [3, 8, 13, 19, 25, 41, 44, 46, 48, 50].reverse();
  const adjacent = analyzeHand(original.map((v, i) => i === 4 ? 27 : v), 50, 3);
  const gap = analyzeHand(original.map((v, i) => i === 3 ? 27 : v), 50, 3);
  assert.equal(adjacent.basePoints, 50); assert.equal(gap.basePoints, 30);
  assert.equal(adjacent.optimisticReplacements, 2); assert.equal(gap.optimisticReplacements, 1);
  const state = fixture(); state.players[0].hand = original; state.drawnCard = 27; state.drawnFrom = "deck";
  assert.deepEqual(explainReferenceDecision(observeForBot(state, "p0"), { policy: "repair" }).action,
    { type: "swap", slot: 3, declareRacko: false });
});

test("reference bots finish immediately when legally possible, including after a swap", async () => {
  const state = fixture(); state.players[0].hand = [3, 8, 13, 19, 25, 26, 27, 46, 48, 50].reverse();
  const bot = createReferenceBot({ policy: "repair" });
  assert.deepEqual(await bot.decide(observeForBot(state, "p0")), { type: "racko" });
  state.players[0].hand[4] = 41; state.drawnCard = 26; state.drawnFrom = "deck";
  assert.deepEqual(await bot.decide(observeForBot(state, "p0")), { type: "swap", slot: 4, declareRacko: true });
});

test("open-card obligation and inactive-turn protection", () => {
  const state = fixture(); state.drawnCard = 50; state.drawnFrom = "discard";
  for (const policy of ["easy", "repair"] as const) {
    const decision = explainReferenceDecision(observeForBot(state, "p0"), { policy });
    assert.equal(decision.action.type, "swap");
    assert.doesNotThrow(() => applyGameAction(state, "p0", decision.action));
    assert.throws(() => explainReferenceDecision(observeForBot(state, "p1"), { policy }), /Phase/);
  }
});

test("reference policies produce legal trajectories for every player count and run setting", () => {
  for (const count of [2, 3, 4] as const) {
    for (const requirement of [0, 3, 4] as DirectRunRequirement[]) {
      const input = fixture();
      input.players = Array.from({ length: count }, (_, i) => ({ ...input.players[0], id: `p${i}`, name: `p${i}` }));
      input.playerCount = count; input.currentRound = 1; input.directRunRequirement = requirement;
      let state = startRound(input, () => 0.37);
      const initialCards = [...state.deck, ...state.players.flatMap((p) => p.hand)].sort((a, b) => a - b);
      for (let step = 0; step < 120 && state.status === "playing"; step++) {
        const actor = state.players[state.turnIndex].id;
        const decision = explainReferenceDecision(observeForBot(state, actor), { policy: state.turnIndex % 2 ? "easy" : "repair" });
        state = applyGameAction(state, actor, decision.action, () => 0.37);
        const cards = [...state.deck, ...state.discard, ...state.players.flatMap((p) => p.hand),
          ...(state.drawnCard === null ? [] : [state.drawnCard])].sort((a, b) => a - b);
        assert.deepEqual(cards, initialCards);
      }
    }
  }
});
