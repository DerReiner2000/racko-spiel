# Bot-Schnittstelle, Referenzstrategien und Simulationen

Stand: 6. November 2026. Diese Datei ist die Übergabe für die spätere lokale und serverseitige Bot-Integration. Verbindlich sind die TypeScript-Typen in `shared/bots.ts` und die Regeln in `shared/game.ts`.

Integrationsstand: Leicht und Mittel sind inzwischen über `lib/online-bots.ts` in Browser-Lobbys und die Server-Zugfolge eingebunden. Bot-Partien sind Training ohne Ranglistenwertung. Die konkrete Integration, Wiederaufnahme und Veröffentlichung stehen in [ONLINE_BOTS.md](ONLINE_BOTS.md). Die folgenden Abschnitte dokumentieren die Strategie-Übergabe; Aussagen zu damals noch fehlenden Online-Adaptern werden durch diesen Integrationsstand ersetzt. Die Strategiedateien selbst wurden für die Online-Integration nicht verändert.

Neuester Stand: [BOT_KONTEXT.md](BOT_KONTEXT.md) beschreibt die aktiven Profile `easy-situational-v1` und `medium-situational-v1`, Rundenfortschritt und konkrete Abschlusskarten. Das additive `roundProgress`-Feld und die Kennzeichnung unvollständiger Historie gehören jetzt zur Übergabe. Die historischen Referenzen und Studien unten bleiben als Vergleichsgrundlage erhalten.

Aktuelle Ergänzung: [BOT_STARTPLAN.md](BOT_STARTPLAN.md) beschreibt die ausdrückliche Bewertung der Ausgangshand vor dem ersten Ziehen, flexible Ankerkarten und den optionalen `prepare`-Hook. Der Registrierungsaufruf für `medium` liefert inzwischen `planning-v1`; die unten dokumentierten `repair`-/`easy`-Referenzen und alten Studien bleiben unverändert als Vergleichsgrundlage erhalten.

## 1. Lieferumfang und Grenzen

Vorhanden:

- Versionierter Beobachtungsvertrag mit eigener Hand, Zugphase, Sitzreihenfolge und ausschließlich erlaubten Informationen.
- Standardmäßig ausgeblendete Gesamtwertung und Rundennummer; ausdrücklich aktivierbarer Kontext.
- Öffentliche Aktionsereignisse für spätere Gegnerbeobachtung. Bei leicht wird der Verlauf vollständig entfernt.
- Zwei ausführbare, deterministische Referenzstrategien sowie eine experimentelle Variante mit Mittelbereichspriorität.
- Ein lokaler Simulator ohne Oberfläche, Netzwerk oder Datenbank, der dieselben Regeln wie App und Server ausführt.
- Regel-/Informationsschutztests sowie reproduzierbare Ergebnisdateien und Entscheidungsbeispiele.

Noch nicht geliefert sind Bot-Plätze in der Lobby, Auswahlfelder in der App, persistierte Bot-Einstellungen/Ereignisse im Server, ein automatischer Bot-Scheduler und die Strategien schwer/Experte. Die Referenzstrategien sind Forschungsgrundlagen; ihre Namen bestätigen keine abgestufte Spielstärke. Das Aktivieren der Gesamtwertungsoption ist im Datenvertrag vorbereitet, wird von den Referenzstrategien aber ausdrücklich abgelehnt. Es gibt keinen stillen Rückfall auf eine schwächere oder anders konfigurierte Strategie.

## 2. Welche Daten ein Bot erhält

`observeForBot(state, playerId, options)` erzeugt ein neues `BotObservation`-Objekt. Dieses Objekt darf dem Entscheider übergeben werden, niemals der vollständige Spielzustand.

