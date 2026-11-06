# Bot-Simulation: pilot

Version: reference-v1; 30 Seeds ab 1; Limit 240 abgeschlossene Spielerzüge pro Runde.

Alle Gegner verwenden repair. Die Teststrategie rotiert durch alle Sitze. Gesamtwertung aus. Abgebrochene Runden sind zensiert und keine Niederlagen; Quoten beziehen sich nur auf beendete Runden. Dies ist ein Pilot mit Referenzstrategien, kein Nachweis menschlicher oder Experten-Spielstärke.

| Spieler | Pflichtfolge | Teststrategie | Beendet / Versuche | Siege unter beendeten | Ø Punkte beendet |
|---|---|---|---|---|---|
| 2 | 0 | easy | 60/60 | 66.7 % | 59.7 |
| 2 | 0 | repair | 56/60 | 50.0 % | 85.7 |
| 2 | 0 | repair-center | 60/60 | 53.3 % | 67.0 |
| 2 | 3 | easy | 60/60 | 53.3 % | 87.3 |
| 2 | 3 | repair | 56/60 | 50.0 % | 101.0 |
| 2 | 3 | repair-center | 59/60 | 47.5 % | 78.6 |
| 2 | 4 | easy | 58/60 | 36.2 % | 91.6 |
| 2 | 4 | repair | 54/60 | 50.0 % | 120.9 |
| 2 | 4 | repair-center | 60/60 | 31.7 % | 75.7 |
| 3 | 0 | easy | 90/90 | 45.6 % | 45.3 |
| 3 | 0 | repair | 81/90 | 33.3 % | 55.5 |
| 3 | 0 | repair-center | 90/90 | 34.4 % | 46.3 |
| 3 | 3 | easy | 89/90 | 36.0 % | 66.0 |
| 3 | 3 | repair | 87/90 | 33.3 % | 65.1 |
| 3 | 3 | repair-center | 87/90 | 27.6 % | 57.6 |
| 3 | 4 | easy | 86/90 | 24.4 % | 72.8 |
| 3 | 4 | repair | 72/90 | 33.3 % | 84.6 |
| 3 | 4 | repair-center | 86/90 | 34.9 % | 83.0 |
| 4 | 0 | easy | 120/120 | 40.0 % | 42.1 |
| 4 | 0 | repair | 116/120 | 25.0 % | 45.0 |
| 4 | 0 | repair-center | 119/120 | 28.6 % | 41.3 |
| 4 | 3 | easy | 118/120 | 26.3 % | 56.4 |
| 4 | 3 | repair | 112/120 | 25.0 % | 56.1 |
| 4 | 3 | repair-center | 118/120 | 22.0 % | 48.0 |
| 4 | 4 | easy | 112/120 | 17.9 % | 65.2 |
| 4 | 4 | repair | 100/120 | 25.0 % | 65.9 |
| 4 | 4 | repair-center | 110/120 | 26.4 % | 68.1 |

## Gepaarte Vergleiche zur repair-Referenz

Differenz = Alternative minus repair. Intervalle: 2.000 Bootstrap-Stichproben ganzer Seed-Blöcke; bei kleinem Pilotumfang nur explorativ. Ausgeschlossene Paare können die Auswertung verzerren. Keine Korrektur für Mehrfachvergleiche.

| Spieler | Folge | Alternative | Gemeinsame / ausgeschlossene Paare | Differenz Siegquote | 95-%-Intervall | Δ Punkte |
|---|---|---|---|---|---|---|
| 2 | 0 | easy | 56/4 | 17.9 % | 7.1 % bis 28.3 % | -25.6 |
| 2 | 0 | repair-center | 56/4 | 1.8 % | -8.6 % bis 13.0 % | -18.8 |
| 2 | 3 | easy | 56/4 | 3.6 % | -8.0 % bis 14.3 % | -13.4 |
| 2 | 3 | repair-center | 55/5 | -3.6 % | -16.1 % bis 8.3 % | -22.7 |
| 2 | 4 | easy | 52/8 | -17.3 % | -30.2 % bis -3.5 % | -35.1 |
| 2 | 4 | repair-center | 54/6 | -18.5 % | -32.0 % bis -4.2 % | -46.8 |
| 3 | 0 | easy | 81/9 | 12.3 % | 2.5 % bis 22.2 % | -9.9 |
| 3 | 0 | repair-center | 81/9 | 0.0 % | -9.3 % bis 9.5 % | -10.2 |
| 3 | 3 | easy | 87/3 | 1.1 % | -8.0 % bis 10.3 % | -0.4 |
| 3 | 3 | repair-center | 85/5 | -5.9 % | -15.0 % bis 3.4 % | -7.0 |
| 3 | 4 | easy | 68/22 | -14.7 % | -23.4 % bis -5.1 % | -19.5 |
| 3 | 4 | repair-center | 69/21 | -2.9 % | -14.1 % bis 8.5 % | -8.5 |
| 4 | 0 | easy | 116/4 | 14.7 % | 5.6 % bis 25.0 % | -3.2 |
| 4 | 0 | repair-center | 115/5 | 1.7 % | -5.9 % bis 10.2 % | -5.7 |
| 4 | 3 | easy | 110/10 | 0.0 % | -7.4 % bis 7.7 % | -0.6 |
| 4 | 3 | repair-center | 111/9 | -3.6 % | -11.7 % bis 5.1 % | -9.2 |
| 4 | 4 | easy | 97/23 | -12.4 % | -18.0 % bis -6.5 % | -8.0 |
| 4 | 4 | repair-center | 94/26 | -4.3 % | -15.2 % bis 7.1 % | -5.5 |

## 25/27: bedingtes Entscheidungsexperiment

Feste eigene Ausgangshand, 27 bereits gezogen, Gegnerhände aus den übrigen Karten zufällig. Danach spielen alle repair. Keine Verallgemeinerung auf andere Hände. Die Handlisten in JSON verwenden Engine-Reihenfolge hinten nach vorne.

- 2 Spieler, adjacent: 30/30 beendet; 22 eigene Siege; Ø 102.0 Punkte.
- 2 Spieler, gap: 28/30 beendet; 19 eigene Siege; Ø 99.5 Punkte.
- 3 Spieler, adjacent: 30/30 beendet; 17 eigene Siege; Ø 89.3 Punkte.
- 3 Spieler, gap: 29/30 beendet; 22 eigene Siege; Ø 104.1 Punkte.
- 4 Spieler, adjacent: 30/30 beendet; 16 eigene Siege; Ø 85.7 Punkte.
- 4 Spieler, gap: 30/30 beendet; 16 eigene Siege; Ø 86.0 Punkte.

Exakt strukturell: direkte Platzierung hat keine einzelne Abschlusskarte; Lücke hat die 26. Das gilt unabhängig davon, ob die 26 tatsächlich erreichbar ist. Die Kartenstatistik enthält Angebote/Aufnahmen/Ablagen nach Spielerzahl, Folge und Teststrategie und ist keine universelle Kartenwerttabelle.
