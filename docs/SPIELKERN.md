# Gemeinsamer Spielkern

Stand: 6. November 2026. Dieses Dokument beschreibt den Regelabgleich aus Schritt 1. Schritt 2 ergänzt inzwischen das Online-Spiel in der installierten App; dessen Einrichtung und aktueller Umfang stehen in [ONLINE_APP.md](ONLINE_APP.md). Bot-Entscheidungen werden separat entwickelt und hier noch nicht ausgeführt.

## Fachliche Referenz und Aufbau

Die vorhandene Online-Version gibt Regeln und Spielablauf vor. Browser-Oberfläche, Lobby-System, Server-Authentifizierung, Supabase-Speicherung, Realtime-Benachrichtigungen und Statistik bleiben bestehen. Es sind keine SQL-Migrationen, neuen Umgebungsvariablen oder Änderungen im Supabase-/Vercel-Konto erforderlich.

- `shared/game.ts`: gemeinsame Datentypen, Namensliste, Karten und Austeilung, gültige Spielzüge, Rack’o, Wertung, Rundenwechsel, Zusatzrunden und Partieabschluss. Keine Netzwerk-, Speicher-, Plattform- oder Zugangsdatenabhängigkeiten.
- `lib/game.ts` und `lib/types.ts`: Online-Adapter; ergänzen Server-Identität und Sitzungstoken. Bestehende JSON-Struktur und API-Aktionen bleiben erhalten.
- `app/api/game/route.ts`: authentifiziert den Teilnehmer, prüft Gastgeberrechte und führt gemeinsame Aktionen mit anschließender Speicherung aus. Versionsprüfung gegen gleichzeitige Änderungen und Statistikaufrufe bleiben erhalten.
- `app/page.tsx`: verwendet die gemeinsamen Rack’o-Prüfungen auch für den Bestätigungsdialog und die gemeinsame Kartensatzgröße für die Anzeige.
- `racko-offline-app/src/game/engine.ts`: lokaler Adapter; erzeugt lokale Teilnehmer und führt dieselben Aktionen für den aktiven Spieler aus.
- `racko-offline-app/src/app/index.tsx`: lokale Speicherung, Sichtschutz, Geräteübergabe und Anzeige von Regelfehlern.
- `racko-offline-app/metro.config.js`: macht ausschließlich den zusätzlichen Ordner `shared/` für Metro sichtbar. Die unterschiedlichen React-/Framework-Versionen der beiden Anwendungen bleiben in ihren bisherigen Installationen.

Die lokal gespeicherte Versionsnummer bleibt `1`. Neue gemeinsame Hilfsfelder sind optional beim Einlesen alter Spielstände. Online bleiben `code`, `hostId`, Teilnehmer-Token und die Datenbank-Versionsnummer unverändert.

## Ergebnis des Abgleichs

| Thema | Bisheriger Unterschied | Gemeinsamer Stand |
| --- | --- | --- |
| Karten, Austeilung, Leserichtung, Punkte und Folgenbonus | Inhaltlich bereits gleich | Online-Regeln unverändert übernommen; keine Sortierung der Startkarten |
| Rack’o nach einem Tausch | Lokal konnte eine ungültige Anmeldung still als gewöhnlicher Tausch weiterlaufen | Anmeldung wird wie online vollständig abgelehnt; gezogene Karte und Spielstand bleiben erhalten |
| Ungültige Aktionen | Lokal oft still ignoriert; Online gab eine Fehlermeldung zurück | Gemeinsame Prüfung; Server antwortet mit Regelfehler, App zeigt eine Meldung |
| Ziehen während einer ausstehenden Rack’o-Entscheidung | Der entsprechende Online-Schutz fehlte lokal | Gemeinsame Online-Prüfung |
| Nächste Runde und Partieabschluss | Lokale Engine konnte Funktionen auch außerhalb erlaubter Phasen ausführen | Online-Phasenprüfung gilt für beide |
| Zusatzrunden | Lokal erhöhte die Engine die Rundenzahl direkt | Gemeinsame Zustimmungslogik; auf einem Gerät bestätigt der bestehende gemeinsame Button die Gruppenentscheidung, online bleiben Einzelstimmen erforderlich |
| Nachrichten nach Ziehen und Partieabschluss | Lokal fehlten teilweise die Online-Nachrichten | Gemeinsame Online-Nachrichten |
| Sichtschutz und Übergabe | Nur lokal nötig | Bleiben erhalten, ebenso das Verbergen beim Wechsel in den Hintergrund |

