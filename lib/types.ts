import { PLAYER_NAMES } from "../shared/game";
import type { CoreGameState, CorePlayer, CoreRoundResult } from "../shared/game";
import type { OnlineBotDifficulty, PlayerName } from "../shared/online";
import type { BotObservation, BotPublicEvent } from "../shared/bots";

export { PLAYER_NAMES };
export type { GameStatus } from "../shared/game";

export type { GameView, LeaderboardEntry, ListedGame, PlayerName, PublicPlayer } from "../shared/online";

export interface HumanPlayerState extends CorePlayer {
  kind?: "human";
  name: PlayerName;
  token: string;
  connectedAt: string;
}

export interface BotPlayerState extends CorePlayer {
  kind: "bot";
  botSettings: { difficulty: OnlineBotDifficulty; considerMatchScore: false };
  strategyId: string;
  token?: never;
  connectedAt?: never;
}

export type PlayerState = HumanPlayerState | BotPlayerState;
export type RoundResult = CoreRoundResult;

export interface BotRoundState {
  id: string;
  events: BotPublicEvent[];
  historyComplete: boolean;
  initialObservations: Record<string, BotObservation>;
}

export interface GameState extends CoreGameState<PlayerState> {
  code: string;
  hostId: string;
  awaitingRacko: boolean;
  /** Private adapter state. Never include in a browser/mobile response. */
  botRound?: BotRoundState;
}
