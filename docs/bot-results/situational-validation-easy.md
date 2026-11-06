# Bot-Simulation: situational-validation-easy

Version: reference-v1; 40 Seeds ab 10001; Limit 480 abgeschlossene Spielerzüge pro Runde.

Alle Gegner verwenden easy. Die Teststrategie rotiert durch alle Sitze. Gesamtwertung aus. Abgebrochene Runden sind zensiert und keine Niederlagen; Quoten beziehen sich nur auf beendete Runden. Dies ist ein Vergleich mit Referenzstrategien, kein Nachweis menschlicher oder Experten-Spielstärke.

| Spieler | Pflichtfolge | Teststrategie | Beendet / Versuche | Siege unter beendeten | Ø Punkte beendet |
|---|---|---|---|---|---|
| 2 | 0 | easy | 80/80 | 50.0 % | 49.3 |
| 2 | 0 | repair | 80/80 | 30.0 % | 54.3 |
| 2 | 0 | plan | 80/80 | 58.8 % | 68.5 |
| 2 | 0 | easy-v2 | 80/80 | 48.8 % | 50.2 |
| 2 | 0 | medium-v2 | 80/80 | 61.3 % | 69.9 |
| 2 | 3 | easy | 80/80 | 50.0 % | 80.4 |
| 2 | 3 | repair | 80/80 | 47.5 % | 86.1 |
| 2 | 3 | plan | 80/80 | 66.3 % | 98.9 |
| 2 | 3 | easy-v2 | 80/80 | 50.0 % | 80.5 |
| 2 | 3 | medium-v2 | 80/80 | 71.3 % | 103.4 |
| 2 | 4 | easy | 74/80 | 50.0 % | 110.3 |
| 2 | 4 | repair | 77/80 | 67.5 % | 142.5 |
| 2 | 4 | plan | 78/80 | 76.9 % | 155.1 |
| 2 | 4 | easy-v2 | 75/80 | 50.7 % | 112.1 |
| 2 | 4 | medium-v2 | 77/80 | 79.2 % | 164.2 |
| 3 | 0 | easy | 120/120 | 33.3 % | 37.9 |
| 3 | 0 | repair | 120/120 | 19.2 % | 38.0 |
| 3 | 0 | plan | 120/120 | 56.7 % | 59.5 |
| 3 | 0 | easy-v2 | 120/120 | 35.0 % | 40.4 |
| 3 | 0 | medium-v2 | 120/120 | 58.3 % | 60.3 |
| 3 | 3 | easy | 120/120 | 33.3 % | 67.1 |
| 3 | 3 | repair | 120/120 | 35.8 % | 66.0 |
| 3 | 3 | plan | 120/120 | 58.3 % | 87.3 |
| 3 | 3 | easy-v2 | 120/120 | 34.2 % | 69.4 |
| 3 | 3 | medium-v2 | 120/120 | 58.3 % | 87.5 |
| 3 | 4 | easy | 108/120 | 33.3 % | 90.3 |
| 3 | 4 | repair | 113/120 | 47.8 % | 113.1 |
| 3 | 4 | plan | 115/120 | 67.0 % | 132.9 |
| 3 | 4 | easy-v2 | 107/120 | 32.7 % | 88.0 |
| 3 | 4 | medium-v2 | 117/120 | 66.7 % | 132.3 |
| 4 | 0 | easy | 160/160 | 25.0 % | 34.5 |
| 4 | 0 | repair | 160/160 | 18.1 % | 38.7 |
| 4 | 0 | plan | 160/160 | 53.1 % | 54.9 |
| 4 | 0 | easy-v2 | 160/160 | 25.6 % | 34.5 |
| 4 | 0 | medium-v2 | 160/160 | 50.6 % | 53.8 |
| 4 | 3 | easy | 160/160 | 25.0 % | 57.7 |
| 4 | 3 | repair | 160/160 | 20.0 % | 48.5 |
| 4 | 3 | plan | 159/160 | 48.4 % | 80.4 |
| 4 | 3 | easy-v2 | 160/160 | 27.5 % | 60.5 |
| 4 | 3 | medium-v2 | 159/160 | 47.8 % | 79.7 |
| 4 | 4 | easy | 144/160 | 25.0 % | 78.1 |
| 4 | 4 | repair | 151/160 | 39.1 % | 93.8 |
| 4 | 4 | plan | 157/160 | 58.6 % | 123.2 |
| 4 | 4 | easy-v2 | 148/160 | 31.1 % | 85.9 |
| 4 | 4 | medium-v2 | 154/160 | 60.4 % | 125.1 |

## Gepaarte Vergleiche

Differenz = Alternative minus Baseline. Intervalle: 2.000 Bootstrap-Stichproben ganzer Seed-Blöcke; bei kleinem Pilotumfang nur explorativ. Ausgeschlossene Paare können die Auswertung verzerren. Keine Korrektur für Mehrfachvergleiche.

