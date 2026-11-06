# Leicht und Mittel: Spielerzahl, Folgenpflicht und Rundenfortschritt

Stand: 6. November 2026. Aktive Profile: `easy-situational-v1` und `medium-situational-v1`. Diese Ergänzung ist maßgeblich für die aktuelle Registrierung; die früheren Referenzen bleiben unverändert für Vergleiche erhalten.

## Was die beiden Stufen berücksichtigen

| Faktor | Leicht | Mittel |
|---|---|---|
| Spielerzahl | Zahlenbereiche passen zum Kartensatz. Mehr Mitspieler erhöhen die grobe Dringlichkeit. | Zusätzlich berücksichtigt der eigene Zielraum die passende Kartensatzgröße und Folgenpflicht. |
| Pflichtfolge 0/3/4 | Einfache direkte Folgen und offene Enden von Zweier-/Dreierketten erkennen; vorhandene Pflichtfolge positiv bewerten. Ohne Pflichtfolge kein eigener Folgenbonus im Suchziel. | Gültige Gesamt-Zielreihen inklusive Pflichtfolge planen; fertige Pflichtfolge zusätzlich leicht bevorzugen. |
| Eigener Fortschritt | Aufsteigende Nachbarn, aufsteigender Wertungsanfang und Erfüllung der Pflichtfolge. | Strukturell erhaltbare Karten, nötige Ersetzungen und konkrete einzügige Abschlusskarten. |
| Bisherige Rundendauer | Nur öffentliche aggregierte Zugzahlen, keine gegnerischen Kartenentscheidungen. | Dieselbe grobe Zeitbewertung, getrennt von der eigenen Kartenplanung. |
| Grundpunkte | Später etwas mehr Gewicht auf den Wertungsanfang legen. | Später etwas mehr Gewicht auf den Wertungsanfang; Fortschritt zum gültigen Rack’o bleibt vorrangig. |
| Alternativen | Mehrere einfache Erweiterungskarten für direkte Teilfolgen beachten. Kein vollständiger Zielraumsucher. | Alle konkreten Ein-Karten-Abschlüsse nach Zahl und Engine-Platz auflisten; unterschiedliche nutzbare Abschlusskarten leicht bevorzugen. |
| Verfügbarkeit | Nur die aktuell angebotene offene Karte betrachten. | Für eigene Abschlusskarten sicher erinnerte Ablagepositionen beachten. Vergrabene oder gerade selbst abgelegte Zielkarten abwerten. |
| Grenze | Keine Gegnerhistorie lesen, keine fremden Bedürfnisse schätzen. | Keine Gegnerhände/-bedarfe modellieren, keine mehrzügigen Rollouts oder genaue Ziehwahrscheinlichkeiten. |

Beide Stufen rufen gültiges Rack’o unmittelbar aus; es gibt weiterhin keine absichtliche Bonuswette. Gesamtpunkte, frühere Runden und die verbleibende Matchdauer bleiben standardmäßig ausgeblendet. Die optionale Gesamtwertungsstrategie ist weiterhin nicht implementiert.

## Eigener Fortschritt ist nicht gegnerischer Fortschritt

Eine glückliche Austeilung kann sofort gut aussehen, während die anderen noch am Anfang stehen. Deshalb werden zwei Größen getrennt berechnet:

- `ownProgress`: grober Zustand der eigenen Reihe. Bei Leicht senkt eine noch fehlende Pflichtfolge den Fortschrittswert trotz bereits aufsteigender Reihe. Mittel verwendet den strukturellen Reparaturbedarf des eigenen Planers.
- `roundAge`: aus der Zahl abgeschlossener normaler Spielerzüge abgeleitete bisherige Rundendauer, durch die Spielerzahl geteilt. Ein leer gewordener und wieder aufgefüllter Ziehstapel setzt diese Zeit nicht zurück.

`pressure` ist ein **Dringlichkeitsindex**, keine Wahrscheinlichkeit für ein gegnerisches Rack’o. Aktuelle Heuristik:

