import type { DirectRunRequirement } from "../../../shared/game";
import type {
  GameResponse, GameSession, GameView, JoinedGameResponse, LeaderboardEntry,
  ListedGame, OnlineAction, PlayerName, RealtimeConfig, StoredOnlineSession,
} from "../../../shared/online";

export const DEFAULT_SERVER_URL = process.env.EXPO_PUBLIC_API_URL || "https://racko-spiel.vercel.app";

export class OnlineError extends Error {
  constructor(message: string, readonly status = 0, readonly code = "NETWORK_ERROR") {
    super(message);
    this.name = "OnlineError";
  }
}

export function isExpiredSession(error: unknown) {
  return error instanceof OnlineError && (
    [401, 404, 410].includes(error.status)
    || ["SESSION_INVALID", "GAME_NOT_FOUND"].includes(error.code)
    // Compatibility with the old API, which reported these cases as HTTP 500.
    || ["Spiel nicht gefunden.", "Deine Spielanmeldung ist nicht mehr gültig."].includes(error.message)
  );
}

export function normalizeServerUrl(value: string) {
  let url: URL;
  try { url = new URL(value.trim()); }
  catch { throw new OnlineError("Bitte eine vollständige Serveradresse mit https:// eingeben.", 0, "INVALID_URL"); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new OnlineError("Bitte die HTTPS-Startadresse der Online-Version eingeben, ohne Unterseite oder Zugangsdaten.", 0, "INVALID_URL");
  }
  return url.origin;
}

export function parseStoredSession(value: string | null): StoredOnlineSession | null {
  if (!value) return null;
  try {
    const session = JSON.parse(value);
    if (!session || typeof session.serverUrl !== "string" || !/^[A-Z0-9]{5}$/.test(session.code)
      || typeof session.playerId !== "string" || !session.playerId || typeof session.token !== "string" || !session.token) return null;
    return { serverUrl: normalizeServerUrl(session.serverUrl), code: session.code, playerId: session.playerId, token: session.token };
  } catch { return null; }
}

function gameResponse(value: unknown): GameResponse {
  const data = value as GameResponse | null;
  const view = data?.game;
  if (!view || typeof view.code !== "string" || !["lobby", "playing", "round_end", "finished"].includes(view.status)
    || !Array.isArray(view.players) || !view.players.length || view.players.length > 4
    || !view.players.every((player) => typeof player.id === "string" && typeof player.name === "string"
      && (player.hand === undefined || (Array.isArray(player.hand) && player.hand.every(Number.isFinite))))
    || typeof view.myPlayerId !== "string" || !view.players.some((player) => player.id === view.myPlayerId)
    || typeof view.isMyTurn !== "boolean" || typeof view.isHost !== "boolean"
    || !Number.isFinite(view.deckCount) || !Number.isInteger(view.turnIndex)
    || (view.drawnCard !== null && !Number.isFinite(view.drawnCard))) {
    throw new OnlineError("Der Server hat keinen gültigen Spielstand geliefert.", 0, "INVALID_RESPONSE");
  }
  return { game: view as GameView, ...(Number.isInteger(data!.version) ? { version: data!.version } : {}) };
}

function credentials(session: GameSession): GameSession {
  return { code: session.code, playerId: session.playerId, token: session.token };
}

export class OnlineApi {
  readonly serverUrl: string;
  constructor(serverUrl: string, private readonly fetcher: typeof fetch = fetch, private readonly timeoutMs = 12000) {
    this.serverUrl = normalizeServerUrl(serverUrl);
  }

  private async request(path: string, body?: object): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`${this.serverUrl}${path}`, {
        method: body ? "POST" : "GET", signal: controller.signal, cache: "no-store",
        headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      let data: unknown;
      try { data = await response.json(); }
      catch { throw new OnlineError("Der Server ist gerade nicht erreichbar oder die Adresse stimmt nicht.", response.status, "INVALID_RESPONSE"); }
      if (!response.ok) {
        const failure = data as { error?: unknown; code?: unknown };
        throw new OnlineError(typeof failure?.error === "string" ? failure.error : "Die Anfrage ist fehlgeschlagen.", response.status,
          typeof failure?.code === "string" ? failure.code : "SERVER_ERROR");
      }
      return data;
    } catch (error) {
      if (error instanceof OnlineError) throw error;
      throw new OnlineError(controller.signal.aborted ? "Der Server antwortet nicht. Die Verbindung wird erneut geprüft." : "Keine Verbindung zum Spielserver. Bitte Internetverbindung prüfen.");
    } finally { clearTimeout(timeout); }
  }

  private async joinResponse(body: object): Promise<JoinedGameResponse> {
    const data = await this.request("/api/game", body) as JoinedGameResponse;
    const checked = gameResponse(data);
    if (typeof data.playerId !== "string" || !data.playerId || typeof data.token !== "string" || !data.token
      || data.code !== checked.game.code || data.playerId !== checked.game.myPlayerId) {
      throw new OnlineError("Die Spielanmeldung konnte nicht gelesen werden.", 0, "INVALID_RESPONSE");
    }
    return { ...checked, code: data.code, playerId: data.playerId, token: data.token };
  }

  create(name: PlayerName, totalRounds: number, directRunRequirement: DirectRunRequirement, previousSession?: GameSession) {
    return this.joinResponse({ action: "create", name, totalRounds, directRunRequirement, ...(previousSession ? { previousSession: credentials(previousSession) } : {}) });
  }

  join(name: PlayerName, code: string) {
    return this.joinResponse({ action: "join", name, code: code.trim().toUpperCase() });
  }

  async snapshot(session: GameSession) { return gameResponse(await this.request("/api/game", { action: "snapshot", ...credentials(session) })); }
  async heartbeat(session: GameSession) { await this.request("/api/game", { action: "heartbeat", ...credentials(session) }); }
  async act(session: GameSession, action: OnlineAction) {
    const { type, ...extra } = action;
    return gameResponse(await this.request("/api/game", { action: type, ...extra, ...credentials(session) }));
  }

  async games(name: PlayerName): Promise<ListedGame[]> {
    const data = await this.request(`/api/games?name=${encodeURIComponent(name)}`) as { games?: ListedGame[] };
    if (!Array.isArray(data.games)) throw new OnlineError("Die Lobby-Liste konnte nicht gelesen werden.", 0, "INVALID_RESPONSE");
    return data.games;
  }

  async leaderboard(): Promise<LeaderboardEntry[]> {
    const data = await this.request("/api/leaderboard") as { leaderboard?: LeaderboardEntry[] | null };
    if (data.leaderboard === null) return [];
    if (!Array.isArray(data.leaderboard)) throw new OnlineError("Die Rangliste konnte nicht gelesen werden.", 0, "INVALID_RESPONSE");
    return data.leaderboard;
  }

  async realtimeConfig(): Promise<RealtimeConfig> {
    const data = await this.request("/api/mobile-config") as RealtimeConfig;
    if (typeof data.url !== "string" || !data.url.startsWith("https://") || typeof data.publishableKey !== "string" || !data.publishableKey) {
      throw new OnlineError("Echtzeit-Einstellungen sind nicht verfügbar.", 0, "INVALID_RESPONSE");
    }
    return data;
  }
}
