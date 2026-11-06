# Ausgangshand bewerten und während der Runde umplanen

Stand: 6. November 2026. Ergänzung zu `BOT_UEBERGABE.md`; Implementierung in `shared/bot-planner.ts`.

Aktuelle Weiterentwicklung: Die aktive mittlere Stufe umschließt diesen Planer inzwischen mit der situationsabhängigen Bewertung aus [BOT_KONTEXT.md](BOT_KONTEXT.md); ihre ID lautet `medium-situational-v1`. `planning-v1` bleibt unverändert als historische Vergleichsstrategie verfügbar. Die nachfolgenden ursprünglichen Vergleichsläufe betreffen `planning-v1`.

## Was vorher schon vorhanden war

Die bisherige `repair`-Referenz bewertete vor dem Ziehen bereits die ganze eigene Hand: Wie viele Karten könnten an ihren aktuellen Plätzen in einer gültigen Zielreihe bleiben? Diese Zahl wurde auch für mögliche Tauschaktionen berechnet. Damit wurden nicht nur benachbarte Karten betrachtet. Es fehlten aber eine nachvollziehbare konkrete Startplanung und eine Bewertung, wie viele alternative Zielreihen mit gleich wenigen Austauschen möglich sind.

## Neuer Ablauf für medium

`createConfiguredReferenceBot({ difficulty: "medium", considerMatchScore: false })` liefert jetzt `planning-v1`. Die unveränderte `repair`-Referenz bleibt für Vergleiche über `createReferenceBot({ policy: "repair" })` verfügbar. Leicht verwendet weiterhin seine einfachen Platzbereiche und keine Gegnerbeobachtung.

1. Nach dem Austeilen, vor dem ersten Ziehen, wertet `prepare(observation)` die zehn eigenen Karten aus. Der eigene Spieler muss noch nicht am Zug sein.
2. Die Planung berücksichtigt aktuelle Karten an ihren festen Plätzen, Kartensatzgröße, ausreichend Zahlen zwischen den Plätzen und die optionale Pflichtfolge.
3. Es entstehen vorläufige Ankerkarten, Austauschplätze, Wertebereiche und eine beispielhafte gültige Zielreihe.
4. Nach einer Änderung der eigenen Karten wird die Planung neu erstellt. Alte Anker dürfen aufgegeben werden, auch wenn die betreffende Karte noch in der Hand liegt.
5. Bei jeder angebotenen oder gezogenen Karte werden alle möglichen Tausche mit der aktuellen Situation verglichen. Die Zahl alternativer strukturell passender Zielreihen geht in die Entscheidung ein.

Die Startplanung selbst erhält **keine** gezogene Karte, offene Ablage, Gegnerdaten oder Gesamtpunkte. Sie ist eine reine Funktion von eigener Hand, Kartensatzgröße und Pflichtfolge. Die Zugentscheidung darf anschließend die aktuelle offene oder eigene gezogene Karte bewerten.

## Beispiel ohne Folgenpflicht

In Wertungsrichtung:

```text
Ausgeteilt:  2 · 49 · 12 · 45 · 22 · 41 · 32 · 37 · 42 · 47
Anker:       2 ·  — · 12 ·  — · 22 ·  — · 32 · 37 · 42 · 47
```

Sieben Karten können zunächst bleiben. Die Plätze mit 49, 45 und 41 sind vorläufig zum Austausch vorgesehen. Dazwischen stehen genügend mögliche Werte für die fehlenden Plätze zur Verfügung. Mit einer Pflichtfolge kann ein anderer Plan nötig sein; bereits aufsteigende Einzelkarten reichen dafür nicht immer aus.

Auch bereits aufsteigende Anker müssen geometrisch passen: Zwischen 25 und 27 gibt es nur die 26. Liegen dazwischen zwei Plätze, können 25 und 27 nicht beide als feste Anker behalten werden. Kleine oder große Karten sind ebenfalls nur dann Anker, wenn genügend kleinere bzw. größere Werte für die übrigen Plätze existieren.

## Planformat

`RackPlan` ist JSON-kompatibel:

- `sourceHand`: Die Hand, aus der der Plan erstellt wurde.
- `anchors`: Zu behaltende Karten mit Engine-Platzindex.
- `replaceSlots`: Voraussichtliche Austauschplätze.
- `targetHand`: Eine repräsentative gültige Zielreihe, **keine verbindliche Wunschliste einzelner Zahlen**.
- `slotRanges`: Min./Max.-Werte und Rolle je Platz für die repräsentative Anker-/Folgenanordnung. Einzelne Werte in einem Bereich sind keine unabhängig austauschbaren Garantien; die Gesamtreihe muss weiterhin aufsteigen.
- `run`: Geplante Pflichtfolge mit Werten und Plätzen oder `null`.
- `keptCards`, `optimisticReplacements`: Strukturell erhaltbare Karten und mindestens nötige Ersetzungen.
- `completionCount`: Anzahl unterschiedlicher optimaler hypothetischer Zielhände über alle optimalen Anker-/Folgenanordnungen.
- `flexibility`: `log(completionCount) / max(1, optimisticReplacements)` als Maß struktureller Alternativen.

