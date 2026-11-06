import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { applyGameAction, canDeclareRacko, deckSizeFor, shuffle, startRound } from "../shared/game";
import type { CoreGameState, DirectRunRequirement } from "../shared/game";
import { observeForBot, publicEventsForAction } from "../shared/bots";
import type { BotPublicEvent } from "../shared/bots";
import { analyzeHand, explainReferenceDecision, REFERENCE_POLICY_VERSION, REFERENCE_WEIGHTS } from "../shared/bot-reference";
import type { ReferencePolicyOptions } from "../shared/bot-reference";
import { createPlanningBot, PLANNING_POLICY_VERSION, PLANNING_WEIGHTS } from "../shared/bot-planner";
import { createAdaptiveBot, ADAPTIVE_POLICY_VERSION, ADAPTIVE_WEIGHTS } from "../shared/bot-adaptive";

function seeded(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function integerOption(name: string, fallback: number, maximum: number) {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? fallback : Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > maximum) throw new Error(`Invalid ${name}`);
  return value;
}
const seeds = integerOption("--seeds", 20, 10000);
const seedOffset = integerOption("--seed-offset", 1, 10000000);
const maxTurns = integerOption("--max-turns", 240, 10000);
const outputIndex = process.argv.indexOf("--output");
const output = path.resolve(outputIndex < 0 ? "docs/bot-results/pilot" : process.argv[outputIndex + 1]);
type SimulationPolicy = ReferencePolicyOptions | { policy: "plan" } | { policy: "easy-v2" } | { policy: "medium-v2" };
const planningStudy = process.argv.includes("--planning");
const situationalStudy = process.argv.includes("--situational");
const opponentIndex = process.argv.indexOf("--opponent");
const opponent = opponentIndex < 0 ? "repair" : process.argv[opponentIndex + 1];
if (!["easy", "repair", "plan"].includes(opponent)) throw new Error("Opponent must be easy, repair or plan");
const policies: Record<string, SimulationPolicy> = situationalStudy ? {
  easy: { policy: "easy" }, repair: { policy: "repair" }, plan: { policy: "plan" },
  "easy-v2": { policy: "easy-v2" }, "medium-v2": { policy: "medium-v2" },
} : planningStudy ? {
  easy: { policy: "easy" }, repair: { policy: "repair" }, plan: { policy: "plan" },
} : {
  easy: { policy: "easy" }, repair: { policy: "repair" },
  "repair-center": { policy: "repair", centralPreference: 4 },
};
if (!policies[opponent]) throw new Error("Use --planning or --situational for plan opponents");
const sourceSha256 = Object.fromEntries(["shared/game.ts", "shared/bots.ts", "shared/bot-reference.ts", "shared/bot-planner.ts", "shared/bot-situation.ts", "shared/bot-adaptive.ts", "scripts/bot-simulation.ts"]
  .map((file) => [file, createHash("sha256").update(readFileSync(path.resolve(file))).digest("hex")]));
const roundIdFor = (key: string) => createHash("sha256").update(key).digest("hex").slice(0, 24);
type CardMetrics = { offered: number; taken: number; discarded: number };
type GameResult = { completed: boolean; won: boolean; points: number | null; turns: number };
type Cell = { players: number; requirement: number; policy: string; attempts: number; completed: number;
  censored: number; wins: number; points: number; turns: number; bySeed: Record<number, GameResult[]> };
const cells: Cell[] = [];
const cards: Record<string, CardMetrics[]> = {};
const traces: unknown[] = [];
const preparations: unknown[] = [];

function initialState(count: 2 | 3 | 4, requirement: DirectRunRequirement): CoreGameState {
  return { players: Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `Player ${i + 1}`,
    hand: [], roundScore: 0, totalScore: 0, rackos: 0 })), playerCount: count, directRunRequirement: requirement,
    totalRounds: 1, currentRound: 1, startingPlayerIndex: 0, status: "playing", deck: [], discard: [],
    turnIndex: 0, drawnCard: null, drawnFrom: null, roundResults: [], gameWinnerIds: [], message: "" };
}

