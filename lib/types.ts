export const PLAYER_NAMES = ["Max", "Tom", "Claudia", "Hannes", "Marleen", "Clara", "Ralf", "Sabine", "Gast 1", "Gast 2", "Gast 3"] as const;

export type PlayerName = (typeof PLAYER_NAMES)[number];
export type GameStatus = "lobby" | "playing" | "round_end" | "finished";

export interface PlayerState {
  id: string;
  name: PlayerName;
  token: string;
  connectedAt: string;
  hand: number[];
  roundScore: number;
  totalScore: number;
  rackos: number;
}

export interface RoundResult {
  playerId: string;
  name: PlayerName;
  hand: number[];
  basePoints: number;
  winnerPoints: number;
  bonusPoints: number;
  total: number;
}

export interface GameState {
  code: string;
  hostId: string;
  playerCount: 2 | 3 | 4;
  totalRounds: number;
  currentRound: number;
  startingPlayerIndex: number;
  status: GameStatus;
  players: PlayerState[];
  deck: number[];
  discard: number[];
  turnIndex: number;
  drawnCard: number | null;
  drawnFrom: "deck" | "discard" | null;
  awaitingRacko: boolean;
  roundResults: RoundResult[];
  gameWinnerIds: string[];
  message: string;
}

export interface PublicPlayer {
  id: string;
  name: PlayerName;
  roundScore: number;
  totalScore: number;
  rackos: number;
  hand?: number[];
}

export interface GameView extends Omit<GameState, "players" | "deck"> {
  players: PublicPlayer[];
  deckCount: number;
  isHost: boolean;
  isMyTurn: boolean;
  myPlayerId: string;
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
