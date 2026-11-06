import type { HumanPlayerState, PlayerName } from "./types";

export {
  applyGameAction, baseScore, bonusForRun, canDeclareRacko, deckSizeFor,
  finishRound, GameRuleError, isRacko, longestRun, nextTurn, shuffle, startRound,
} from "../shared/game";

// Server-only identity data never belongs in the shared rules or mobile bundle.
export function createPlayer(name: PlayerName): HumanPlayerState {
  return {
    id: crypto.randomUUID(),
    token: crypto.randomUUID() + crypto.randomUUID(),
    name,
    connectedAt: new Date().toISOString(),
    hand: [],
    roundScore: 0,
    totalScore: 0,
    rackos: 0,
  };
}
