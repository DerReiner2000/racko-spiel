import { baseScore, canDeclareRacko, deckSizeFor, longestRun } from "./game";
import type { DirectRunRequirement } from "./game";
import type { BotObservation } from "./bots";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
export interface OwnHandSummary {
  prefixCards: number;
  ascendingLinks: number;
  longestRun: number;
  requiredRunReady: boolean;
  simpleProgress: number;
  impossibleSlots: number;
  runExtensionCards: number[];
}

/** Deliberately local/simple for easy: no optimal target search or enemy model. */
export function summarizeOwnHand(hand: number[], maxCard: number, requirement: DirectRunRequirement): OwnHandSummary {
  const h = [...hand].reverse();
  const prefixCards = baseScore(hand) / 5;
  let ascendingLinks = 0, impossibleSlots = 0;
  for (let i = 0; i < 10; i++) {
    if (i && h[i] > h[i - 1]) ascendingLinks++;
    if (h[i] < i + 1 || h[i] > maxCard - 9 + i) impossibleSlots++;
  }
  const run = longestRun(hand);
  const extensions = new Set<number>();
  if (requirement && run < requirement) {
    for (let first = 0; first < 9; first++) {
      let last = first;
      while (last < 9 && h[last + 1] === h[last] + 1) last++;
      if (last === first) continue;
      if (first > 0) {
        const value = h[first] - 1;
        if (value >= first && value <= maxCard - 10 + first && !hand.includes(value)
          && (first < 2 || h[first - 2] < value)) extensions.add(value);
      }
      if (last < 9) {
        const value = h[last] + 1;
        if (value >= last + 2 && value <= maxCard - 8 + last && !hand.includes(value)
          && (last > 7 || value < h[last + 2])) extensions.add(value);
      }
    }
  }
  return { prefixCards, ascendingLinks, longestRun: run, impossibleSlots,
    requiredRunReady: requirement === 0 || run >= requirement,
    simpleProgress: clamp((0.65 * ascendingLinks / 9 + 0.35 * prefixCards / 10)
      * (requirement ? 0.7 + 0.3 * Math.min(1, run / requirement) : 1)),
    runExtensionCards: [...extensions].sort((a, b) => a - b) };
}

export interface RoundSituation {
  ownProgress: number;
  roundAge: number;
  pressure: number;
  phase: "early" | "building" | "closing";
  elapsedOwnTurns: number | null;
  source: "public-turn-count" | "stock-only-proxy";
  requiredRunReady: boolean;
  reshuffleNear: boolean;
}

/** A bounded urgency heuristic, NOT an estimate of an opponent's win chance.
 * A good initial hand contributes much less than actual elapsed time. */
export function assessRoundSituation(observation: BotObservation, ownProgress: number): RoundSituation {
  const n = observation.playerCount;
  const initialDeck = deckSizeFor(n) - n * 10;
  const history = observation.roundProgress;
  const knownTurns = history?.historyComplete && history.completedTurns !== null ? history.completedTurns : null;
  const elapsed = knownTurns === null ? null : knownTurns / n;
  const stockDepletion = clamp((initialDeck - observation.deckCount) / initialDeck);
  const roundAge = elapsed === null ? stockDepletion * 0.65 : clamp(elapsed / 22);
  const pressure = clamp(0.68 * roundAge + 0.18 * clamp(ownProgress) + 0.07 * (n - 2));
  return { ownProgress: clamp(ownProgress), roundAge, pressure,
    phase: pressure >= 0.58 ? "closing" : pressure >= 0.27 ? "building" : "early",
    elapsedOwnTurns: history?.completedOwnTurns ?? null,
    source: elapsed === null ? "stock-only-proxy" : "public-turn-count",
    requiredRunReady: observation.directRunRequirement === 0 || longestRun(observation.hand) >= observation.directRunRequirement,
    reshuffleNear: observation.deckCount <= n * 2 };
}

export interface FinishCard { card: number; slots: number[] }
/** Exact structural one-exchange finishes. No claim the card is in the deck. */
export function enumerateFinishCards(hand: number[], maxCard: number, requirement: DirectRunRequirement): FinishCard[] {
  const result: FinishCard[] = [];
  for (let card = 1; card <= maxCard; card++) {
    if (hand.includes(card)) continue;
    const slots: number[] = [];
    for (let slot = 0; slot < 10; slot++) {
      if (canDeclareRacko(hand.map((value, i) => i === slot ? card : value), requirement)) slots.push(slot);
    }
    if (slots.length) result.push({ card, slots });
  }
  return result;
}

/** Exact remembered discard locations only. Never infer cards in enemy hands. */
export function knownBuriedCards(observation: BotObservation): Set<number> {
  if (observation.settings.difficulty === "easy" || !observation.roundProgress?.historyComplete) return new Set();
  let stack: number[] = [];
  for (const event of observation.events) {
    if (event.type === "swap") stack.push(event.discardedCard);
    else if (event.type === "discard") stack.push(event.card);
    else if (event.type === "reshuffle") stack = stack.length ? [stack[stack.length - 1]] : [];
    else if (event.type === "draw" && event.source === "discard") {
      if (stack.at(-1) !== event.card) return new Set(); // Partial/inconsistent history: no certainty.
      stack.pop();
    }
  }
  if ((stack.at(-1) ?? null) !== observation.topDiscard) return new Set();
  return new Set(stack.slice(0, -1));
}
