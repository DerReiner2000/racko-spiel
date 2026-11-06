# Bot-Simulation: validation

Version: reference-v1; 100 Seeds ab 1001; Limit 480 abgeschlossene Spielerzüge pro Runde.

Alle Gegner verwenden repair. Die Teststrategie rotiert durch alle Sitze. Gesamtwertung aus. Abgebrochene Runden sind zensiert und keine Niederlagen; Quoten beziehen sich nur auf beendete Runden. Dies ist ein Pilot mit Referenzstrategien, kein Nachweis menschlicher oder Experten-Spielstärke.

| Spieler | Pflichtfolge | Teststrategie | Beendet / Versuche | Siege unter beendeten | Ø Punkte beendet |
|---|---|---|---|---|---|
| 2 | 0 | easy | 200/200 | 70.0 % | 62.8 |
| 2 | 0 | repair | 188/200 | 50.0 % | 74.4 |
| 2 | 0 | repair-center | 200/200 | 51.0 % | 69.5 |
| 2 | 3 | easy | 198/200 | 52.5 % | 82.1 |
| 2 | 3 | repair | 172/200 | 50.0 % | 88.6 |
| 2 | 3 | repair-center | 198/200 | 53.0 % | 90.3 |
| 2 | 4 | easy | 192/200 | 32.8 % | 85.3 |
| 2 | 4 | repair | 168/200 | 50.0 % | 117.3 |
| 2 | 4 | repair-center | 198/200 | 35.4 % | 87.5 |
| 3 | 0 | easy | 300/300 | 42.7 % | 44.4 |
| 3 | 0 | repair | 279/300 | 33.3 % | 49.6 |
| 3 | 0 | repair-center | 300/300 | 30.3 % | 43.1 |
| 3 | 3 | easy | 296/300 | 36.1 % | 65.0 |
| 3 | 3 | repair | 279/300 | 33.3 % | 67.1 |
| 3 | 3 | repair-center | 298/300 | 32.2 % | 64.4 |
| 3 | 4 | easy | 280/300 | 24.3 % | 72.4 |
| 3 | 4 | repair | 243/300 | 33.3 % | 86.7 |
| 3 | 4 | repair-center | 281/300 | 29.5 % | 76.7 |
| 4 | 0 | easy | 400/400 | 38.5 % | 41.3 |
| 4 | 0 | repair | 384/400 | 25.0 % | 40.8 |
| 4 | 0 | repair-center | 400/400 | 26.5 % | 40.6 |
| 4 | 3 | easy | 395/400 | 28.9 % | 60.5 |
| 4 | 3 | repair | 388/400 | 25.0 % | 56.3 |
| 4 | 3 | repair-center | 395/400 | 23.8 % | 51.3 |
| 4 | 4 | easy | 380/400 | 19.2 % | 67.1 |
| 4 | 4 | repair | 328/400 | 25.0 % | 68.8 |
| 4 | 4 | repair-center | 384/400 | 26.6 % | 68.3 |

## Gepaarte Vergleiche zur repair-Referenz

Differenz = Alternative minus repair. Intervalle: 2.000 Bootstrap-Stichproben ganzer Seed-Blöcke; bei kleinem Pilotumfang nur explorativ. Ausgeschlossene Paare können die Auswertung verzerren. Keine Korrektur für Mehrfachvergleiche.

| Spieler | Folge | Alternative | Gemeinsame / ausgeschlossene Paare | Differenz Siegquote | 95-%-Intervall | Δ Punkte |
|---|---|---|---|---|---|---|
| 2 | 0 | easy | 188/12 | 19.7 % | 13.8 % bis 25.3 % | -11.9 |
| 2 | 0 | repair-center | 188/12 | 1.1 % | -4.7 % bis 6.8 % | -5.2 |
| 2 | 3 | easy | 170/30 | 1.2 % | -5.9 % bis 8.6 % | -7.6 |
| 2 | 3 | repair-center | 170/30 | 3.5 % | -2.9 % bis 10.3 % | -0.1 |
| 2 | 4 | easy | 163/37 | -17.2 % | -23.9 % bis -10.1 % | -31.8 |
| 2 | 4 | repair-center | 167/33 | -12.0 % | -19.5 % bis -4.2 % | -24.7 |
| 3 | 0 | easy | 279/21 | 7.9 % | 2.8 % bis 13.0 % | -5.8 |
| 3 | 0 | repair-center | 279/21 | -4.7 % | -9.1 % bis 0.0 % | -7.8 |
| 3 | 3 | easy | 277/23 | 1.4 % | -3.7 % bis 6.8 % | -2.1 |
| 3 | 3 | repair-center | 277/23 | -2.5 % | -7.5 % bis 2.5 % | -4.7 |
| 3 | 4 | easy | 232/68 | -12.5 % | -17.3 % bis -7.6 % | -19.4 |
| 3 | 4 | repair-center | 232/68 | -7.3 % | -12.3 % bis -2.5 % | -15.6 |
| 4 | 0 | easy | 384/16 | 12.8 % | 7.2 % bis 18.1 % | -0.1 |
| 4 | 0 | repair-center | 384/16 | 0.8 % | -3.6 % bis 5.1 % | -1.1 |
| 4 | 3 | easy | 384/16 | 2.9 % | -1.5 % bis 7.3 % | 3.1 |
| 4 | 3 | repair-center | 384/16 | -1.3 % | -5.4 % bis 3.1 % | -5.2 |
| 4 | 4 | easy | 316/84 | -8.5 % | -12.7 % bis -4.1 % | -5.4 |
| 4 | 4 | repair-center | 319/81 | -1.6 % | -5.6 % bis 2.5 % | -5.5 |

## 25/27: bedingtes Entscheidungsexperiment

Feste eigene Ausgangshand, 27 bereits gezogen, Gegnerhände aus den übrigen Karten zufällig. Danach spielen alle repair. Keine Verallgemeinerung auf andere Hände. Die Handlisten in JSON verwenden Engine-Reihenfolge hinten nach vorne.

- 2 Spieler, adjacent: 97/100 beendet; 81 eigene Siege; Ø 111.4 Punkte.
- 2 Spieler, gap: 97/100 beendet; 77 eigene Siege; Ø 109.1 Punkte.
- 3 Spieler, adjacent: 94/100 beendet; 57 eigene Siege; Ø 92.4 Punkte.
- 3 Spieler, gap: 99/100 beendet; 67 eigene Siege; Ø 98.3 Punkte.
- 4 Spieler, adjacent: 99/100 beendet; 61 eigene Siege; Ø 92.0 Punkte.
- 4 Spieler, gap: 98/100 beendet; 53 eigene Siege; Ø 86.3 Punkte.

Exakt strukturell: direkte Platzierung hat keine einzelne Abschlusskarte; Lücke hat die 26. Das gilt unabhängig davon, ob die 26 tatsächlich erreichbar ist. Die Kartenstatistik enthält Angebote/Aufnahmen/Ablagen nach Spielerzahl, Folge und Teststrategie und ist keine universelle Kartenwerttabelle.
