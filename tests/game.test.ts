import assert from "node:assert/strict";
import test from "node:test";
import {
  applyGameAction, baseScore, bonusForRun, canDeclareRacko, deckSizeFor,
  GameRuleError, isRacko, longestRun, startRound,
} from "../lib/game";
import type { GameState as OnlineGameState, PlayerName } from "../lib/types";
import * as local from "../racko-offline-app/src/game/engine";
import reference from "./fixtures/online-reference.json";

type State = OnlineGameState & local.GameState;

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function withSeed<T>(seed: number, action: () => T): T {
  const original = Math.random;
  Math.random = seeded(seed);
  try { return action(); } finally { Math.random = original; }
}

function game(playerCount: 2 | 3 | 4 = 2): State {
  const names: PlayerName[] = ["Max", "Tom", "Claudia", "Hannes"];
  return {
    version: 1, code: "TEST1", hostId: "p0", playerCount, totalRounds: 2,
    currentRound: 1, startingPlayerIndex: 0, directRunRequirement: 0, status: "playing",
    players: names.slice(0, playerCount).map((name, i) => ({
      id: `p${i}`, name, token: `test-token-${i}`, connectedAt: "2026-01-01T00:00:00Z",
      hand: [], roundScore: 0, totalScore: 0, rackos: 0,
    })),
    deck: [], discard: [], turnIndex: 0, drawnCard: null, drawnFrom: null,
    awaitingRacko: false, roundResults: [], extraRoundVotes: [], gameWinnerIds: [], message: "",
  };
}

function playing(playerCount: 2 | 3 | 4 = 2) {
  return startRound(game(playerCount), seeded(42));
}

function ordered() { return [40, 35, 30, 25, 20, 15, 10, 4, 3, 2]; }

function readyToWin(): State {
  const state = playing();
  state.players[0].hand = ordered();
  return state;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

for (const fixture of reference.deals) {
  test(`matches original online dealing: ${fixture.playerCount} players, round ${fixture.currentRound}`, () => {
    const input = game(fixture.playerCount as 2 | 3 | 4);
    input.currentRound = fixture.currentRound;
    input.startingPlayerIndex = fixture.startingPlayerIndex;
    const next = startRound(deepFreeze(input), seeded(fixture.seed));
    assert.deepEqual({
      deck: next.deck, hands: next.players.map((player) => player.hand),
      turnIndex: next.turnIndex, message: next.message,
    }, fixture.expected);
    assert.equal(next.discard.length, 0);
    assert.equal(next.drawnCard, null);
    assert.equal(next.status, "playing");
    assert.equal(next.players[0].token, input.players[0].token);
  });
}

for (const count of [2, 3, 4] as const) {
  test(`preserves every card and seat order for ${count} players`, () => {
    const next = playing(count);
    const cards = [...next.deck, ...next.players.flatMap((player) => player.hand)];
    assert.equal(cards.length, deckSizeFor(count));
    assert.equal(new Set(cards).size, cards.length);
    assert.deepEqual([...cards].sort((a, b) => a - b), Array.from({ length: deckSizeFor(count) }, (_, i) => i + 1));
    assert.ok(next.players.every((player) => player.hand.length === 10));
    assert.equal(next.deck.length, count === 4 ? 35 : 30);
  });
}

test("reads hands front to back, requires ten cards, and respects the optional run", () => {
  const hand = ordered();
  assert.equal(isRacko(hand), true);
  assert.equal(isRacko([...hand].reverse()), false);
  assert.equal(isRacko(hand.slice(1)), false);
  assert.equal(isRacko([]), false);
  assert.equal(canDeclareRacko(hand, 0), true);
  assert.equal(canDeclareRacko(hand, 3), true);
  assert.equal(canDeclareRacko(hand, 4), false);
  assert.equal(longestRun(hand), 3);
  assert.deepEqual(hand, ordered());
});

test("scores only the ascending prefix and uses the original bonus table", () => {
  assert.equal(baseScore([]), 0);
  assert.equal(baseScore([2, 7, 5, 1]), 15);
  assert.equal(baseScore(ordered()), 50);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(bonusForRun), [0, 0, 0, 50, 100, 200, 400, 400]);
});

test("awards winner points and sequence bonus only to the round winner", () => {
  const state = readyToWin();
  state.players[0].totalScore = 10;
  state.players[1].totalScore = 20;
  state.players[1].hand = [30, 25, 10, 20, 6, 5, 4, 3, 2, 1];
  const next = applyGameAction(deepFreeze(state), "p0", { type: "racko" });
  assert.equal(next.status, "round_end");
  assert.deepEqual(next.roundResults.map(({ basePoints, winnerPoints, bonusPoints, total }) => ({ basePoints, winnerPoints, bonusPoints, total })), [
    { basePoints: 50, winnerPoints: 25, bonusPoints: 50, total: 125 },
    { basePoints: 35, winnerPoints: 0, bonusPoints: 0, total: 35 },
  ]);
  assert.deepEqual(next.players.map((p) => [p.roundScore, p.totalScore, p.rackos]), [[125, 135, 1], [35, 55, 0]]);
});

