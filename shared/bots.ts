import type { CoreGameState, DirectRunRequirement, GameAction } from "./game";

/** Shared integration contract. App/server scheduling remains an adapter concern. */
export type BotAction = Extract<GameAction, { type: "draw" | "swap" | "discard" | "racko" }>;

export type BotDifficulty = "easy" | "medium" | "hard" | "expert";
export interface BotSettings {
  difficulty: BotDifficulty;
  considerMatchScore: boolean;
}
export const DEFAULT_BOT_SETTINGS: Readonly<BotSettings> = Object.freeze({
  difficulty: "medium", considerMatchScore: false,
});

export function resolveBotSettings(input: Partial<BotSettings> = {}): BotSettings {
  const difficulty = input.difficulty ?? DEFAULT_BOT_SETTINGS.difficulty;
  const considerMatchScore = input.considerMatchScore ?? DEFAULT_BOT_SETTINGS.considerMatchScore;
  if (!["easy", "medium", "hard", "expert"].includes(difficulty) || typeof considerMatchScore !== "boolean") {
    throw new Error("Ungültige Bot-Einstellungen.");
  }
  return { difficulty, considerMatchScore };
}

type EventStamp = { roundId: string; revision: number };
/** No opponent slot, hidden incoming value, deck order, token or private hand. */
export type BotPublicEvent = EventStamp & (
  | { type: "draw"; playerId: string; source: "deck" | "discard"; card: number | null }
  | { type: "swap"; playerId: string; discardedCard: number }
  | { type: "discard"; playerId: string; card: number }
  | { type: "reshuffle" }
  | { type: "roundEnded"; winnerId: string }
);

export interface BotObservationOptions {
  settings?: Partial<BotSettings>;
  /** Opaque stable ID; do not encode the round number in this ID. */
  roundId?: string;
  revision?: number;
  /** Complete public log for this round, not just events since the last own turn. */
  events?: readonly BotPublicEvent[];
  /** False for partial logs, e.g. a resumed old save without round history. */
  historyComplete?: boolean;
}

export interface PublicRoundProgress {
  historyComplete: boolean;
  completedTurns: number | null;
  completedOwnTurns: number | null;
  reshuffles: number | null;
}

export interface BotObservation {
  schemaVersion: 1;
  handOrder: "back-to-front";
  roundId: string;
  revision: number;
  settings: BotSettings;
  phase: "draw" | "place" | "inactive" | "blocked";
  activePlayerId: string;
  playerId: string;
  hand: number[];
  isMyTurn: boolean;
  topDiscard: number | null;
  deckCount: number;
  drawnCard: number | null;
  drawnFrom: "deck" | "discard" | null;
  directRunRequirement: DirectRunRequirement;
  /** Legacy fields: both masked to 1 unless considerMatchScore is enabled. */
  currentRound: number;
  totalRounds: number;
  playerCount: 2 | 3 | 4;
  /** In turn order. Legacy totalScore is masked to 0 by default. */
  players: { id: string; name: string; handCount: number; totalScore: number }[];
  events: BotPublicEvent[];
  /** Additive field; old adapters may omit it. No opponent card choices. */
  roundProgress?: PublicRoundProgress;
  matchContext: null | { currentRound: number; totalRounds: number; scores: { playerId: string; totalScore: number }[] };
}

export interface BotStrategy {
  id: string;
  /** Optional round-start preparation, including while another player is active.
   * Must not execute an action. decide must also work without this eager hook. */
  prepare?(observation: BotObservation): void;
  decide(observation: BotObservation): BotAction | Promise<BotAction>;
}