Unverändert gelten insbesondere: 2–4 Teilnehmer; Karten 1–50/60/75; zehn Karten pro Person; leerer Ablagestapel zu Beginn; nur verdeckt gezogene Karten dürfen ungenutzt abgelegt werden; Rack’o ist eine ausdrückliche Entscheidung; der Startspieler wechselt nach Sitzreihenfolge; nur der Rundengewinner erhält den Folgenbonus; Gleichstände sind möglich.

## Prüfung

`npm test` im Projektstamm kompiliert die benötigten TypeScript-Dateien in ein temporäres Verzeichnis und führt die Regel- und API-Tests mit dem Node-Testläufer aus. Es werden keine Netzwerkzugriffe oder echten Datenbankänderungen vorgenommen.

`tests/fixtures/online-reference.json` enthält sechs reproduzierbare Austeilungen der ursprünglichen Online-Implementierung samt Referenz-Commit. Diese Referenz darf nicht aus dem neuen Spielkern neu erzeugt werden. Weitere Tests prüfen Wertung, ungültige Aktionen ohne Zustandsänderung, Stapel-Neumischung, Rack’o-Entscheidung, Rundenzustimmung, Gleichstände und alte lokale v1-Spielstände. Neun längere Vergleiche decken alle Kombinationen aus 2/3/4 Teilnehmern und 0/3/4 als Folgenbedingung ab. API-Tests prüfen zusätzlich Sichtbarkeit der Hände, Sitzung und Gastgeberrechte, Versionsprüfung und Statistikaufrufe.

Ergänzend: `npm run build` im Stamm; `npm run typecheck` und `npm run lint` im App-Ordner. Der native JavaScript-Export lässt sich dort mit `npx expo export --platform android --platform ios --output-dir dist/core-check` prüfen. Das ersetzt keinen Gerätetest und erzeugt noch keine installierbare APK/IPA.

## Nächste Schritte und Bots

Die App verbindet sich inzwischen mit derselben Online-API und denselben Realtime-Kanälen wie der Browser. Verbindungswiederaufnahme, Sitzungsspeicherung und mobile Unterbrechungen sind in `src/online/` der App umgesetzt. Siehe [ONLINE_APP.md](ONLINE_APP.md).

Bots sind für lokale Partien **und** Online-Lobbys vorgesehen, insbesondere zwei Menschen plus ein Bot. Der gemeinsame Kern arbeitet mit Teilnehmer-IDs und freien Namen und setzt keinen menschlichen Entscheider voraus. Identität, Berechtigung und Art des Teilnehmers gehören weiterhin zum jeweiligen Adapter. `shared/bots.ts` bietet inzwischen eine Strategie-Schnittstelle und eine gefilterte Beobachtung für die separat entstehende Bot-Logik.

Online müssen Bot-Züge später serverseitig ausgelöst und wie menschliche Züge geprüft und versionsgesichert gespeichert werden. Der Bot darf nicht von einem geöffneten Gastgeber-Browser abhängig sein. Lokal kann dieselbe Entscheidungslogik auf dem Gerät laufen. Eine eingeschränkte Bot-Sicht muss fremde Hände und die verdeckte Stapelreihenfolge ausblenden. Teilnehmermodell, Lobby-Bedienung, zuverlässige serverseitige Ausführung und Behandlung in der Statistik werden erst mit dem Bot-Schritt umgesetzt. Schwierigkeitsgrade folgen danach.
