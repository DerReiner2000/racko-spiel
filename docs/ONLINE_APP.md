# Online-Anbindung der installierten App

Stand: 6. November 2026. Die Umsetzung ist lokal vorhanden. Die Produktionsseite und App-Stores wurden nicht veröffentlicht oder verändert; ein Test auf echten Geräten steht noch aus.

Aktuelle Priorität: Zunächst wird die Browser-Version mit Bots getestet. Die Online-Bot-Integration und die Trainingswertung sind in [ONLINE_BOTS.md](ONLINE_BOTS.md) beschrieben. Die vorhandene App wird dabei zunächst nicht weiter ausgebaut.

## Funktionsumfang

Die Startseite der App bietet „Online spielen“ und „Lokal spielen“. Lokal bleiben Pass-and-Play, Sichtschutz und vorhandene v1-Spielstände erhalten. Online gibt es dieselbe Namensauswahl und dieselben Rundeneinstellungen wie im Browser:

- Lobby erstellen und mit 2–4 Personen starten.
- Über die Lobby-Liste oder einen fünfstelligen Spielcode beitreten; bestehende Teilnehmer können laufende Partien wieder aufnehmen.
- Spielcode über die native Teilen-Funktion weitergeben.
- Gemeinsam mit Browser-Spielern ziehen, tauschen, ablegen, Rack’o ausrufen und für Bonus weiterspielen.
- Runden- und Endergebnisse, individuelle Zustimmung zu Zusatzrunden und gemeinsame Online-Rangliste.

Die Standardadresse ist `https://racko-spiel.vercel.app`. Eine andere HTTPS-Startadresse kann in der Online-Übersicht gespeichert werden. Die Einstellung `EXPO_PUBLIC_API_URL` kann die Vorgabe beim Build überschreiben, ist für den vorhandenen Server aber nicht nötig.

## Server und Veröffentlichung

Für den vollständigen Stand die aktualisierte Next.js-Anwendung über den bisherigen Veröffentlichungsweg nach Vercel deployen. Die vorhandenen drei Supabase-Umgebungsvariablen bleiben unverändert. Es ist **keine SQL-Migration** und keine zusätzliche Konto-Konfiguration erforderlich.

Der neue öffentliche Endpunkt `GET /api/mobile-config` liefert ausschließlich `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Das sind die Einstellungen, die auch die Browser-Anwendung verwendet. Der Service-Role-Schlüssel bleibt ausschließlich auf dem Server.

Die Spielantworten enthalten zusätzlich die Datenbank-Version. Ungültige Sitzungen, nicht mehr vorhandene Spiele und gleichzeitige Änderungen liefern unterscheidbare Statuscodes (401/404/409). Die Oberfläche des Browsers verarbeitet die bisherigen Fehlermeldungen weiterhin wie gewohnt. Eine verdeckt gezogene aktive Karte wird nun auch in der Serverantwort ausschließlich ihrem Besitzer angezeigt; die übrigen Teilnehmer sehen ihren Wert nicht.

Die App kann bereits mit einem älteren Serverstand ohne Konfigurations-Endpunkt und Versionsfeld kommunizieren. Dann erfolgt der Abgleich ersatzweise alle 15 Sekunden. Für unmittelbare Realtime-Aktualisierung und die ergänzten Prüfungen zuerst den aktualisierten Server veröffentlichen.

## App bauen und installieren

Das vollständige Repository einschließlich `shared/` verwenden. Im Stamm und im App-Ordner die jeweils eigenen Abhängigkeiten aus den Lockfiles installieren. Der App-Ordner bleibt aus Kompatibilitätsgründen `racko-offline-app`; Slug, Paketkennungen und EAS-Projekt ändern sich nicht. Der Anzeigename ist „Rack'o“.

```powershell
# Im Repository-Stamm
npm ci
npm test
npm run build

