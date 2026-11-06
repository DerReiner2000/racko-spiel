import { Brand, PlayingCard, PrimaryButton, colors, styles } from "@/components/game-ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  canDeclareRacko,
  continueGame,
  createGame,
  deckSizeFor,
  declareRacko,
  DirectRunRequirement,
  discardDrawnCard,
  drawCard,
  finishGame,
  GameState,
  GameRuleError,
  PLAYER_NAMES,
  swapCard,
} from "@/game/engine";

const STORAGE_KEY = "racko-offline-game-v1";


export default function LocalScreen() {
  const [game, setGame] = useState<GameState | null>(null);
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as GameState;
        if (parsed.version === 1 && parsed.players?.length >= 2) setSavedGame(parsed);
      } catch {
        AsyncStorage.removeItem(STORAGE_KEY);
      }
    }).finally(() => setReady(true));
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") setRevealed(false);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (game) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  function updateGame(action: () => GameState) {
    try {
      const next = action();
      if (game?.status === "playing" && next.status === "playing" && next.turnIndex !== game.turnIndex) setRevealed(false);
      setGame(next);
    } catch (error) {
      if (error instanceof GameRuleError) Alert.alert("Spielzug nicht möglich", error.message);
      else throw error;
    }
  }

  function requestReset() {
    Alert.alert("Partie beenden?", "Der gespeicherte Spielstand wird gelöscht.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Partie beenden", style: "destructive", onPress: () => {
        AsyncStorage.removeItem(STORAGE_KEY);
        setGame(null);
        setSavedGame(null);
        setRevealed(false);
      } },
    ]);
  }

  if (!ready) return <SafeAreaView style={styles.loading}><Text style={styles.loadingText}>Rack’o Offline!</Text></SafeAreaView>;
  if (!game) return <SetupScreen savedGame={savedGame} onResume={() => { setGame(savedGame); setRevealed(false); }} onStart={(next) => { setGame(next); setSavedGame(null); setRevealed(false); }} />;
  if (game.status !== "playing") return <ResultsScreen game={game} onContinue={() => { updateGame(() => continueGame(game)); setRevealed(false); }} onFinish={() => updateGame(() => finishGame(game))} onReset={requestReset} />;
  if (!revealed) return <HandoffScreen game={game} onReveal={() => setRevealed(true)} />;
  return <GameScreen game={game} onUpdate={updateGame} onHide={() => setRevealed(false)} onReset={requestReset} />;
}