function play(state: CoreGameState, focal: number, variant: string, random: () => number,
  metricKey: string | null, trace: boolean, roundId: string): GameResult {
  let turns = 0, revision = 0, traceActions = 0;
  const events: BotPublicEvent[] = [];
  const planners = state.players.map((_, seat) => {
    const policy = policies[seat === focal ? variant : opponent].policy;
    return policy === "plan" ? createPlanningBot() : policy === "easy-v2" ? createAdaptiveBot("easy")
      : policy === "medium-v2" ? createAdaptiveBot("medium") : null;
  });
  planners.forEach((planner, seat) => {
    if (!planner) return;
    planner.prepare!(observeForBot(state, state.players[seat].id, { roundId }));
    if (trace && planner.getPlanningState()) preparations.push({ variant, seat, planningState: planner.getPlanningState() });
  });
  while (state.status === "playing" && turns < maxTurns) {
    const actor = state.turnIndex;
    const options = policies[actor === focal ? variant : opponent];
    const observation = observeForBot(state, state.players[actor].id, {
      settings: { difficulty: options.policy === "easy" || options.policy === "easy-v2" ? "easy" : "medium" },
      roundId, revision, events,
    });
    const decision = options.policy === "plan" || options.policy === "easy-v2" || options.policy === "medium-v2"
      ? planners[actor]!.explain(observation) : explainReferenceDecision(observation, options);
    if (trace && (traceActions++ < 16 || decision.reason === "winning-swap" || decision.reason === "declare-now")) {
      traces.push({ policy: actor === focal ? variant : opponent, observation, decision,
        ...(planners[actor] ? { planningState: planners[actor]!.getPlanningState() } : {}) });
    }
    if (metricKey && actor === focal) {
      const metrics = cards[metricKey];
      if (decision.action.type === "draw" && observation.topDiscard !== null) {
        metrics[observation.topDiscard].offered++;
        if (decision.action.source === "discard") metrics[observation.topDiscard].taken++;
      }
      if (decision.action.type === "swap") metrics[state.players[actor].hand[decision.action.slot]].discarded++;
      if (decision.action.type === "discard") metrics[state.drawnCard!].discarded++;
    }
    const before = state;
    state = applyGameAction(state, state.players[actor].id, decision.action, random);
    revision++;
    events.push(...publicEventsForAction(before, decision.action, state, { roundId, revision }));
    if (decision.action.type !== "draw") turns++;
  }
  const result = state.roundResults.find((entry) => entry.playerId === state.players[focal].id);
  return { completed: state.status === "round_end", won: !!result?.winnerPoints,
    points: result?.total ?? null, turns };
}

for (const count of [2, 3, 4] as const) {
  for (const requirement of [0, 3, 4] as const) {
    for (const variant of Object.keys(policies)) {
      const cell: Cell = { players: count, requirement, policy: variant, attempts: 0, completed: 0,
        censored: 0, wins: 0, points: 0, turns: 0, bySeed: {} };
      const metricKey = `${count}/${requirement}/${variant}`;
      cards[metricKey] = Array.from({ length: deckSizeFor(count) + 1 }, () => ({ offered: 0, taken: 0, discarded: 0 }));
      for (let sample = seedOffset; sample < seedOffset + seeds; sample++) {
        cell.bySeed[sample] = [];
        for (let focal = 0; focal < count; focal++) {
          const random = seeded(sample + count * 100000 + requirement * 10000);
          const state = startRound(initialState(count, requirement), random);
          const result = play(state, focal, variant, random, metricKey, sample === seedOffset && focal === 0,
            roundIdFor(`tournament/${metricKey}/${sample}/${focal}`));
          cell.bySeed[sample].push(result);
          cell.attempts++; cell.completed += +result.completed; cell.censored += +!result.completed;
          cell.wins += +result.won; cell.points += result.points ?? 0; cell.turns += result.turns;
        }
      }
      cells.push(cell);
      process.stdout.write(`${metricKey}: ${cell.completed}/${cell.attempts} finished, focal wins ${cell.wins}\n`);
    }
  }
}