| Feld | Inhalt / Bereitstellung |
|---|---|
| `schemaVersion` | Aktuell `1`; bei inkompatiblen Änderungen erhöhen. |
| `handOrder` | Fest `back-to-front`. `hand[0]` liegt hinten/oben; `hand[9]` vorne/unten. |
| `roundId` | Vom Adapter erzeugte, innerhalb einer Runde stabile, undurchsichtige ID. Kein codierter Rundenindex. |
| `revision` | Version des beobachteten, bestätigten Spielstands. |
| `settings` | `difficulty` und `considerMatchScore`. Nur bekannte Felder werden übernommen. |
| `phase` | `draw`, `place`, `inactive` oder `blocked`. Nur in den ersten beiden Phasen entscheiden. |
| `activePlayerId`, `playerId`, `isMyTurn` | Zugzuständigkeit und eigene Identität. |
| `hand` | Kopie der zehn eigenen Karten in Engine-Reihenfolge. |
| `topDiscard` | Oberste sichtbare Ablagekarte oder `null`. Keine verdeckte Auswahl älterer Ablagen. |
| `deckCount` | Anzahl Karten im verdeckten Stapel, keine Kartenwerte oder Reihenfolge. |
| `drawnCard`, `drawnFrom` | Eigene bereits gezogene Karte und Quelle. Bei einem fremden Zug immer `null`. |
| `directRunRequirement` | `0`, `3` oder `4`. |
| `playerCount` | `2`, `3` oder `4`; Kartensatzgröße folgt aus `deckSizeFor`. |
| `players` | Teilnehmer in fester Zugreihenfolge: ID, Name, Kartenanzahl und standardmäßig maskierte Gesamtpunkte. |
| `events` | Vollständiger erlaubter Verlauf der aktuellen Runde bis einschließlich `revision`. Bei leicht immer leer. |
| `matchContext` | Standardmäßig `null`. Nur nach Opt-in: aktuelle/geplante Rundenzahl und Gesamtpunkte. |
| `currentRound`, `totalRounds` | Aus Kompatibilitätsgründen vorhanden, ohne Opt-in beide auf `1` maskiert. |

Die `totalScore`-Felder in `players` sind ohne Opt-in `0`. Frühere Runden und der tatsächliche Rundenindex dürfen dann auch nicht über IDs, Ereignisse oder zusätzlich angehängte Metadaten an die Strategie gelangen. Gleiche Rundensituation muss unabhängig vom Matchstand dieselbe Entscheidung liefern. Die Referenzstrategien sind deterministisch; spätere zufällige Strategien müssen entsprechend dieselbe Entscheidungsverteilung haben.

Nicht enthalten: fremde Hände, gegnerische verdeckte Ziehkarten, verdeckte Stapelwerte/-reihenfolge, Zugriffstoken und Server-Geheimnisse. Der Beobachter kopiert arrays und Ereignisse; Änderungen des Bots verändern den Spielzustand nicht.

`roundId` und `revision` haben für einfache Aufrufe Fallbacks (`current-round`, `0`). Produktive Adapter müssen beide ausdrücklich und stabil bereitstellen. Der Adapter muss veraltete Ergebnisse verwerfen; eine Revision allein sperrt noch keinen konkurrierenden Schreibzugriff.

## 3. Einstellungen

Standard:

```json
{
  "difficulty": "medium",
  "considerMatchScore": false
}
```

Vorgesehene Schwierigkeitsstufen:

| Stufe | Ziel |
|---|---|
| `easy` | Anfängerähnlich: eigene Reihe, grobe Platzbereiche, aktuelle offene Karte; keine Gegnerhistorie oder Gegnerbedarfsanalyse. |
| `medium` | Eigene Sortierung und Pflichtfolge gemeinsam planen, Engstellen und alternative Abschlusskarten bewerten. |
| `hard` | Zusätzlich öffentliche Kartenbewegungen, Vorgänger/Nachfolger und vermuteten Kartenbedarf berücksichtigen. |
| `expert` | Zusätzlich mögliche verdeckte Verteilungen und Gegnerreaktionen simulieren; keine echten geheimen Daten verwenden. |

`considerMatchScore` gilt unabhängig von der Schwierigkeit und ist vor Partiebeginn optional wählbar. Solange dafür keine Strategie implementiert ist, darf die App das aktivierte Profil nicht als unterstützt anbieten. Das bloße Bereitstellen des Punktestands erzeugt noch keine sinnvolle Matchstrategie.

