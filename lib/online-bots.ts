import { applyGameAction, canDeclareRacko, GameRuleError } from "../shared/game";
import type { GameAction } from "../shared/game";
import { createConfiguredReferenceBot } from "../shared/bot-reference";
import { observeForBot, publicEventsForAction } from "../shared/bots";
import type { BotAction, BotStrategy } from "../shared/bots";
import type { OnlineBotDifficulty } from "../shared/online";
import type { BotPlayerState, GameState, PlayerState } from "./types";

// Keep the existing humans-only leaderboard comparable during bot testing.
export const BOT_GAMES_RANKED = false;
export const isBot = (player: PlayerState): player is BotPlayerState => player.kind === "bot";

export function botDifficulty(value: unknown): OnlineBotDifficulty {
  if (value !== "easy" && value !== "medium") throw new GameRuleError("Bitte Leicht oder Mittel als Bot-Stufe wählen.");
  return value;
}

export function addOnlineBot(state: GameState, difficulty: OnlineBotDifficulty): GameState {
  if (state.status !== "lobby") throw new GameRuleError("Bots können nur im Warteraum hinzugefügt werden.");
  if (state.players.length >= 4) throw new GameRuleError("Das Spiel ist bereits voll.");
  const name = ["Bot 1", "Bot 2", "Bot 3"].find((candidate) => !state.players.some((player) => player.name === candidate))!;
  const botSettings = { difficulty, considerMatchScore: false as const };
  const bot: BotPlayerState = {
    id: crypto.randomUUID(), name, kind: "bot", botSettings,
    strategyId: createConfiguredReferenceBot(botSettings).id,
    hand: [], roundScore: 0, totalScore: 0, rackos: 0,
  };
  return { ...state, players: [...state.players, bot], message: `${name} wurde hinzugefügt.` };
}

export function changeOnlineBot(state: GameState, botId: string, difficulty?: OnlineBotDifficulty): GameState {
  if (state.status !== "lobby") throw new GameRuleError("Bots können nur im Warteraum geändert werden.");
  const bot = state.players.find((player) => player.id === botId && isBot(player));
  if (!bot || !isBot(bot)) throw new GameRuleError("Dieser Bot wurde nicht gefunden.");
  const settings = difficulty ? { difficulty, considerMatchScore: false as const } : null;
  return {
    ...state,
    players: settings ? state.players.map((player) => player.id === botId ? {
      ...bot, botSettings: settings, strategyId: createConfiguredReferenceBot(settings).id,
    } : player) : state.players.filter((player) => player.id !== botId),
    message: settings ? `${bot.name}s Stufe wurde geändert.` : `${bot.name} wurde entfernt.`,
  };
}

/** A fresh opaque ID and initial observation make prepare reproducible across
 * server restarts, without encoding match context into the strategy's round ID. */
export function initializeBotRound(state: GameState, revision: number, historyComplete = true): GameState {
  const bots = state.players.filter(isBot);
  if (!bots.length) return state;
  const round = { id: crypto.randomUUID(), events: [], historyComplete, initialObservations: {} as NonNullable<GameState["botRound"]>["initialObservations"] };
  const next = { ...state, botRound: round };
  for (const bot of bots) {
    const observation = observeForBot(next, bot.id, { settings: bot.botSettings, roundId: round.id, revision, events: [], historyComplete });
    round.initialObservations[bot.id] = observation;
    createConfiguredReferenceBot(bot.botSettings).prepare?.(observation);
  }
  return next;
}

/** Called for every participant's committed action, including humans. History
 * and the new state are written in the same version-checked database update. */
export function applyOnlineAction(state: GameState, playerId: string, action: GameAction, revision: number): GameState {
  let before = state.players.some(isBot) && !state.botRound ? initializeBotRound(state, revision - 1, false) : state;
  if (action.type === "voteExtraRound" && before.players.some(isBot)) {
    before = { ...before, extraRoundVotes: [...new Set([...(before.extraRoundVotes ?? []), ...before.players.filter(isBot).map((bot) => bot.id)])] };
  }
  let next = applyGameAction(before, playerId, action);
  if (next.currentRound !== before.currentRound && next.status === "playing") return initializeBotRound(next, revision);
  if (before.status === "playing" && next.status === "round_end" && next.currentRound >= next.totalRounds) {
    next = { ...next, extraRoundVotes: next.players.filter(isBot).map((bot) => bot.id) };
  }
  if (!before.botRound || !["draw", "swap", "discard", "racko"].includes(action.type)) return next;
  return { ...next, botRound: { ...before.botRound, events: [
    ...before.botRound.events,
    ...publicEventsForAction(before, action as BotAction, next, { roundId: before.botRound.id, revision }),
  ] } };
}

