# Bot-Simulation: planning-validation-easy

Version: reference-v1; 60 Seeds ab 5001; Limit 480 abgeschlossene Spielerzüge pro Runde.

Alle Gegner verwenden easy. Die Teststrategie rotiert durch alle Sitze. Gesamtwertung aus. Abgebrochene Runden sind zensiert und keine Niederlagen; Quoten beziehen sich nur auf beendete Runden. Dies ist ein Vergleich mit Referenzstrategien, kein Nachweis menschlicher oder Experten-Spielstärke.

| Spieler | Pflichtfolge | Teststrategie | Beendet / Versuche | Siege unter beendeten | Ø Punkte beendet |
|---|---|---|---|---|---|
| 2 | 0 | easy | 120/120 | 50.0 % | 47.6 |
| 2 | 0 | repair | 120/120 | 33.3 % | 49.3 |
| 2 | 0 | plan | 120/120 | 76.7 % | 76.5 |
| 2 | 3 | easy | 120/120 | 50.0 % | 83.4 |
| 2 | 3 | repair | 120/120 | 47.5 % | 80.8 |
| 2 | 3 | plan | 120/120 | 72.5 % | 102.4 |
| 2 | 4 | easy | 116/120 | 50.0 % | 110.0 |
| 2 | 4 | repair | 114/120 | 59.6 % | 143.1 |
| 2 | 4 | plan | 119/120 | 83.2 % | 161.4 |
| 3 | 0 | easy | 180/180 | 33.3 % | 37.5 |
| 3 | 0 | repair | 180/180 | 17.8 % | 37.3 |
| 3 | 0 | plan | 180/180 | 47.8 % | 54.4 |
| 3 | 3 | easy | 180/180 | 33.3 % | 66.8 |
| 3 | 3 | repair | 179/180 | 34.6 % | 66.6 |
| 3 | 3 | plan | 180/180 | 52.8 % | 82.4 |
| 3 | 4 | easy | 153/180 | 33.3 % | 90.3 |
| 3 | 4 | repair | 169/180 | 47.3 % | 106.7 |
| 3 | 4 | plan | 168/180 | 59.5 % | 125.2 |
| 4 | 0 | easy | 240/240 | 25.0 % | 34.7 |
| 4 | 0 | repair | 240/240 | 18.8 % | 37.6 |
| 4 | 0 | plan | 240/240 | 52.5 % | 55.4 |
| 4 | 3 | easy | 240/240 | 25.0 % | 59.9 |
| 4 | 3 | repair | 239/240 | 22.2 % | 54.7 |
| 4 | 3 | plan | 240/240 | 49.6 % | 79.2 |
| 4 | 4 | easy | 224/240 | 25.0 % | 80.1 |
| 4 | 4 | repair | 221/240 | 39.8 % | 91.9 |
| 4 | 4 | plan | 232/240 | 55.2 % | 113.4 |

## Gepaarte Vergleiche

Differenz = Alternative minus Baseline. Intervalle: 2.000 Bootstrap-Stichproben ganzer Seed-Blöcke; bei kleinem Pilotumfang nur explorativ. Ausgeschlossene Paare können die Auswertung verzerren. Keine Korrektur für Mehrfachvergleiche.

