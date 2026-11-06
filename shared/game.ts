/** Platform-independent rules. The existing online game is the reference. */
export const PLAYER_NAMES = ["Max", "Tom", "Claudia", "Hannes", "Marleen", "Clara", "Ralf", "Sabine", "Gast 1", "Gast 2", "Gast 3"] as const;

export type DirectRunRequirement = 0 | 3 | 4;
export type GameStatus = "lobby" | "playing" | "round_end" | "finished";

export interface CorePlayer {
  id: string;
  name: string;
  hand: number[];
  roundScore: number;
  totalScore: number;
  rackos: number;
}

export interface CoreRoundResult<Name extends string = string> {
  playerId: string;
  name: Name;
  hand: number[];
  basePoints: number;
  winnerPoints: number;
  bonusPoints: number;
  total: number;
}

export interface CoreGameState<Player extends CorePlayer = CorePlayer> {
  players: Player[];
  playerCount: 2 | 3 | 4;
  directRunRequirement: DirectRunRequirement;
  totalRounds: number;
  currentRound: number;
  startingPlayerIndex: number;
  status: GameStatus;
  deck: number[];
  discard: number[];
  turnIndex: number;
  drawnCard: number | null;
  drawnFrom: "deck" | "discard" | null;
  // Optional so existing local v1 saves continue to work without a migration.
  awaitingRacko?: boolean;
  roundResults: CoreRoundResult<Player["name"]>[];
  extraRoundVotes?: string[];
  gameWinnerIds: string[];
  message: string;
}

export class GameRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameRuleError";
  }
}

export const deckSizeFor = (players: number) => players === 2 ? 50 : players === 3 ? 60 : 75;

