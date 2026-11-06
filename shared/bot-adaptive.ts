import { baseScore, canDeclareRacko, deckSizeFor, longestRun } from "./game";
import type { BotObservation, BotStrategy } from "./bots";
import type { ReferenceDecision } from "./bot-reference";
import { analyzeTargetSpace, createPlanningBot } from "./bot-planner";
import type { PlanningState, TargetSpace } from "./bot-planner";
import { assessRoundSituation, enumerateFinishCards, knownBuriedCards, summarizeOwnHand } from "./bot-situation";
import type { FinishCard, OwnHandSummary, RoundSituation } from "./bot-situation";

export const ADAPTIVE_POLICY_VERSION = "situational-v1";
export const ADAPTIVE_WEIGHTS = Object.freeze({
  easy: Object.freeze({ band: 1, neighbor: 1.5, prefix: 0.02, latePrefix: 0.18, run: 1.25,
    runReady: 1, extensions: 0.1, impossible: 0.5 }),
  medium: Object.freeze({ kept: 20, flexibility: 2, prefix: 0.4, latePrefix: 0.3,
    finishAlternatives: 0.25, blockedFinish: 2, lateBlockedFinish: 4, runReady: 0.25,
    flexibilityPressureReduction: 0.1 }),
});
export type ActiveBotLevel = "easy" | "medium";
export interface AvailableFinishCard extends FinishCard {
  availability: "open-now" | "unknown" | "buried" | "just-discarded";
}
export interface AdaptiveDecision extends ReferenceDecision {
  situation: RoundSituation;
  finishCards?: AvailableFinishCard[];
  resultingFinishCards?: AvailableFinishCard[];
}
interface HandFeatures { summary: OwnHandSummary; space?: TargetSpace; finishes?: FinishCard[] }

function classifyFinishes(finishes: FinishCard[], observation: BotObservation, buried: Set<number>, outgoing?: number): AvailableFinishCard[] {
  return finishes.map((entry) => ({ card: entry.card, slots: [...entry.slots], availability:
    entry.card === outgoing ? "just-discarded" : buried.has(entry.card) ? "buried"
      : entry.card === observation.topDiscard ? "open-now" : "unknown" }));
}

export interface AdaptiveBot extends BotStrategy {
  explain(observation: BotObservation): AdaptiveDecision;
  getPlanningState(): PlanningState | null;
}

/** Easy uses only the current own hand/offer plus aggregate time. Medium adds
 * own target space and remembered discard locations, never an opponent model. */