// Paired contrasts use the same seed AND focal seat. Bootstrap whole seed blocks,
// preserving correlation between seat rotations. Only jointly finished pairs enter.
function pairedComparison(baseline: Cell, alternative: Cell) {
  const blocks = Object.keys(baseline.bySeed).map((key) => {
    let winDifference = 0, pointDifference = 0, pairs = 0;
    baseline.bySeed[+key].forEach((a, i) => {
      const b = alternative.bySeed[+key][i];
      if (a.completed && b.completed) { pairs++; winDifference += +b.won - +a.won; pointDifference += b.points! - a.points!; }
    });
    return { pairs, winDifference, pointDifference };
  });
  const totals = blocks.reduce((a, b) => ({ pairs: a.pairs + b.pairs,
    winDifference: a.winDifference + b.winDifference, pointDifference: a.pointDifference + b.pointDifference }),
  { pairs: 0, winDifference: 0, pointDifference: 0 });
  const random = seeded(982451653);
  const samples: number[] = [];
  for (let sample = 0; sample < 2000; sample++) {
    let pairs = 0, difference = 0;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[Math.floor(random() * blocks.length)]; pairs += block.pairs; difference += block.winDifference;
    }
    if (pairs) samples.push(difference / pairs);
  }
  samples.sort((a, b) => a - b);
  return { players: baseline.players, requirement: baseline.requirement, baseline: baseline.policy,
    alternative: alternative.policy, jointlyCompletedPairs: totals.pairs,
    excludedPairs: baseline.attempts - totals.pairs,
    winRateDifference: totals.pairs ? totals.winDifference / totals.pairs : null,
    meanPointDifference: totals.pairs ? totals.pointDifference / totals.pairs : null,
    seedBlockBootstrap95: samples.length ? [samples[Math.floor(samples.length * 0.025)], samples[Math.floor(samples.length * 0.975)]] : null };
}
const comparisons = cells.filter((cell) => situationalStudy ? ["easy", "plan", "easy-v2"].includes(cell.policy)
  : cell.policy === "repair" || (planningStudy && cell.policy === "easy")).flatMap((baseline) =>
  Object.keys(policies).filter((policy) => situationalStudy
    ? policy === (baseline.policy === "easy" ? "easy-v2" : "medium-v2")
    : policy !== baseline.policy && (baseline.policy === "repair" || policy === "plan"))
    .map((policy) => pairedComparison(baseline, cells.find((cell) =>
    cell.players === baseline.players && cell.requirement === baseline.requirement && cell.policy === policy)!)));

const originalHand = [3, 8, 13, 19, 25, 41, 44, 46, 48, 50].reverse();
const scenario: unknown[] = [];
for (const count of (process.argv.includes("--skip-scenario") ? [] : [2, 3, 4]) as (2 | 3 | 4)[]) {
  const outcomes: Record<string, GameResult[]> = { adjacent: [], gap: [] };
  for (let sample = seedOffset; sample < seedOffset + seeds; sample++) {
    const random = seeded(700000 + sample + count * 100000);
    const remaining = shuffle(Array.from({ length: deckSizeFor(count) }, (_, i) => i + 1)
      .filter((card) => card !== 27 && !originalHand.includes(card)), random);
    const state = initialState(count, 3);
    state.players[0].hand = [...originalHand];
    for (let seat = 1; seat < count; seat++) state.players[seat].hand = remaining.splice(-10);
    state.deck = remaining; state.drawnCard = 27; state.drawnFrom = "deck";
    for (const [variant, slot] of [["adjacent", 4], ["gap", 3]] as const) {
      const next = applyGameAction(state, "p0", { type: "swap", slot, declareRacko: false });
      outcomes[variant].push(play(next, 0, "repair", seeded(900000 + sample), null, false,
        roundIdFor(`scenario/${count}/${sample}/${variant}`)));
    }
  }
  const oneMoveTargets = (hand: number[]) => {
    const targets = new Set<number>();
    for (let card = 1; card <= deckSizeFor(count); card++) {
      if (hand.includes(card)) continue;
      for (let slot = 0; slot < 10; slot++) {
        if (canDeclareRacko(hand.map((value, i) => i === slot ? card : value), 3)) targets.add(card);
      }
    }
    return [...targets];
  };
  const adjacent = originalHand.map((v, i) => i === 4 ? 27 : v);
  const gap = originalHand.map((v, i) => i === 3 ? 27 : v);
  scenario.push({ players: count, requirement: 3, outcomes,
    adjacent: { hand: adjacent, analysis: analyzeHand(adjacent, deckSizeFor(count), 3), oneMoveTargets: oneMoveTargets(adjacent) },
    gap: { hand: gap, analysis: analyzeHand(gap, deckSizeFor(count), 3), oneMoveTargets: oneMoveTargets(gap) } });
}

