# Bot-Simulation: planning-validation-repair

Version: reference-v1; 60 Seeds ab 5001; Limit 480 abgeschlossene Spielerzüge pro Runde.

Alle Gegner verwenden repair. Die Teststrategie rotiert durch alle Sitze. Gesamtwertung aus. Abgebrochene Runden sind zensiert und keine Niederlagen; Quoten beziehen sich nur auf beendete Runden. Dies ist ein Vergleich mit Referenzstrategien, kein Nachweis menschlicher oder Experten-Spielstärke.

| Spieler | Pflichtfolge | Teststrategie | Beendet / Versuche | Siege unter beendeten | Ø Punkte beendet |
|---|---|---|---|---|---|
| 2 | 0 | easy | 120/120 | 66.7 % | 60.7 |
| 2 | 0 | repair | 114/120 | 50.0 % | 69.5 |
| 2 | 0 | plan | 119/120 | 73.9 % | 70.8 |
| 2 | 3 | easy | 120/120 | 52.5 % | 85.3 |
| 2 | 3 | repair | 114/120 | 50.0 % | 99.4 |
| 2 | 3 | plan | 119/120 | 73.1 % | 110.8 |
| 2 | 4 | easy | 114/120 | 40.4 % | 95.6 |
| 2 | 4 | repair | 94/120 | 50.0 % | 110.7 |
| 2 | 4 | plan | 116/120 | 55.2 % | 114.3 |
| 3 | 0 | easy | 180/180 | 50.6 % | 47.8 |
| 3 | 0 | repair | 174/180 | 33.3 % | 50.3 |
| 3 | 0 | plan | 179/180 | 59.8 % | 60.1 |
| 3 | 3 | easy | 177/180 | 37.3 % | 67.0 |
| 3 | 3 | repair | 150/180 | 33.3 % | 67.4 |
| 3 | 3 | plan | 174/180 | 58.6 % | 89.8 |
| 3 | 4 | easy | 168/180 | 33.9 % | 87.5 |
| 3 | 4 | repair | 165/180 | 33.3 % | 81.2 |
| 3 | 4 | plan | 166/180 | 48.8 % | 105.3 |
| 4 | 0 | easy | 240/240 | 35.8 % | 41.8 |
| 4 | 0 | repair | 220/240 | 25.0 % | 44.9 |
| 4 | 0 | plan | 237/240 | 52.3 % | 56.8 |
| 4 | 3 | easy | 236/240 | 33.1 % | 64.0 |
| 4 | 3 | repair | 212/240 | 25.0 % | 54.3 |
| 4 | 3 | plan | 238/240 | 52.5 % | 82.9 |
| 4 | 4 | easy | 217/240 | 24.9 % | 75.8 |
| 4 | 4 | repair | 208/240 | 25.0 % | 70.1 |
| 4 | 4 | plan | 222/240 | 36.5 % | 86.2 |

## Gepaarte Vergleiche

Differenz = Alternative minus Baseline. Intervalle: 2.000 Bootstrap-Stichproben ganzer Seed-Blöcke; bei kleinem Pilotumfang nur explorativ. Ausgeschlossene Paare können die Auswertung verzerren. Keine Korrektur für Mehrfachvergleiche.