## 4. Öffentliche Ereignisse für spätere stärkere Bots

`publicEventsForAction(before, action, after, { roundId, revision })` darf ausschließlich nach erfolgreicher Regelprüfung aufgerufen werden. Online wird das Ergebnis zusammen mit dem Zustand atomar gespeichert. Nicht aus Nachrichtentexten und nicht aus sporadischen Polling-Snapshots rekonstruieren: Dazwischen können relevante Züge fehlen.

| Ereignis | Sichtbarer Inhalt |
|---|---|
| `draw` aus `discard` | Spieler, Quelle und offen genommene Zahl. |
| `draw` aus `deck` | Spieler und Quelle; `card` bleibt zwingend `null`. |
| `swap` | Spieler und öffentlich abgelegte alte Zahl. Weder neuer verdeckter Kartenwert noch gegnerischer Platz. |
| `discard` | Spieler und ungenutzt abgelegte Zahl; diese ist jetzt öffentlich. |
| `reshuffle` | Die früher vergrabenen Ablagekarten werden neu gemischt. Alte Aussagen über deren Ablageposition verfallen. |
| `roundEnded` | Gewinner-ID der gerade beendeten Runde. |

Ein Ziehen bei leerem Stapel erzeugt erst `reshuffle`, dann `draw`; beide dürfen dieselbe Revision tragen. Die Reihenfolge im Log bleibt erhalten. Der Log wird bei Rundenbeginn vollständig zurückgesetzt. Ein späterer zustandsbehafteter Bot kann Ereignisse anhand `(roundId, revision, Position innerhalb der Revision)` genau einmal verarbeiten. Bei Wiederaufnahme entweder den gesamten Log wiedergeben oder eine versionierte, dazu passende Bot-Erinnerung laden.

Mit offen genommener Zahl und späterer Ablage lassen sich legitime Vermutungen bilden. Aus einem verdeckten Tausch lässt sich der neue Kartenwert nicht sicher ableiten. Auch ein früher offen aufgenommener Wert kann inzwischen abgelegt worden sein. Wahrscheinlichkeiten sind kein Wissen über fremde Hände.

## 5. Was ein Bot zurückgibt

`BotStrategy.decide(observation)` liefert synchron oder asynchron genau eine Aktion:

```ts
{ type: "draw", source: "deck" | "discard" }
{ type: "swap", slot: number, declareRacko: boolean }
{ type: "discard" }
{ type: "racko" }
```

`slot` ist der echte Engine-Index `0..9`, nicht die Position in einer beispielhaft aufsteigend gedruckten Liste. Für die gedachte Wertungsposition `1..10` gilt `slot = 10 - position`.

- Vor dem Ziehen: gültiges Rack’o anmelden oder eine Karte ziehen.
- Nach dem Ziehen: tauschen oder eine verdeckt gezogene Karte ungenutzt ablegen.
- Eine offen gezogene Karte muss getauscht werden.
- Nach einem Tausch muss Rack’o direkt mit `declareRacko: true` angemeldet werden; sonst endet der eigene Zug. Ein nachträglicher zusätzlicher Rack’o-Aufruf wäre dann zu spät.
- Eine Diagnose/Erklärung gehört nicht als zusätzliches Spielfeld in die Aktion. Dafür gibt es `explainReferenceDecision`.

Alle Aktionen gehen erneut durch `applyGameAction`. Die Strategie besitzt keine Regelhoheit.

## 6. Integrationsablauf

Beispiel für den fachlichen Teil eines Zuges, noch ohne Speicherung und Scheduler:

```ts
import { applyGameAction } from "./shared/game";
import { observeForBot, publicEventsForAction, resolveBotSettings } from "./shared/bots";
import { createConfiguredReferenceBot } from "./shared/bot-reference";

const settings = resolveBotSettings({ difficulty: "medium", considerMatchScore: false });
const strategy = createConfiguredReferenceBot(settings);
const observation = observeForBot(before, botPlayerId, {
  settings, roundId, revision, events: publicRoundLog,
});
const action = await strategy.decide(observation);
const after = applyGameAction(before, botPlayerId, action);
const publicEvents = publicEventsForAction(before, action, after, {
  roundId, revision: revision + 1,
});
// Zustand + publicEvents mit erwarteter alter Revision atomar bestätigen.
// Bei Versionskonflikt neu laden und neu entscheiden; nicht blind wiederholen.
```

Die Beispielsymbole `before`, `botPlayerId`, `roundId`, `revision` und `publicRoundLog` stammen aus dem ausführenden Adapter. Online ist die neue Ereignisrevision aus der tatsächlich bestätigten Serverversion abzuleiten, nicht frei vom Bot zu vergeben.

Der App-/Server-Adapter muss zusätzlich:

1. Bot-Teilnehmer und ihre Einstellungen in Lobby/Spielstand speichern.
2. Beim Rundenstart eine neue undurchsichtige ID und leeren öffentlichen Log anlegen.
3. Öffentliche Ereignisse **aller** Teilnehmer nach jedem bestätigten Zug mitführen, auch zwischen zwei Bot-Zügen.
4. Die Strategieversion und unterstützten Profile registrieren; unfertige Profile nicht als verfügbar ausgeben.
5. Nach einem menschlichen oder Bot-Zug prüfen, ob der aktive Teilnehmer ein Bot ist. Ziehen und Platzieren können zwei aufeinanderfolgende Bot-Aktionen sein.
6. Online serverseitig ausführen, unabhängig von geöffneten Browsern. Revision, Zuständigkeit und parallele Ausführung absichern.
7. Bei asynchroner Berechnung, Neustart oder Konflikt einen neuen gültigen Snapshot herstellen. Einen möglicherweise schon bestätigten Zug nicht blind wiederholen.
8. Bei Strategiefehlern oder Zeitüberschreitung eine ausdrücklich definierte, regelkonforme Ersatzentscheidung verwenden. Eine offen genommene Karte darf dabei nicht ungenutzt abgelegt werden.
9. Bots passend in Ergebnissen/Statistik behandeln. Das gehört nicht zur Entscheidungslogik.

Eine Umstellung der Spielregeln oder ein separater Simulations-Spielkern ist dafür nicht erforderlich.

## 7. Ausführbare Referenzstrategien und Parameter

`shared/bot-reference.ts` exportiert `createReferenceBot`, `createConfiguredReferenceBot`, `explainReferenceDecision`, `analyzeHand`, `REFERENCE_WEIGHTS` und `REFERENCE_POLICY_VERSION`.

- `easy`: Abweichung von zehn gleichmäßig verteilten Platzbereichen bestrafen; aufsteigende Nachbarn mit `1.5` gewichten; bei Folgenpflicht längste direkte Folge mit `1.25` gewichten. Keine Ereignis- oder Gegnerauswertung.
- `repair`: Mittels dynamischer Programmierung bestimmen, wie viele bestehende Karten in einer hypothetischen gültigen Zielreihe inklusive Pflichtfolge erhalten bleiben könnten. Gewicht `20`; zusätzlich `0.4` pro Karte des aufsteigenden Wertungsanfangs und `0.2` pro erhaltbarer Karte einer nur sortierten Zielreihe.
- `repair-center`: Dieselbe Strategie plus experimenteller Mittelbereichspriorität `centralPreference: 4`. Dies ist ausschließlich eine Vergleichsvariante.

Zentralitätswert einer Zahl `x` bei höchster Zahl `N`: `1 - abs(2*x/(N+1) - 1)`. Er wird über die eigene Hand summiert. Standardmäßig beträgt sein Gewicht **0**, weil keine allgemein überlegene Mittelbereichspriorität nachgewiesen ist.

Alle Koeffizienten sind anfängliche, von Hand gewählte Referenzwerte, keine trainierten oder optimalen Parameter. Die Referenzen nehmen nur strikt bessere offene Karten und legen verdeckte Karten ohne Verbesserung ab. Bei offen gezogenen Karten wird auch eine Verschlechterung regelkonform akzeptiert. Sie rufen jedes gültige Rack’o sofort aus; eine bewusste Bonuswette ist noch nicht enthalten.

