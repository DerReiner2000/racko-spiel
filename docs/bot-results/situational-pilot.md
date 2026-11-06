# Bot-Simulation: situational-pilot

Version: reference-v1; 10 Seeds ab 1; Limit 240 abgeschlossene Spielerzüge pro Runde.

Alle Gegner verwenden plan. Die Teststrategie rotiert durch alle Sitze. Gesamtwertung aus. Abgebrochene Runden sind zensiert und keine Niederlagen; Quoten beziehen sich nur auf beendete Runden. Dies ist ein Vergleich mit Referenzstrategien, kein Nachweis menschlicher oder Experten-Spielstärke.

| Spieler | Pflichtfolge | Teststrategie | Beendet / Versuche | Siege unter beendeten | Ø Punkte beendet |
|---|---|---|---|---|---|
| 2 | 0 | easy | 20/20 | 50.0 % | 56.3 |
| 2 | 0 | repair | 20/20 | 25.0 % | 61.8 |
| 2 | 0 | plan | 20/20 | 50.0 % | 57.5 |
| 2 | 0 | easy-v2 | 20/20 | 20.0 % | 39.8 |
| 2 | 0 | medium-v2 | 20/20 | 45.0 % | 52.0 |
| 2 | 3 | easy | 20/20 | 20.0 % | 48.5 |
| 2 | 3 | repair | 19/20 | 21.1 % | 49.5 |
| 2 | 3 | plan | 20/20 | 50.0 % | 74.0 |
| 2 | 3 | easy-v2 | 20/20 | 15.0 % | 45.8 |
| 2 | 3 | medium-v2 | 20/20 | 45.0 % | 69.8 |
| 2 | 4 | easy | 19/20 | 15.8 % | 66.1 |
| 2 | 4 | repair | 20/20 | 40.0 % | 110.8 |
| 2 | 4 | plan | 20/20 | 50.0 % | 112.5 |
| 2 | 4 | easy-v2 | 20/20 | 25.0 % | 69.3 |
| 2 | 4 | medium-v2 | 20/20 | 25.0 % | 70.0 |
| 3 | 0 | easy | 30/30 | 16.7 % | 28.0 |
| 3 | 0 | repair | 30/30 | 6.7 % | 24.0 |
| 3 | 0 | plan | 30/30 | 33.3 % | 42.8 |
| 3 | 0 | easy-v2 | 30/30 | 13.3 % | 28.0 |
| 3 | 0 | medium-v2 | 30/30 | 33.3 % | 41.2 |
| 3 | 3 | easy | 30/30 | 10.0 % | 37.5 |
| 3 | 3 | repair | 30/30 | 23.3 % | 49.2 |
| 3 | 3 | plan | 30/30 | 33.3 % | 59.0 |
| 3 | 3 | easy-v2 | 30/30 | 16.7 % | 41.7 |
| 3 | 3 | medium-v2 | 30/30 | 40.0 % | 66.5 |
| 3 | 4 | easy | 29/30 | 6.9 % | 49.7 |
| 3 | 4 | repair | 29/30 | 20.7 % | 58.1 |
| 3 | 4 | plan | 30/30 | 33.3 % | 83.3 |
| 3 | 4 | easy-v2 | 30/30 | 6.7 % | 48.2 |
| 3 | 4 | medium-v2 | 30/30 | 30.0 % | 81.2 |
| 4 | 0 | easy | 40/40 | 12.5 % | 25.0 |
| 4 | 0 | repair | 40/40 | 2.5 % | 25.4 |
| 4 | 0 | plan | 40/40 | 25.0 % | 36.5 |
| 4 | 0 | easy-v2 | 40/40 | 10.0 % | 24.9 |
| 4 | 0 | medium-v2 | 40/40 | 20.0 % | 36.3 |
| 4 | 3 | easy | 40/40 | 7.5 % | 36.1 |
| 4 | 3 | repair | 40/40 | 7.5 % | 33.1 |
| 4 | 3 | plan | 40/40 | 25.0 % | 51.1 |
| 4 | 3 | easy-v2 | 40/40 | 15.0 % | 42.8 |
| 4 | 3 | medium-v2 | 40/40 | 27.5 % | 54.3 |
| 4 | 4 | easy | 40/40 | 7.5 % | 51.1 |
| 4 | 4 | repair | 40/40 | 12.5 % | 49.5 |
| 4 | 4 | plan | 40/40 | 25.0 % | 69.1 |
| 4 | 4 | easy-v2 | 40/40 | 10.0 % | 57.3 |
| 4 | 4 | medium-v2 | 40/40 | 17.5 % | 58.0 |

## Gepaarte Vergleiche

Differenz = Alternative minus Baseline. Intervalle: 2.000 Bootstrap-Stichproben ganzer Seed-Blöcke; bei kleinem Pilotumfang nur explorativ. Ausgeschlossene Paare können die Auswertung verzerren. Keine Korrektur für Mehrfachvergleiche.

