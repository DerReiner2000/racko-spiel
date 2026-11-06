import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand, colors, PrimaryButton, styles } from "@/components/game-ui";
import { OnlineGame } from "@/components/online-game";
import { DEFAULT_SERVER_URL, normalizeServerUrl, OnlineApi, parseStoredSession } from "@/online/client";
import { PLAYER_NAMES } from "../../../shared/game";
import type { DirectRunRequirement } from "../../../shared/game";
import type { JoinedGameResponse, LeaderboardEntry, ListedGame, PlayerName, StoredOnlineSession } from "../../../shared/online";

const SETTINGS_KEY = "racko-online-settings-v1";
const SESSION_KEY = "racko-online-session-v1";
const PREVIOUS_KEY = "racko-online-previous-session-v1";
type Screen = "home" | "create" | "join" | "leaderboard";

export default function OnlineScreen() {
  const [ready, setReady] = useState(false);
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [draftUrl, setDraftUrl] = useState(DEFAULT_SERVER_URL);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState<PlayerName | "">("");
  const [session, setSession] = useState<StoredOnlineSession | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [rounds, setRounds] = useState(3);
  const [requirement, setRequirement] = useState<DirectRunRequirement>(0);
  const [code, setCode] = useState("");
  const [games, setGames] = useState<ListedGame[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const listing = useRef(0);
  const expired = useRef(false);
  const api = useMemo(() => new OnlineApi(serverUrl), [serverUrl]);

  useEffect(() => {
    let active = true;
    void Promise.all([AsyncStorage.getItem(SETTINGS_KEY), AsyncStorage.getItem(SESSION_KEY)]).then(([settings, saved]) => {
      if (!active) return;
      if (settings) {
        try {
          const parsed = JSON.parse(settings);
          const normalized = normalizeServerUrl(parsed.serverUrl);
          setServerUrl(normalized); setDraftUrl(normalized);
          if (PLAYER_NAMES.includes(parsed.name)) setName(parsed.name);
        } catch { /* Keep the bundled server address if preferences are damaged. */ }
      }
      const restored = parseStoredSession(saved);
      if (restored) {
        setServerUrl(restored.serverUrl); setDraftUrl(restored.serverUrl); setSession(restored);
      }
    }).catch(() => { if (active) setError("Gespeicherte Anmeldung konnte nicht geladen werden. Du kannst erneut beitreten."); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Die Anfrage ist fehlgeschlagen."); }
    finally { pending.current = false; setBusy(false); }
  }

  useEffect(() => {
    let live = true;
    let loading = false;
    if (!ready || screen !== "join" || !name || session) return;
    const selectedName = name;
    async function refresh() {
      if (loading || pending.current || AppState.currentState === "background" || AppState.currentState === "inactive") return;
      loading = true;
      const request = ++listing.current;
      try {
        const listed = await api.games(selectedName);
        if (live && request === listing.current) { setGames(listed); setError(""); }
      } catch (failure) {
        if (live && request === listing.current) setError(failure instanceof Error ? failure.message : "Lobbys konnten nicht geladen werden.");
      } finally { loading = false; }
    }
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 15000);
    const subscription = AppState.addEventListener("change", (next) => { if (next === "active") void refresh(); });
    return () => { live = false; clearInterval(timer); subscription.remove(); };
  }, [api, name, ready, screen, session]);

  const clearExpired = useCallback(() => {
    expired.current = true;
    void AsyncStorage.removeItem(SESSION_KEY).catch(() => undefined);
  }, []);

  async function remember(response: JoinedGameResponse) {
    const next = { serverUrl: api.serverUrl, code: response.code, playerId: response.playerId, token: response.token };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ serverUrl: api.serverUrl, name }));
    expired.current = false;
    setSession(next);
  }

  function join(joinCode: string) {
    if (!name) return;
    void run(async () => { await remember(await api.join(name, joinCode)); });
  }

  function create() {
    if (!name) return;
    void run(async () => {
      const previous = parseStoredSession(await AsyncStorage.getItem(PREVIOUS_KEY));
      await remember(await api.create(name, rounds, requirement, previous?.serverUrl === api.serverUrl ? previous : undefined));
      await AsyncStorage.removeItem(PREVIOUS_KEY);
    });
  }

  function leave() {
    if (!session) return;
    Alert.alert("Online-Partie verlassen?", "Die Partie bleibt auf dem Server. Solange sie existiert, kannst du mit deinem Namen erneut beitreten.", [
      { text: "Weiterspielen", style: "cancel" },
      { text: "Verlassen", onPress: () => { void run(async () => {
        if (!expired.current) await AsyncStorage.setItem(PREVIOUS_KEY, JSON.stringify(session));
        await AsyncStorage.removeItem(SESSION_KEY);
        setSession(null); setScreen("home");
      }); } },
    ]);
  }

  if (!ready) return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.hint}>Online-Anmeldung wird geladen …</Text></SafeAreaView>;
  if (session) return <OnlineGame session={session} onLeave={leave} onExpired={clearExpired} />;

  return <SafeAreaView style={styles.safe}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.setupPage}>
      <Brand subtitle="ONLINE · APP & BROWSER" />
      <Pressable onPress={() => { if (screen === "home") router.back(); else { setScreen("home"); setError(""); } }}><Text style={styles.continueText}>← {screen === "home" ? "Zur Spielauswahl" : "Zur Online-Übersicht"}</Text></Pressable>
      {screen !== "leaderboard" && <View style={styles.panel}><Text style={styles.panelTitle}>Wer bist du?</Text><View style={styles.playerGrid}>{PLAYER_NAMES.map((playerName) => <Pressable key={playerName} accessibilityRole="radio" accessibilityState={{ checked: name === playerName }} disabled={busy} onPress={() => { setName(playerName); setGames([]); }} style={[styles.playerChoice, name === playerName && styles.playerChoiceSelected]}><Text style={[styles.playerName, name === playerName && styles.playerNameSelected]}>{playerName}</Text></Pressable>)}</View></View>}
      {screen === "home" && <View style={{ gap: 12 }}>
        <PrimaryButton disabled={!name || busy} label="Neues Online-Spiel" onPress={() => setScreen("create")} />
        <PrimaryButton disabled={!name || busy} label="Spiel beitreten" onPress={() => { setGames([]); setScreen("join"); }} />
        <Pressable disabled={busy} style={styles.continueButton} onPress={() => { setScreen("leaderboard"); void run(async () => setLeaderboard(await api.leaderboard())); }}><Text style={styles.continueText}>Rangliste</Text></Pressable>
        {!name && <Text style={styles.hint}>Wähle zuerst deinen Namen.</Text>}
      </View>}
      {screen === "create" && <View style={styles.panel}><Text style={styles.panelTitle}>Neue Online-Runde</Text><Text style={styles.hint}>Deine Freunde treten mit dem Spielcode bei. Du startest mit 2 bis 4 Personen.</Text>
        <Text style={[styles.label, { marginTop: 18 }]}>Runden</Text><View style={styles.stepper}><Pressable disabled={busy} style={styles.stepperButton} onPress={() => setRounds(Math.max(1, rounds - 1))}><Text style={styles.stepperButtonText}>−</Text></Pressable><View style={styles.stepperValue}><Text style={styles.stepperNumber}>{rounds}</Text></View><Pressable disabled={busy} style={styles.stepperButton} onPress={() => setRounds(Math.min(20, rounds + 1))}><Text style={styles.stepperButtonText}>+</Text></Pressable></View>
        <Text style={styles.label}>Rack’o-Bedingung</Text><View style={styles.segmented}>{([0, 3, 4] as const).map((value) => <Pressable disabled={busy} key={value} style={[styles.segment, requirement === value && styles.segmentActive]} onPress={() => setRequirement(value)}><Text style={styles.segmentText}>{value === 0 ? "Normal" : `${value}er-Folge`}</Text></Pressable>)}</View><Text style={styles.ruleHint}>{requirement ? `Zusätzlich mindestens ${requirement} Karten direkt in Folge.` : "Eine vollständig aufsteigende Reihe genügt."}</Text>
        <PrimaryButton disabled={!name || busy} label={busy ? "Wird erstellt …" : "Lobby erstellen"} onPress={create} />
      </View>}
      {screen === "join" && <>
        <View style={styles.panel}><Text style={styles.panelTitle}>Mit Spielcode beitreten</Text><TextInput accessibilityLabel="Spielcode" autoCapitalize="characters" autoCorrect={false} maxLength={5} value={code} onChangeText={(value) => setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABCDE" placeholderTextColor={colors.muted} style={inputStyles.input} editable={!busy} /><PrimaryButton disabled={!name || code.length !== 5 || busy} label="Beitreten" onPress={() => join(code)} /></View>
        <View style={styles.panel}><Text style={styles.panelTitle}>Verfügbare Partien</Text><Text style={styles.hint}>Die Liste wird automatisch aktualisiert. Laufende Partien können nur bisherige Teilnehmer fortsetzen.</Text>
          <Pressable disabled={busy || !name} style={styles.continueButton} onPress={() => { if (name) void run(async () => setGames(await api.games(name))); }}><Text style={styles.continueText}>Aktualisieren</Text></Pressable>
          {!games.length && <Text style={styles.hint}>Keine offenen oder laufenden Partien gefunden.</Text>}
          {games.map((listed) => <View key={listed.code} style={{ borderTopWidth: 1, borderTopColor: colors.line, marginTop: 18, paddingTop: 12, gap: 8 }}><Text selectable style={styles.resumeTitle}>{listed.hostName}s Lobby · {listed.code}</Text><Text style={styles.hint}>{listed.playerNames.join(", ")} · {listed.playerCount}/4</Text><Text style={styles.ruleHint}>{listed.status === "lobby" ? "Im Warteraum" : "Bereits begonnen"} · {listed.totalRounds} Runden</Text><PrimaryButton disabled={busy || !name || !(listed.canJoin || listed.canRejoin)} label={listed.canRejoin ? "Wieder beitreten" : listed.canJoin ? "Beitreten" : "Nicht teilgenommen"} onPress={() => join(listed.code)} /></View>)}
        </View>
      </>}
      {screen === "leaderboard" && <View style={styles.panel}><Text style={styles.panelTitle}>Rangliste</Text><Text style={styles.hint}>Alle abgeschlossenen Online-Partien – aus App und Browser.</Text>{!busy && !leaderboard.length && <Text style={styles.hint}>Noch kein Spiel abgeschlossen.</Text>}{leaderboard.map((entry, index) => <View key={entry.player_name} style={styles.resultRow}><Text style={styles.rank}>{index + 1}</Text><View style={{ flex: 1 }}><Text style={styles.resultName}>{entry.player_name}</Text><Text style={styles.hint}>{entry.games_played} Spiele · {entry.wins} Siege</Text></View><Text style={styles.scoreName}>Ø {entry.average_per_game ?? "–"}</Text></View>)}</View>}
      {busy && <ActivityIndicator color={colors.green} />}
      {error ? <Text accessibilityRole="alert" style={{ color: colors.red, fontSize: 14 }}>{error}</Text> : null}
      <Pressable disabled={busy} onPress={() => setSettingsOpen(!settingsOpen)}><Text style={styles.hint}>Serveradresse {settingsOpen ? "schließen" : "ändern"}</Text></Pressable>
      {settingsOpen && <View style={styles.panel}><Text style={styles.label}>Online-Server</Text><TextInput accessibilityLabel="Serveradresse" autoCapitalize="none" autoCorrect={false} keyboardType="url" value={draftUrl} onChangeText={setDraftUrl} style={inputStyles.input} editable={!busy} /><PrimaryButton disabled={busy} label="Adresse speichern" onPress={() => { void run(async () => {
        const normalized = normalizeServerUrl(draftUrl);
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ serverUrl: normalized, name }));
        setServerUrl(normalized); setDraftUrl(normalized); setGames([]); setSettingsOpen(false);
      }); }} /></View>}
    </ScrollView>
  </SafeAreaView>;
}

const inputStyles = StyleSheet.create({ input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, marginVertical: 14, color: colors.green, fontSize: 17, backgroundColor: "#FAFBF9" } });
