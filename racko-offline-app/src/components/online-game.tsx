import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Share, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import type { GameView, OnlineAction, StoredOnlineSession } from "../../../shared/online";
import { canDeclareRacko, deckSizeFor } from "../../../shared/game";
import { colors, PlayingCard, PrimaryButton, styles } from "./game-ui";
import { useOnlineGame } from "@/online/use-online-game";

export function OnlineGame({ session, onLeave, onExpired }: {
  session: StoredOnlineSession; onLeave: () => void; onExpired: () => void;
}) {
  const state = useOnlineGame(session);
  const { game, busy, connection, error } = state;
  const connected = connection === "connected";
  const disabled = busy || !connected;

  useEffect(() => { if (connection === "ended") onExpired(); }, [connection, onExpired]);

  return <SafeAreaView style={styles.gameSafe} edges={["top", "left", "right"]}>
    <View style={styles.gameHeader}><Text style={styles.primaryButtonText}>Rack’o</Text><Text selectable style={styles.headerRound}>Lobby {session.code}{game ? ` · Runde ${game.currentRound}/${game.totalRounds}` : ""}</Text><Pressable accessibilityRole="button" onPress={onLeave}><Text style={styles.headerEnd}>Verlassen</Text></Pressable></View>
    <View style={{ padding: 10, backgroundColor: connected ? colors.mint : "#FFF2D3", gap: 6 }}>
      <Text style={styles.hint}>{connected ? "● Verbunden · App & Browser spielen gemeinsam" : connection === "paused" ? "Spiel pausiert · Verbindung wird bei Rückkehr geprüft" : connection === "ended" ? "Diese Spielanmeldung ist nicht mehr verfügbar" : "Verbindung wird hergestellt …"}</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.red, fontSize: 13 }}>{error}</Text> : null}
      {(connection === "connecting" || connection === "reconnecting") && <Pressable onPress={() => { void state.refresh(); }}><Text style={styles.continueText}>Verbindung erneut prüfen</Text></Pressable>}
    </View>
    {!game ? <View style={[styles.setupPage, { flex: 1, justifyContent: "center" }]}><Text style={styles.panelTitle}>{connection === "ended" ? "Zurück zur Lobby-Auswahl" : "Deine Partie wird geladen"}</Text><Text style={styles.hint}>Dein Online-Spielstand liegt auf dem Server. Nach einer Unterbrechung wird er neu abgeglichen.</Text><PrimaryButton label="Zur Übersicht" onPress={onLeave} /></View>
      : <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scoreStrip}>{game.players.map((player, index) => <View key={player.id} style={[styles.scorePlayer, game.status === "playing" && index === game.turnIndex && styles.scorePlayerCurrent]}><Text style={styles.scoreAvatar}>{player.name[0]}</Text><View><Text style={styles.scoreName}>{player.name}{player.id === game.myPlayerId ? " (du)" : ""}</Text><Text style={styles.scorePoints}>{player.totalScore} Punkte</Text></View></View>)}</ScrollView>
        {game.status === "lobby" ? <ScrollView contentContainerStyle={styles.setupPage}>
          <View style={styles.panel}><Text style={styles.eyebrow}>WARTERAUM</Text><Text style={styles.panelTitle}>Lobby {game.code}</Text><Text style={styles.hint}>2 bis 4 Personen können mitspielen – im Browser oder in der App.</Text>
            <Text selectable style={[styles.handoffName, { color: colors.green, marginVertical: 18 }]}>{game.code}</Text>
            {game.players.map((player) => <Text key={player.id} style={[styles.hint, { marginBottom: 10 }]}>{player.name}{player.id === game.hostId ? " · Gastgeber" : ""}</Text>)}
            <Text style={styles.ruleHint}>{game.totalRounds} Runden · {game.directRunRequirement ? `Mindestens ${game.directRunRequirement}er-Folge` : "Klassische Rack’o-Regel"}</Text>
            <PrimaryButton disabled={disabled} label="Einladung teilen" onPress={() => { void Share.share({ message: `Spiele Rack’o mit uns! Lobby ${game.code}: ${session.serverUrl}` }).catch(() => undefined); }} />
            {game.isHost ? <View style={{ marginTop: 12 }}><PrimaryButton disabled={disabled || game.players.length < 2} label={game.players.length < 2 ? "Noch 1 Spieler benötigt" : `Mit ${game.players.length} Spielern starten`} onPress={() => { void state.act({ type: "start" }); }} /></View> : <Text style={styles.hint}>Der Gastgeber startet die Partie.</Text>}
          </View>
        </ScrollView>
          : game.status === "playing" ? <OnlineBoard key={`${game.currentRound}:${game.turnIndex}:${game.drawnCard}:${connection}`} game={game} disabled={disabled} act={(action) => { void state.act(action); }} />
            : <OnlineResults game={game} disabled={disabled} act={(action) => { void state.act(action); }} onLeave={onLeave} />}
      </>}
  </SafeAreaView>;
}