```text
bei vollständigem Verlauf:
roundAge = clamp(completedTurns / (playerCount × 22))

ohne vollständigen Verlauf:
roundAge = 0,65 × clamp((initialDeckCount - deckCount) / initialDeckCount)

pressure = clamp(0,68 × roundAge + 0,18 × ownProgress + 0,07 × (playerCount - 2))
```

`clamp` begrenzt auf 0..1. Der Index wird bei 0,27/0,58 grob in `early`, `building` und `closing` eingeteilt. Diese Grenzen sind handgewählte, nachvollziehbare Heuristiken und kein trainiertes Gefahrenmodell.

So erhöht dieselbe durchschnittliche Anzahl Züge pro Person bei vier Spielern die Dringlichkeit stärker als bei zwei. Ein guter eigener Start allein erzeugt dagegen noch keine späte Rundensituation. Auch ohne Änderung der eigenen Hand wird die Dringlichkeit bei weiteren Zügen neu berechnet; der Struktur-Cache speichert keine alte Zeitbewertung.

## Zusätzliche Daten in der Schnittstelle

`BotObservation` erhält das additive, optionale Feld `roundProgress`:

```ts
{
  historyComplete: boolean;
  completedTurns: number | null;
  completedOwnTurns: number | null;
  reshuffles: number | null;
}
```

`observeForBot` berechnet die Zahlen aus den bestätigten öffentlichen Ereignissen der aktuellen Runde, bevor der Ereignisverlauf für Leicht entfernt wird. Ein Tausch oder ungenutztes Ablegen zählt als abgeschlossener normaler Zug; bloßes Ziehen noch nicht. Leicht erhält die aggregierten Zahlen, aber keine Kartennummern oder Entscheidungen der Gegner. Tests prüfen zusätzlich, dass seine Entscheidungslogik auch bei einem individuell erzeugten Beobachtungsobjekt den Ereignisverlauf nicht liest.

Ohne Ereignislog bleiben die Zähler `null`, statt eine unbekannte Rundendauer als null Züge auszugeben. Bei `options.events !== undefined` wird gemäß dem bestehenden Vertrag zunächst ein vollständiger Rundenlog angenommen. Teilweise rekonstruierte Verläufe müssen ausdrücklich mit `historyComplete: false` gekennzeichnet werden. Nicht einfach einen leeren Log übergeben, wenn die bisherige Runde unbekannt ist. Nur nach einer bekannten frischen Austeilung bedeutet `events: []` tatsächlich null Züge.

Alte Adapter können das Feld weglassen; dann verwendet die neue Logik ausschließlich die schwächere Reststapel-Heuristik. Diese kann ohne Verlaufswissen keine frühere Neumischung erkennen und wird daher als `source: "stock-only-proxy"` gekennzeichnet. Bei bekanntem Verlauf lautet die Quelle `public-turn-count`.

Der Ablauf, die Runden-ID, atomare Ereignisspeicherung und der optionale `prepare`-Hook bleiben wie in `BOT_UEBERGABE.md` und `BOT_STARTPLAN.md` beschrieben.

## Konkrete Abschlusskarten bei Mittel

`enumerateFinishCards(hand, maxCard, requirement)` prüft exakt, welche nicht bereits selbst gehaltenen Zahlen mit einem Austausch ein gültiges Rack’o ergeben. Dieselbe Zahl wird einmal mit ihren möglichen Zielplätzen aufgeführt. Beispiel in Wertungsrichtung:

```text
3 · 8 · 13 · 19 · 24 · 25 · 44 · 46 · 48 · 50
```

Bei Dreierpflicht passen die 23 anstelle der 19 oder die 26 anstelle der 44. Bei

```text
3 · 8 · 13 · 19 · 25 · 41 · 27 · 46 · 48 · 50
```

ist die 26 die einzige einzügige Abschlusskarte. Bei Viererpflicht ist derselbe Tausch noch kein gültiger Abschluss.

Die Diagnose von Mittel enthält `finishCards` und gegebenenfalls `resultingFinishCards` für den erwogenen Tausch. Die Verfügbarkeit wird unterschieden:

- `open-now`: aktuell oben sichtbar; das garantiert nicht, dass die Karte nach einem weiteren eigenen Tausch im nächsten Zug noch offen liegt.
- `unknown`: strukturell passend, tatsächlicher Ort und Erreichbarkeit unbekannt. Kein Versprechen, dass die Karte im Ziehstapel liegt.
- `buried`: aus vollständig beobachteten öffentlichen Ablagen sicher unter anderen Karten bekannt. Bis zu weiterer Bewegung/Neumischung nicht direkt greifbar.
- `just-discarded`: diese Karte würde der Bot gerade selbst abgeben. Sie ist kein frei verfügbarer zweiter Zug und müsste erst wieder erreichbar werden.

Mittel rekonstruiert dafür nur den öffentlichen Ablagestapel, kein Kartenbesitzmodell der Gegner. Bei unvollständigem oder widersprüchlichem Log wird keine sichere Ablageposition behauptet. Beim Neumischen verfallen alte Aussagen über vergrabene Positionen. Wenn Neumischen wegen des kleinen Reststapels näher rückt, fällt die Blockierungsabwertung geringer aus. Auch das ist eine Heuristik, keine garantierte Wartezeit.

## Implementierung und Schwierigkeitstrennung

- `shared/bot-situation.ts`: einfache eigene Handmerkmale, Zeit-/Dringlichkeitsheuristik, konkrete Abschlusskarten und öffentliche Ablagepositionen.
- `shared/bot-adaptive.ts`: aktive Stufen und versionierte Anfangsgewichte; Diagnose über `explain`.
- `shared/bot-reference.ts`: bestehender Registrierungsaufruf `createConfiguredReferenceBot`; liefert die neuen aktiven Profile. Die historischen `createReferenceBot`-Strategien bleiben unverändert.
- `shared/bot-planner.ts`: unveränderter struktureller Startplan und historische `planning-v1`-Strategie. Mittel verwendet ihn weiterhin als eigene Handplanung.

Die neuen Gewichte sind in `ADAPTIVE_WEIGHTS` exportiert. Bei Leicht bleiben Platzbereiche und aufsteigende Nachbarn die Hauptmerkmale; dazu kommen kleine Beiträge für gesicherte Punkte, unmögliche Randpositionen, Pflichtfolge und einfache Erweiterungen. Es gibt dort keine optimale Zielraumsuche und keine vollständige Abschlusskartenliste.

Bei Mittel bleibt die Anzahl erhaltbarer Karten mit Gewicht 20 die Hauptgröße. Die Zeit verändert die Gewichte für Flexibilität und Wertungsanfang nur moderat. Konkrete nutzbare Abschlusskarten und bekannte kurzfristige Blockaden ergänzen diese Bewertung. In den Vorversuchen erwies sich eine starke Absicherungsgewichtung als hinderlich; sie wurde deshalb für die endgültige Fassung deutlich reduziert.

Die Startplanung bleibt unabhängig von der ersten Zugkarte. Die situationsabhängige Bewertung entsteht danach für jede Zugentscheidung neu. Initialer und aktueller Plan bleiben zur Diagnose abrufbar.

## Vergleichsläufe und Grenzen der Ergebnisse

Historische Referenzen werden weiter mitgetestet. In den neuen Berichten stehen:

- `easy`: alter leichter Bot.
- `repair`: alte erste planende Referenz.
- `plan`: vorheriger mittlerer Bot `planning-v1`.
- `easy-v2`: neuer leichter Bot `easy-situational-v1`.
- `medium-v2`: neuer mittlerer Bot `medium-situational-v1`.

Ausgeführt wurden 14.850 zusätzliche Rundenversuche: ein kleiner Pilot mit 1.350, ein Kalibrierlauf mit 2.700 und zwei vom Pilot getrennte Validierungsläufe mit jeweils 5.400 Versuchen. 14.672 Runden endeten, 178 erreichten ihr Zuglimit. Pilot und Kalibrierung enthalten frühere Zwischenstände; sie dürfen nicht als Resultate der endgültigen Fassung gelesen werden.