test("draws exactly the last deck card and does not change the turn", () => {
  const state = playing();
  const expected = state.deck.at(-1);
  const next = applyGameAction(deepFreeze(state), "p0", { type: "draw", source: "deck" });
  assert.equal(next.drawnCard, expected);
  assert.equal(next.drawnFrom, "deck");
  assert.equal(next.deck.length, state.deck.length - 1);
  assert.equal(next.turnIndex, 0);
  assert.equal(next.message, "Max hat verdeckt gezogen.");
  assert.throws(() => applyGameAction(next, "p0", { type: "draw", source: "deck" }), GameRuleError);
});

test("rejects unknown participants and actions outside the current turn", () => {
  const state = playing();
  for (const player of ["p1", "missing"]) {
    assert.throws(() => applyGameAction(state, player, { type: "draw", source: "deck" }), GameRuleError);
    assert.throws(() => applyGameAction(state, player, { type: "racko" }), GameRuleError);
  }
  state.awaitingRacko = true;
  assert.throws(() => applyGameAction(state, "p0", { type: "draw", source: "deck" }), GameRuleError);
});

test("may discard a hidden draw, advancing to the next player", () => {
  const drawn = local.drawCard(playing(), "deck");
  const next = local.discardDrawnCard(deepFreeze(drawn));
  assert.equal(next.turnIndex, 1);
  assert.equal(next.discard.at(-1), drawn.drawnCard);
  assert.equal(next.drawnCard, null);
  assert.equal(next.drawnFrom, null);
});

test("an open draw must be swapped and cannot be discarded unused", () => {
  const state = playing();
  state.discard = [11, 12];
  const drawn = local.drawCard(deepFreeze(state), "discard");
  assert.equal(drawn.drawnCard, 12);
  assert.deepEqual(drawn.discard, [11]);
  assert.throws(() => local.discardDrawnCard(drawn), GameRuleError);
  const old = drawn.players[0].hand[4];
  const next = local.swapCard(drawn, 4, false);
  assert.equal(next.players[0].hand[4], 12);
  assert.equal(next.discard.at(-1), old);
  assert.equal(next.turnIndex, 1);
});

test("recycles the discard pile while keeping its top card visible", () => {
  const state = playing();
  state.deck = [];
  state.discard = [11, 12, 13, 14];
  const next = applyGameAction(deepFreeze(state), "p0", { type: "draw", source: "deck" }, seeded(17));
  assert.deepEqual(next.discard, [14]);
  assert.deepEqual([...next.deck, next.drawnCard!].sort((a, b) => a - b), [11, 12, 13]);
});

test("rejects empty piles without corrupting the current game", () => {
  for (const discard of [[], [11]]) {
    const state = playing();
    state.deck = [];
    state.discard = discard;
    const frozen = deepFreeze(state);
    assert.throws(() => local.drawCard(frozen, "deck"), /keine Karten mehr/);
    assert.equal(frozen.drawnCard, null);
  }
  assert.throws(() => local.drawCard(playing(), "discard"), /Ablagestapel ist leer/);
});

test("rejects invalid slots and Rack'o calls without consuming the drawn card", () => {
  const state = deepFreeze(local.drawCard(playing(), "deck"));
  for (const slot of [-1, 10, 1.5, NaN]) assert.throws(() => local.swapCard(state, slot, false), GameRuleError);
  assert.throws(() => local.swapCard(state, 0, true), GameRuleError);
  assert.notEqual(state.drawnCard, null);
  assert.equal(state.turnIndex, 0);
  assert.throws(() => local.declareRacko(state), /vor dem Ziehen/);
});

test("finishing a hand offers the same explicit Rack'o or continue choice", () => {
  const state = readyToWin();
  state.players[0].hand[0] = 1;
  state.drawnCard = 40;
  state.drawnFrom = "deck";
  const frozen = deepFreeze(state);
  const continued = local.swapCard(frozen, 0, false);
  assert.equal(continued.status, "playing");
  assert.equal(continued.turnIndex, 1);
  assert.equal(continued.players[0].totalScore, 0);
  const won = local.swapCard(frozen, 0, true);
  assert.equal(won.status, "round_end");
  assert.equal(won.players[0].totalScore, 125);
});

test("enforces sequence requirements both before drawing and after swapping", () => {
  const state = readyToWin();
  state.directRunRequirement = 4;
  assert.throws(() => local.declareRacko(state), /4 Karten/);
  state.players[0].hand[0] = 1;
  state.drawnCard = 40;
  state.drawnFrom = "deck";
  assert.throws(() => local.swapCard(state, 0, true), /4 Karten/);
  state.directRunRequirement = 3;
  assert.equal(local.swapCard(state, 0, true).status, "round_end");
});