function OnlineBoard({ game, disabled, act }: { game: GameView; disabled: boolean; act: (action: OnlineAction) => void }) {
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const me = game.players.find((player) => player.id === game.myPlayerId)!;
  const current = game.players[game.turnIndex];
  const topDiscard = game.discard.at(-1);
  const myDrawnCard = game.isMyTurn ? game.drawnCard : null;
  const mayDraw = game.isMyTurn && !disabled && myDrawnCard === null && !game.awaitingRacko;
  const maySwap = game.isMyTurn && !disabled && myDrawnCard !== null;
  const maxCard = deckSizeFor(game.playerCount);
  function choose(slot: number) {
    if (!maySwap || !me.hand) return;
    const hand = me.hand.map((card, index) => index === slot ? myDrawnCard! : card);
    if (canDeclareRacko(hand, game.directRunRequirement ?? 0)) setPendingSlot(slot);
    else act({ type: "swap", slot, declareRacko: false });
  }
  return <>
    <ScrollView contentContainerStyle={styles.gamePage}>
      <View style={styles.turnRow}><View><Text style={styles.eyebrow}>{game.isMyTurn ? "DEIN ZUG" : "AM ZUG"}</Text><Text style={styles.turnName}>{game.isMyTurn ? me.name : current?.name}</Text></View></View>
      <View style={styles.board}>
        <View style={styles.rackArea}><View style={styles.rackLabel}><Text style={styles.rackEnd}>HINTEN</Text><Text style={styles.rackTitle}>Deine Karten</Text></View>
          <LinearGradient colors={[colors.green, colors.green2]} style={styles.rack}>{me.hand?.map((card, index) => <Pressable accessibilityRole="button" accessibilityLabel={`Karte ${card} auf Platz ${index + 1} austauschen`} disabled={!maySwap || pendingSlot !== null} key={index} onPress={() => choose(index)} style={styles.rackSlot}><PlayingCard card={card} maxCard={maxCard} /></Pressable>)}</LinearGradient><Text style={[styles.rackEnd, styles.rackFront]}>VORNE</Text>
        </View>
        <View style={styles.piles}>
          <View style={[styles.pile, styles.activeCard, myDrawnCard === null && styles.emptyCard]}><Text style={styles.pileOverline}>AKTIVE KARTE</Text>{myDrawnCard === null ? <Text style={styles.emptyText}>{game.isMyTurn ? "Ziehe eine Karte" : "Warte auf deinen Zug"}</Text> : <><Text style={styles.activeNumber}>{myDrawnCard}</Text><Text style={styles.pileHint}>Links einen Platz wählen</Text>{game.drawnFrom === "deck" && <Pressable disabled={disabled} onPress={() => act({ type: "discard" })} style={styles.discardUnused}><Text style={styles.discardUnusedText}>Ablegen</Text></Pressable>}</>}</View>
          <Pressable accessibilityRole="button" accessibilityLabel="Verdeckte Karte ziehen" disabled={!mayDraw} onPress={() => act({ type: "draw", source: "deck" })} style={[styles.pile, styles.deck, !mayDraw && styles.pileDisabled]}><Text style={styles.deckPattern}>▥</Text><Text style={styles.deckTitle}>Verdeckt</Text><Text style={styles.deckCount}>{game.deckCount} Karten</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={topDiscard ? `Offene Karte ${topDiscard} ziehen` : "Ablagestapel leer"} disabled={!mayDraw || !topDiscard} onPress={() => act({ type: "draw", source: "discard" })} style={[styles.pile, styles.openPile, (!mayDraw || !topDiscard) && styles.pileDisabled]}><Text style={styles.discardNumber}>{topDiscard ?? "↓"}</Text><Text style={styles.openTitle}>Ablage</Text></Pressable>
        </View>
      </View>
      {game.isMyTurn && game.drawnCard === null && me.hand && canDeclareRacko(me.hand, game.directRunRequirement ?? 0) && <Pressable disabled={disabled} style={styles.rackoButton} onPress={() => act({ type: "racko" })}><Text style={styles.rackoButtonText}>♛ RACK’O AUSRUFEN</Text></Pressable>}
    </ScrollView>
    <Modal visible={pendingSlot !== null} transparent animationType="fade" onRequestClose={() => setPendingSlot(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalCrown}>♛</Text><Text style={styles.modalTitle}>Rack’o ausrufen?</Text><PrimaryButton disabled={disabled} label="RACK’O!" onPress={() => { if (pendingSlot !== null) act({ type: "swap", slot: pendingSlot, declareRacko: true }); setPendingSlot(null); }} /><Pressable disabled={disabled} style={styles.continueButton} onPress={() => { if (pendingSlot !== null) act({ type: "swap", slot: pendingSlot, declareRacko: false }); setPendingSlot(null); }}><Text style={styles.continueText}>Für Bonus weiterspielen</Text></Pressable></View></View></Modal>
  </>;
}

function OnlineResults({ game, disabled, act, onLeave }: { game: GameView; disabled: boolean; act: (action: OnlineAction) => void; onLeave: () => void }) {
  const [selectedId, setSelectedId] = useState(game.myPlayerId);
  const selected = game.players.find((player) => player.id === selectedId) ?? game.players[0];
  const finished = game.status === "finished";
  const voted = (game.extraRoundVotes ?? []).includes(game.myPlayerId);
  const players = [...game.players].sort((a, b) => finished ? b.totalScore - a.totalScore : b.roundScore - a.roundScore);
  return <ScrollView contentContainerStyle={styles.resultsPage}><View style={styles.resultsPanel}>
    <Text style={styles.resultsCrown}>♛</Text><Text style={styles.eyebrow}>{finished ? "SPIEL BEENDET" : `ERGEBNIS RUNDE ${game.currentRound}`}</Text>
    <Text style={styles.resultsTitle}>{finished ? `${game.players.filter((player) => game.gameWinnerIds.includes(player.id)).map((player) => player.name).join(" & ")} gewinnt!` : game.message}</Text>
    <View style={styles.ranking}>{players.map((player, index) => <View key={player.id} style={[styles.resultRow, index === 0 && styles.winnerRow]}><Text style={styles.rank}>{index + 1}</Text><Text style={styles.resultName}>{player.name}</Text><View style={styles.scoreBox}><Text style={styles.scoreLabel}>{finished ? "GESAMT" : "DIESE RUNDE"}</Text><Text style={styles.scoreValue}>{finished ? player.totalScore : `+${player.roundScore}`}</Text></View></View>)}</View>
    <Text style={styles.cardsTitle}>Karten ansehen</Text><ScrollView horizontal contentContainerStyle={styles.playerTabs}>{game.players.map((player) => <Pressable key={player.id} onPress={() => setSelectedId(player.id)} style={[styles.playerTab, selectedId === player.id && styles.playerTabActive]}><Text style={[styles.playerTabText, selectedId === player.id && styles.playerTabTextActive]}>{player.name}</Text></Pressable>)}</ScrollView>
    <ScrollView horizontal contentContainerStyle={styles.resultCards}>{selected.hand?.map((card, index) => <View key={index} style={styles.resultCard}><PlayingCard card={card} maxCard={deckSizeFor(game.playerCount)} compact /></View>)}</ScrollView>
    {!finished && game.currentRound < game.totalRounds && (game.isHost ? <PrimaryButton disabled={disabled} label="Nächste Runde" onPress={() => act({ type: "nextRound" })} /> : <Text style={styles.hint}>Warte auf den Gastgeber …</Text>)}
    {!finished && game.currentRound >= game.totalRounds && <View style={styles.finalActions}><PrimaryButton disabled={disabled} label="Endergebnis anzeigen" onPress={() => act({ type: "finishGame" })} /><Pressable disabled={disabled || voted} style={styles.continueButton} onPress={() => act({ type: "voteExtraRound" })}><Text style={styles.continueText}>{voted ? "Zugestimmt" : "Weitere Runde spielen"} · {(game.extraRoundVotes ?? []).length}/{game.players.length}</Text></Pressable>{voted && <Text style={styles.hint}>Die Zusatzrunde startet, sobald alle zugestimmt haben.</Text>}</View>}
    {finished && <PrimaryButton label="Zur Übersicht" onPress={onLeave} />}
  </View></ScrollView>;
}