export function createAdaptiveBot(level: ActiveBotLevel): AdaptiveBot {
  if (level !== "easy" && level !== "medium") throw new Error("Unbekannte aktive Bot-Stufe.");
  const planner = level === "medium" ? createPlanningBot() : null;
  const cache = new Map<string, HandFeatures>();
  let roundKey = "";
  const prepare = (observation: BotObservation) => {
    const key = `${observation.roundId}/${observation.playerId}`;
    if (key !== roundKey) { cache.clear(); roundKey = key; }
    planner?.prepare?.(observation);
  };
  const features = (hand: number[], observation: BotObservation): HandFeatures => {
    const maxCard = deckSizeFor(observation.playerCount);
    const key = `${maxCard}/${observation.directRunRequirement}/${hand.join(",")}`;
    const cached = cache.get(key);
    if (cached) return cached;
    const value: HandFeatures = { summary: summarizeOwnHand(hand, maxCard, observation.directRunRequirement) };
    if (level === "medium") {
      value.space = analyzeTargetSpace(hand, maxCard, observation.directRunRequirement);
      if (value.space.keptCards === 9) value.finishes = enumerateFinishCards(hand, maxCard, observation.directRunRequirement);
    }
    if (cache.size >= 256) cache.clear();
    cache.set(key, value);
    return value;
  };
  const explain = (observation: BotObservation): AdaptiveDecision => {
    if (!observation.isMyTurn || observation.phase === "inactive" || observation.phase === "blocked") throw new Error("Bot darf in dieser Phase nicht handeln.");
    if (observation.settings.considerMatchScore) throw new Error("Gesamtwertungs-Optimierung ist noch nicht implementiert.");
    prepare(observation);
    const maxCard = deckSizeFor(observation.playerCount);
    const current = features(observation.hand, observation);
    const progress = level === "medium" ? Math.max(0, (current.space!.keptCards - 3) / 7) : current.summary.simpleProgress;
    const situation = assessRoundSituation(observation, progress);
    // Easy must not even inspect the public event log passed by a custom caller.
    const buried = level === "medium" ? knownBuriedCards(observation) : new Set<number>();
    const finishes = (value: HandFeatures, outgoing?: number) => classifyFinishes(value.finishes ?? [], observation, buried, outgoing);
    const score = (hand: number[], value: HandFeatures, outgoing?: number) => {
      const summary = value.summary;
      if (level === "easy") {
        const w = ADAPTIVE_WEIGHTS.easy;
        const h = [...hand].reverse();
        let bandCost = 0;
        for (let i = 0; i < 10; i++) bandCost += Math.abs(h[i] - (i + 0.5) * maxCard / 10) / (maxCard / 10);
        const runValue = observation.directRunRequirement ? summary.longestRun : 0;
        return -w.band * bandCost + w.neighbor * summary.ascendingLinks
          + (w.prefix + w.latePrefix * situation.pressure) * summary.prefixCards
          - w.impossible * summary.impossibleSlots
          + w.run * runValue + (observation.directRunRequirement && summary.requiredRunReady ? w.runReady : 0)
          + w.extensions * Math.min(2, summary.runExtensionCards.length);
      }
      const w = ADAPTIVE_WEIGHTS.medium;
      const cards = finishes(value, outgoing);
      const usable = cards.filter((c) => c.availability === "open-now" || c.availability === "unknown").length;
      const blocked = cards.length > 0 && usable === 0;
      return w.kept * value.space!.keptCards + w.flexibility * (1 - w.flexibilityPressureReduction * situation.pressure) * value.space!.flexibility
        + (w.prefix + w.latePrefix * situation.pressure) * summary.prefixCards
        + (observation.directRunRequirement && summary.requiredRunReady ? w.runReady : 0)
        + w.finishAlternatives * Math.log1p(usable)
        - (blocked ? (w.blockedFinish + w.lateBlockedFinish * situation.pressure) * (situation.reshuffleNear ? 0.35 : 1) : 0);
    };
    const currentScore = score(observation.hand, current);
    const diagnostics = { situation, ...(level === "medium" ? { finishCards: finishes(current) } : {}) };
    if (observation.drawnCard === null && canDeclareRacko(observation.hand, observation.directRunRequirement)) {
      return { action: { type: "racko" }, reason: "declare-now", score: currentScore, ...diagnostics };
    }
    const card = observation.drawnCard ?? observation.topDiscard;
    let best: { slot: number; score: number; wins: boolean; value: HandFeatures; outgoing: number } | null = null;
    if (card !== null) for (let slot = 0; slot < 10; slot++) {
      const hand = observation.hand.map((value, i) => i === slot ? card : value);
      const wins = canDeclareRacko(hand, observation.directRunRequirement);
      const value = features(hand, observation);
      const candidateScore = score(hand, value, observation.hand[slot]);
      if (!best || (wins && !best.wins) || (wins === best.wins && candidateScore > best.score + 1e-9)) {
        best = { slot, score: candidateScore, wins, value, outgoing: observation.hand[slot] };
      }
    }
    if (observation.drawnCard === null) {
      const take = best && (best.wins || best.score > currentScore + 1e-9);
      return { action: { type: "draw", source: take ? "discard" : "deck" }, reason: take ? "take-open" : "draw-hidden",
        score: best?.score ?? currentScore, ...diagnostics };
    }
    if (best && (best.wins || best.score > currentScore + 1e-9 || observation.drawnFrom === "discard")) {
      return { action: { type: "swap", slot: best.slot, declareRacko: best.wins }, score: best.score,
        reason: best.wins ? "winning-swap" : best.score > currentScore + 1e-9 ? "improve-hand" : "forced-open-swap",
        ...diagnostics, ...(level === "medium" ? { resultingFinishCards: finishes(best.value, best.outgoing) } : {}) };
    }
    return { action: { type: "discard" }, reason: "reject-card", score: currentScore, ...diagnostics };
  };
  return { id: `${level}-${ADAPTIVE_POLICY_VERSION}`, prepare, explain,
    decide: (observation) => explain(observation).action,
    getPlanningState: () => planner?.getPlanningState() ?? null };
}
