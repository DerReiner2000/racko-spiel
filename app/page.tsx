"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ArrowDown, Copy, Crown, Layers3, LogIn, Plus, RotateCcw, Trophy, Users } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { GameView, LeaderboardEntry, ListedGame, PLAYER_NAMES, PlayerName } from "@/lib/types";

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
  const [rounds, setRounds] = useState(3);
  const [directRunRequirement, setDirectRunRequirement] = useState<0 | 3 | 4>(0);
  const [listedGames, setListedGames] = useState<ListedGame[]>([]);
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

  useEffect(() => {
    if (screen !== "join" || !name) return;
    const timer = setInterval(async () => {
      try {
        const data = await api(`/api/games?name=${encodeURIComponent(name)}`);
        setListedGames(data.games);
      } catch { /* Die manuelle Aktualisierung zeigt mögliche Fehler an. */ }
    }, 15 * 1000);
    return () => clearInterval(timer);
  }, [screen, name]);

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

  async function loadListedGames(selectedName: PlayerName) {
    setBusy(true); setError("");
    try { const data = await api(`/api/games?name=${encodeURIComponent(selectedName)}`); setListedGames(data.games); }
    catch (err) { setError(err instanceof Error ? err.message : "Spiele konnten nicht geladen werden."); }
    finally { setBusy(false); }
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
        <button className="action-card" onClick={() => { setScreen("join"); setListedGames([]); if (name) loadListedGames(name); }}><LogIn/><span><strong>Spiel beitreten</strong><small>Offene und laufende Spiele ansehen</small></span></button>
        <button className="action-card" onClick={showLeaderboard}><Trophy/><span><strong>Rangliste</strong><small>Punkte & Statistiken ansehen</small></span></button>
      </section>}

      {(screen === "create" || screen === "join") && <section className="panel setup-panel">
        <button className="back" onClick={() => { setScreen("home"); setError(""); }}>← Zurück</button>
        <h2>{screen === "create" ? "Neue Runde erstellen" : "Spiel beitreten"}</h2>
        <label>Wer bist du?<select value={name} onChange={(e) => { const selected = e.target.value as PlayerName | ""; setName(selected); if (screen === "join" && selected) loadListedGames(selected); else if (!selected) setListedGames([]); }}><option value="">Spieler auswählen</option>{PLAYER_NAMES.map((player) => <option key={player}>{player}</option>)}</select></label>
        {screen === "create" ? <>
          <label>Runden<input type="number" min="1" max="20" value={rounds} onChange={(e) => setRounds(Math.max(1, Math.min(20, Number(e.target.value))))}/></label>
          <div className="field"><span>Rack’o-Bedingung</span><div className="segmented rule-options">{([0,3,4] as const).map((run) => <button type="button" className={directRunRequirement === run ? "active" : ""} onClick={() => setDirectRunRequirement(run)} key={run}>{run === 0 ? "Normal" : `${run}er-Folge`}</button>)}</div><small>{directRunRequirement ? `Zum Rack’o ist zusätzlich mindestens eine direkte Zahlenfolge aus ${directRunRequirement} Karten nötig.` : "Eine vollständig aufsteigende Reihe genügt."}</small></div>
          <button className="main-button" disabled={!name || busy} onClick={() => submit("create", { name, totalRounds: rounds, directRunRequirement })}>{busy ? "Wird erstellt …" : "Spiel erstellen"}</button>
        </> : <>
          {!name ? <p className="empty">Wähle zuerst deinen Namen. Danach erscheinen die verfügbaren Spiele.</p> : busy && !listedGames.length ? <p className="empty">Spiele werden geladen …</p> : <GameBrowser games={listedGames} name={name} onJoin={(gameCode) => submit("join", { name, code: gameCode })} onRefresh={() => loadListedGames(name)} busy={busy}/>}
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
    <span className="eyebrow">WARTERAUM</span><h1>Lobby {game.code}</h1><p>2 bis 4 Spieler können teilnehmen. Der Gastgeber entscheidet, wann es losgeht.</p>
    <button className="invite-code" onClick={copyCode}>{game.code}<Copy size={20}/></button>
    {game.directRunRequirement ? <p className="lobby-rule">Zusatzregel: direkte Folge aus mindestens {game.directRunRequirement} Karten</p> : <p className="lobby-rule">Klassische Rack’o-Regel</p>}
    <div className="seats">{Array.from({ length: 4 }, (_, i) => game.players[i] ? <div className="seat filled" key={i}><span>{game.players[i].name[0]}</span><strong>{game.players[i].name}</strong>{game.players[i].id === game.hostId && <small>Gastgeber</small>}</div> : <div className="seat" key={i}><span><Users/></span><strong>Freier Platz</strong><small>wartet …</small></div>)}</div>
    {game.isHost ? <button className="main-button" disabled={game.players.length < 2 || busy} onClick={() => act("start")}>{game.players.length >= 2 ? `Mit ${game.players.length} Spielern starten` : "Noch 1 Spieler benötigt"}</button> : <p className="waiting">Der Gastgeber startet das Spiel mit 2 bis 4 Spielern.</p>}
    {error && <p className="error">{error}</p>}
  </section></main>;

  if (game.status === "round_end" || game.status === "finished") {
    const selected = game.players.find((player) => player.id === selectedPlayerId) ?? game.players[0];
    const isFinished = game.status === "finished";
    const hasVotedForExtraRound = (game.extraRoundVotes ?? []).includes(game.myPlayerId);
    const rankedPlayers = [...game.players].sort((a, b) => isFinished
      ? b.totalScore - a.totalScore
      : (game.roundResults.find((result) => result.playerId === b.id)?.total ?? 0) - (game.roundResults.find((result) => result.playerId === a.id)?.total ?? 0));
    return <main className="game-shell"><GameHeader game={game} leave={leave}/><PlayerStrip game={game} selectedPlayerId={selected.id} onSelect={setSelectedPlayerId}/><section className={`results panel ${isFinished ? "final-results" : "round-results"}`}>
    <Crown size={38}/><span className="eyebrow">{isFinished ? "SPIEL BEENDET" : `ERGEBNIS RUNDE ${game.currentRound}`}</span>
    <h1>{isFinished ? `${game.players.filter((p) => game.gameWinnerIds.includes(p.id)).map((p) => p.name).join(" & ")} gewinnt!` : game.message}</h1>
    <p className="result-heading">{isFinished ? "Gesamtpunkte des Spiels" : "Punkte dieser Runde"}</p>
    <div className="result-list">{rankedPlayers.map((player, index) => { const result = game.roundResults.find((r) => r.playerId === player.id); const displayedScore = isFinished ? player.totalScore : result?.total ?? 0; return <div className="result-row" key={player.id}><span>{index + 1}</span><strong>{player.name}</strong><div className="result-score"><small>{isFinished ? "Gesamt" : "Diese Runde"}</small><b>{isFinished ? displayedScore : `+${displayedScore}`} <em>Pkt.</em></b></div></div> })}</div>
    <div className="revealed-hand"><p><strong>{selected.name}s Karten</strong><span>Spieler oben auswählen</span></p><div className="result-cards">{selected.hand?.map((card, index) => <PlayingCard card={card} maxCard={game.playerCount === 2 ? 50 : game.playerCount === 3 ? 60 : 75} key={index}/>)}</div></div>
    {game.status === "round_end" && game.currentRound < game.totalRounds && game.isHost && <button className="main-button" disabled={busy} onClick={() => act("nextRound")}>Nächste Runde</button>}
    {game.status === "round_end" && game.currentRound < game.totalRounds && !game.isHost && <p className="waiting">Warte auf den Gastgeber …</p>}
    {game.status === "round_end" && game.currentRound >= game.totalRounds && <div className="game-ending-actions">
      <button className="main-button finish-game" disabled={busy} onClick={() => act("finishGame")}>Endergebnis anzeigen</button>
      <button className={`main-button extra-round ${hasVotedForExtraRound ? "my-vote" : ""}`} aria-pressed={hasVotedForExtraRound} disabled={busy} onClick={() => { if (!hasVotedForExtraRound) act("voteExtraRound"); }}><span>Weitere Runde spielen</span><span className="vote-indicators" aria-label={`${(game.extraRoundVotes ?? []).length} von ${game.players.length} Spielern möchten weiterspielen`}>{game.players.map((player) => <i className={(game.extraRoundVotes ?? []).includes(player.id) ? "voted" : ""} title={`${player.name}: ${(game.extraRoundVotes ?? []).includes(player.id) ? "zugestimmt" : "noch offen"}`} key={player.id}/>)}</span></button>
      {hasVotedForExtraRound && <p className="waiting">Deine Stimme ist abgegeben. Die Zusatzrunde startet, sobald alle zugestimmt haben.</p>}
    </div>}
    {game.status === "finished" && <button className="main-button" onClick={leave}>Zur Startseite</button>}
    {error && <p className="error">{error}</p>}
  </section></main>;
  }

  return <main className="game-shell"><GameHeader game={game} leave={leave}/>
    <PlayerStrip game={game}/>
    <section className="table-area">
      <div className="portrait-board">
        <section className="rack-section"><div className="rack-label"><p>Deine Karten</p><div className="turn-message"><span className={game.isMyTurn ? "pulse" : ""}/>{game.isMyTurn ? "Du bist am Zug" : `${current?.name} ist am Zug`}</div></div><div className="rack">{me.hand?.map((card, index) => <button style={{ zIndex: index + 1 }} aria-label={`Karte ${card} auf Platz ${index + 1}`} disabled={!game.isMyTurn || game.drawnCard === null || busy || pendingRackoSlot !== null} onClick={() => {
          const nextHand = me.hand!.map((value, slot) => slot === index ? game.drawnCard! : value);
          const fromFront = [...nextHand].reverse();
          const longest = getLongestRun(fromFront);
          if (fromFront.every((value, slot) => slot === 0 || fromFront[slot - 1] < value) && (!(game.directRunRequirement ?? 0) || longest >= game.directRunRequirement)) setPendingRackoSlot(index);
          else act("swap", { slot: index, declareRacko: false });
        }} key={index}><PlayingCard card={card} maxCard={game.playerCount === 2 ? 50 : game.playerCount === 3 ? 60 : 75}/></button>)}</div></section>
        <div className="piles">
          <div className={`drawn active-card ${game.drawnCard === null ? "empty-card" : ""}`}><span>AKTIVE KARTE</span>{game.drawnCard !== null && game.isMyTurn ? <><b>{game.drawnCard}</b><small>Links einen Platz wählen</small>{game.drawnFrom === "deck" && <button disabled={busy} onClick={() => act("discard")}>Ablegen</button>}</> : <small className="empty-hint">Noch keine Karte gezogen</small>}</div>
          <button className="pile deck" disabled={!game.isMyTurn || game.drawnCard !== null || game.awaitingRacko || busy} onClick={() => act("draw", { source: "deck" })}>{game.isMyTurn && game.drawnCard === null && !game.awaitingRacko && !busy && <span className="draw-prompt">AUSWÄHLEN</span>}<Layers3/><strong>Verdeckt</strong><small>{game.deckCount} Karten</small></button>
          <button className="pile discard" disabled={!game.isMyTurn || game.drawnCard !== null || game.awaitingRacko || !topDiscard || busy} onClick={() => act("draw", { source: "discard" })}>{game.isMyTurn && game.drawnCard === null && !game.awaitingRacko && Boolean(topDiscard) && !busy && <span className="draw-prompt">AUSWÄHLEN</span>}{topDiscard ? <b>{topDiscard}</b> : <ArrowDown/>}<strong>Ablage</strong><small>{topDiscard ? "Offene Karte" : "Noch leer"}</small></button>
        </div>
      </div>
      {pendingRackoSlot !== null && <div className="racko-overlay"><div className="racko-call"><Crown/><p>Deine Reihe ist vollständig.</p><strong>Möchtest du Rack’o sagen?</strong><button disabled={busy} onClick={() => { act("swap", { slot: pendingRackoSlot, declareRacko: true }); setPendingRackoSlot(null); }}><Crown/> RACK’O!</button><button className="continue" disabled={busy} onClick={() => { act("swap", { slot: pendingRackoSlot, declareRacko: false }); setPendingRackoSlot(null); }}><RotateCcw/> Für Bonus weiterspielen</button></div></div>}
      {game.isMyTurn && !game.awaitingRacko && game.drawnCard === null && me.hand && canRackoLocally(me.hand, game.directRunRequirement ?? 0) && <button className="floating-racko" disabled={busy} onClick={() => act("racko")}><Crown/> Rack’o ausrufen</button>}
      {error && <p className="error game-error">{error}</p>}
    </section>
  </main>;
}

function GameBrowser({ games, name, onJoin, onRefresh, busy }: { games: ListedGame[]; name: PlayerName; onJoin: (code: string) => void; onRefresh: () => void; busy: boolean }) {
  const waiting = games.filter((game) => game.status === "lobby");
  const started = games.filter((game) => game.status !== "lobby" && game.status !== "finished");
  const section = (title: string, items: ListedGame[], startedGames = false) => <div className="game-list-section"><h3>{title}<span>{items.length}</span></h3>{items.length ? <div className="game-list">{items.map((game) => <article className="listed-game" key={game.code}><div className="lobby-code"><small>LOBBY</small><strong>{game.code}</strong></div><div className="listed-game-info"><strong>{game.hostName}s Spiel</strong><span>{game.playerNames.join(", ")}</span><small>{game.playerCount}/4 Spieler · {game.totalRounds} Runden{game.directRunRequirement ? ` · ${game.directRunRequirement}er-Folge` : " · Klassisch"}</small></div><button disabled={busy || (startedGames ? !game.canRejoin : !game.canJoin && !game.canRejoin)} onClick={() => onJoin(game.code)}>{game.canRejoin ? "Wieder beitreten" : startedGames ? "Nicht teilgenommen" : "Beitreten"}</button></article>)}</div> : <p className="empty">Keine Spiele in diesem Bereich.</p>}</div>;
  return <div className="game-browser"><div className="browser-heading"><p>Verfügbare Spiele für <strong>{name}</strong></p><button type="button" onClick={onRefresh} disabled={busy}>Aktualisieren</button></div>{section("Im Wartebereich", waiting)}{section("Bereits begonnen", started, true)}</div>;
}

function getLongestRun(cards: number[]) {
  let longest = cards.length ? 1 : 0;
  let current = longest;
  for (let i = 1; i < cards.length; i++) {
    current = cards[i] === cards[i - 1] + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

function canRackoLocally(hand: number[], requirement: 0 | 3 | 4) {
  const cards = [...hand].reverse();
  return cards.every((card, index) => index === 0 || cards[index - 1] < card) && (!requirement || getLongestRun(cards) >= requirement);
}

function PlayingCard({ card, maxCard }: { card: number; maxCard: number }) {
  const position = 8 + ((card - 1) / (maxCard - 1)) * 84;
  const hue = 150 - ((card - 1) / (maxCard - 1)) * 112;
  const style = {
    "--number-position": `${position}%`,
    "--card-accent": `hsl(${hue} 42% 31%)`,
  } as CSSProperties;
  return <span className="playing-card" style={style}><b className="corner top">{card}</b></span>;
}

function PlayerStrip({ game, selectedPlayerId, onSelect }: { game: GameView; selectedPlayerId?: string; onSelect?: (id: string) => void }) {
  const current = game.players[game.turnIndex];
  return <section className={`score-strip ${onSelect ? "selectable" : ""}`}>{game.players.map((player) => <button disabled={!onSelect} onClick={() => onSelect?.(player.id)} className={`${player.id === current?.id && game.status === "playing" ? "current" : ""} ${player.id === selectedPlayerId ? "selected" : ""}`} key={player.id}><span>{player.name[0]}</span><p><strong>{player.name}</strong><small>{player.totalScore} Punkte</small></p>{player.id === current?.id && game.status === "playing" && <b>AM ZUG</b>}</button>)}</section>;
}

function GameHeader({ game, leave }: { game: GameView; leave: () => void }) {
  return <header className="game-header"><div className="brand"><div className="brand-mark"><Layers3 size={20}/></div><span>Rack’o</span></div><div className="round-info">Runde <strong>{game.currentRound}</strong> / {game.totalRounds}<i/>Code <strong>{game.code}</strong></div><button onClick={leave}>Verlassen</button></header>;
}
