import { applyGameAction, startRound } from "../../../shared/game";
import type { CoreGameState, CorePlayer, DirectRunRequirement } from "../../../shared/game";

export { canDeclareRacko, deckSizeFor, GameRuleError, isRacko, longestRun, PLAYER_NAMES } from "../../../shared/game";
export type { DirectRunRequirement } from "../../../shared/game";
export type { CorePlayer as Player, CoreRoundResult as RoundResult } from "../../../shared/game";
export type GameStatus = "playing" | "round_end" | "finished";

export interface GameState extends CoreGameState {
  version: 1;
  status: GameStatus;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createGame(names: string[], totalRounds: number, directRunRequirement: DirectRunRequirement): GameState {
  const players: CorePlayer[] = names.map((name) => ({ id: makeId(), name, hand: [], roundScore: 0, totalScore: 0, rackos: 0 }));
  const startingPlayerIndex = Math.floor(Math.random() * players.length);
  return startRound({ version: 1, players, playerCount: players.length as 2 | 3 | 4, totalRounds, currentRound: 1, directRunRequirement, startingPlayerIndex, status: "playing", turnIndex: startingPlayerIndex, deck: [], discard: [], drawnCard: null, drawnFrom: null, roundResults: [], gameWinnerIds: [], message: "" });
}

export function drawCard(state: GameState, source: "deck" | "discard"): GameState {
  return applyGameAction(state, state.players[state.turnIndex].id, { type: "draw", source });
}

export function swapCard(state: GameState, slot: number, declareWinner: boolean): GameState {
  return applyGameAction(state, state.players[state.turnIndex].id, { type: "swap", slot, declareRacko: declareWinner });
}

export function discardDrawnCard(state: GameState): GameState {
  return applyGameAction(state, state.players[state.turnIndex].id, { type: "discard" });
}

export function declareRacko(state: GameState): GameState {
  return applyGameAction(state, state.players[state.turnIndex].id, { type: "racko" });
}

export function continueGame(state: GameState): GameState {
  if (state.currentRound < state.totalRounds) {
    return applyGameAction(state, state.players[0].id, { type: "nextRound" });
  }
  // On one device the shared button confirms the group's decision. Online,
  // each participant must send their own vote through the server adapter.
  return state.players.reduce((next, player) => applyGameAction(next, player.id, { type: "voteExtraRound" }), state);
}

export function finishGame(state: GameState): GameState {
  return applyGameAction(state, state.players[0].id, { type: "finishGame" });
}