Alle Handlisten und `slot`-Indizes verwenden die unveränderte Engine-Reihenfolge **hinten nach vorne**. Die Beispiele oben werden zum Lesen umgedreht.

Die Zielhände zählen jede aufsteigende Hand nur einmal, auch bei mehreren möglichen Pflichtfolgen. Die dynamische Programmierung wurde gegen vollständige Aufzählungen kleiner Kartensätze geprüft. Bei gleich guter Ankerzahl wird für die Darstellung eine ungefähr gleichmäßig verteilte Beispiel-Zielreihe gewählt. Diese Wahl der Beispielwerte beeinflusst nicht die Anzahl aller Alternativen.

Die Flexibilität ist keine Zieh- oder Siegchance. Passende Werte können beim Gegner gebunden oder in der Ablage vergraben sein. Eigene Karten an falschen Plätzen sind ebenfalls nicht ohne Weiteres verschiebbar. Die Zahlen beschreiben deshalb einen optimistischen strukturellen Zielraum.

## Lebenszyklus für die App-/Server-Integration

Der bestehende Beobachtungsvertrag bleibt unverändert. `BotStrategy` besitzt jetzt zusätzlich den optionalen, synchronen Hook:

```ts
prepare?(observation: BotObservation): void;
```

Direkt nach dem Austeilen alle Bot-Instanzen vorbereiten, bevor irgendein Teilnehmer zieht:

```ts
for (const [playerId, strategy] of botStrategies) {
  strategy.prepare?.(observeForBot(state, playerId, {
    roundId, revision, settings: settingsByPlayer[playerId], events: publicRoundLog,
  }));
}
```

Der Hook führt keinen Spielzug aus. Er funktioniert auch mit `phase: "inactive"`. Falls ein älterer Adapter ihn nicht aufruft, erstellt `decide` den Plan automatisch, bevor die angebotene/gezogene Karte bewertet wird. Eine zusätzliche Netzwerkabfrage ist nicht nötig.

Eine Strategieinstanz pro Bot-Teilnehmer beibehalten, damit der anfängliche Diagnoseplan erhalten bleibt. Eine neue Instanz pro Einzelaktion kann zwar aus der aktuellen Hand korrekt neu entscheiden, verliert aber die Gegenüberstellung von ursprünglicher und aktueller Planung.

`createPlanningBot()` bietet für Diagnose/Tests `getPlanningState()` und `explain(observation)`. Der Zustand enthält `initialPlan`, `currentPlan`, `replans`, Spieler-ID und Runden-ID. Rückgaben sind isolierte Kopien. Der ursprüngliche Plan bleibt zur Nachvollziehbarkeit erhalten; er sperrt keine Karten. Bei einer neuen undurchsichtigen `roundId` wird dieser Diagnosezustand zurückgesetzt. Produktive Adapter müssen die Runden-ID daher zuverlässig wechseln.

Planungszustände können zu Diagnosezwecken gespeichert werden; für korrekte Entscheidungen genügt nach einem Neustart die aktuelle erlaubte Beobachtung. Der dann erste Plan bezieht sich auf die zuerst beobachtete Hand, nicht rückwirkend auf eine unbekannte Austeilung.

## Bewertung und Abgrenzung

Die vorab festgelegten Gewichte von `planning-v1` sind:

```text
20 × strukturell erhaltbare Karten
+ 2 × Flexibilität
+ 0,4 × Karten im aufsteigenden Wertungsanfang
```

Es gibt keine allgemeine Priorität für mittlere Zahlen und keine Abhängigkeit von Gesamtpunkten. Gegnerhistorie und bewusste Bonuswetten sind nicht Teil dieser Verbesserung. Die Gewichte sind nachvollziehbare Ausgangswerte, kein automatisch trainiertes Modell.

Die Vergleichsläufe prüfen das **Gesamtpaket aus ausdrücklicher Vorbereitung und verbesserter Bewertung flexibler Zielreihen**. Sie beweisen nicht, dass allein das Speichern eines Startplans die Stärke erhöht; die alte Referenz hatte bereits eine implizite Gesamtbewertung der Hand.

## Reproduzierbare Vergleiche

Pilot mit zehn Seeds; danach unveränderte Planungsgewichte mit 60 neuen Seeds und zwei Gegnerfamilien:

```powershell
node scripts/simulate-bots.cjs --planning --seeds 10 --max-turns 240 --output docs/bot-results/planning-pilot
node scripts/simulate-bots.cjs --planning --seeds 60 --seed-offset 5001 --max-turns 480 --output docs/bot-results/planning-validation-repair
node scripts/simulate-bots.cjs --planning --opponent easy --seeds 60 --seed-offset 5001 --max-turns 480 --output docs/bot-results/planning-validation-easy
```

