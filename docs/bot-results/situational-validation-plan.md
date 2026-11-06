# Bot-Simulation: situational-validation-plan

Version: reference-v1; 40 Seeds ab 10001; Limit 480 abgeschlossene Spielerzüge pro Runde.

Alle Gegner verwenden plan. Die Teststrategie rotiert durch alle Sitze. Gesamtwertung aus. Abgebrochene Runden sind zensiert und keine Niederlagen; Quoten beziehen sich nur auf beendete Runden. Dies ist ein Vergleich mit Referenzstrategien, kein Nachweis menschlicher oder Experten-Spielstärke.

| Spieler | Pflichtfolge | Teststrategie | Beendet / Versuche | Siege unter beendeten | Ø Punkte beendet |
|---|---|---|---|---|---|
| 2 | 0 | easy | 80/80 | 41.3 % | 45.6 |
| 2 | 0 | repair | 79/80 | 20.3 % | 43.3 |
| 2 | 0 | plan | 80/80 | 50.0 % | 56.0 |
| 2 | 0 | easy-v2 | 80/80 | 37.5 % | 43.3 |
| 2 | 0 | medium-v2 | 80/80 | 51.2 % | 56.8 |
| 2 | 3 | easy | 80/80 | 33.8 % | 62.3 |
| 2 | 3 | repair | 79/80 | 35.4 % | 77.8 |
| 2 | 3 | plan | 78/80 | 50.0 % | 84.4 |
| 2 | 3 | easy-v2 | 80/80 | 27.5 % | 55.1 |
| 2 | 3 | medium-v2 | 79/80 | 51.9 % | 85.3 |
| 2 | 4 | easy | 78/80 | 23.1 % | 71.6 |
| 2 | 4 | repair | 72/80 | 45.8 % | 98.0 |
| 2 | 4 | plan | 78/80 | 50.0 % | 114.3 |
| 2 | 4 | easy-v2 | 79/80 | 25.3 % | 74.3 |
| 2 | 4 | medium-v2 | 79/80 | 46.8 % | 108.5 |
| 3 | 0 | easy | 120/120 | 17.5 % | 29.4 |
| 3 | 0 | repair | 120/120 | 15.8 % | 33.3 |
| 3 | 0 | plan | 120/120 | 33.3 % | 45.0 |
| 3 | 0 | easy-v2 | 120/120 | 16.7 % | 29.0 |
| 3 | 0 | medium-v2 | 120/120 | 32.5 % | 44.5 |
| 3 | 3 | easy | 119/120 | 12.6 % | 40.3 |
| 3 | 3 | repair | 119/120 | 19.3 % | 50.7 |
| 3 | 3 | plan | 120/120 | 33.3 % | 62.5 |
| 3 | 3 | easy-v2 | 119/120 | 16.0 % | 43.7 |
| 3 | 3 | medium-v2 | 120/120 | 31.7 % | 61.0 |
| 3 | 4 | easy | 119/120 | 6.7 % | 46.7 |
| 3 | 4 | repair | 119/120 | 25.2 % | 66.6 |
| 3 | 4 | plan | 120/120 | 33.3 % | 82.3 |
| 3 | 4 | easy-v2 | 119/120 | 7.6 % | 47.9 |
| 3 | 4 | medium-v2 | 119/120 | 31.9 % | 80.5 |
| 4 | 0 | easy | 160/160 | 16.9 % | 27.8 |
| 4 | 0 | repair | 160/160 | 15.6 % | 32.3 |
| 4 | 0 | plan | 160/160 | 25.0 % | 37.9 |
| 4 | 0 | easy-v2 | 160/160 | 15.6 % | 27.3 |
| 4 | 0 | medium-v2 | 160/160 | 25.6 % | 38.2 |
| 4 | 3 | easy | 160/160 | 10.6 % | 36.6 |
| 4 | 3 | repair | 160/160 | 10.6 % | 37.9 |
| 4 | 3 | plan | 160/160 | 25.0 % | 53.3 |
| 4 | 3 | easy-v2 | 159/160 | 8.2 % | 34.9 |
| 4 | 3 | medium-v2 | 160/160 | 25.0 % | 53.0 |
| 4 | 4 | easy | 157/160 | 10.2 % | 54.5 |
| 4 | 4 | repair | 153/160 | 19.6 % | 60.3 |
| 4 | 4 | plan | 156/160 | 25.0 % | 72.0 |
| 4 | 4 | easy-v2 | 159/160 | 9.4 % | 53.7 |
| 4 | 4 | medium-v2 | 156/160 | 24.4 % | 71.0 |

## Gepaarte Vergleiche

Differenz = Alternative minus Baseline. Intervalle: 2.000 Bootstrap-Stichproben ganzer Seed-Blöcke; bei kleinem Pilotumfang nur explorativ. Ausgeschlossene Paare können die Auswertung verzerren. Keine Korrektur für Mehrfachvergleiche.

