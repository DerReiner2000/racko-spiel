import { baseScore, canDeclareRacko, deckSizeFor } from "./game";
import type { DirectRunRequirement } from "./game";
import type { BotObservation, BotStrategy } from "./bots";
import type { ReferenceDecision } from "./bot-reference";

export const PLANNING_POLICY_VERSION = "planning-v1";
export const PLANNING_WEIGHTS = Object.freeze({ keptCards: 20, flexibility: 2, prefixCard: 0.4 });

export interface TargetSpace {
  keptCards: number;
  /** Count of equally good hypothetical target hands, NOT a win probability. */
  completionCount: number;
  flexibility: number;
}
export interface RackPlan extends TargetSpace {
  schemaVersion: 1;
  handOrder: "back-to-front";
  sourceHand: number[];
  targetHand: number[];
  anchors: { slot: number; value: number }[];
  replaceSlots: number[];
  slotRanges: { slot: number; min: number; max: number; role: "anchor" | "run-target" | "replace" }[];
  run: null | { slots: number[]; values: number[] };
  optimisticReplacements: number;
}

/** Maximum retained cards AND number of optimal sorted targets, with a required
 * consecutive run. Each target is counted once, even if it has several runs.
 * State R means 'run already achieved'; lower states record current run length.
 * No deck, draw card, opponent information or public history is accepted here. */
function solveTargets(hand: number[], maxCard: number, requirement: DirectRunRequirement, witness: boolean): TargetSpace & { targetHand?: number[] } {
  if (hand.length !== 10 || maxCard < 10 || maxCard > 75 || !Number.isInteger(maxCard)
    || new Set(hand).size !== 10 || hand.some((v) => !Number.isInteger(v) || v < 1 || v > maxCard)
    || ![0, 3, 4].includes(requirement)) throw new Error("Ungültige Planungshand.");
  const h = [...hand].reverse();
  const cap = requirement || 1;
  const width = maxCard + 1;
  const size = (cap + 1) * width;
  let scores = new Int16Array(size).fill(-1000);
  let ways = new Float64Array(size);
  let costs = new Float64Array(size).fill(Infinity);
  const parents: Int16Array[] = [];
  const cost = (position: number, value: number) => ((value - (position + 1) * (maxCard + 1) / 11) / maxCard) ** 2;
  for (let value = 1; value <= maxCard - 9; value++) {
    const index = width + value;
    scores[index] = +(h[0] === value); ways[index] = 1;
    if (witness) costs[index] = cost(0, value);
  }
  if (witness) parents.push(new Int16Array(size).fill(-1));
  for (let position = 1; position < 10; position++) {
    const nextScores = new Int16Array(size).fill(-1000);
    const nextWays = new Float64Array(size);
    const nextCosts = new Float64Array(size).fill(Infinity);
    const parent = witness ? new Int16Array(size).fill(-1) : null;
    const gapScores = new Int16Array(cap + 1).fill(-1000);
    const gapWays = new Float64Array(cap + 1);
    const gapCosts = new Float64Array(cap + 1).fill(Infinity);
    const gapIndices = new Int16Array(cap + 1).fill(-1);
    const put = (state: number, value: number, kept: number, count: number, priorIndex: number, priorCost: number) => {
      if (!count) return;
      const index = state * width + value;
      const score = kept + +(h[position] === value);
      const tieCost = witness ? priorCost + cost(position, value) : 0;
      if (score > nextScores[index]) {
        nextScores[index] = score; nextWays[index] = count;
        if (witness) { nextCosts[index] = tieCost; parent![index] = priorIndex; }
      } else if (score === nextScores[index]) {
        nextWays[index] += count;
        if (witness && tieCost < nextCosts[index]) { nextCosts[index] = tieCost; parent![index] = priorIndex; }
      }
    };
    for (let value = 1; value <= maxCard - (9 - position); value++) {
      for (let state = 1; state <= cap; state++) {
        const older = state * width + value - 2;
        if (value > 2 && ways[older]) {
          if (scores[older] > gapScores[state]) {
            gapScores[state] = scores[older]; gapWays[state] = ways[older];
            if (witness) { gapCosts[state] = costs[older]; gapIndices[state] = older; }
          } else if (scores[older] === gapScores[state]) {
            gapWays[state] += ways[older];
            if (witness && costs[older] < gapCosts[state]) { gapCosts[state] = costs[older]; gapIndices[state] = older; }
          }
        }
        put(state === cap ? cap : 1, value, gapScores[state], gapWays[state], gapIndices[state], gapCosts[state]);
        const adjacent = state * width + value - 1;
        if (value > 1) put(Math.min(cap, state + 1), value, scores[adjacent], ways[adjacent], adjacent, costs[adjacent]);
      }
    }
    scores = nextScores; ways = nextWays; costs = nextCosts;
    if (witness) parents.push(parent!);
  }
  let keptCards = -1, completionCount = 0, representative = -1, bestCost = Infinity;
  for (let value = 1; value <= maxCard; value++) {
    const index = cap * width + value;
    if (!ways[index]) continue;
    if (scores[index] > keptCards) {
      keptCards = scores[index]; completionCount = ways[index]; representative = index; bestCost = costs[index];
    } else if (scores[index] === keptCards) {
      completionCount += ways[index];
      if (witness && costs[index] < bestCost) { representative = index; bestCost = costs[index]; }
    }
  }
  if (!Number.isSafeInteger(completionCount) || completionCount < 1) throw new Error("Ungültiger Zielraum.");
  const result: TargetSpace & { targetHand?: number[] } = {
    keptCards, completionCount, flexibility: Math.log(completionCount) / Math.max(1, 10 - keptCards),
  };
  if (witness) {
    const target = new Array<number>(10);
    for (let position = 9; position >= 0; position--) {
      target[position] = representative % width;
      representative = parents[position][representative];
    }
    result.targetHand = target.reverse();
  }
  return result;
}