Die endgültige Fassung wurde mit 40 neuen Seed-Blöcken ab 10001, allen Spielerzahlen und Folgenregeln, allen Sitzen sowie gegen zwei Gegnerfamilien geprüft. Die beiden Familien verwenden dieselben Ausgangsausteilungen und sind daher nicht statistisch unabhängig. Die Vergleiche schließen nicht gemeinsam beendete Paare aus und dokumentieren die ausgeschlossenen Paare. Intervalle werden über ganze Seed-Blöcke gebootstrapped; Mehrfachvergleiche bleiben explorativ.

Die Ergebnisse sind **gemischt**, kein Nachweis einer durchgängigen Überlegenheit:

| Gegnerfamilie und Regel | Veränderung eigener mittlerer Punkte, nur gemeinsam beendete Paare |
|---|---|
| Alte leichte Gegner, 4 Spieler, Viererpflicht | Neuer leichter Bot: +7,30 Punkte gegenüber dem alten leichten Bot. |
| Alte leichte Gegner, 2 Spieler, Viererpflicht | Neuer mittlerer Bot: +9,35 Punkte gegenüber `planning-v1`. |
| Alte leichte Gegner, 4 Spieler, normale Regel | Neuer mittlerer Bot: −1,19 Punkte gegenüber `planning-v1`. |
| `planning-v1`-Gegner, 2 Spieler, Dreierpflicht | Neuer leichter Bot: −7,12 Punkte gegenüber dem alten leichten Bot. |

Diese Auswahl zeigt bewusst sowohl Gewinne als auch Rückschritte. Die kleinen Stichproben und Konfidenzintervalle erlauben keine pauschale Aussage, dass jede neue Stufe in jeder Konstellation stärker ist. Die Erweiterung deckt zusätzliche Spielsituationen ab und erhält die Trennung von Leicht/Mittel; sie ist noch keine endgültige Spielstärkekalibrierung gegen Menschen. Alle Daten und Intervalle:

- [Validierung gegen leichte Referenzen](bot-results/situational-validation-easy.md), [Rohdaten](bot-results/situational-validation-easy.json).
- [Validierung gegen den bisherigen mittleren Bot](bot-results/situational-validation-plan.md), [Rohdaten](bot-results/situational-validation-plan.json).
- Historische Vorläufe: `situational-pilot.*` und `situational-calibration.*` mit jeweils damaligen Parametern und Quellprüfsummen. Aktuelle Reproduktion gilt für die folgenden Validierungskommandos; die Vorläufe nutzten frühere Quellstände.

```powershell
node scripts/simulate-bots.cjs --situational --opponent plan --seeds 40 --seed-offset 10001 --max-turns 480 --skip-scenario --output docs/bot-results/situational-validation-plan
node scripts/simulate-bots.cjs --situational --opponent easy --seeds 40 --seed-offset 10001 --max-turns 480 --skip-scenario --output docs/bot-results/situational-validation-easy
```

Die JSON-Dateien halten die endgültigen Gewichte, Quellprüfsummen, Anfangspläne und Ergebnisdaten fest. Die Traces enthalten zusätzlich Dringlichkeitsquelle und konkrete Abschlusskarten. Es wurden keine echten Spieler- oder Produktionsdaten verwendet und keine neuronalen Modelle trainiert.

Prüfung: 94 erfolgreiche Tests, erfolgreicher Web-Build sowie mobile Typ- und Lint-Prüfung. Die neuen Tests decken unter anderem Zeit ohne Kartenänderung, glückliche Anfangshände, Spielerzahl, Folgenpflicht, konkrete Abschlusskarten, vergrabene Ablagen, Neumischen, eigene abgegebene Karten, fehlende Historie und die Informationsgrenze von Leicht ab.

Die ausführbaren Strategiemodule sind vorbereitet. Auswahl in der Lobby und automatische lokale/serverseitige Bot-Ausführung sind weiterhin nicht aktiviert.
