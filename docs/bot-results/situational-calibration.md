# Bot-Simulation: situational-calibration

Version: reference-v1; 20 Seeds ab 1; Limit 240 abgeschlossene Spielerzüge pro Runde.

Alle Gegner verwenden plan. Die Teststrategie rotiert durch alle Sitze. Gesamtwertung aus. Abgebrochene Runden sind zensiert und keine Niederlagen; Quoten beziehen sich nur auf beendete Runden. Dies ist ein Vergleich mit Referenzstrategien, kein Nachweis menschlicher oder Experten-Spielstärke.

| Spieler | Pflichtfolge | Teststrategie | Beendet / Versuche | Siege unter beendeten | Ø Punkte beendet |
|---|---|---|---|---|---|
| 2 | 0 | easy | 40/40 | 42.5 % | 46.8 |
| 2 | 0 | repair | 40/40 | 32.5 % | 67.5 |
| 2 | 0 | plan | 40/40 | 50.0 % | 55.5 |
| 2 | 0 | easy-v2 | 40/40 | 40.0 % | 44.9 |
| 2 | 0 | medium-v2 | 40/40 | 50.0 % | 54.3 |
| 2 | 3 | easy | 40/40 | 35.0 % | 63.9 |
| 2 | 3 | repair | 38/40 | 18.4 % | 56.1 |
| 2 | 3 | plan | 40/40 | 50.0 % | 76.4 |
| 2 | 3 | easy-v2 | 40/40 | 35.0 % | 63.3 |
| 2 | 3 | medium-v2 | 40/40 | 50.0 % | 78.9 |
| 2 | 4 | easy | 39/40 | 25.6 % | 75.3 |
| 2 | 4 | repair | 40/40 | 42.5 % | 113.8 |
| 2 | 4 | plan | 40/40 | 50.0 % | 112.5 |
| 2 | 4 | easy-v2 | 38/40 | 18.4 % | 63.0 |
| 2 | 4 | medium-v2 | 40/40 | 45.0 % | 101.4 |
| 3 | 0 | easy | 60/60 | 11.7 % | 25.0 |
| 3 | 0 | repair | 60/60 | 13.3 % | 31.7 |
| 3 | 0 | plan | 60/60 | 33.3 % | 42.1 |
| 3 | 0 | easy-v2 | 60/60 | 11.7 % | 24.3 |
| 3 | 0 | medium-v2 | 60/60 | 31.7 % | 41.6 |
| 3 | 3 | easy | 60/60 | 10.0 % | 38.3 |
| 3 | 3 | repair | 60/60 | 21.7 % | 47.3 |
| 3 | 3 | plan | 60/60 | 33.3 % | 62.5 |
| 3 | 3 | easy-v2 | 60/60 | 10.0 % | 38.3 |
| 3 | 3 | medium-v2 | 60/60 | 38.3 % | 68.3 |
| 3 | 4 | easy | 59/60 | 10.2 % | 51.7 |
| 3 | 4 | repair | 58/60 | 19.0 % | 55.3 |
| 3 | 4 | plan | 60/60 | 33.3 % | 78.8 |
| 3 | 4 | easy-v2 | 58/60 | 10.3 % | 51.1 |
| 3 | 4 | medium-v2 | 60/60 | 31.7 % | 76.8 |
| 4 | 0 | easy | 80/80 | 10.0 % | 23.8 |
| 4 | 0 | repair | 80/80 | 1.3 % | 24.5 |
| 4 | 0 | plan | 80/80 | 25.0 % | 37.5 |
| 4 | 0 | easy-v2 | 80/80 | 10.0 % | 24.9 |
| 4 | 0 | medium-v2 | 80/80 | 25.0 % | 38.5 |
| 4 | 3 | easy | 80/80 | 8.8 % | 37.8 |
| 4 | 3 | repair | 80/80 | 11.3 % | 38.5 |
| 4 | 3 | plan | 80/80 | 25.0 % | 55.6 |
| 4 | 3 | easy-v2 | 80/80 | 11.3 % | 39.6 |
| 4 | 3 | medium-v2 | 80/80 | 26.3 % | 57.1 |
| 4 | 4 | easy | 79/80 | 5.1 % | 46.8 |
| 4 | 4 | repair | 79/80 | 12.7 % | 47.2 |
| 4 | 4 | plan | 76/80 | 25.0 % | 68.4 |
| 4 | 4 | easy-v2 | 79/80 | 5.1 % | 48.4 |
| 4 | 4 | medium-v2 | 76/80 | 26.3 % | 71.2 |

## Gepaarte Vergleiche

Differenz = Alternative minus Baseline. Intervalle: 2.000 Bootstrap-Stichproben ganzer Seed-Blöcke; bei kleinem Pilotumfang nur explorativ. Ausgeschlossene Paare können die Auswertung verzerren. Keine Korrektur für Mehrfachvergleiche.