| Spieler | Folge | Baseline | Alternative | Gemeinsame / ausgeschlossene Paare | Differenz Siegquote | 95-%-Intervall | Δ Punkte |
|---|---|---|---|---|---|---|---|
| 2 | 0 | easy | plan | 119/1 | 7.6 % | -0.8 % bis 16.7 % | 10.3 |
| 2 | 0 | repair | easy | 114/6 | 17.5 % | 10.0 % bis 25.0 % | -8.4 |
| 2 | 0 | repair | plan | 114/6 | 23.7 % | 16.9 % bis 30.4 % | 1.5 |
| 2 | 3 | easy | plan | 119/1 | 20.2 % | 10.3 % bis 29.7 % | 24.8 |
| 2 | 3 | repair | easy | 114/6 | 2.6 % | -5.9 % bis 11.6 % | -13.5 |
| 2 | 3 | repair | plan | 113/7 | 22.1 % | 13.6 % bis 30.3 % | 10.2 |
| 2 | 4 | easy | plan | 110/10 | 12.7 % | 1.9 % bis 23.2 % | 16.4 |
| 2 | 4 | repair | easy | 89/31 | -5.6 % | -14.6 % bis 3.8 % | -9.9 |
| 2 | 4 | repair | plan | 92/28 | 5.4 % | -2.5 % bis 13.8 % | 4.0 |
| 3 | 0 | easy | plan | 179/1 | 9.5 % | 2.2 % bis 17.2 % | 12.4 |
| 3 | 0 | repair | easy | 174/6 | 16.7 % | 8.8 % bis 24.4 % | -2.7 |
| 3 | 0 | repair | plan | 174/6 | 25.9 % | 19.5 % bis 31.6 % | 9.3 |
| 3 | 3 | easy | plan | 171/9 | 22.2 % | 12.7 % bis 31.0 % | 23.4 |
| 3 | 3 | repair | easy | 149/31 | 3.4 % | -5.0 % bis 12.1 % | -1.1 |
| 3 | 3 | repair | plan | 149/31 | 24.2 % | 16.8 % bis 31.0 % | 22.0 |
| 3 | 4 | easy | plan | 154/26 | 14.9 % | 3.9 % bis 25.6 % | 18.2 |
| 3 | 4 | repair | easy | 155/25 | 0.6 % | -7.1 % bis 9.0 % | 6.7 |
| 3 | 4 | repair | plan | 155/25 | 14.2 % | 6.3 % bis 22.2 % | 22.5 |
| 4 | 0 | easy | plan | 237/3 | 16.0 % | 8.7 % bis 23.7 % | 14.7 |
| 4 | 0 | repair | easy | 220/20 | 11.8 % | 5.3 % bis 18.4 % | -2.8 |
| 4 | 0 | repair | plan | 220/20 | 27.7 % | 21.0 % bis 34.3 % | 11.7 |
| 4 | 3 | easy | plan | 234/6 | 20.1 % | 12.0 % bis 28.4 % | 19.6 |
| 4 | 3 | repair | easy | 209/31 | 5.7 % | -0.5 % bis 11.7 % | 7.3 |
| 4 | 3 | repair | plan | 211/29 | 24.6 % | 18.1 % bis 31.3 % | 26.1 |
| 4 | 4 | easy | plan | 200/40 | 11.0 % | 2.4 % bis 20.0 % | 9.5 |
| 4 | 4 | repair | easy | 188/52 | 1.1 % | -4.7 % bis 7.4 % | 9.6 |
| 4 | 4 | repair | plan | 193/47 | 8.3 % | 2.7 % bis 13.7 % | 10.7 |

## 25/27: bedingtes Entscheidungsexperiment

Feste eigene Ausgangshand, 27 bereits gezogen, Gegnerhände aus den übrigen Karten zufällig. Danach spielt der untersuchte Spieler repair, seine Gegner repair. Keine Verallgemeinerung auf andere Hände. Die Handlisten in JSON verwenden Engine-Reihenfolge hinten nach vorne.

- 2 Spieler, adjacent: 55/60 beendet; 44 eigene Siege; Ø 107.5 Punkte.
- 2 Spieler, gap: 58/60 beendet; 47 eigene Siege; Ø 110.1 Punkte.
- 3 Spieler, adjacent: 59/60 beendet; 32 eigene Siege; Ø 87.8 Punkte.
- 3 Spieler, gap: 59/60 beendet; 42 eigene Siege; Ø 100.0 Punkte.
- 4 Spieler, adjacent: 59/60 beendet; 33 eigene Siege; Ø 89.4 Punkte.
- 4 Spieler, gap: 59/60 beendet; 37 eigene Siege; Ø 93.6 Punkte.

Exakt strukturell: direkte Platzierung hat keine einzelne Abschlusskarte; Lücke hat die 26. Das gilt unabhängig davon, ob die 26 tatsächlich erreichbar ist. Die Kartenstatistik enthält Angebote/Aufnahmen/Ablagen nach Spielerzahl, Folge und Teststrategie und ist keine universelle Kartenwerttabelle.