Im Simulator werden die Planungs-Bots nach dem Austeilen vorbereitet, bevor die Zugschleife beginnt. JSON-Berichte enthalten zusätzlich `preparations` mit den zuerst erstellten Plänen der Stichprobe. Entscheidungs-Traces enthalten den jeweiligen anfänglichen und aktuellen Plan. Es sind ausschließlich synthetische Spielstände.

Die Teststrategie rotiert durch alle Sitze. Alle Kombinationen aus 2/3/4 Spielern und 0/3/4 als Folgenpflicht werden geprüft. Gepaarte Vergleiche verwenden dieselbe Austeilung und denselben Testspielersitz. Neue Strategie und alte Referenzen spielen jeweils gegen dieselbe Gegnerfamilie. Der Simulator berichtet daneben weiterhin das ältere 25/27-Szenario mit `repair` als untersuchtem Spieler; dieses Zusatzexperiment ist kein Test von `planning-v1`.

Ergebnisse und Rohdaten stehen unter `docs/bot-results/planning-*.{md,json}`. Zensierte Runden werden gesondert ausgewiesen, nicht als Niederlage oder null Punkte gewertet. Bootstrap-Intervalle werden über ganze Seed-Blöcke gebildet; die vielen Vergleiche sind explorativ und nicht für Mehrfachtests korrigiert. Die Ergebnisse gelten für die getesteten Referenzgegner und sind kein Nachweis von Expertenstärke gegen Menschen.

## Tatsächlich ausgeführte Ergebnisse

Es wurden zusätzlich 11.310 Rundenversuche dokumentiert: 10.530 Turnierversuche und 780 Zusatzversuche des älteren 25/27-Szenarios. Davon endeten 10.893; 417 erreichten das jeweilige Zuglimit. Pilot und Validierung werden getrennt gehalten. Die Gewichte wurden nach dem Pilot nicht verändert.

Die beiden vom Pilot getrennten Validierungsläufe umfassen je 4.860 Turnierversuche mit 60 neuen Seed-Blöcken. Beide Gegnerfamilien verwenden dieselben neuen Ausgangsausteilungen; die Läufe sind daher untereinander nicht statistisch unabhängig. Die neuen Planungs-Bots erzielten in allen 36 untersuchten gepaarten Kontrasten (neun Regel-/Spielerzahl-Kombinationen × zwei alte Vergleichsstrategien × zwei Gegnerfamilien) eine höhere deskriptive Siegquote und höhere mittlere Punkte als die jeweilige alte Strategie. Das sind beobachtete Richtungen, keine Aussage über 36 unabhängig signifikante Ergebnisse. Je nach Vergleich mussten nicht gemeinsam beendete Runden ausgeschlossen werden.

Beispiel mit Dreierpflicht gegen ausschließlich leichte Gegner; die alte oder neue Strategie nimmt jeweils denselben getesteten Sitz ein:

| Spieler | Alte repair-Referenz: Siege / beendet | Neuer Planer: Siege / beendet | Alte / neue Ø Rundenpunkte |
|---|---|---|---|
| 2 | 57 / 120 | 87 / 120 | 80,8 / 102,4 |
| 3 | 62 / 179 | 95 / 180 | 66,6 / 82,4 |
| 4 | 53 / 239 | 119 / 240 | 54,7 / 79,2 |

Im Zweierspiel bedeutet das 47,5 % gegenüber 72,5 % Siege bei vollständig beendeten Vergleichsrunden. Der gepaarte Unterschied beträgt +25 Prozentpunkte; das explorative 95-%-Seed-Block-Bootstrap-Intervall reicht von +15,8 bis +35,0 Prozentpunkten. Die durchschnittliche Punktedifferenz beträgt +21,6.

Gegen ausschließlich `repair`-Gegner gewann der neue Planer bei Dreierpflicht 87/119 beendete Zweier-, 102/174 Dreier- und 125/238 Viererrunden. Es gab entsprechend 1/6/2 zensierte Versuche. Vollständige Werte, Vergleichspaare und Intervalle:

- [Validierung gegen repair](bot-results/planning-validation-repair.md), [Rohdaten](bot-results/planning-validation-repair.json).
- [Validierung gegen easy](bot-results/planning-validation-easy.md), [Rohdaten](bot-results/planning-validation-easy.json).
- [Pilot](bot-results/planning-pilot.md).

Die Validierungsdateien enthalten Prüfsummen der verwendeten Quellen, vorbereitete Startpläne und getrennte Zensierungszahlen. Die veröffentlichten Startgewichte bleiben transparent und veränderbar; es wurde kein selbstlernendes neuronales Modell trainiert.

Prüfung der Implementierung: 84 erfolgreiche Tests, erfolgreicher Web-Build sowie erfolgreiche mobile Typ- und Lint-Prüfung. Zusätzliche Tests prüfen Karten mit Abstand, unmögliche Anker, exakte Zielzählung, Vorbereitung vor dem eigenen Zug, Unabhängigkeit von der ersten Ziehkarte, Freigabe alter Anker und Zurücksetzen bei Rundenwechsel.