| Spieler | Folge | Baseline | Alternative | Gemeinsame / ausgeschlossene Paare | Differenz Siegquote | 95-%-Intervall | Δ Punkte |
|---|---|---|---|---|---|---|---|
| 2 | 0 | easy | plan | 120/0 | 26.7 % | 20.8 % bis 33.3 % | 28.8 |
| 2 | 0 | repair | easy | 120/0 | 16.7 % | 9.2 % bis 23.3 % | -1.7 |
| 2 | 0 | repair | plan | 120/0 | 43.3 % | 35.0 % bis 52.5 % | 27.2 |
| 2 | 3 | easy | plan | 120/0 | 22.5 % | 15.8 % bis 29.2 % | 19.0 |
| 2 | 3 | repair | easy | 120/0 | 2.5 % | -5.8 % bis 10.8 % | 2.6 |
| 2 | 3 | repair | plan | 120/0 | 25.0 % | 15.8 % bis 35.0 % | 21.6 |
| 2 | 4 | easy | plan | 115/5 | 33.9 % | 26.3 % bis 40.9 % | 52.0 |
| 2 | 4 | repair | easy | 110/10 | -8.2 % | -16.8 % bis 0.9 % | -31.3 |
| 2 | 4 | repair | plan | 113/7 | 23.0 % | 12.5 % bis 33.3 % | 19.6 |
| 3 | 0 | easy | plan | 180/0 | 14.4 % | 8.9 % bis 20.0 % | 16.9 |
| 3 | 0 | repair | easy | 180/0 | 15.6 % | 10.0 % bis 20.6 % | 0.2 |
| 3 | 0 | repair | plan | 180/0 | 30.0 % | 23.3 % bis 36.7 % | 17.1 |
| 3 | 3 | easy | plan | 180/0 | 19.4 % | 12.8 % bis 25.6 % | 15.6 |
| 3 | 3 | repair | easy | 179/1 | -1.7 % | -8.4 % bis 5.0 % | -0.1 |
| 3 | 3 | repair | plan | 179/1 | 18.4 % | 8.9 % bis 27.9 % | 16.1 |
| 3 | 4 | easy | plan | 141/39 | 24.8 % | 15.7 % bis 34.0 % | 31.1 |
| 3 | 4 | repair | easy | 142/38 | -12.0 % | -21.0 % bis -2.8 % | -14.8 |
| 3 | 4 | repair | plan | 160/20 | 13.8 % | 5.0 % bis 23.4 % | 21.2 |
| 4 | 0 | easy | plan | 240/0 | 27.5 % | 22.1 % bis 33.3 % | 20.7 |
| 4 | 0 | repair | easy | 240/0 | 6.3 % | 1.7 % bis 10.4 % | -2.9 |
| 4 | 0 | repair | plan | 240/0 | 33.8 % | 27.5 % bis 40.0 % | 17.8 |
| 4 | 3 | easy | plan | 240/0 | 24.6 % | 19.2 % bis 30.0 % | 19.4 |
| 4 | 3 | repair | easy | 239/1 | 2.9 % | -2.1 % bis 7.9 % | 5.2 |
| 4 | 3 | repair | plan | 239/1 | 27.2 % | 20.1 % bis 34.3 % | 24.4 |
| 4 | 4 | easy | plan | 217/23 | 30.4 % | 25.0 % bis 36.2 % | 33.5 |
| 4 | 4 | repair | easy | 207/33 | -14.0 % | -21.0 % bis -7.2 % | -9.5 |
| 4 | 4 | repair | plan | 214/26 | 15.0 % | 6.5 % bis 23.6 % | 21.5 |

## 25/27: bedingtes Entscheidungsexperiment

Feste eigene Ausgangshand, 27 bereits gezogen, Gegnerhände aus den übrigen Karten zufällig. Danach spielt der untersuchte Spieler repair, seine Gegner easy. Keine Verallgemeinerung auf andere Hände. Die Handlisten in JSON verwenden Engine-Reihenfolge hinten nach vorne.

- 2 Spieler, adjacent: 60/60 beendet; 38 eigene Siege; Ø 94.9 Punkte.
- 2 Spieler, gap: 60/60 beendet; 52 eigene Siege; Ø 115.0 Punkte.
- 3 Spieler, adjacent: 60/60 beendet; 43 eigene Siege; Ø 103.1 Punkte.
- 3 Spieler, gap: 60/60 beendet; 47 eigene Siege; Ø 108.1 Punkte.
- 4 Spieler, adjacent: 60/60 beendet; 40 eigene Siege; Ø 95.9 Punkte.
- 4 Spieler, gap: 60/60 beendet; 32 eigene Siege; Ø 88.3 Punkte.

Exakt strukturell: direkte Platzierung hat keine einzelne Abschlusskarte; Lücke hat die 26. Das gilt unabhängig davon, ob die 26 tatsächlich erreichbar ist. Die Kartenstatistik enthält Angebote/Aufnahmen/Ablagen nach Spielerzahl, Folge und Teststrategie und ist keine universelle Kartenwerttabelle.