export function analyzeTargetSpace(hand: number[], maxCard: number, requirement: DirectRunRequirement): TargetSpace {
  return solveTargets(hand, maxCard, requirement, false);
}

/** A representative plan, not a locked exact wish list. Ranges describe one
 * anchor/run arrangement; completionCount includes alternative optimal plans. */
export function buildRackPlan(hand: number[], maxCard: number, requirement: DirectRunRequirement): RackPlan {
  const solution = solveTargets(hand, maxCard, requirement, true);
  const targetHand = solution.targetHand!;
  const h = [...hand].reverse(), target = [...targetHand].reverse();
  const anchors = hand.flatMap((value, slot) => value === targetHand[slot] ? [{ slot, value }] : []);
  const replaceSlots = hand.flatMap((value, slot) => value !== targetHand[slot] ? [slot] : []);
  let run: RackPlan["run"] = null;
  if (requirement) {
    for (let first = 0; first <= 10 - requirement; first++) {
      if (Array.from({ length: requirement }, (_, k) => target[first + k] === target[first] + k).every(Boolean)) {
        run = { slots: Array.from({ length: requirement }, (_, k) => 9 - first - k),
          values: Array.from({ length: requirement }, (_, k) => target[first + k]) }; break;
      }
    }
  }
  const fixed = new Map<number, number>([[-1, 0], [10, maxCard + 1]]);
  anchors.forEach(({ slot, value }) => fixed.set(9 - slot, value));
  run?.slots.forEach((slot, i) => fixed.set(9 - slot, run!.values[i]));
  const slotRanges = h.map<RackPlan["slotRanges"][number]>((value, position) => {
    const slot = 9 - position;
    if (value === target[position]) return { slot, min: value, max: value, role: "anchor" };
    if (fixed.has(position)) return { slot, min: fixed.get(position)!, max: fixed.get(position)!, role: "run-target" };
    let left = position - 1, right = position + 1;
    while (!fixed.has(left)) left--;
    while (!fixed.has(right)) right++;
    return { slot, min: fixed.get(left)! + position - left, max: fixed.get(right)! - right + position, role: "replace" };
  }).reverse();
  return { schemaVersion: 1, handOrder: "back-to-front", sourceHand: [...hand], targetHand,
    anchors, replaceSlots, slotRanges, run, keptCards: solution.keptCards,
    completionCount: solution.completionCount, flexibility: solution.flexibility,
    optimisticReplacements: 10 - solution.keptCards };
}