# Danach im Ordner racko-offline-app
npm ci
npm run typecheck
npm run lint
npm start -- --clear
```

Mit Expo Go lässt sich die App während der Entwicklung öffnen. Für eine eigenständig installierbare Android-Test-App im App-Ordner:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Für eine Veröffentlichung über die bisherigen Android-/iOS-Profile die bestehende EAS-Konfiguration weiterverwenden. Ein lokaler JavaScript-/Hermes-Export prüft die Bündelung, erzeugt aber noch keine APK/IPA:

```powershell
npx expo export --platform android --platform ios --output-dir dist/core-check --max-workers 2
```

## Sitzungen und Unterbrechungen

Lokale Spielstände behalten ihren bisherigen Speicherschlüssel. Online-Einstellungen, aktuelle Anmeldung und vorherige Anmeldung verwenden eigene `racko-online-…-v1`-Schlüssel. Gespeichert werden Serveradresse, Spielcode, Teilnehmer-ID und Sitzungstoken; der Online-Spielstand wird beim Öffnen erneut vom Server geladen.

Die bestehende Namenslogik bleibt erhalten: Ein erneuter Beitritt mit demselben Namen ersetzt dessen bisheriges Sitzungstoken. Für gleichzeitige App-/Browser-Tests unterschiedliche Namen verwenden.

Beim Wechsel in den Hintergrund werden Realtime-Verbindung und Intervalle freigegeben. Beim Zurückkehren bleiben Spielzüge gesperrt, bis der Serverstand wieder geladen ist. Doppeltippen löst höchstens eine gleichzeitige Aktion aus. Verspätete Antworten einer verlassenen oder pausierten Sitzung werden verworfen; niedrigere Server-Versionen überschreiben keinen neueren Stand. Eine wegen Netzproblemen unklare Aktion wird nicht automatisch erneut gesendet, sondern zunächst abgeglichen.

Bei Realtime-Ausfall läuft ein HTTP-Abgleich alle 15 Sekunden. Mit funktionierender Realtime-Verbindung gibt es wie im Browser alle fünf Minuten eine Aktivitätsmeldung. Die bisherige automatische Entfernung einer Partie nach 15 Minuten ohne aktive Geräte bleibt bestehen. Eine echte Online-Partie kann bei fehlendem Internet nicht lokal weitergespielt werden.

## Bot-Schnittstelle für die parallele Entwicklung

`shared/bots.ts` definiert `BotStrategy` mit `id` und `decide(observation)`. Die Rückgabe ist eine erlaubte Form der gemeinsamen Aktionen: `draw`, `swap`, `discard` oder `racko`; sie kann synchron oder als Promise erfolgen.

`observeForBot(state, playerId)` erzeugt eine Kopie der eigenen Hand, der sichtbaren obersten Ablagekarte, der Stapelgröße, der aktuellen Rundeneinstellungen und öffentlicher Teilnehmerdaten. Fremde Hände, Sitzungstoken und die verdeckte Stapelreihenfolge werden nicht weitergereicht. Eine aktive gezogene Karte erhält nur der Teilnehmer, der gerade am Zug ist.

Ergänzung für die Strategieentwicklung: Der Gesamtpunktestand und tatsächliche Rundenindex werden inzwischen standardmäßig maskiert; sie sind nur über `considerMatchScore` freigebbar. Der optionale öffentliche Aktionsverlauf und seine Persistierung, die Referenzstrategien sowie der lokale Simulator sind in [BOT_UEBERGABE.md](BOT_UEBERGABE.md) beschrieben. Die produktive Bot-Ausführung bleibt ein separater Integrationsschritt.

Die Strategie erhält ausschließlich dieses Beobachtungsobjekt. Die Browser-/Server-Integration ist inzwischen in `lib/online-bots.ts` umgesetzt und verwendet die separat entwickelten Profile Leicht und Mittel. Siehe [ONLINE_BOTS.md](ONLINE_BOTS.md). Lobby-Bedienung für Bots in der installierten App und lokale Bot-Ausführung folgen später.

## Prüfungen und kurzer Gerätetest

Automatische Tests umfassen Regeln, Original-Austeilung, alte lokale Spielstände, API-Sichtbarkeit und eine gemischte App-/Browser-Partie gegen die tatsächliche API mit einer Datenbank im Arbeitsspeicher. Weitere Tests prüfen Transport, Zeitüberschreitungen, HTTP-Fallback, Realtime-Lebenszyklus, alte Serverantworten, Doppeltippen, Hintergrund/Rückkehr und die gefilterte Bot-Beobachtung. Dabei wird die Produktionsdatenbank nicht verwendet.

Nach Web-Deployment und Installation auf einem echten Gerät:

1. Browser als „Max“ öffnen; App als „Tom“. Eine Lobby jeweils einmal vom Browser und einmal von der App erstellen und vom anderen Gerät beitreten.
2. Partie starten; verdeckt und offen ziehen, tauschen und ablegen. Auf beiden Geräten Zugfolge und eigene Hand prüfen.
3. App schließen und öffnen, Handy sperren und entsperren, WLAN/Mobilfunk wechseln. Die Partie muss nach dem Abgleich ohne doppelten Zug weitergehen.
4. Eine Runde abschließen, eine Zusatzrunde mit beiden Stimmen starten und danach das Endergebnis sowie die gemeinsame Rangliste prüfen.
5. Ohne Internet eine lokale Partie starten und fortsetzen; Sichtschutz und vorhandene lokale Spielstände prüfen.