| Spieler | Folge | Baseline | Alternative | Gemeinsame / ausgeschlossene Paare | Differenz Siegquote | 95-%-Intervall | Δ Punkte |
|---|---|---|---|---|---|---|---|
| 2 | 0 | easy | easy-v2 | 20/0 | -30.0 % | -45.0 % bis -15.0 % | -16.5 |
| 2 | 0 | plan | medium-v2 | 20/0 | -5.0 % | -15.0 % bis 0.0 % | -5.5 |
| 2 | 0 | easy-v2 | medium-v2 | 20/0 | 25.0 % | 10.0 % bis 40.0 % | 12.3 |
| 2 | 3 | easy | easy-v2 | 20/0 | -5.0 % | -30.0 % bis 15.0 % | -2.8 |
| 2 | 3 | plan | medium-v2 | 20/0 | -5.0 % | -15.0 % bis 0.0 % | -4.3 |
| 2 | 3 | easy-v2 | medium-v2 | 20/0 | 30.0 % | 15.0 % bis 45.0 % | 24.0 |
| 2 | 4 | easy | easy-v2 | 19/1 | 5.3 % | 0.0 % bis 15.8 % | -2.4 |
| 2 | 4 | plan | medium-v2 | 20/0 | -25.0 % | -40.0 % bis -10.0 % | -42.5 |
| 2 | 4 | easy-v2 | medium-v2 | 20/0 | 0.0 % | -20.0 % bis 20.0 % | 0.8 |
| 3 | 0 | easy | easy-v2 | 30/0 | -3.3 % | -10.0 % bis 0.0 % | 0.0 |
| 3 | 0 | plan | medium-v2 | 30/0 | 0.0 % | -10.0 % bis 10.0 % | -1.7 |
| 3 | 0 | easy-v2 | medium-v2 | 30/0 | 20.0 % | 3.3 % bis 36.7 % | 13.2 |
| 3 | 3 | easy | easy-v2 | 30/0 | 6.7 % | -13.3 % bis 26.7 % | 4.2 |
| 3 | 3 | plan | medium-v2 | 30/0 | 6.7 % | 0.0 % bis 20.0 % | 7.5 |
| 3 | 3 | easy-v2 | medium-v2 | 30/0 | 23.3 % | 10.0 % bis 36.7 % | 24.8 |
| 3 | 4 | easy | easy-v2 | 29/1 | 0.0 % | -10.0 % bis 10.3 % | -1.6 |
| 3 | 4 | plan | medium-v2 | 30/0 | -3.3 % | -10.0 % bis 0.0 % | -2.2 |
| 3 | 4 | easy-v2 | medium-v2 | 30/0 | 23.3 % | 10.0 % bis 33.3 % | 33.0 |
| 4 | 0 | easy | easy-v2 | 40/0 | -2.5 % | -7.5 % bis 0.0 % | -0.1 |
| 4 | 0 | plan | medium-v2 | 40/0 | -5.0 % | -15.0 % bis 5.0 % | -0.3 |
| 4 | 0 | easy-v2 | medium-v2 | 40/0 | 10.0 % | -5.0 % bis 25.0 % | 11.4 |
| 4 | 3 | easy | easy-v2 | 40/0 | 7.5 % | -2.5 % bis 17.5 % | 6.6 |
| 4 | 3 | plan | medium-v2 | 40/0 | 2.5 % | -5.0 % bis 10.0 % | 3.1 |
| 4 | 3 | easy-v2 | medium-v2 | 40/0 | 12.5 % | 2.5 % bis 25.0 % | 11.5 |
| 4 | 4 | easy | easy-v2 | 40/0 | 2.5 % | -7.5 % bis 12.5 % | 6.1 |
| 4 | 4 | plan | medium-v2 | 40/0 | -7.5 % | -17.5 % bis 5.0 % | -11.1 |
| 4 | 4 | easy-v2 | medium-v2 | 40/0 | 7.5 % | -5.0 % bis 20.0 % | 0.8 |

## 25/27: bedingtes Entscheidungsexperiment

Feste eigene Ausgangshand, 27 bereits gezogen, Gegnerhände aus den übrigen Karten zufällig. Danach spielt der untersuchte Spieler repair, seine Gegner plan. Keine Verallgemeinerung auf andere Hände. Die Handlisten in JSON verwenden Engine-Reihenfolge hinten nach vorne.


Exakt strukturell: direkte Platzierung hat keine einzelne Abschlusskarte; Lücke hat die 26. Das gilt unabhängig davon, ob die 26 tatsächlich erreichbar ist. Die Kartenstatistik enthält Angebote/Aufnahmen/Ablagen nach Spielerzahl, Folge und Teststrategie und ist keine universelle Kartenwerttabelle.