| Spieler | Folge | Baseline | Alternative | Gemeinsame / ausgeschlossene Paare | Differenz Siegquote | 95-%-Intervall | Δ Punkte |
|---|---|---|---|---|---|---|---|
| 2 | 0 | easy | easy-v2 | 80/0 | -1.3 % | -8.8 % bis 6.3 % | 0.9 |
| 2 | 0 | plan | medium-v2 | 80/0 | 2.5 % | 0.0 % bis 6.3 % | 1.4 |
| 2 | 0 | easy-v2 | medium-v2 | 80/0 | 12.5 % | 1.3 % bis 23.8 % | 19.8 |
| 2 | 3 | easy | easy-v2 | 80/0 | 0.0 % | -7.5 % bis 8.8 % | 0.1 |
| 2 | 3 | plan | medium-v2 | 80/0 | 5.0 % | -1.3 % bis 12.5 % | 4.5 |
| 2 | 3 | easy-v2 | medium-v2 | 80/0 | 21.3 % | 8.8 % bis 32.5 % | 22.9 |
| 2 | 4 | easy | easy-v2 | 73/7 | 0.0 % | -6.8 % bis 6.8 % | 0.9 |
| 2 | 4 | plan | medium-v2 | 77/3 | 2.6 % | -3.9 % bis 10.4 % | 9.4 |
| 2 | 4 | easy-v2 | medium-v2 | 72/8 | 27.8 % | 16.2 % bis 39.2 % | 52.2 |
| 3 | 0 | easy | easy-v2 | 120/0 | 1.7 % | -3.3 % bis 6.7 % | 2.5 |
| 3 | 0 | plan | medium-v2 | 120/0 | 1.7 % | 0.0 % bis 4.2 % | 0.8 |
| 3 | 0 | easy-v2 | medium-v2 | 120/0 | 23.3 % | 15.8 % bis 30.8 % | 20.0 |
| 3 | 3 | easy | easy-v2 | 120/0 | 0.8 % | -5.0 % bis 6.7 % | 2.3 |
| 3 | 3 | plan | medium-v2 | 120/0 | 0.0 % | -3.3 % bis 3.3 % | 0.3 |
| 3 | 3 | easy-v2 | medium-v2 | 120/0 | 24.2 % | 14.2 % bis 33.3 % | 18.1 |
| 3 | 4 | easy | easy-v2 | 104/16 | 1.0 % | -5.3 % bis 7.0 % | -0.3 |
| 3 | 4 | plan | medium-v2 | 115/5 | 0.0 % | -5.1 % bis 5.2 % | -1.0 |
| 3 | 4 | easy-v2 | medium-v2 | 104/16 | 32.7 % | 21.6 % bis 43.8 % | 43.1 |
| 4 | 0 | easy | easy-v2 | 160/0 | 0.6 % | -2.5 % bis 4.4 % | 0.1 |
| 4 | 0 | plan | medium-v2 | 160/0 | -2.5 % | -5.0 % bis 0.0 % | -1.2 |
| 4 | 0 | easy-v2 | medium-v2 | 160/0 | 25.0 % | 18.1 % bis 31.9 % | 19.2 |
| 4 | 3 | easy | easy-v2 | 160/0 | 2.5 % | -1.3 % bis 6.3 % | 2.8 |
| 4 | 3 | plan | medium-v2 | 159/1 | -0.6 % | -3.1 % bis 1.3 % | -0.8 |
| 4 | 3 | easy-v2 | medium-v2 | 159/1 | 20.8 % | 13.1 % bis 29.4 % | 19.5 |
| 4 | 4 | easy | easy-v2 | 139/21 | 5.8 % | 0.0 % bis 11.6 % | 7.3 |
| 4 | 4 | plan | medium-v2 | 154/6 | 1.3 % | -2.7 % bis 5.8 % | 1.0 |
| 4 | 4 | easy-v2 | medium-v2 | 142/18 | 27.5 % | 19.3 % bis 36.0 % | 36.0 |

## 25/27: bedingtes Entscheidungsexperiment

Feste eigene Ausgangshand, 27 bereits gezogen, Gegnerhände aus den übrigen Karten zufällig. Danach spielt der untersuchte Spieler repair, seine Gegner easy. Keine Verallgemeinerung auf andere Hände. Die Handlisten in JSON verwenden Engine-Reihenfolge hinten nach vorne.


Exakt strukturell: direkte Platzierung hat keine einzelne Abschlusskarte; Lücke hat die 26. Das gilt unabhängig davon, ob die 26 tatsächlich erreichbar ist. Die Kartenstatistik enthält Angebote/Aufnahmen/Ablagen nach Spielerzahl, Folge und Teststrategie und ist keine universelle Kartenwerttabelle.
