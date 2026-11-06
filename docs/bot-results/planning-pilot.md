# Bot-Simulation: planning-pilot

Version: reference-v1; 10 Seeds ab 1; Limit 240 abgeschlossene Spielerzüge pro Runde.

Alle Gegner verwenden repair. Die Teststrategie rotiert durch alle Sitze. Gesamtwertung aus. Abgebrochene Runden sind zensiert und keine Niederlagen; Quoten beziehen sich nur auf beendete Runden. Dies ist ein Vergleich mit Referenzstrategien, kein Nachweis menschlicher oder Experten-Spielstärke.

| Spieler | Pflichtfolge | Teststrategie | Beendet / Versuche | Siege unter beendeten | Ø Punkte beendet |
|---|---|---|---|---|---|
| 2 | 0 | easy | 20/20 | 70.0 % | 62.8 |
| 2 | 0 | repair | 20/20 | 50.0 % | 87.0 |
| 2 | 0 | plan | 20/20 | 75.0 % | 84.5 |
| 2 | 3 | easy | 20/20 | 40.0 % | 77.5 |
| 2 | 3 | repair | 20/20 | 50.0 % | 89.0 |
| 2 | 3 | plan | 19/20 | 78.9 % | 104.7 |
| 2 | 4 | easy | 20/20 | 40.0 % | 98.3 |
| 2 | 4 | repair | 18/20 | 50.0 % | 134.2 |
| 2 | 4 | plan | 20/20 | 60.0 % | 127.0 |
| 3 | 0 | easy | 30/30 | 60.0 % | 52.2 |
| 3 | 0 | repair | 24/30 | 33.3 % | 67.1 |
| 3 | 0 | plan | 30/30 | 56.7 % | 57.0 |
| 3 | 3 | easy | 30/30 | 30.0 % | 58.3 |
| 3 | 3 | repair | 30/30 | 33.3 % | 63.7 |
| 3 | 3 | plan | 29/30 | 55.2 % | 85.0 |
| 3 | 4 | easy | 29/30 | 20.7 % | 66.6 |
| 3 | 4 | repair | 24/30 | 33.3 % | 89.6 |
| 3 | 4 | plan | 27/30 | 40.7 % | 95.4 |
| 4 | 0 | easy | 40/40 | 42.5 % | 44.4 |
| 4 | 0 | repair | 36/40 | 25.0 % | 50.8 |
| 4 | 0 | plan | 40/40 | 77.5 % | 70.0 |
| 4 | 3 | easy | 40/40 | 27.5 % | 57.9 |
| 4 | 3 | repair | 36/40 | 25.0 % | 56.5 |
| 4 | 3 | plan | 40/40 | 47.5 % | 77.1 |
| 4 | 4 | easy | 40/40 | 17.5 % | 66.3 |
| 4 | 4 | repair | 36/40 | 25.0 % | 70.3 |
| 4 | 4 | plan | 39/40 | 38.5 % | 93.5 |

## Gepaarte Vergleiche zur repair-Referenz

Differenz = Alternative minus repair. Intervalle: 2.000 Bootstrap-Stichproben ganzer Seed-Blöcke; bei kleinem Pilotumfang nur explorativ. Ausgeschlossene Paare können die Auswertung verzerren. Keine Korrektur für Mehrfachvergleiche.

| Spieler | Folge | Alternative | Gemeinsame / ausgeschlossene Paare | Differenz Siegquote | 95-%-Intervall | Δ Punkte |
|---|---|---|---|---|---|---|
| 2 | 0 | easy | 20/0 | 20.0 % | 0.0 % bis 40.0 % | -24.3 |
| 2 | 0 | plan | 20/0 | 25.0 % | 10.0 % bis 40.0 % | -2.5 |
| 2 | 3 | easy | 20/0 | -10.0 % | -30.0 % bis 10.0 % | -11.5 |
| 2 | 3 | plan | 19/1 | 31.6 % | 10.0 % bis 52.9 % | 17.6 |
| 2 | 4 | easy | 18/2 | -11.1 % | -35.7 % bis 15.0 % | -37.5 |
| 2 | 4 | plan | 18/2 | 11.1 % | -15.0 % bis 35.0 % | -5.6 |
| 3 | 0 | easy | 24/6 | 29.2 % | 14.8 % bis 42.9 % | -11.9 |
| 3 | 0 | plan | 24/6 | 25.0 % | 9.5 % bis 40.7 % | -8.1 |
| 3 | 3 | easy | 30/0 | -3.3 % | -16.7 % bis 13.3 % | -5.3 |
| 3 | 3 | plan | 29/1 | 20.7 % | 0.0 % bis 41.4 % | 20.0 |
| 3 | 4 | easy | 23/7 | -26.1 % | -36.8 % bis -14.3 % | -42.2 |
| 3 | 4 | plan | 23/7 | 8.7 % | -12.5 % bis 30.0 % | 7.0 |
| 4 | 0 | easy | 36/4 | 16.7 % | 0.0 % bis 35.0 % | -7.2 |
| 4 | 0 | plan | 36/4 | 52.8 % | 40.6 % bis 65.0 % | 20.0 |
| 4 | 3 | easy | 36/4 | 2.8 % | -15.0 % bis 21.9 % | 2.6 |
| 4 | 3 | plan | 36/4 | 25.0 % | 12.5 % bis 37.5 % | 23.8 |
| 4 | 4 | easy | 36/4 | -11.1 % | -19.4 % bis -2.8 % | -9.2 |
| 4 | 4 | plan | 35/5 | 14.3 % | -2.6 % bis 33.3 % | 24.6 |

## 25/27: bedingtes Entscheidungsexperiment

Feste eigene Ausgangshand, 27 bereits gezogen, Gegnerhände aus den übrigen Karten zufällig. Danach spielen alle repair. Keine Verallgemeinerung auf andere Hände. Die Handlisten in JSON verwenden Engine-Reihenfolge hinten nach vorne.

- 2 Spieler, adjacent: 10/10 beendet; 6 eigene Siege; Ø 92.0 Punkte.
- 2 Spieler, gap: 10/10 beendet; 7 eigene Siege; Ø 100.5 Punkte.
- 3 Spieler, adjacent: 10/10 beendet; 6 eigene Siege; Ø 93.0 Punkte.
- 3 Spieler, gap: 10/10 beendet; 9 eigene Siege; Ø 117.5 Punkte.
- 4 Spieler, adjacent: 10/10 beendet; 5 eigene Siege; Ø 85.5 Punkte.
- 4 Spieler, gap: 10/10 beendet; 6 eigene Siege; Ø 91.0 Punkte.

Exakt strukturell: direkte Platzierung hat keine einzelne Abschlusskarte; Lücke hat die 26. Das gilt unabhängig davon, ob die 26 tatsächlich erreichbar ist. Die Kartenstatistik enthält Angebote/Aufnahmen/Ablagen nach Spielerzahl, Folge und Teststrategie und ist keine universelle Kartenwerttabelle.