| Spieler | Folge | Baseline | Alternative | Gemeinsame / ausgeschlossene Paare | Differenz Siegquote | 95-%-Intervall | Δ Punkte |
|---|---|---|---|---|---|---|---|
| 2 | 0 | easy | easy-v2 | 40/0 | -2.5 % | -7.5 % bis 0.0 % | -1.9 |
| 2 | 0 | plan | medium-v2 | 40/0 | 0.0 % | 0.0 % bis 0.0 % | -1.3 |
| 2 | 0 | easy-v2 | medium-v2 | 40/0 | 10.0 % | -2.5 % bis 22.5 % | 9.4 |
| 2 | 3 | easy | easy-v2 | 40/0 | 0.0 % | -10.0 % bis 12.5 % | -0.6 |
| 2 | 3 | plan | medium-v2 | 40/0 | 0.0 % | 0.0 % bis 0.0 % | 2.5 |
| 2 | 3 | easy-v2 | medium-v2 | 40/0 | 15.0 % | 0.0 % bis 30.0 % | 15.6 |
| 2 | 4 | easy | easy-v2 | 38/2 | -7.9 % | -16.2 % bis 0.0 % | -12.9 |
| 2 | 4 | plan | medium-v2 | 40/0 | -5.0 % | -12.5 % bis 0.0 % | -11.1 |
| 2 | 4 | easy-v2 | medium-v2 | 38/2 | 23.7 % | 11.8 % bis 34.2 % | 34.5 |
| 3 | 0 | easy | easy-v2 | 60/0 | 0.0 % | -5.0 % bis 5.0 % | -0.8 |
| 3 | 0 | plan | medium-v2 | 60/0 | -1.7 % | -5.0 % bis 0.0 % | -0.5 |
| 3 | 0 | easy-v2 | medium-v2 | 60/0 | 20.0 % | 8.3 % bis 30.0 % | 17.3 |
| 3 | 3 | easy | easy-v2 | 60/0 | 0.0 % | -5.0 % bis 5.0 % | 0.0 |
| 3 | 3 | plan | medium-v2 | 60/0 | 5.0 % | 0.0 % bis 13.3 % | 5.8 |
| 3 | 3 | easy-v2 | medium-v2 | 60/0 | 28.3 % | 16.7 % bis 40.0 % | 30.0 |
| 3 | 4 | easy | easy-v2 | 58/2 | 0.0 % | -5.1 % bis 5.0 % | -0.6 |
| 3 | 4 | plan | medium-v2 | 60/0 | -1.7 % | -5.0 % bis 0.0 % | -2.1 |
| 3 | 4 | easy-v2 | medium-v2 | 58/2 | 20.7 % | 10.0 % bis 29.3 % | 24.7 |
| 4 | 0 | easy | easy-v2 | 80/0 | 0.0 % | -3.8 % bis 3.8 % | 1.1 |
| 4 | 0 | plan | medium-v2 | 80/0 | 0.0 % | -3.8 % bis 3.8 % | 1.0 |
| 4 | 0 | easy-v2 | medium-v2 | 80/0 | 15.0 % | 6.3 % bis 23.8 % | 13.6 |
| 4 | 3 | easy | easy-v2 | 80/0 | 2.5 % | -2.5 % bis 7.5 % | 1.8 |
| 4 | 3 | plan | medium-v2 | 80/0 | 1.3 % | 0.0 % bis 3.8 % | 1.5 |
| 4 | 3 | easy-v2 | medium-v2 | 80/0 | 15.0 % | 8.8 % bis 21.3 % | 17.5 |
| 4 | 4 | easy | easy-v2 | 78/2 | 0.0 % | 0.0 % bis 0.0 % | 1.5 |
| 4 | 4 | plan | medium-v2 | 76/4 | 1.3 % | -4.4 % bis 6.9 % | 2.8 |
| 4 | 4 | easy-v2 | medium-v2 | 75/5 | 21.3 % | 13.2 % bis 29.1 % | 23.5 |

## 25/27: bedingtes Entscheidungsexperiment

Feste eigene Ausgangshand, 27 bereits gezogen, Gegnerhände aus den übrigen Karten zufällig. Danach spielt der untersuchte Spieler repair, seine Gegner plan. Keine Verallgemeinerung auf andere Hände. Die Handlisten in JSON verwenden Engine-Reihenfolge hinten nach vorne.


Exakt strukturell: direkte Platzierung hat keine einzelne Abschlusskarte; Lücke hat die 26. Das gilt unabhängig davon, ob die 26 tatsächlich erreichbar ist. Die Kartenstatistik enthält Angebote/Aufnahmen/Ablagen nach Spielerzahl, Folge und Teststrategie und ist keine universelle Kartenwerttabelle.
