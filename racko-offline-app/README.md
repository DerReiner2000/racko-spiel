# Rack'o – lokal und online

React-Native-App für Android und iOS. Lokales Spielen läuft nach der Installation vollständig offline. Der Online-Modus verwendet dieselbe API und dieselben Supabase-Realtime-Kanäle wie die Browser-Anwendung. Die Regeln stammen gemeinsam mit Server und Browser aus `../shared/game.ts`; bei Abweichungen hat die bisherige Online-Version Vorrang.

## Enthalten

- Modusauswahl: lokal auf einem Gerät oder gemeinsam online
- Online-Lobbys erstellen, über Liste oder Spielcode beitreten
- Gemeinsame Partien und Rangliste mit Browser-Spielern
- Gespeicherte Online-Anmeldung, Wiederaufnahme nach App-Neustart und Netzunterbrechung
- Realtime mit HTTP-Abgleich als Ersatz bei Verbindungsproblemen

- Pass-and-Play für 2–4 Personen auf einem Gerät
- Blickdichte Übergabeansicht vor jedem Zug
- Automatischer Sichtschutz beim Wechsel in den Hintergrund
- Lokaler Spielstand und sichere Wiederaufnahme
- Alle Karten-, Rack'o-, Runden- und Bonusregeln der Online-Version
- Zusatzrunden und gemeinsame Ergebnisansicht

Die Oberfläche für Geräteübergabe und Sichtschutz bleibt lokal. Spielzüge, Rack’o-Prüfung und Rundenwechsel werden dagegen durch denselben Spielkern wie online geprüft. Ungültige Aktionen zeigen eine Meldung und verändern den Spielstand nicht. Bestehende lokale v1-Spielstände bleiben verwendbar.

Die Standardadresse ist `https://racko-spiel.vercel.app`. Über „Serveradresse ändern“ in der Online-Übersicht kann ein anderer HTTPS-Server verwendet werden. Alternativ setzt `EXPO_PUBLIC_API_URL` die Vorgabe beim App-Build; siehe `.env.example`. Es werden keine geheimen Supabase-Schlüssel in die App übernommen. Die öffentlichen Realtime-Einstellungen lädt sie vom eigenen Server über `/api/mobile-config`.

Die bestehende App-Kennung und das EAS-Projekt bleiben erhalten; der Anzeigename lautet jetzt „Rack'o“. Installation, Web-Deployment und eine kurze Gerätetest-Anleitung stehen in `../docs/ONLINE_APP.md`.

Bei einer lokalen Zusatzrunde steht der gemeinsame Button für die Zustimmung der Gruppe auf diesem Gerät. Online stimmt weiterhin jeder Teilnehmer einzeln ab.

## Entwicklung

Das vollständige Repository auschecken, nicht nur diesen Unterordner kopieren. `../shared/` wird über `metro.config.js` in das App-Bundle aufgenommen und muss auch im Build-Archiv vorhanden sein. Es werden keine zusätzlichen Laufzeitpakete für den Spielkern benötigt.

```bash
npm install
npm start
```

Nach der erstmaligen Umstellung auf den gemeinsamen Kern Metro bei Bedarf mit `npm start -- --clear` starten. Die zentralen Regel- und Vergleichstests laufen mit `npm test` im übergeordneten Projektordner. Für die App zusätzlich `npm run typecheck` und `npm run lint` ausführen.

Anschließend lässt sich die App mit Expo Go auf einem Gerät öffnen. Ein vollständig eigenständiger Test-Build wird über EAS erzeugt.

## Installierbare Builds

```bash
# Direkt installierbare Android-APK für Tests
npx eas-cli@latest build --platform android --profile preview

# Produktionspakete für Google Play und Apple App Store
npx eas-cli@latest build --platform all --profile production
```

Für EAS Build ist ein Expo-Konto erforderlich. Für die Veröffentlichung benötigt man zusätzlich ein Google-Play- beziehungsweise Apple-Developer-Konto.
