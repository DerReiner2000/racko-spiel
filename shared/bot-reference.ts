import { baseScore, canDeclareRacko, deckSizeFor, longestRun } from "./game";
import type { DirectRunRequirement } from "./game";
import type { BotAction, BotObservation, BotStrategy } from "./bots";
import { resolveBotSettings } from "./bots";
import { createAdaptiveBot } from "./bot-adaptive";

export const REFERENCE_POLICY_VERSION = "reference-v1";
/** Initial, hand-chosen coefficients. Simulations assess them; no training claim. */
export const REFERENCE_WEIGHTS = Object.freeze({
  easy: Object.freeze({ orderedNeighbor: 1.5, run: 1.25 }),
  repair: Object.freeze({ keptWithRequiredRun: 20, prefixCard: 0.4, keptSorted: 0.2 }),
});
export interface ReferencePolicyOptions {
  policy: "easy" | "repair";
  /** Experimental preference, NOT a learned or validated card-value table. */
  centralPreference?: number;
}
export interface HandAnalysis {
  keptSorted: number;
  keptWithRequiredRun: number;
  optimisticReplacements: number;
  basePoints: number;
  longestRun: number;
}

/** Exact maximum matches with a hypothetical sorted target hand (with required
 * run). This is an optimistic structural bound: target cards may be unavailable.
 * Input and returned action slots use the engine's BACK-TO-FRONT array order. */
export function analyzeHand(hand: number[], maxCard: number, requirement: DirectRunRequirement): HandAnalysis {
  const h = [...hand].reverse();
  const n = h.length;
  const impossible = -1000;
  // prefix[t][v]: maximum matches in t filled slots, all values <= v.
  const prefix = Array.from({ length: n + 1 }, () => new Int16Array(maxCard + 2).fill(impossible));
  prefix[0].fill(0);
  for (let t = 1; t <= n; t++) {
    for (let v = 1; v <= maxCard; v++) {
      prefix[t][v] = Math.max(prefix[t][v - 1], prefix[t - 1][v - 1] + (h[t - 1] === v ? 1 : 0));
    }
  }
  const keptSorted = prefix[n][maxCard];
  let keptWithRequiredRun = keptSorted;
  if (requirement) {
    // suffix[t][v]: maximum matches in slots t..n-1, all values >= v.
    const suffix = Array.from({ length: n + 1 }, () => new Int16Array(maxCard + 2).fill(impossible));
    suffix[n].fill(0);
    for (let t = n - 1; t >= 0; t--) {
      for (let v = maxCard; v >= 1; v--) {
        suffix[t][v] = Math.max(suffix[t][v + 1], suffix[t + 1][v + 1] + (h[t] === v ? 1 : 0));
      }
    }
    keptWithRequiredRun = impossible;
    for (let slot = 0; slot <= n - requirement; slot++) {
      for (let first = slot + 1; first <= maxCard - n + slot + 1; first++) {
        let matches = 0;
        for (let k = 0; k < requirement; k++) matches += h[slot + k] === first + k ? 1 : 0;
        keptWithRequiredRun = Math.max(keptWithRequiredRun,
          prefix[slot][first - 1] + matches + suffix[slot + requirement][first + requirement]);
      }
    }
  }
  return { keptSorted, keptWithRequiredRun, optimisticReplacements: n - keptWithRequiredRun,
    basePoints: baseScore(hand), longestRun: longestRun(hand) };
}

function scoreHand(hand: number[], observation: BotObservation, options: ReferencePolicyOptions): number {
  const maxCard = deckSizeFor(observation.playerCount);
  const h = [...hand].reverse();
  if (options.policy === "easy") {
    let score = 0;
    for (let i = 0; i < h.length; i++) {
      score -= Math.abs(h[i] - (i + 0.5) * maxCard / 10) / (maxCard / 10);
      if (i && h[i] > h[i - 1]) score += REFERENCE_WEIGHTS.easy.orderedNeighbor;
    }
    return score + (observation.directRunRequirement ? longestRun(hand) * REFERENCE_WEIGHTS.easy.run : 0);
  }
  const analysis = analyzeHand(hand, maxCard, observation.directRunRequirement);
  const centrality = h.reduce((sum, value) => sum + 1 - Math.abs(2 * value / (maxCard + 1) - 1), 0);
  return REFERENCE_WEIGHTS.repair.keptWithRequiredRun * analysis.keptWithRequiredRun
    + REFERENCE_WEIGHTS.repair.prefixCard * analysis.basePoints / 5
    + REFERENCE_WEIGHTS.repair.keptSorted * analysis.keptSorted + (options.centralPreference ?? 0) * centrality;
}