function planningScore(hand: number[], observation: BotObservation): number {
  const analysis = analyzeTargetSpace(hand, deckSizeFor(observation.playerCount), observation.directRunRequirement);
  return PLANNING_WEIGHTS.keptCards * analysis.keptCards + PLANNING_WEIGHTS.flexibility * analysis.flexibility
    + PLANNING_WEIGHTS.prefixCard * baseScore(hand) / 5;
}

export function explainPlanningDecision(observation: BotObservation): ReferenceDecision {
  if (!observation.isMyTurn || observation.phase === "blocked" || observation.phase === "inactive") throw new Error("Bot darf in dieser Phase nicht handeln.");
  if (observation.settings.considerMatchScore) throw new Error("Gesamtwertungs-Optimierung ist noch nicht implementiert.");
  const currentScore = planningScore(observation.hand, observation);
  if (observation.drawnCard === null && canDeclareRacko(observation.hand, observation.directRunRequirement)) {
    return { action: { type: "racko" }, reason: "declare-now", score: currentScore };
  }
  const card = observation.drawnCard ?? observation.topDiscard;
  let best: { slot: number; score: number; wins: boolean } | null = null;
  if (card !== null) for (let slot = 0; slot < 10; slot++) {
    const hand = observation.hand.map((value, i) => i === slot ? card : value);
    const wins = canDeclareRacko(hand, observation.directRunRequirement);
    const score = planningScore(hand, observation);
    if (!best || (wins && !best.wins) || (wins === best.wins && score > best.score + 1e-9)) best = { slot, score, wins };
  }
  if (observation.drawnCard === null) {
    const take = best && (best.wins || best.score > currentScore + 1e-9);
    return { action: { type: "draw", source: take ? "discard" : "deck" }, reason: take ? "take-open" : "draw-hidden", score: best?.score ?? currentScore };
  }
  if (best && (best.wins || best.score > currentScore + 1e-9 || observation.drawnFrom === "discard")) {
    return { action: { type: "swap", slot: best.slot, declareRacko: best.wins }, score: best.score,
      reason: best.wins ? "winning-swap" : best.score > currentScore + 1e-9 ? "improve-hand" : "forced-open-swap" };
  }
  return { action: { type: "discard" }, reason: "reject-card", score: currentScore };
}

export interface PlanningState { roundId: string; playerId: string; initialPlan: RackPlan; currentPlan: RackPlan; replans: number }
export interface PlanningBot extends BotStrategy {
  getPlanningState(): PlanningState | null;
  explain(observation: BotObservation): ReferenceDecision;
}

/** Preparation ignores draw card, open offer, opponents and match context.
 * Rebuilt on hand/rule/round changes; no hard locks that could freeze bad anchors. */
export function createPlanningBot(): PlanningBot {
  let state: PlanningState | null = null;
  let fingerprint = "";
  const prepare = (observation: BotObservation) => {
    const key = JSON.stringify([observation.roundId, observation.playerId, observation.playerCount,
      observation.directRunRequirement, observation.hand]);
    if (key === fingerprint) return;
    const plan = buildRackPlan(observation.hand, deckSizeFor(observation.playerCount), observation.directRunRequirement);
    const sameRound = state?.roundId === observation.roundId && state.playerId === observation.playerId;
    state = { roundId: observation.roundId, playerId: observation.playerId,
      initialPlan: sameRound ? state!.initialPlan : plan, currentPlan: plan,
      replans: sameRound ? state!.replans + 1 : 0 };
    fingerprint = key;
  };
  const explain = (observation: BotObservation) => { prepare(observation); return explainPlanningDecision(observation); };
  return { id: PLANNING_POLICY_VERSION, prepare, explain,
    decide: (observation) => explain(observation).action,
    getPlanningState: () => state ? JSON.parse(JSON.stringify(state)) as PlanningState : null };
}