export function shuffle(values: number[], random: () => number = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function startRound<State extends CoreGameState>(state: State, random: () => number = Math.random): State {
  const deck = shuffle(Array.from({ length: deckSizeFor(state.playerCount) }, (_, i) => i + 1), random);
  const players = state.players.map((player) => ({ ...player, hand: [] as number[], roundScore: 0 }));
  for (let card = 0; card < 10; card++) {
    for (const player of players) player.hand.unshift(deck.pop()!);
  }
  const turnIndex = ((state.startingPlayerIndex ?? 0) + state.currentRound - 1) % players.length;
  return {
    ...state, players, deck, discard: [], status: "playing", turnIndex,
    drawnCard: null, drawnFrom: null, awaitingRacko: false, roundResults: [], extraRoundVotes: [],
    message: `${players[turnIndex].name} beginnt Runde ${state.currentRound}.`,
  };
}

export function isRacko(hand: number[]) {
  const fromFront = [...hand].reverse();
  return fromFront.length === 10 && fromFront.every((card, index) => index === 0 || fromFront[index - 1] < card);
}

export function canDeclareRacko(hand: number[], directRunRequirement: DirectRunRequirement = 0) {
  return isRacko(hand) && (directRunRequirement === 0 || longestRun(hand) >= directRunRequirement);
}

export function baseScore(hand: number[]) {
  const fromFront = [...hand].reverse();
  if (!fromFront.length) return 0;
  let count = 1;
  while (count < fromFront.length && fromFront[count - 1] < fromFront[count]) count++;
  return count * 5;
}

export function longestRun(hand: number[]) {
  const fromFront = [...hand].reverse();
  let longest = fromFront.length ? 1 : 0;
  let current = longest;
  for (let i = 1; i < fromFront.length; i++) {
    current = fromFront[i] === fromFront[i - 1] + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

export function bonusForRun(run: number) {
  if (run >= 6) return 400;
  if (run === 5) return 200;
  if (run === 4) return 100;
  if (run === 3) return 50;
  return 0;
}

export function finishRound<State extends CoreGameState>(state: State, winnerId: string): State {
  const roundResults = state.players.map((player) => {
    const won = player.id === winnerId;
    const basePoints = baseScore(player.hand);
    const winnerPoints = won ? 25 : 0;
    const bonusPoints = won ? bonusForRun(longestRun(player.hand)) : 0;
    return { playerId: player.id, name: player.name, hand: player.hand, basePoints, winnerPoints, bonusPoints, total: basePoints + winnerPoints + bonusPoints };
  });
  const players = state.players.map((player) => {
    const result = roundResults.find((item) => item.playerId === player.id)!;
    return { ...player, roundScore: result.total, totalScore: player.totalScore + result.total, rackos: player.rackos + (player.id === winnerId ? 1 : 0) };
  });
  return { ...state, status: "round_end", players, roundResults, drawnCard: null, drawnFrom: null, awaitingRacko: false, message: `${players.find((p) => p.id === winnerId)?.name} ruft Rack’o!` };
}

export function nextTurn<State extends CoreGameState>(state: State): State {
  const turnIndex = (state.turnIndex + 1) % state.players.length;
  return { ...state, turnIndex, drawnCard: null, drawnFrom: null, awaitingRacko: false, message: `${state.players[turnIndex].name} ist am Zug.` };
}

export type GameAction =
  | { type: "draw"; source: "deck" | "discard" }
  | { type: "swap"; slot: number; declareRacko: boolean }
  | { type: "discard" }
  | { type: "racko" }
  | { type: "nextRound" }
  | { type: "voteExtraRound" }
  | { type: "finishGame" };

function invalidRacko(state: CoreGameState, message: string): never {
  throw new GameRuleError(state.directRunRequirement ? `Zusätzlich wird eine direkte Folge aus ${state.directRunRequirement} Karten benötigt.` : message);
}

/** Authentication, host permissions, persistence and visibility belong to the adapters. */
export function applyGameAction<State extends CoreGameState>(state: State, playerId: string, action: GameAction, random: () => number = Math.random): State {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) throw new GameRuleError("Du gehörst nicht zu diesem Spiel.");
  const isMyTurn = state.status === "playing" && state.players[state.turnIndex]?.id === playerId;

  switch (action.type) {
    case "draw": {
      if (!isMyTurn || state.drawnCard !== null || state.awaitingRacko) throw new GameRuleError("Du kannst gerade keine Karte ziehen.");
      if (action.source === "discard") {
        if (!state.discard.length) throw new GameRuleError("Der Ablagestapel ist leer.");
        const discard = [...state.discard];
        return { ...state, drawnCard: discard.pop()!, drawnFrom: "discard", discard, message: `${player.name} hat die offene Karte genommen.` };
      }
      let deck = [...state.deck];
      let discard = [...state.discard];
      if (!deck.length) {
        if (discard.length <= 1) throw new GameRuleError("Es sind keine Karten mehr verfügbar.");
        const top = discard.pop()!;
        deck = shuffle(discard, random);
        discard = [top];
      }
      return { ...state, drawnCard: deck.pop()!, drawnFrom: "deck", deck, discard, message: `${player.name} hat verdeckt gezogen.` };
    }
    case "swap": {
      if (!isMyTurn || state.drawnCard === null) throw new GameRuleError("Du hast keine Karte zum Tauschen.");
      const { slot } = action;
      if (!Number.isInteger(slot) || slot < 0 || slot > 9) throw new GameRuleError("Ungültiger Kartenplatz.");
      const players = state.players.map((item) => item.id === playerId ? { ...item, hand: item.hand.map((card, index) => index === slot ? state.drawnCard! : card) } : item);
      const updated = { ...state, players, discard: [...state.discard, player.hand[slot]], drawnCard: null, drawnFrom: null };
      if (action.declareRacko) {
        const hand = players.find((item) => item.id === playerId)!.hand;
        if (!canDeclareRacko(hand, state.directRunRequirement ?? 0)) invalidRacko(state, "Diese Reihe ist noch nicht vollständig aufsteigend.");
        return finishRound(updated, playerId);
      }
      return nextTurn(updated);
    }
    case "discard":
      if (!isMyTurn || state.drawnCard === null || state.drawnFrom !== "deck") throw new GameRuleError("Diese Karte kann nicht abgelegt werden.");
      return nextTurn({ ...state, discard: [...state.discard, state.drawnCard] });
    case "racko":
      if (!isMyTurn || state.drawnCard !== null) throw new GameRuleError("Rack’o kann nur während deines Zuges vor dem Ziehen ausgerufen werden.");
      if (!canDeclareRacko(player.hand, state.directRunRequirement ?? 0)) invalidRacko(state, "Deine Karten sind noch nicht vollständig aufsteigend.");
      return finishRound(state, playerId);
    case "nextRound":
      if (state.status !== "round_end") throw new GameRuleError("Die nächste Runde kann noch nicht gestartet werden.");
      if (state.currentRound >= state.totalRounds) throw new GameRuleError("Für eine weitere Runde müssen alle Spieler zustimmen.");
      return startRound({ ...state, currentRound: state.currentRound + 1 }, random);
    case "voteExtraRound": {
      if (state.status !== "round_end" || state.currentRound < state.totalRounds) throw new GameRuleError("Über eine Zusatzrunde kann gerade nicht abgestimmt werden.");
      const extraRoundVotes = [...new Set([...(state.extraRoundVotes ?? []), playerId])];
      return extraRoundVotes.length === state.players.length
        ? startRound({ ...state, totalRounds: state.totalRounds + 1, currentRound: state.currentRound + 1, extraRoundVotes: [] }, random)
        : { ...state, extraRoundVotes, message: `${player.name} möchte eine weitere Runde spielen.` };
    }
    case "finishGame": {
      if (state.status !== "round_end" || state.currentRound < state.totalRounds) throw new GameRuleError("Das Spiel kann gerade nicht beendet werden.");
      const max = Math.max(...state.players.map((item) => item.totalScore));
      return { ...state, status: "finished", extraRoundVotes: [], gameWinnerIds: state.players.filter((item) => item.totalScore === max).map((item) => item.id), message: `${player.name} hat das Endergebnis aufgerufen.` };
    }
  }
}
