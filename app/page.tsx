"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, Copy, Crown, Layers3, LogIn, Plus, RotateCcw, Trophy, Users } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { GameView, LeaderboardEntry, PLAYER_NAMES, PlayerName } from "@/lib/types";

type Session = { code: string; playerId: string; token: string };
type Screen = "home" | "create" | "join" | "leaderboard" | "game";

async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Etwas ist schiefgelaufen.");
  return data;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [name, setName] = useState<PlayerName | "">("");
  const [code, setCode] = useState("");
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [rounds, setRounds] = useState(3);
  const [session, setSession] = useState<Session | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadGame = useCallback(async (active: Session, quiet = false) => {
    try {
      const data = await api("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "snapshot", ...active }),
      });
      setGame(data.game);
      if (!quiet) setError("");
    } catch (err) {
      if (!quiet) setError(err instanceof Error ? err.message : "Spiel konnte nicht geladen werden.");
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("racko-session");
    if (!saved) return;
    try {
      const active = JSON.parse(saved) as Session;
      setSession(active);
      setScreen("game");
      loadGame(active);
    } catch { localStorage.removeItem("racko-session"); }
  }, [loadGame]);

  useEffect(() => {
    if (!session || screen !== "game") return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    let realtimeHealthy = false;
    const channel = supabase
      .channel(`game-${session.code}`)
      .on("broadcast", { event: "changed" }, () => loadGame(session, true))
      .subscribe((status) => {
        realtimeHealthy = status === "SUBSCRIBED";
        if (realtimeHealthy) loadGame(session, true);
      });

    const heartbeat = setInterval(() => {
      api("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat", ...session }),
      }).catch(() => undefined);
    }, 5 * 60 * 1000);

    const fallback = setInterval(() => {
      if (!realtimeHealthy) loadGame(session, true);
    }, 15 * 1000);

    return () => {
      clearInterval(heartbeat);
      clearInterval(fallback);
      supabase.removeChannel(channel);
    };
  }, [session, screen, loadGame]);

  async function submit(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setError("");
    try {
      let previousSession: Session | undefined;
      if (action === "create") {
        const savedPrevious = localStorage.getItem("racko-previous-session");
        if (savedPrevious) {
          try { previousSession = JSON.parse(savedPrevious) as Session; } catch { localStorage.removeItem("racko-previous-session"); }
        }
      }
      const body = session ? { action, ...session, ...extra } : { action, ...extra, ...(previousSession ? { previousSession } : {}) };
      const data = await api("/api/game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (data.playerId) {
        const active = { code: data.code, playerId: data.playerId, token: data.token };
        setSession(active); localStorage.setItem("racko-session", JSON.stringify(active));
        if (action === "create") localStorage.removeItem("racko-previous-session");
      }
      if (data.game) setGame(data.game);
      setScreen("game");
    } catch (err) { setError(err instanceof Error ? err.message : "Etwas ist schiefgelaufen."); }
    finally { setBusy(false); }
  }

  async function showLeaderboard() {
    setScreen("leaderboard"); setError("");
    try { const data = await api("/api/leaderboard"); setLeaderboard(data.leaderboard); }
    catch (err) { setError(err instanceof Error ? err.message : "Rangliste konnte nicht geladen werden."); }
  }

  function leave() {
    if (session) localStorage.setItem("racko-previous-session", JSON.stringify(session));
    localStorage.removeItem("racko-session"); setSession(null); setGame(null); setScreen("home"); setError("");
  }

  if (screen === "game" && game && session) return <Game game={game} busy={busy} error={error} act={submit} leave={leave} />;

  return (
    <main className="shell">
      <header className="brand"><div className="brand-mark"><Layers3 size={25}/></div><span>Rack’o</span><small>PRIVATE SPIELRUNDE</small></header>
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">KARTEN. TAKTIK. RACK’O.</span>
          <h1>Bring deine Karten<br/><em>in die richtige Reihe.</em></h1>
          <p>Spielt gemeinsam in privaten Runden, sammelt Punkte und kämpft euch an die Spitze der Rangliste.</p>
        </div>
        <div className="card-fan" aria-hidden="true"><b>12</b><b>31</b><b>44</b><b>58</b></div>
      </section>

      {screen === "home" && <section className="action-grid">
        <button className="action-card primary" onClick={() => setScreen("create")}><Plus/><span><strong>Neues Spiel</strong><small>Runde erstellen & Freunde einladen</small></span></button>
        <button className="action-card" onClick={() => setScreen("join")}><LogIn/><span><strong>Spiel beitreten</strong><small>Mit einem Spielcode einsteigen</small></span></button>
        <button className="action-card" onClick={showLeaderboard}><Trophy/><span><strong>Rangliste</strong><small>Punkte & Statistiken ansehen</small></span></button>
      </section>}

      {(screen === "create" || screen === "join") && <section className="panel setup-panel">
        <button className="back" onClick={() => { setScreen("home"); setError(""); }}>← Zurück</button>
        <h2>{screen === "create" ? "Neue Runde erstellen" : "Spiel beitreten"}</h2>
        <label>Wer bist du?<select value={name} onChange={(e) => setName(e.target.value as PlayerName)}><option value="">Spieler auswählen</option>{PLAYER_NAMES.map((player) => <option key={player}>{player}</option>)}</select></label>
        {screen === "create" ? <>
          <div className="field"><span>Spielerzahl</span><div className="segmented">{([2,3,4] as const).map((count) => <button className={playerCount === count ? "active" : ""} onClick={() => setPlayerCount(count)} key={count}>{count}</button>)}</div></div>
          <label>Runden<input type="number" min="1" max="20" value={rounds} onChange={(e) => setRounds(Math.max(1, Math.min(20, Number(e.target.value))))}/></label>
          <button className="main-button" disabled={!name || busy} onClick={() => submit("create", { name, playerCount, totalRounds: rounds })}>{busy ? "Wird erstellt …" : "Spiel erstellen"}</button>
        </> : <>
          <label>Spielcode<input className="code-input" maxLength={5} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABCDE"/></label>
          <button className="main-button" disabled={!name || code.length !== 5 || busy} onClick={() => submit("join", { name, code })}>{busy ? "Beitritt …" : "Beitreten"}</button>
        </>}
        {error && <p className="error">{error}</p>}
      </section>}

      {screen === "leaderboard" && <section className="panel leaderboard">
        <button className="back" onClick={() => { setScreen("home"); setError(""); }}>← Zurück</button>
        <div className="panel-title"><Trophy/><div><h2>Rangliste</h2><p>Durchschnittswerte aller abgeschlossenen Spiele</p></div></div>
        {leaderboard.length ? <div className="table-wrap"><table><thead><tr><th>#</th><th>Spieler</th><th>Spiele</th><th>Siege</th><th>Ø / Runde</th><th>Ø / Spiel</th></tr></thead><tbody>{leaderboard.map((entry, index) => <tr key={entry.player_name}><td>{index + 1}</td><td><strong>{entry.player_name}</strong></td><td>{entry.games_played}</td><td>{entry.wins}</td><td>{entry.average_per_round ?? "–"}</td><td>{entry.average_per_game ?? "–"}</td></tr>)}</tbody></table></div> : <p className="empty">Noch kein Spiel abgeschlossen. Die erste Runde eröffnet die Rangliste.</p>}
        {error && <p className="error">{error}</p>}
      </section>}
      <footer>Privat gespielt · Für eure Rack’o-Runde</footer>
    </main>
  );
}