test("round transitions preserve totals and rotate the starter, not the winner", () => {
  const state = readyToWin();
  state.startingPlayerIndex = 1;
  const ended = local.declareRacko(state);
  const next = local.continueGame(deepFreeze(ended));
  assert.equal(next.currentRound, 2);
  assert.equal(next.totalRounds, 2);
  assert.equal(next.turnIndex, 0);
  assert.equal(next.players[0].totalScore, 125);
  assert.equal(next.players[0].roundScore, 0);
  assert.deepEqual(next.roundResults, []);
  assert.deepEqual(next.extraRoundVotes, []);
  assert.throws(() => local.continueGame(playing()), GameRuleError);
  assert.throws(() => local.finishGame(ended), GameRuleError);
});

test("online extra rounds require every distinct player's vote", () => {
  const state = local.declareRacko(readyToWin());
  state.totalRounds = 1;
  assert.throws(() => applyGameAction(state, "p0", { type: "nextRound" }), /alle Spieler zustimmen/);
  const first = applyGameAction(state, "p0", { type: "voteExtraRound" });
  const repeated = applyGameAction(first, "p0", { type: "voteExtraRound" });
  assert.equal(repeated.status, "round_end");
  assert.deepEqual(repeated.extraRoundVotes, ["p0"]);
  const next = applyGameAction(repeated, "p1", { type: "voteExtraRound" });
  assert.equal(next.status, "playing");
  assert.equal(next.currentRound, 2);
  assert.equal(next.totalRounds, 2);
  assert.deepEqual(next.extraRoundVotes, []);
});

test("the local extra-round button represents agreement on the shared device", () => {
  const state = local.declareRacko(readyToWin());
  state.totalRounds = 1;
  const next = local.continueGame(state);
  assert.equal(next.status, "playing");
  assert.equal(next.currentRound, 2);
  assert.equal(next.totalRounds, 2);
});

test("allows tied match winners and prevents continuing a finished game", () => {
  const state = local.declareRacko(readyToWin());
  state.totalRounds = 1;
  state.players[1].totalScore = state.players[0].totalScore;
  state.extraRoundVotes = ["p1"];
  const next = local.finishGame(deepFreeze(state));
  assert.deepEqual(next.gameWinnerIds, ["p0", "p1"]);
  assert.deepEqual(next.extraRoundVotes, []);
  assert.equal(next.status, "finished");
  assert.throws(() => local.continueGame(next), GameRuleError);
  assert.throws(() => local.finishGame(next), GameRuleError);
  assert.throws(() => local.drawCard(next, "deck"), GameRuleError);
});

test("existing local v1 saves resume without online identity or newly optional fields", () => {
  const state = readyToWin();
  const { code, hostId, awaitingRacko, extraRoundVotes, ...saved } = state;
  void code; void hostId; void awaitingRacko; void extraRoundVotes;
  const old = JSON.parse(JSON.stringify({ ...saved, players: saved.players.map(({ token, connectedAt, ...player }) => {
    void token; void connectedAt;
    return player;
  }) })) as local.GameState;
  assert.equal(old.version, 1);
  const drawn = local.drawCard(old, "deck");
  assert.notEqual(drawn.drawnCard, null);
  const ended = local.declareRacko(old);
  assert.equal(ended.players[0].totalScore, 125);
  assert.equal(local.continueGame(ended).currentRound, 2);
});

for (const count of [2, 3, 4] as const) {
  for (const requirement of [0, 3, 4] as const) {
    test(`online/local parity across 160 turns: ${count} players, requirement ${requirement}`, () => {
      let online = playing(count);
      online.directRunRequirement = requirement;
      let offline: local.GameState = structuredClone(online);
      const choose = seeded(count * 17 + requirement);
      for (let turn = 0; turn < 160; turn++) {
        const playerId = online.players[online.turnIndex].id;
        const source = online.discard.length && choose() < 0.3 ? "discard" : "deck";
        online = withSeed(turn, () => applyGameAction(deepFreeze(online), playerId, { type: "draw", source }));
        offline = withSeed(turn, () => local.drawCard(deepFreeze(offline), source));
        assert.deepEqual(offline, online);
        if (source === "deck" && choose() < 0.2) {
          online = applyGameAction(online, playerId, { type: "discard" });
          offline = local.discardDrawnCard(offline);
        } else {
          const slot = Math.floor(choose() * 10);
          online = applyGameAction(online, playerId, { type: "swap", slot, declareRacko: false });
          offline = local.swapCard(offline, slot, false);
        }
        assert.deepEqual(offline, online);
        const allCards = [...online.deck, ...online.discard, ...online.players.flatMap((player) => player.hand)];
        assert.equal(allCards.length, deckSizeFor(count));
        assert.equal(new Set(allCards).size, allCards.length);
      }
    });
  }
}
