import type { CoreGameState, GameAction, GameStatus, PLAYER_NAMES } from "./game";

export type PlayerName = (typeof PLAYER_NAMES)[number];
export type OnlineBotDifficulty = "easy" | "medium";

/** Wire types only: never import a database client or server state here. */
export interface PublicPlayer {
  id: string;
  name: string;
  roundScore: number;
  totalScore: number;
  rackos: number;
  hand?: number[];
  kind?: "human" | "bot";
  botDifficulty?: OnlineBotDifficulty;
}

export interface GameView extends Omit<CoreGameState, "players" | "deck"> {
  code: string;
  hostId: string;
  players: PublicPlayer[];
  deckCount: number;
  isHost: boolean;
  isMyTurn: boolean;
  myPlayerId: string;
  statisticsMode?: "training";
}

export interface ListedGame {
  code: string;
  hostName: string;
  status: GameStatus;
  playerNames: string[];
  playerCount: number;
  totalRounds: number;
  directRunRequirement: 0 | 3 | 4;
  canJoin: boolean;
  canRejoin: boolean;
  botCount?: number;
}

export interface LeaderboardEntry {
  player_name: PlayerName;
  games_played: number;
  rounds_played: number;
  wins: number;
  total_points: number;
  average_per_round: number;
  average_per_game: number;
}

export interface GameSession {
  code: string;
  playerId: string;
  token: string;
}

export interface StoredOnlineSession extends GameSession {
  serverUrl: string;
}

export interface GameResponse {
  game: GameView;
  // Optional while clients can still connect to older server deployments.
  version?: number;
}

export interface JoinedGameResponse extends GameResponse, GameSession {}

export type OnlineAction = GameAction | { type: "start" };

export interface RealtimeConfig {
  url: string;
  publishableKey: string;
}