function SetupScreen({ savedGame, onResume, onStart }: { savedGame: GameState | null; onResume: () => void; onStart: (game: GameState) => void }) {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [rounds, setRounds] = useState(3);
  const [requirement, setRequirement] = useState<DirectRunRequirement>(0);
  const toggle = (name: string) => setSelectedNames((current) => current.includes(name) ? current.filter((item) => item !== name) : current.length < 4 ? [...current, name] : current);
  return <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    <ScrollView contentContainerStyle={styles.setupPage} showsVerticalScrollIndicator={false}>
      <Brand />
      <Link href="/" asChild><Pressable><Text style={styles.hint}>← Zur Spielauswahl</Text></Pressable></Link>
      <LinearGradient colors={[colors.green, colors.green2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={styles.eyebrowGold}>EIN GERÄT · KEIN INTERNET</Text>
        <Text style={styles.heroTitle}>Weitergeben.{"\n"}<Text style={styles.heroAccent}>Aufdecken. Spielen.</Text></Text>
        <Text style={styles.heroCopy}>Die komplette Rack’o-Runde auf einem Handy. Karten bleiben zwischen den Zügen sicher verborgen.</Text>
        <View style={styles.heroBadge}><Text style={styles.heroBadgeIcon}>▣</Text><Text><Text style={styles.heroBadgeStrong}>Echte Mobile-App{"\n"}</Text><Text style={styles.heroBadgeSmall}>Android & iOS</Text></Text></View>
      </LinearGradient>
      {savedGame && <View style={styles.resumeCard}><View style={styles.resumeText}><Text style={styles.resumeTitle}>Gespeicherte Partie</Text><Text style={styles.resumeMeta}>Runde {savedGame.currentRound} · {savedGame.players.map((player) => player.name).join(", ")}</Text></View><Pressable style={styles.resumeButton} onPress={onResume}><Text style={styles.resumeButtonText}>Sicher fortsetzen</Text></Pressable></View>}
      <View style={styles.panel}>
        <View style={styles.panelTitleRow}><Text style={styles.panelIcon}>♟</Text><View style={styles.flex}><Text style={styles.eyebrow}>SPIELVORBEREITUNG</Text><Text style={styles.panelTitle}>Wer spielt mit?</Text></View><Text style={styles.counter}>{selectedNames.length}/4</Text></View>
        <Text style={styles.hint}>Wähle 2 bis 4 Spieler. Die Reihenfolge der Auswahl ist die Sitzreihenfolge.</Text>
        <View style={styles.playerGrid}>{PLAYER_NAMES.map((name) => {
          const index = selectedNames.indexOf(name);
          const selected = index >= 0;
          return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected, disabled: !selected && selectedNames.length >= 4 }} key={name} disabled={!selected && selectedNames.length >= 4} onPress={() => toggle(name)} style={({ pressed }) => [styles.playerChoice, selected && styles.playerChoiceSelected, !selected && selectedNames.length >= 4 && styles.disabled, pressed && styles.pressed]}><Text style={[styles.playerAvatar, selected && styles.playerAvatarSelected]}>{selected ? index + 1 : name[0]}</Text><Text style={[styles.playerName, selected && styles.playerNameSelected]}>{name}</Text></Pressable>;
        })}</View>
        <Text style={styles.label}>Runden</Text>
        <View style={styles.stepper}><Pressable onPress={() => setRounds(Math.max(1, rounds - 1))} style={styles.stepperButton}><Text style={styles.stepperButtonText}>−</Text></Pressable><View style={styles.stepperValue}><Text style={styles.stepperNumber}>{rounds}</Text><Text style={styles.stepperCaption}>RUNDEN</Text></View><Pressable onPress={() => setRounds(Math.min(20, rounds + 1))} style={styles.stepperButton}><Text style={styles.stepperButtonText}>+</Text></Pressable></View>
        <Text style={styles.label}>Rack’o-Bedingung</Text>
        <View style={styles.segmented}>{([0, 3, 4] as const).map((value) => <Pressable key={value} onPress={() => setRequirement(value)} style={[styles.segment, requirement === value && styles.segmentActive]}><Text style={[styles.segmentText, requirement === value && styles.segmentTextActive]}>{value === 0 ? "Normal" : `${value}er-Folge`}</Text></Pressable>)}</View>
        <Text style={styles.ruleHint}>{requirement ? `Für Rack’o ist zusätzlich eine direkte Folge aus mindestens ${requirement} Karten nötig.` : "Eine vollständig aufsteigende Reihe genügt."}</Text>
        <PrimaryButton disabled={selectedNames.length < 2} label="Spiel starten" onPress={() => onStart(createGame(selectedNames, rounds, requirement))} />
        <View style={styles.offlineNote}><Text style={styles.offlineIcon}>✓</Text><View style={styles.flex}><Text style={styles.offlineTitle}>Bleibt auf diesem Gerät</Text><Text style={styles.offlineCopy}>Keine Anmeldung, kein Server und keine Internetverbindung beim Spielen.</Text></View></View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

function HandoffScreen({ game, onReveal }: { game: GameState; onReveal: () => void }) {
  const player = game.players[game.turnIndex];
  return <LinearGradient colors={["#235E46", "#0D2D21"]} style={styles.handoffBackground}>
    <SafeAreaView style={styles.handoffSafe}>
      <View style={styles.handoffHeader}><Brand light compact /><Text style={styles.handoffRound}>Runde {game.currentRound} / {game.totalRounds}</Text></View>
      <View style={styles.handoffContent}><View style={styles.lockCircle}><Text style={styles.lockIcon}>⌾</Text></View><Text style={styles.eyebrowGold}>GERÄT WEITERGEBEN AN</Text><Text adjustsFontSizeToFit numberOfLines={1} style={styles.handoffName}>{player.name}</Text><Text style={styles.handoffCopy}>Nur {player.name} darf jetzt fortfahren. Bis dahin sind alle Karten sicher verdeckt.</Text><Pressable accessibilityLabel={`${player.name}, Karten aufdecken`} onPress={onReveal} style={({ pressed }) => [styles.revealButton, pressed && styles.pressed]}><Text style={styles.revealName}>{player.name}</Text><Text style={styles.revealHint}>Tippen, um deine Karten zu sehen</Text></Pressable><Text style={styles.privacyActive}>✓  SICHTSCHUTZ AKTIV</Text></View>
    </SafeAreaView>
  </LinearGradient>;
}

function GameScreen({ game, onUpdate, onHide, onReset }: { game: GameState; onUpdate: (action: () => GameState) => void; onHide: () => void; onReset: () => void }) {
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const player = game.players[game.turnIndex];
  const topDiscard = game.discard.at(-1);
  const maxCard = deckSizeFor(game.playerCount);
  const chooseSlot = (slot: number) => {
    if (game.drawnCard === null) return;
    const nextHand = player.hand.map((card, index) => index === slot ? game.drawnCard! : card);
    if (canDeclareRacko(nextHand, game.directRunRequirement)) setPendingSlot(slot);
    else onUpdate(() => swapCard(game, slot, false));
  };
  return <SafeAreaView style={styles.gameSafe} edges={["top", "left", "right"]}>
    <GameHeader game={game} onReset={onReset} />
    <ScoreStrip game={game} />
    <ScrollView contentContainerStyle={styles.gamePage} showsVerticalScrollIndicator={false}>
      <View style={styles.turnRow}><View><Text style={styles.eyebrow}>DEIN ZUG</Text><Text style={styles.turnName}>{player.name}</Text></View><Pressable onPress={onHide} style={styles.hideButton}><Text style={styles.hideButtonText}>▣  Karten verbergen</Text></Pressable></View>
      <View style={styles.board}>
        <View style={styles.rackArea}><View style={styles.rackLabel}><Text style={styles.rackEnd}>HINTEN</Text><Text style={styles.rackTitle}>Deine Karten</Text></View><LinearGradient colors={["#0F3B2B", "#286249"]} style={styles.rack}>{player.hand.map((card, index) => <Pressable accessibilityLabel={`Karte ${card} auf Platz ${index + 1}`} accessibilityHint={game.drawnCard === null ? "Ziehe zuerst eine Karte" : "Diese Karte austauschen"} disabled={game.drawnCard === null || pendingSlot !== null} key={`${index}-${card}`} onPress={() => chooseSlot(index)} style={({ pressed }) => [styles.rackSlot, pressed && game.drawnCard !== null && styles.cardPressed]}><PlayingCard card={card} maxCard={maxCard} /></Pressable>)}</LinearGradient><Text style={[styles.rackEnd, styles.rackFront]}>VORNE</Text></View>
        <View style={styles.piles}>
          <View style={[styles.pile, styles.activeCard, game.drawnCard === null && styles.emptyCard]}><Text style={styles.pileOverline}>AKTIVE KARTE</Text>{game.drawnCard === null ? <Text style={styles.emptyText}>Noch keine Karte gezogen</Text> : <><Text style={styles.activeNumber}>{game.drawnCard}</Text><Text style={styles.pileHint}>Links einen Platz wählen</Text>{game.drawnFrom === "deck" && <Pressable onPress={() => onUpdate(() => discardDrawnCard(game))} style={styles.discardUnused}><Text style={styles.discardUnusedText}>Ablegen</Text></Pressable>}</>}</View>
          <Pressable accessibilityLabel="Verdeckte Karte ziehen" disabled={game.drawnCard !== null} onPress={() => onUpdate(() => drawCard(game, "deck"))} style={[styles.pile, styles.deck, game.drawnCard !== null && styles.pileDisabled]}><Text style={styles.deckPattern}>▥</Text><Text style={styles.deckTitle}>Verdeckt</Text><Text style={styles.deckCount}>{game.deck.length} Karten</Text></Pressable>
          <Pressable accessibilityLabel={topDiscard ? `Offene Karte ${topDiscard} ziehen` : "Ablagestapel ist leer"} disabled={game.drawnCard !== null || !topDiscard} onPress={() => onUpdate(() => drawCard(game, "discard"))} style={[styles.pile, styles.openPile, (game.drawnCard !== null || !topDiscard) && styles.pileDisabled]}><Text style={styles.discardNumber}>{topDiscard ?? "↓"}</Text><Text style={styles.openTitle}>Ablage</Text><Text style={styles.pileHint}>{topDiscard ? "Offene Karte" : "Noch leer"}</Text></Pressable>
        </View>
      </View>
      {game.drawnCard === null && canDeclareRacko(player.hand, game.directRunRequirement) && <Pressable style={styles.rackoButton} onPress={() => onUpdate(() => declareRacko(game))}><Text style={styles.rackoButtonText}>♛  RACK’O AUSRUFEN</Text></Pressable>}
    </ScrollView>
    <Modal transparent visible={pendingSlot !== null} animationType="fade" onRequestClose={() => setPendingSlot(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalCrown}>♛</Text><Text style={styles.eyebrow}>DEINE REIHE IST VOLLSTÄNDIG</Text><Text style={styles.modalTitle}>Rack’o ausrufen?</Text><PrimaryButton label="♛  RACK’O!" onPress={() => { if (pendingSlot !== null) onUpdate(() => swapCard(game, pendingSlot!, true)); setPendingSlot(null); }} /><Pressable style={styles.continueButton} onPress={() => { if (pendingSlot !== null) onUpdate(() => swapCard(game, pendingSlot!, false)); setPendingSlot(null); }}><Text style={styles.continueText}>↻  Für Bonus weiterspielen</Text></Pressable></View></View></Modal>
  </SafeAreaView>;
}

function ResultsScreen({ game, onContinue, onFinish, onReset }: { game: GameState; onContinue: () => void; onFinish: () => void; onReset: () => void }) {
  const [selectedId, setSelectedId] = useState(game.players[0].id);
  const finished = game.status === "finished";
  const selected = game.players.find((player) => player.id === selectedId) ?? game.players[0];
  const ranked = useMemo(() => [...game.players].sort((a, b) => finished ? b.totalScore - a.totalScore : b.roundScore - a.roundScore), [game.players, finished]);
  const winners = game.players.filter((player) => game.gameWinnerIds.includes(player.id)).map((player) => player.name).join(" & ");
  return <SafeAreaView style={styles.gameSafe} edges={["top", "left", "right"]}><GameHeader game={game} onReset={onReset} /><ScrollView contentContainerStyle={styles.resultsPage}><View style={styles.resultsPanel}><Text style={styles.resultsCrown}>♛</Text><Text style={styles.eyebrow}>{finished ? "SPIEL BEENDET" : `ERGEBNIS RUNDE ${game.currentRound}`}</Text><Text style={styles.resultsTitle}>{finished ? `${winners} gewinnt!` : game.message}</Text><View style={styles.ranking}>{ranked.map((player, index) => <View key={player.id} style={[styles.resultRow, index === 0 && styles.winnerRow]}><Text style={styles.rank}>{index + 1}</Text><Text style={styles.resultName}>{player.name}</Text><View style={[styles.scoreBox, index === 0 && styles.scoreBoxWinner]}><Text style={styles.scoreLabel}>{finished ? "GESAMT" : "DIESE RUNDE"}</Text><Text style={styles.scoreValue}>{finished ? player.totalScore : `+${player.roundScore}`} <Text style={styles.scoreUnit}>Pkt.</Text></Text></View></View>)}</View><Text style={styles.cardsTitle}>Karten ansehen</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playerTabs}>{game.players.map((player) => <Pressable key={player.id} onPress={() => setSelectedId(player.id)} style={[styles.playerTab, selectedId === player.id && styles.playerTabActive]}><Text style={[styles.playerTabText, selectedId === player.id && styles.playerTabTextActive]}>{player.name}</Text></Pressable>)}</ScrollView><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.resultCards}>{selected.hand.map((card, index) => <View style={styles.resultCard} key={`${index}-${card}`}><PlayingCard card={card} maxCard={deckSizeFor(game.playerCount)} compact /></View>)}</ScrollView>{!finished && game.currentRound < game.totalRounds && <PrimaryButton label="Nächste Runde" onPress={onContinue} />}{!finished && game.currentRound >= game.totalRounds && <View style={styles.finalActions}><Pressable onPress={onFinish} style={styles.finishButton}><Text style={styles.finishButtonText}>Endergebnis anzeigen</Text></Pressable><PrimaryButton label="Weitere Runde spielen" onPress={onContinue} /></View>}{finished && <PrimaryButton label="Neue Partie starten" onPress={onReset} />}</View></ScrollView></SafeAreaView>;
}

function GameHeader({ game, onReset }: { game: GameState; onReset: () => void }) {
  return <View style={styles.gameHeader}><Brand light compact /><Text style={styles.headerRound}>Runde <Text style={styles.headerRoundStrong}>{game.currentRound}</Text> / {game.totalRounds}</Text><Pressable onPress={onReset}><Text style={styles.headerEnd}>Beenden</Text></Pressable></View>;
}

function ScoreStrip({ game }: { game: GameState }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scoreStrip}>{game.players.map((player, index) => <View key={player.id} style={[styles.scorePlayer, index === game.turnIndex && styles.scorePlayerCurrent]}><Text style={styles.scoreAvatar}>{player.name[0]}</Text><View><Text style={styles.scoreName}>{player.name}</Text><Text style={styles.scorePoints}>{player.totalScore} Punkte</Text></View>{index === game.turnIndex && <Text style={styles.turnBadge}>AM ZUG</Text>}</View>)}</ScrollView>;
}