const report = { schemaVersion: 1, policyVersion: REFERENCE_POLICY_VERSION,
  ...(planningStudy ? { planningPolicyVersion: PLANNING_POLICY_VERSION, planningWeights: PLANNING_WEIGHTS } : {}),
  ...(situationalStudy ? { adaptivePolicyVersion: ADAPTIVE_POLICY_VERSION, adaptiveWeights: ADAPTIVE_WEIGHTS,
    planningPolicyVersion: PLANNING_POLICY_VERSION, planningWeights: PLANNING_WEIGHTS } : {}),
  sourceSha256, weights: REFERENCE_WEIGHTS, opponent, preparations,
  considerMatchScore: false, seeds, seedOffset, maxTurns,
  methodology: `Focal policy against ${opponent} opponents; identical seed and rotating focal seats. Capped rounds are censored, not losses. Match context disabled. Bootstrap resamples whole seed blocks. No claims about human/expert strength.`,
  policies, cells, comparisons, cards, scenario };
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(`${output}.json`, JSON.stringify(report, null, 2) + "\n");
writeFileSync(`${output}.trace.jsonl`, traces.map((entry) => JSON.stringify(entry)).join("\n") + "\n");
const percent = (value: number | null) => value === null ? "—" : `${(100 * value).toFixed(1)} %`;
const lines = [`# Bot-Simulation: ${path.basename(output)}`, "", `Version: ${REFERENCE_POLICY_VERSION}; ${seeds} Seeds ab ${seedOffset}; Limit ${maxTurns} abgeschlossene Spielerzüge pro Runde.`, "",
  `Alle Gegner verwenden ${opponent}. Die Teststrategie rotiert durch alle Sitze. Gesamtwertung aus. Abgebrochene Runden sind zensiert und keine Niederlagen; Quoten beziehen sich nur auf beendete Runden. Dies ist ein Vergleich mit Referenzstrategien, kein Nachweis menschlicher oder Experten-Spielstärke.`, "",
  "| Spieler | Pflichtfolge | Teststrategie | Beendet / Versuche | Siege unter beendeten | Ø Punkte beendet |", "|---|---|---|---|---|---|"];
for (const cell of cells) lines.push(`| ${cell.players} | ${cell.requirement} | ${cell.policy} | ${cell.completed}/${cell.attempts} | ${percent(cell.completed ? cell.wins / cell.completed : null)} | ${cell.completed ? (cell.points / cell.completed).toFixed(1) : "—"} |`);
lines.push("", "## Gepaarte Vergleiche", "", "Differenz = Alternative minus Baseline. Intervalle: 2.000 Bootstrap-Stichproben ganzer Seed-Blöcke; bei kleinem Pilotumfang nur explorativ. Ausgeschlossene Paare können die Auswertung verzerren. Keine Korrektur für Mehrfachvergleiche.", "",
  "| Spieler | Folge | Baseline | Alternative | Gemeinsame / ausgeschlossene Paare | Differenz Siegquote | 95-%-Intervall | Δ Punkte |", "|---|---|---|---|---|---|---|---|");
for (const c of comparisons) lines.push(`| ${c.players} | ${c.requirement} | ${c.baseline} | ${c.alternative} | ${c.jointlyCompletedPairs}/${c.excludedPairs} | ${percent(c.winRateDifference)} | ${c.seedBlockBootstrap95?.map(percent).join(" bis ") ?? "—"} | ${c.meanPointDifference?.toFixed(1) ?? "—"} |`);
lines.push("", "## 25/27: bedingtes Entscheidungsexperiment", "", `Feste eigene Ausgangshand, 27 bereits gezogen, Gegnerhände aus den übrigen Karten zufällig. Danach spielt der untersuchte Spieler repair, seine Gegner ${opponent}. Keine Verallgemeinerung auf andere Hände. Die Handlisten in JSON verwenden Engine-Reihenfolge hinten nach vorne.`, "");
for (const item of scenario as { players: number; outcomes: Record<string, GameResult[]> }[]) {
  for (const [variant, results] of Object.entries(item.outcomes)) {
    const completed = results.filter((r) => r.completed);
    lines.push(`- ${item.players} Spieler, ${variant}: ${completed.length}/${results.length} beendet; ${completed.filter((r) => r.won).length} eigene Siege; Ø ${completed.length ? (completed.reduce((sum, r) => sum + r.points!, 0) / completed.length).toFixed(1) : "—"} Punkte.`);
  }
}
lines.push("", "Exakt strukturell: direkte Platzierung hat keine einzelne Abschlusskarte; Lücke hat die 26. Das gilt unabhängig davon, ob die 26 tatsächlich erreichbar ist. Die Kartenstatistik enthält Angebote/Aufnahmen/Ablagen nach Spielerzahl, Folge und Teststrategie und ist keine universelle Kartenwerttabelle.", "");
writeFileSync(`${output}.md`, lines.join("\n"));
process.stdout.write(`Saved ${output}.{json,md} and trace.jsonl\n`);