| Spieler | Folge | Baseline | Alternative | Gemeinsame / ausgeschlossene Paare | Differenz Siegquote | 95-%-Intervall | Δ Punkte |
|---|---|---|---|---|---|---|---|
| 2 | 0 | easy | easy-v2 | 80/0 | -3.8 % | -10.0 % bis 2.5 % | -2.3 |
| 2 | 0 | plan | medium-v2 | 80/0 | 1.3 % | 0.0 % bis 3.8 % | 0.8 |
| 2 | 0 | easy-v2 | medium-v2 | 80/0 | 13.8 % | 2.5 % bis 23.8 % | 13.5 |
| 2 | 3 | easy | easy-v2 | 80/0 | -6.3 % | -12.5 % bis 0.0 % | -7.1 |
| 2 | 3 | plan | medium-v2 | 78/2 | 1.3 % | 0.0 % bis 3.9 % | 0.4 |
| 2 | 3 | easy-v2 | medium-v2 | 79/1 | 25.3 % | 13.8 % bis 35.9 % | 31.1 |
| 2 | 4 | easy | easy-v2 | 78/2 | 2.6 % | -3.8 % bis 8.9 % | 3.0 |
| 2 | 4 | plan | medium-v2 | 78/2 | -2.6 % | -6.3 % bis 0.0 % | -5.0 |
| 2 | 4 | easy-v2 | medium-v2 | 78/2 | 23.1 % | 11.4 % bis 34.6 % | 36.5 |
| 3 | 0 | easy | easy-v2 | 120/0 | -0.8 % | -3.3 % bis 1.7 % | -0.4 |
| 3 | 0 | plan | medium-v2 | 120/0 | -0.8 % | -2.5 % bis 0.0 % | -0.4 |
| 3 | 0 | easy-v2 | medium-v2 | 120/0 | 15.8 % | 10.0 % bis 21.7 % | 15.5 |
| 3 | 3 | easy | easy-v2 | 119/1 | 3.4 % | 0.0 % bis 7.5 % | 3.4 |
| 3 | 3 | plan | medium-v2 | 120/0 | -1.7 % | -5.8 % bis 2.5 % | -1.5 |
| 3 | 3 | easy-v2 | medium-v2 | 119/1 | 15.1 % | 8.4 % bis 21.8 % | 16.7 |
| 3 | 4 | easy | easy-v2 | 119/1 | 0.8 % | -2.5 % bis 4.2 % | 1.3 |
| 3 | 4 | plan | medium-v2 | 119/1 | -0.8 % | -2.5 % bis 0.0 % | -1.0 |
| 3 | 4 | easy-v2 | medium-v2 | 118/2 | 24.6 % | 19.3 % bis 29.4 % | 33.2 |
| 4 | 0 | easy | easy-v2 | 160/0 | -1.3 % | -3.1 % bis 0.0 % | -0.6 |
| 4 | 0 | plan | medium-v2 | 160/0 | 0.6 % | 0.0 % bis 1.9 % | 0.3 |
| 4 | 0 | easy-v2 | medium-v2 | 160/0 | 10.0 % | 3.8 % bis 16.3 % | 10.9 |
| 4 | 3 | easy | easy-v2 | 159/1 | -2.5 % | -5.7 % bis 0.6 % | -1.6 |
| 4 | 3 | plan | medium-v2 | 160/0 | 0.0 % | -1.9 % bis 1.9 % | -0.3 |
| 4 | 3 | easy-v2 | medium-v2 | 159/1 | 16.4 % | 11.3 % bis 20.8 % | 17.6 |
| 4 | 4 | easy | easy-v2 | 157/3 | -1.3 % | -3.9 % bis 1.3 % | -1.5 |
| 4 | 4 | plan | medium-v2 | 156/4 | -0.6 % | -3.8 % bis 2.6 % | -1.0 |
| 4 | 4 | easy-v2 | medium-v2 | 155/5 | 14.8 % | 8.4 % bis 21.2 % | 17.1 |

## 25/27: bedingtes Entscheidungsexperiment

Feste eigene Ausgangshand, 27 bereits gezogen, Gegnerhände aus den übrigen Karten zufällig. Danach spielt der untersuchte Spieler repair, seine Gegner plan. Keine Verallgemeinerung auf andere Hände. Die Handlisten in JSON verwenden Engine-Reihenfolge hinten nach vorne.


Exakt strukturell: direkte Platzierung hat keine einzelne Abschlusskarte; Lücke hat die 26. Das gilt unabhängig davon, ob die 26 tatsächlich erreichbar ist. Die Kartenstatistik enthält Angebote/Aufnahmen/Ablagen nach Spielerzahl, Folge und Teststrategie und ist keine universelle Kartenwerttabelle.