export interface ReferenceDecision {
  action: BotAction;
  reason: "declare-now" | "winning-swap" | "improve-hand" | "forced-open-swap" | "reject-card" | "take-open" | "draw-hidden";
  score: number;
}

/** Stateless baselines. No opponent model and no match-score optimization yet. */
export function explainReferenceDecision(observation: BotObservation, options: ReferencePolicyOptions): ReferenceDecision {
  if (!observation.isMyTurn || observation.phase === "blocked" || observation.phase === "inactive") {
    throw new Error("Bot darf in dieser Phase nicht handeln.");
  }
  if (observation.settings.considerMatchScore) {
    throw new Error("Die Referenzstrategien unterstützen noch keine Gesamtwertungs-Optimierung.");
  }
  const currentScore = scoreHand(observation.hand, observation, options);
  if (observation.drawnCard === null && canDeclareRacko(observation.hand, observation.directRunRequirement)) {
    return { action: { type: "racko" }, reason: "declare-now", score: currentScore };
  }
  const card = observation.drawnCard ?? observation.topDiscard;
  let best: { slot: number; score: number; wins: boolean } | null = null;
  if (card !== null) {
    for (let slot = 0; slot < 10; slot++) {
      const hand = observation.hand.map((value, i) => i === slot ? card : value);
      const wins = canDeclareRacko(hand, observation.directRunRequirement);
      const score = scoreHand(hand, observation, options);
      if (!best || (wins && !best.wins) || (wins === best.wins && score > best.score + 1e-9)) best = { slot, score, wins };
    }
  }
  if (observation.drawnCard === null) {
    const takeOpen = best && (best.wins || best.score > currentScore + 1e-9);
    return { action: { type: "draw", source: takeOpen ? "discard" : "deck" },
      reason: takeOpen ? "take-open" : "draw-hidden", score: best?.score ?? currentScore };
  }
  if (best && (best.wins || best.score > currentScore + 1e-9 || observation.drawnFrom === "discard")) {
    return { action: { type: "swap", slot: best.slot, declareRacko: best.wins }, score: best.score,
      reason: best.wins ? "winning-swap" : best.score > currentScore + 1e-9 ? "improve-hand" : "forced-open-swap" };
  }
  return { action: { type: "discard" }, reason: "reject-card", score: currentScore };
}

export function createReferenceBot(options: ReferencePolicyOptions): BotStrategy {
  if (!["easy", "repair"].includes(options.policy)) throw new Error("Unbekannte Referenzstrategie.");
  if (!Number.isFinite(options.centralPreference ?? 0)) throw new Error("Ungültige Kartenpriorität.");
  const fixedOptions = { ...options };
  return {
    id: `${REFERENCE_POLICY_VERSION}:${options.policy}:center=${options.centralPreference ?? 0}`,
    decide: (observation) => explainReferenceDecision(observation, fixedOptions).action,
  };
}

/** Registration entry point retained for compatibility. Historical easy/repair
 * baselines remain separately available; active levels use situational logic. */
export function createConfiguredReferenceBot(settings: BotObservation["settings"]): BotStrategy {
  settings = resolveBotSettings(settings);
  if (settings.considerMatchScore) throw new Error("Gesamtwertungs-Optimierung ist noch nicht implementiert.");
  if (settings.difficulty === "hard" || settings.difficulty === "expert") {
    throw new Error("Schwer und Experte benötigen noch eigene Strategien und Kalibrierung.");
  }
  return createAdaptiveBot(settings.difficulty);
}
