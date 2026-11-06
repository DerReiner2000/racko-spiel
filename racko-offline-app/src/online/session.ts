import type { GameResponse, GameSession, GameView, OnlineAction } from "../../../shared/online";
import { isExpiredSession, OnlineError } from "./client";

export type Connection = "connecting" | "connected" | "reconnecting" | "paused" | "ended";
export interface SessionState {
  game: GameView | null;
  connection: Connection;
  error: string;
  busy: boolean;
}

export interface SessionApi {
  snapshot(session: GameSession): Promise<GameResponse>;
  heartbeat(session: GameSession): Promise<void>;
  act(session: GameSession, action: OnlineAction): Promise<GameResponse>;
}

export type ConnectRealtime = (changed: () => void, healthy: (value: boolean) => void) => Promise<() => void>;
type Every = (callback: () => void, milliseconds: number) => () => void;

/** One session owns all subscriptions and requests. Late results from a paused
 * or abandoned session cannot overwrite the currently displayed game. */
export class OnlineGameSession {
  private state: SessionState = { game: null, connection: "connecting", error: "", busy: false };
  private listeners = new Set<(state: SessionState) => void>();
  private active = false;
  private epoch = 0;
  private sequence = 0;
  private version = -1;
  private reading = false;
  private writing = false;
  private dirty = false;
  private healthy = false;
  private actionError = "";
  private cleanup: (() => void)[] = [];

  constructor(private readonly api: SessionApi, private readonly session: GameSession,
    private readonly connectRealtime?: ConnectRealtime,
    private readonly every: Every = (callback, milliseconds) => {
      const timer = setInterval(callback, milliseconds);
      return () => clearInterval(timer);
    }) {}

  getState = () => this.state;
  subscribe = (listener: (state: SessionState) => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener(this.state));
  }
  private accept(response: GameResponse) {
    if (response.version !== undefined && response.version < this.version) return;
    if (response.version !== undefined) this.version = response.version;
    this.update({ game: response.game, connection: "connected", error: this.actionError });
  }
  private fail(error: unknown) {
    const message = error instanceof Error ? error.message : "Verbindung konnte nicht hergestellt werden.";
    if (isExpiredSession(error)) {
      this.stop();
      this.update({ game: null, connection: "ended", error: message, busy: false });
    } else {
      this.update({ connection: "reconnecting", error: message });
    }
  }

  start() {
    if (this.active || this.state.connection === "ended") return;
    this.active = true;
    const epoch = ++this.epoch;
    this.healthy = false;
    this.actionError = "";
    this.update({ connection: this.state.game ? "reconnecting" : "connecting", busy: this.writing });
    void this.refresh();
    this.cleanup.push(this.every(() => { if (!this.healthy || this.state.connection !== "connected") void this.refresh(); }, 15000));
    this.cleanup.push(this.every(() => {
      void this.api.heartbeat(this.session).catch((error) => { if (this.active && epoch === this.epoch) this.fail(error); });
    }, 5 * 60 * 1000));
    if (this.connectRealtime) {
      void this.connectRealtime(
        () => { if (this.active && epoch === this.epoch) void this.refresh(); },
        (healthy) => {
          if (!this.active || epoch !== this.epoch) return;
          this.healthy = healthy;
          if (healthy) void this.refresh();
        },
      ).then((dispose) => {
        if (this.active && epoch === this.epoch) this.cleanup.push(dispose);
        else dispose();
      }).catch(() => { /* The HTTP fallback remains active. */ });
    }
  }

  stop() {
    this.active = false;
    this.epoch++;
    this.reading = false;
    this.dirty = false;
    this.healthy = false;
    this.cleanup.splice(0).forEach((dispose) => dispose());
  }

  pause() {
    this.stop();
    if (this.state.connection !== "ended") this.update({ connection: "paused" });
  }

  async refresh(): Promise<void> {
    if (!this.active) return;
    if (this.reading || this.writing) { this.dirty = true; return; }
    const epoch = this.epoch;
    const sequence = this.sequence;
    this.reading = true;
    try {
      const response = await this.api.snapshot(this.session);
      if (this.active && epoch === this.epoch && sequence === this.sequence) this.accept(response);
    } catch (error) {
      if (this.active && epoch === this.epoch && sequence === this.sequence) this.fail(error);
    } finally {
      if (epoch === this.epoch) {
        this.reading = false;
        if (this.dirty) { this.dirty = false; void this.refresh(); }
      }
    }
  }

  async act(action: OnlineAction): Promise<void> {
    if (!this.active || this.writing || this.state.connection !== "connected") return;
    this.writing = true;
    this.sequence++;
    const epoch = this.epoch;
    this.actionError = "";
    this.update({ busy: true, error: "" });
    try {
      const response = await this.api.act(this.session, action);
      if (this.active && epoch === this.epoch) this.accept(response);
    } catch (error) {
      if (this.active && epoch === this.epoch) {
        if (error instanceof OnlineError && error.status === 400) {
          this.actionError = error.message;
          this.update({ error: error.message });
        }
        else this.fail(error);
        this.dirty = true;
      }
    } finally {
      this.writing = false;
      if (this.active && epoch !== this.epoch) {
        // A request may finish while the phone is being unlocked. Its result
        // belongs to the old foreground period; fetch the server state again.
        this.update({ busy: false });
        this.dirty = false;
        void this.refresh();
      }
      if (this.active && epoch === this.epoch) {
        this.update({ busy: false });
        if (this.dirty) { this.dirty = false; void this.refresh(); }
      }
    }
  }
}
