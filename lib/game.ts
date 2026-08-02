import { GameState, PlayerName, PlayerState, RoundResult } from "./types";

export const deckSizeFor = (players: number) => players === 2 ? 50 : players === 3 ? 60 : 75;

export function shuffle(values: number[]) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createPlayer(name: PlayerName): PlayerState {
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

export function startRound(state: GameState): GameState {
  const deck = shuffle(Array.from({ length: deckSizeFor(state.playerCount) }, (_, i) => i + 1));
  const players = state.players.map((player) => ({ ...player, hand: [] as number[], roundScore: 0 }));

  for (let card = 0; card < 10; card++) {
    for (const player of players) player.hand.unshift(deck.pop()!);
  }

  return {
    ...state,
    players,
    deck,
    discard: [],
    status: "playing",
    turnIndex: ((state.startingPlayerIndex ?? 0) + state.currentRound - 1) % players.length,
    drawnCard: null,
    drawnFrom: null,
    awaitingRacko: false,
    roundResults: [],
    message: `${players[((state.startingPlayerIndex ?? 0) + state.currentRound - 1) % players.length].name} beginnt Runde ${state.currentRound}.`,
  };
}

export function isRacko(hand: number[]) {
  const fromFront = [...hand].reverse();
  return fromFront.length === 10 && fromFront.every((card, index) => index === 0 || fromFront[index - 1] < card);
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

export function finishRound(state: GameState, winnerId: string) {
  const results: RoundResult[] = state.players.map((player) => {
    const won = player.id === winnerId;
    const basePoints = baseScore(player.hand);
    const winnerPoints = won ? 25 : 0;
    const bonusPoints = won ? bonusForRun(longestRun(player.hand)) : 0;
    return { playerId: player.id, name: player.name, hand: player.hand, basePoints, winnerPoints, bonusPoints, total: basePoints + winnerPoints + bonusPoints };
  });
  const players = state.players.map((player) => {
    const result = results.find((item) => item.playerId === player.id)!;
    return { ...player, roundScore: result.total, totalScore: player.totalScore + result.total, rackos: player.rackos + (player.id === winnerId ? 1 : 0) };
  });
  return { ...state, status: "round_end" as const, players, roundResults: results, drawnCard: null, drawnFrom: null, awaitingRacko: false, message: `${players.find((p) => p.id === winnerId)?.name} ruft Rack’o!` };
}

export function nextTurn(state: GameState) {
  const turnIndex = (state.turnIndex + 1) % state.players.length;
  return { ...state, turnIndex, drawnCard: null, drawnFrom: null, awaitingRacko: false, message: `${state.players[turnIndex].name} ist am Zug.` };
}