export interface LoadedOnlineGame { state: GameState; version: number }
export interface BotGameStore {
  load(): Promise<LoadedOnlineGame>;
  /** false means a version conflict: reload and decide from the committed state. */
  save(state: GameState, expectedVersion: number): Promise<boolean>;
  notify(): Promise<void>;
}

/** Defined fallback for strategy failures. Uses only the bot's own hand/offer.
 * In particular an open draw must be swapped, never discarded unused. */
export function fallbackBotAction(observation: ReturnType<typeof observeForBot>): BotAction {
  if (observation.drawnCard === null) {
    if (canDeclareRacko(observation.hand, observation.directRunRequirement)) return { type: "racko" };
    const source = observation.deckCount === 0 && observation.topDiscard !== null ? "discard" : "deck";
    return { type: "draw", source };
  }
  for (let slot = 0; slot < 10; slot++) {
    const hand = observation.hand.map((card, i) => i === slot ? observation.drawnCard! : card);
    if (canDeclareRacko(hand, observation.directRunRequirement)) return { type: "swap", slot, declareRacko: true };
  }
  return observation.drawnFrom === "deck" ? { type: "discard" } : { type: "swap", slot: 0, declareRacko: false };
}

async function decideWithTimeout(strategy: BotStrategy, observation: ReturnType<typeof observeForBot>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      strategy.decide(observation),
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error("Bot-Entscheidung dauerte zu lange.")), 1500); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

/** Awaited by the server after start/moves/round changes, not a detached timer
 * or a browser-owned bot. At least one human is required in every game. */
export async function advanceOnlineBots(
  initial: LoadedOnlineGame, store: BotGameStore,
  factory: (bot: BotPlayerState) => BotStrategy = (bot) => createConfiguredReferenceBot(bot.botSettings),
): Promise<LoadedOnlineGame> {
  let loaded = initial;
  const deadline = Date.now() + 8000;
  const strategies = new Map<string, BotStrategy>();
  for (let attempt = 0; attempt < 24; attempt++) {
    if (Date.now() >= deadline) return loaded;
    const { state, version } = loaded;
    if (state.status !== "playing" || !state.players.some((player) => !isBot(player))) return loaded;
    const bot = state.players[state.turnIndex];
    if (!bot || !isBot(bot)) return loaded;
    const prepared = state.botRound ? state : initializeBotRound(state, version, false);
    const round = prepared.botRound!;
    const observation = observeForBot(prepared, bot.id, {
      settings: bot.botSettings, roundId: round.id, revision: version, events: round.events, historyComplete: round.historyComplete,
    });
    let next: GameState;
    try {
      const key = `${round.id}/${bot.id}`;
      let strategy = strategies.get(key);
      if (!strategy) {
        strategy = factory(bot);
        if (strategy.id !== bot.strategyId) throw new Error("Bot-Strategieversion ist nicht verfügbar.");
        strategy.prepare?.(structuredClone(round.initialObservations[bot.id] ?? observation));
        strategies.set(key, strategy);
      }
      const action = await decideWithTimeout(strategy, observation);
      if (!action || !["draw", "swap", "discard", "racko"].includes(action.type)) throw new Error("Ungültige Bot-Aktion.");
      next = applyOnlineAction(prepared, bot.id, action, version + 1);
    } catch (error) {
      console.error("Bot-Strategie fehlgeschlagen; regelkonformer Ersatzzug.", error instanceof Error ? error.message : "Unbekannter Fehler");
      // Rebuild the observation: an external strategy may have modified its copy.
      const safe = observeForBot(prepared, bot.id, { settings: bot.botSettings, roundId: round.id, revision: version, events: round.events, historyComplete: round.historyComplete });
      next = applyOnlineAction(prepared, bot.id, fallbackBotAction(safe), version + 1);
    }
    if (await store.save(next, version)) {
      loaded = { state: next, version: version + 1 };
      await store.notify();
    } else {
      loaded = await store.load();
      strategies.clear();
    }
  }
  return loaded;
}