function Game({ game, busy, error, act, leave }: { game: GameView; busy: boolean; error: string; act: (action: string, extra?: Record<string, unknown>) => void; leave: () => void }) {
  const [pendingRackoSlot, setPendingRackoSlot] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(game.myPlayerId);
  const me = game.players.find((player) => player.id === game.myPlayerId)!;
  const current = game.players[game.turnIndex];
  const topDiscard = game.discard.at(-1);
  const copyCode = () => navigator.clipboard.writeText(game.code);

  if (game.status === "lobby") return <main className="game-shell"><GameHeader game={game} leave={leave}/><section className="lobby-card">
    <span className="eyebrow">WARTERAUM</span><h1>Die Runde füllt sich.</h1><p>Teile diesen Code mit deinen Mitspielern.</p>
    <button className="invite-code" onClick={copyCode}>{game.code}<Copy size={20}/></button>
    <div className="seats">{Array.from({ length: game.playerCount }, (_, i) => game.players[i] ? <div className="seat filled" key={i}><span>{game.players[i].name[0]}</span><strong>{game.players[i].name}</strong>{game.players[i].id === game.hostId && <small>Gastgeber</small>}</div> : <div className="seat" key={i}><span><Users/></span><strong>Freier Platz</strong><small>wartet …</small></div>)}</div>
    {game.isHost ? <button className="main-button" disabled={game.players.length !== game.playerCount || busy} onClick={() => act("start")}>{game.players.length === game.playerCount ? "Spiel starten" : `Noch ${game.playerCount - game.players.length} Spieler benötigt`}</button> : <p className="waiting">Der Gastgeber startet das Spiel.</p>}
    {error && <p className="error">{error}</p>}
  </section></main>;

  if (game.status === "round_end" || game.status === "finished") {
    const selected = game.players.find((player) => player.id === selectedPlayerId) ?? game.players[0];
    return <main className="game-shell"><GameHeader game={game} leave={leave}/><PlayerStrip game={game} selectedPlayerId={selected.id} onSelect={setSelectedPlayerId}/><section className="results panel">
    <Crown size={38}/><span className="eyebrow">{game.status === "finished" ? "SPIEL BEENDET" : `RUNDE ${game.currentRound} BEENDET`}</span>
    <h1>{game.status === "finished" ? `${game.players.filter((p) => game.gameWinnerIds.includes(p.id)).map((p) => p.name).join(" & ")} gewinnt!` : game.message}</h1>
    <div className="result-list">{[...game.players].sort((a,b) => b.totalScore-a.totalScore).map((player, index) => { const result = game.roundResults.find((r) => r.playerId === player.id); return <div className="result-row" key={player.id}><span>{index + 1}</span><strong>{player.name}</strong><small>{result ? `Runde +${result.total}` : `${player.rackos} Rack’o`}</small><b>{player.totalScore} Pkt.</b></div> })}</div>
    <div className="revealed-hand"><p><strong>{selected.name}s Karten</strong><span>Spieler oben auswählen</span></p><div className="result-cards">{selected.hand?.map((card, index) => <PlayingCard card={card} index={index} maxCard={game.playerCount === 2 ? 50 : game.playerCount === 3 ? 60 : 75} key={index}/>)}</div></div>
    {game.status === "round_end" && game.isHost && <button className="main-button" disabled={busy} onClick={() => act("nextRound")}>{game.currentRound === game.totalRounds ? "Spiel abschließen" : "Nächste Runde"}</button>}
    {game.status === "round_end" && !game.isHost && <p className="waiting">Warte auf den Gastgeber …</p>}
    {game.status === "finished" && <button className="main-button" onClick={leave}>Zur Startseite</button>}
    {error && <p className="error">{error}</p>}
  </section></main>;
  }

  return <main className="game-shell"><GameHeader game={game} leave={leave}/>
    <PlayerStrip game={game}/>
    <section className="table-area">
      <div className="portrait-board">
        <section className="rack-section"><div className="rack-label"><p>Deine Karten</p><div className="turn-message"><span className={game.isMyTurn ? "pulse" : ""}/>{game.isMyTurn ? "Du bist am Zug" : `${current?.name} ist am Zug`}</div></div><div className="rack">{me.hand?.map((card, index) => <button aria-label={`Karte ${card} auf Platz ${index + 1}`} disabled={!game.isMyTurn || game.drawnCard === null || busy || pendingRackoSlot !== null} onClick={() => {
          const nextHand = me.hand!.map((value, slot) => slot === index ? game.drawnCard! : value);
          const fromFront = [...nextHand].reverse();
          if (fromFront.every((value, slot) => slot === 0 || fromFront[slot - 1] < value)) setPendingRackoSlot(index);
          else act("swap", { slot: index, declareRacko: false });
        }} key={index}><PlayingCard card={card} index={index} maxCard={game.playerCount === 2 ? 50 : game.playerCount === 3 ? 60 : 75}/></button>)}</div></section>
        <div className="piles">
          <div className={`drawn active-card ${game.drawnCard === null ? "empty-card" : ""}`}><span>AKTIVE KARTE</span>{game.drawnCard !== null && game.isMyTurn ? <><b>{game.drawnCard}</b><small>Links einen Platz wählen</small>{game.drawnFrom === "deck" && <button disabled={busy} onClick={() => act("discard")}>Ablegen</button>}</> : <small className="empty-hint">Noch keine Karte gezogen</small>}</div>
          <button className="pile deck" disabled={!game.isMyTurn || game.drawnCard !== null || game.awaitingRacko || busy} onClick={() => act("draw", { source: "deck" })}><Layers3/><strong>Verdeckt</strong><small>{game.deckCount} Karten</small></button>
          <button className="pile discard" disabled={!game.isMyTurn || game.drawnCard !== null || game.awaitingRacko || !topDiscard || busy} onClick={() => act("draw", { source: "discard" })}>{topDiscard ? <b>{topDiscard}</b> : <ArrowDown/>}<strong>Ablage</strong><small>{topDiscard ? "Offene Karte" : "Noch leer"}</small></button>
        </div>
      </div>
      {pendingRackoSlot !== null && <div className="racko-overlay"><div className="racko-call"><Crown/><p>Deine Reihe ist vollständig.</p><strong>Möchtest du Rack’o sagen?</strong><button disabled={busy} onClick={() => { act("swap", { slot: pendingRackoSlot, declareRacko: true }); setPendingRackoSlot(null); }}><Crown/> RACK’O!</button><button className="continue" disabled={busy} onClick={() => { act("swap", { slot: pendingRackoSlot, declareRacko: false }); setPendingRackoSlot(null); }}><RotateCcw/> Für Bonus weiterspielen</button></div></div>}
      {game.isMyTurn && !game.awaitingRacko && game.drawnCard === null && me.hand && [...me.hand].reverse().every((card, i, cards) => i === 0 || cards[i-1] < card) && <button className="floating-racko" disabled={busy} onClick={() => act("racko")}><Crown/> Rack’o ausrufen</button>}
      {error && <p className="error game-error">{error}</p>}
    </section>
  </main>;
}

