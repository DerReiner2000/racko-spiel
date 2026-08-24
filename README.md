# Rack’o – private Spielrunde

Private Mehrspieler-Web-App für 2–4 Personen. Enthalten sind Lobby und Spielcode, geheime Kartenhände, mehrere Runden, Rack’o- und Bonuswertung sowie eine dauerhafte Statistik-Rangliste.

Beim Erstellen ist keine feste Spielerzahl nötig. Der Gastgeber startet die Lobby mit 2–4 anwesenden Spielern; die Kartenzahl wird daraus automatisch bestimmt. Optional kann Rack’o zusätzlich eine direkte Folge aus mindestens 3 oder 4 Karten voraussetzen. Nach der Namensauswahl zeigt die Anwendung wartende und bereits begonnene Partien. In laufende Partien können nur deren bisherige Teilnehmer zurückkehren.

## Supabase einrichten

1. Ein neues Supabase-Projekt erstellen.
2. Im **SQL Editor** den gesamten Inhalt aus `supabase/schema.sql` ausführen.
3. Unter **Project Settings → API Keys** die Projekt-URL, den Publishable Key und den Secret Key kopieren.
4. `.env.example` als `.env.local` kopieren und alle drei Werte eintragen. Der Secret Key darf niemals mit `NEXT_PUBLIC_` beginnen oder im Browser verwendet werden.

## Lokal starten

```bash
npm install
npm run dev
```

## Auf Vercel veröffentlichen

1. Das Projekt in ein privates Git-Repository übertragen und in Vercel importieren.
2. In den Vercel-Projekteinstellungen diese Umgebungsvariablen hinterlegen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deployment starten. Vercel erkennt das Next.js-Projekt automatisch.

## Datenschutz der Hände

Die vollständige Spielpartie wird nur serverseitig mit dem Supabase-Service-Schlüssel gelesen. Jeder Browser erhält ausschließlich seine eigene Hand. Die Tabellen besitzen keine öffentlichen Zugriffsrichtlinien.

## Inaktive Spiele

Solange mindestens ein Spieler die Partie geöffnet hat, wird ihre Aktivität automatisch erneuert. Ist ein Spiel oder Warteraum 15 Minuten lang auf keinem Gerät mehr aktiv, löscht Supabase die Partie beim nächsten minütlichen Bereinigungslauf. Erstellt ein Spieler nach dem Verlassen eine neue Partie, wird seine vorherige Partie direkt entfernt. Abgebrochene Partien werden nicht in der Statistik erfasst.

Spieländerungen werden über Supabase Realtime übertragen. Eine Aktivitätsmeldung läuft nur alle fünf Minuten; ein 15-sekündiger Abgleich wird ausschließlich verwendet, solange die Realtime-Verbindung unterbrochen ist.

## Spielregeln dieser Version

- 2 Spieler: Karten 1–50; 3 Spieler: 1–60; 4 Spieler: 1–75.
- Jeder erhält zehn Karten in Ziehreihenfolge. Die zuletzt gezogene liegt vorne.
- Pro Zug wird verdeckt oder vom offenen Ablagestapel gezogen und anschließend getauscht. Nur eine verdeckt gezogene Karte darf ungenutzt abgelegt werden.
- Eine aufsteigende Zehnerreihe erlaubt während des eigenen Zuges den Rack’o-Ruf oder freiwilliges Weiterspielen.
- Gewertet werden je 5 Punkte bis zur ersten nicht aufsteigenden Karte. Rack’o bringt zusätzlich 25 Punkte.
- Nur der Rundengewinner erhält für seine längste direkte Zahlenfolge den Bonus: 3 = 50, 4 = 100, 5 = 200, ab 6 = 400 Punkte.
- Nach der gewählten Rundenzahl gewinnt die höchste Gesamtpunktzahl; Gleichstände sind möglich.