`optimisticReplacements` ist eine strukturelle Untergrenze auf nötige Austausche. Sie setzt hypothetisch passende Karten voraus. Sie ist **keine** erwartete Zugzahl und berücksichtigt weder beim Gegner gebundene Karten noch die Schwierigkeit, eine eigene Karte an einen anderen Platz zu bekommen. Ein genauerer Rechner kann deshalb trotzdem häufiger verlieren. Die Funktion wurde zusätzlich gegen vollständige Aufzählung kleiner Kartensätze geprüft.

Die ursprüngliche Zuordnung von `medium` auf `repair` wurde durch die ausdrückliche Startplanung `planning-v1` ersetzt. Die aktuelle Zuordnung und zusätzliche Vergleiche gegen zwei Gegnerfamilien stehen in `BOT_STARTPLAN.md`. Für eine veröffentlichte vollständige Schwierigkeitsstaffel sind weitere Kalibrierung und Gegnerfamilien nötig.

## 8. Simulation ausführen

Im Projektstamm:

```powershell
npm test
node scripts/simulate-bots.cjs --seeds 30 --max-turns 240 --output docs/bot-results/pilot
node scripts/simulate-bots.cjs --seeds 100 --seed-offset 1001 --max-turns 480 --output docs/bot-results/validation
```

Die Compile-Abhängigkeit TypeScript ist bereits im Projekt vorhanden. Der Starter kompiliert in einen geprüften temporären Ordner und entfernt diesen anschließend. Die Ergebnisdateien bleiben unter dem angegebenen Präfix erhalten. Kein Download und kein Konto nötig.

Pro Seed werden alle Kombinationen von 2/3/4 Spielern und 0/3/4 als Folgenpflicht untersucht. Die getestete Strategie rotiert durch jeden Sitz und spielt gegen `repair`-Gegner. Für jeden Vergleich werden dieselbe Anfangsausteilung und derselbe Zufallsstart verwendet. Nach abweichenden Entscheidungen entstehen unterschiedliche Kartenverläufe; es sind keine identischen späteren Ziehkarten garantiert. Der Zufall ist ausschließlich im Spielkern, nicht in einer geheimen Kartenvorschau der Strategie.

Ausgaben:

- `.md`: lesbare Ergebnisübersicht.
- `.json`: vollständige Konfiguration, Einzelresultate je Seed/Sitz, gepaarte Vergleiche, Zensierung und Kartenstatistik.
- Die JSON-Datei enthält außerdem die verwendeten Gewichte und SHA-256-Prüfsummen von Spielkern, Schnittstelle, Strategie und Simulator als Herkunftsnachweis.
- `.trace.jsonl`: begrenzte Stichprobe von Beobachtung, gewählter Aktion und Begründung. Synthetische Daten, keine echten Spielersitzungen. Die Stichprobe ist bewusst kein repräsentatives Trainingsset.

Die zusätzliche 25/27-Untersuchung verwendet die konkrete Hand `3,8,13,19,25,41,44,46,48,50` in Wertungsrichtung und bereits gezogene 27. Gegenspielerhände werden aus den übrigen Karten erzeugt. Danach spielen alle `repair`. Beide Platzierungen werden aus derselben verdeckten Anfangslage verglichen. Das belegt ausschließlich Aussagen für dieses Szenario und diese Folgepolitik.

## 9. Ergebnisse richtig verwenden

Die Dateien `docs/bot-results/pilot.md` und `validation.md` enthalten die tatsächlich ausgeführten Läufe. Der Pilot umfasst 2.430 Turnierrundenversuche und 180 Szenarioversuche; der unabhängige Lauf 8.100 und 600. Insgesamt **11.310 Rundenversuche**. Ein Versuch ist nicht automatisch eine beendete Runde.

Die Ergebnisse trennen:

- Rundensiegquote und eigene Rundenpunkte. Diese Größen können verschiedene Strategien bevorzugen.
- Beendete und am Zuglimit zensierte Runden. Zensierte Runden werden nicht als Niederlagen oder als null Punkte behandelt.
- Gemeinsame beendete Vergleichspaare und ausgeschlossene Paare. Unterschiedliche Zensierung kann den Vergleich verzerren.
- 95-%-Bootstrap-Intervalle über ganze Seed-Blöcke statt fälschlich unabhängiger Sitzwiederholungen. Viele Vergleiche bleiben explorativ; es gibt keine Mehrfachtestkorrektur.

Fachliche Folgerungen für die Übergabe:

1. **Kein universeller Kartenwert nach Zahl fest einbauen.** Der getestete Mittelbereichsbonus ist keine durchgängig bessere Strategie. Aufnahmequote muss pro Angebot und getrennt nach Spielerzahl, Pflichtfolge und Strategie ausgewertet werden.
2. **Pflichtfolge in die Zielreihe einbeziehen.** Im konkreten 25/27-Fall reduziert die Lücke den strukturellen Reparaturbedarf von zwei Karten auf eine; die 26 ist dann die einzige einzelne Abschlusskarte. Das ist exakt geprüft, aber kein Beweis eines höheren langfristigen Erwartungswerts in jeder Situation.
3. **Strukturelle Güte allein reicht nicht.** Verfügbarkeit, Zahl verschiedener Abschlussmöglichkeiten und bei stärkeren Bots gegnerische Bindung müssen später ergänzt werden. Die Referenzen bleiben teilweise lange ohne Abschluss.
4. **Keine unbelegte Schwierigkeitsrangfolge veröffentlichen.** Eine aufwendigere Berechnung kann mehr Punkte erzielen und zugleich seltener gewinnen. Zuerst das Runden-Zielmaß und die gewünschte Spielweise festlegen, anschließend Schwierigkeitsstufen gegen mehrere Gegnerfamilien kalibrieren.
5. **Keine Gesamtwertungsabhängigkeit im Standardmodus.** Das ist eine geprüfte Informationsgrenze und kein bloßer Gewichtungswert.

Im unabhängigen Lauf ohne Folgenpflicht gewann die einfache Referenz gegen `repair` zu zweit in 140/200, zu dritt in 128/300 und zu viert in 154/400 Versuchen; alle diese Runden endeten. Mit Viererpflicht gewann dieselbe Referenz dagegen deutlich seltener. Die Ergebnisse sind gegnerabhängig und belegen keine allgemeine Rangfolge.

Im konkreten 25/27-Szenario ergaben sich folgende deskriptive Ergebnisse (je 100 Versuche; die übrigen beendeten Runden gewann ein Gegner):

| Spieler | Direkte Platzierung: Siege / beendet | Lücke: Siege / beendet |
|---|---|---|
| 2 | 81 / 97 | 77 / 97 |
| 3 | 57 / 94 | 67 / 99 |
| 4 | 61 / 99 | 53 / 98 |

Damit ist insbesondere die Regel „eine fehlende Karte ist immer besser als zwei“ als allgemeine Entscheidung unzureichend. Die Lücke hat zwar den besseren strukturellen Reparaturwert, garantiert aber weder die Verfügbarkeit der 26 noch mehr Siege. Wegen Stichprobengröße, unterschiedlicher Zensierung und nur einer untersuchten Folgepolitik werden diese Zahlen nicht als feste Bot-Regel oder Signifikanznachweis übernommen.

Noch offen für weitere Forschung: Gegner mit flexiblen Zahlenbereichen statt nur `repair`, längere Läufe gegen mögliche Blockaden, echte öffentliche Karten-Erinnerung, mehrere Abschlusskarten als Wahrscheinlichkeitsmodell, bedingte Verfügbarkeit der 26, andere Zahlenbereiche/Startreihen, Bonusabwägung und Experten-Rollouts. Der neue Simulator und Datenvertrag sind für diese Schritte wiederverwendbar; Expertenstärke ist mit diesen Läufen nicht nachgewiesen.