export function observeForBot(state: CoreGameState, playerId: string, options: BotObservationOptions = {}): BotObservation {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) throw new Error("Unbekannter Bot-Teilnehmer.");
  const isMyTurn = state.status === "playing" && state.players[state.turnIndex]?.id === playerId;
  const settings = resolveBotSettings(options.settings);
  const roundId = options.roundId ?? "current-round";
  const revision = options.revision ?? 0;
  const roundEvents = (options.events ?? [])
    .filter((event) => event.roundId === roundId && event.revision <= revision)
    .map(copyPublicEvent);
  const historyComplete = options.historyComplete ?? options.events !== undefined;
  const completed = roundEvents.filter((event) => event.type === "swap" || event.type === "discard");
  const roundProgress: PublicRoundProgress = {
    historyComplete,
    completedTurns: historyComplete ? completed.length : null,
    completedOwnTurns: historyComplete ? completed.filter((event) => "playerId" in event && event.playerId === playerId).length : null,
    reshuffles: historyComplete ? roundEvents.filter((event) => event.type === "reshuffle").length : null,
  };
  const events = settings.difficulty === "easy" ? [] : roundEvents;
  return {
    schemaVersion: 1, handOrder: "back-to-front", roundId, revision, settings,
    phase: !isMyTurn ? "inactive" : state.awaitingRacko ? "blocked" : state.drawnCard === null ? "draw" : "place",
    activePlayerId: state.players[state.turnIndex].id,
    playerId, hand: [...player.hand], isMyTurn,
    topDiscard: state.discard.at(-1) ?? null, deckCount: state.deck.length,
    drawnCard: isMyTurn ? state.drawnCard : null,
    drawnFrom: isMyTurn ? state.drawnFrom : null,
    directRunRequirement: state.directRunRequirement ?? 0,
    currentRound: settings.considerMatchScore ? state.currentRound : 1,
    totalRounds: settings.considerMatchScore ? state.totalRounds : 1, playerCount: state.playerCount,
    players: state.players.map(({ id, name, hand, totalScore }) => ({
      id, name, handCount: hand.length, totalScore: settings.considerMatchScore ? totalScore : 0,
    })),
    events, roundProgress,
    matchContext: settings.considerMatchScore ? {
      currentRound: state.currentRound, totalRounds: state.totalRounds,
      scores: state.players.map(({ id, totalScore }) => ({ playerId: id, totalScore })),
    } : null,
  };
}

function copyPublicEvent(event: BotPublicEvent): BotPublicEvent {
  const stamp = { roundId: event.roundId, revision: event.revision };
  switch (event.type) {
    case "draw": return { ...stamp, type: event.type, playerId: event.playerId, source: event.source,
      card: event.source === "discard" ? event.card : null };
    case "swap": return { ...stamp, type: event.type, playerId: event.playerId, discardedCard: event.discardedCard };
    case "discard": return { ...stamp, type: event.type, playerId: event.playerId, card: event.card };
    case "reshuffle": return { ...stamp, type: event.type };
    case "roundEnded": return { ...stamp, type: event.type, winnerId: event.winnerId };
  }
}

/** Call ONLY after applyGameAction succeeds, using the committed before/after states.
 * Persist atomically with the state online; never derive this from message strings. */
export function publicEventsForAction(before: CoreGameState, action: BotAction, after: CoreGameState, stamp: EventStamp): BotPublicEvent[] {
  // Do not spread adapter objects: structural typing permits additional fields.
  stamp = { roundId: stamp.roundId, revision: stamp.revision };
  const player = before.players[before.turnIndex];
  const events: BotPublicEvent[] = [];
  if (action.type === "draw") {
    if (action.source === "deck" && before.deck.length === 0) events.push({ ...stamp, type: "reshuffle" });
    events.push({ ...stamp, type: "draw", playerId: player.id, source: action.source,
      card: action.source === "discard" ? before.discard.at(-1)! : null });
  } else if (action.type === "swap") {
    events.push({ ...stamp, type: "swap", playerId: player.id, discardedCard: player.hand[action.slot] });
  } else if (action.type === "discard") {
    events.push({ ...stamp, type: "discard", playerId: player.id, card: before.drawnCard! });
  }
  if (after.status === "round_end") events.push({ ...stamp, type: "roundEnded", winnerId: player.id });
  return events;
}