function PlayingCard({ card, index, maxCard }: { card: number; index: number; maxCard: number }) {
  const position = 8 + ((card - 1) / (maxCard - 1)) * 84;
  return <span className="playing-card"><small>{index + 1}</small><b className="corner top" style={{ left: `${position}%` }}>{card}</b></span>;
}

function PlayerStrip({ game, selectedPlayerId, onSelect }: { game: GameView; selectedPlayerId?: string; onSelect?: (id: string) => void }) {
  const current = game.players[game.turnIndex];
  return <section className={`score-strip ${onSelect ? "selectable" : ""}`}>{game.players.map((player) => <button disabled={!onSelect} onClick={() => onSelect?.(player.id)} className={`${player.id === current?.id && game.status === "playing" ? "current" : ""} ${player.id === selectedPlayerId ? "selected" : ""}`} key={player.id}><span>{player.name[0]}</span><p><strong>{player.name}</strong><small>{player.totalScore} Punkte</small></p>{player.id === current?.id && game.status === "playing" && <b>AM ZUG</b>}</button>)}</section>;
}

function GameHeader({ game, leave }: { game: GameView; leave: () => void }) {
  return <header className="game-header"><div className="brand"><div className="brand-mark"><Layers3 size={20}/></div><span>Rack’o</span></div><div className="round-info">Runde <strong>{game.currentRound}</strong> / {game.totalRounds}<i/>Code <strong>{game.code}</strong></div><button onClick={leave}>Verlassen</button></header>;
}
