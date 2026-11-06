# Bots in der Online-Version

Stand: 6. November 2026. Die Integration ist lokal umgesetzt und geprüft. Die Veröffentlichung auf Vercel erfolgt über den bisherigen Veröffentlichungsweg; die Produktionsdatenbank wurde nicht verändert.

## Benutzung

„Neues Spiel“, Namensauswahl, Rundenzahl und Rack’o-Bedingung funktionieren wie bisher. Im Warteraum kann der Gastgeber zusätzlich bis zu drei Bots hinzufügen, ihre Stufe zwischen **Leicht** und **Mittel** ändern und sie vor dem Start wieder entfernen. Menschen und Bots belegen gemeinsam höchstens vier Plätze. Ist die Lobby voll, kann der Gastgeber einen Bot entfernen, um einen Menschen beitreten zu lassen.

Eine Person kann mit 1–3 Bots spielen; ebenso sind beispielsweise zwei Menschen und ein Bot möglich. Eine Partie benötigt mindestens einen Menschen. Der Gastgeber startet weiterhin die Partie, und der Kartensatz richtet sich wie bisher nach der Gesamtzahl der Teilnehmer.

Bot-Partien gelten nach Nutzerentscheidung als **Training ohne Ranglistenwertung**. Sie zeigen normale Rundenpunkte, Gesamtpunkte und Gewinner, verändern aber keinen bisherigen Ranglisteneintrag. Reine Menschen-Partien werden weiterhin wie bisher gewertet. Die Lobby, der Spielkopf und das Endergebnis kennzeichnen Trainingspartien.

Bei Zusatzrunden stimmen Bots automatisch zu. Alle menschlichen Teilnehmer müssen weiterhin einzeln zustimmen. Beim Beitritt und bei der Rückkehr in eine Partie bleiben die bisherigen Namen und Sitzungstoken maßgeblich; ein Bot kann nicht als menschliche Sitzung übernommen werden.

## Verwendete Bot-Logik

Die Strategien aus dem Chat „Racko-Bot-Strategien untersuchen“ werden unverändert eingebunden:

- `easy-situational-v1`: einfache Bewertung der eigenen Reihe, aktuelle offene Karte und aggregierter Rundenfortschritt.
- `medium-situational-v1`: zusätzlich eigene Zielplanung, konkrete Abschlusskarten und zulässige Erinnerung an den öffentlichen Ablagestapel.

Registrierung über `createConfiguredReferenceBot` aus `shared/bot-reference.ts`. Die aktuelle fachliche Beschreibung steht in `BOT_KONTEXT.md`, die Schnittstelle in `shared/bots.ts`. Schwer, Experte und Gesamtwertungsoptimierung werden nicht angeboten, weil diese Profile noch nicht implementiert sind.

## Serverausführung und Wiederaufnahme

`lib/online-bots.ts` ist der Online-Adapter. Nach Spielstart, menschlichem Zug oder Rundenwechsel führt der Server aufeinanderfolgende Bot-Aktionen direkt innerhalb der Anfrage aus. Er wartet damit nicht auf einen geöffneten Gastgeber-Browser und verwendet keinen unzuverlässigen, losgelösten Hintergrundtimer.

Ziehen und Platzieren sind zwei eigenständige, jeweils bestätigte Aktionen. Jeder neue Spielstand wird mit der erwarteten bisherigen Datenbank-Version gespeichert. Zwei konkurrierende Anfragen können dadurch denselben Bot-Zug nicht doppelt bestätigen. Bei einem Konflikt wird neu geladen und neu entschieden; bereits ausgeführte Aktionen werden nicht blind wiederholt.

Die Ausführung ist pro Anfrage zeitlich und nach Versuchen begrenzt. Bei einer unterbrochenen Anfrage kann jeder authentifizierte Teilnehmer über einen neuen Snapshot den verbliebenen Bot-Zug fortsetzen. Die Browser-Version gleicht hierfür während eines Bot-Zugs alle zwei Sekunden ab. Im normalen Fall ist die Zugfolge bereits vollständig serverseitig ausgeführt. Es gibt keinen permanenten eigenen Bot-Dienst; wenn die Partie auf einem menschlichen Zug wartet, passiert ohne dessen Aktion nichts.

Unerwartete Strategiefehler, nicht verfügbare Strategieversionen oder eine verspätete asynchrone Entscheidung führen zu einem dokumentierten Ersatzzug. Dieser nutzt ausschließlich die eigene Hand und öffentliche Informationen und wird ebenfalls durch den gemeinsamen Regelkern geprüft. Insbesondere wird eine offen gezogene Karte zwingend getauscht. Strategiefehler werden serverseitig protokolliert.

## Persistenz und Informationsschutz

Neue Bot-Metadaten werden in der vorhandenen JSON-Spielzustandsspalte gespeichert. Eine SQL-Migration oder neue Umgebungsvariablen sind nicht erforderlich.

`GameState.botRound` enthält serverintern:

- eine neue undurchsichtige Runden-ID;
- den vollständigen öffentlichen Ereignisverlauf der aktuellen Runde;
- die Kennzeichnung, ob der Verlauf vollständig ist;
- die ursprünglichen gefilterten Beobachtungen der Bots für die Startplanung.

Startbeobachtungen werden vor dem ersten Ziehen erzeugt. Bei Wiederaufnahme wird die initiale Planung daraus wiederhergestellt und anschließend an die aktuelle eigene Hand angepasst. Alte Spielstände ohne Verlauf werden ausdrücklich als unvollständig behandelt. Bei jeder neuen Runde werden ID, Verlauf und Startbeobachtungen erneuert.

Ereignisse aller Teilnehmer werden zusammen mit dem Spielstand atomar in derselben versionsgeprüften Datenbankänderung gespeichert. Verdeckte Zugkarten bleiben im öffentlichen Verlauf verborgen; gegnerische Tauschplätze werden nicht protokolliert. Die Bot-Logik erhält ausschließlich `observeForBot(...)`, niemals den vollständigen Server-Spielstand.

Browser-Antworten enthalten weder `botRound` noch Startbeobachtungen oder Bot-Interna. Bot-Hände werden wie menschliche Hände erst am Rundenende offengelegt. Nach außen kommen lediglich Bot-Kennzeichnung und Schwierigkeitsstufe. Sitzungstoken werden Bots nicht zugeteilt.

## Lokale Vorschau ohne echte Datenbank

```powershell
npm run preview:online
```

Die Vorschau läuft unter `http://localhost:3107`. Sie startet die tatsächliche Next.js-Anwendung und ersetzt ausschließlich den Supabase-HTTP-Endpunkt durch eine kleine Datenbank im Arbeitsspeicher auf Port 3117. Sämtliche Zugangsdaten werden im Vorschau-Prozess mit festen Testwerten überschrieben; die vorhandene `.env.local` wird nicht geändert.

Für zwei getrennte Testspieler im selben Browser können `http://localhost:3107` und `http://127.0.0.1:3107` verwendet werden. Die beiden Adressen haben getrennte lokale Sitzungsspeicher, greifen aber auf dieselbe Testpartie zu. Die Vorschau bildet Supabase Realtime nicht nach; dafür greift der HTTP-Abgleich. Ihre Rangliste bleibt leer und alle Testpartien verschwinden beim Beenden. Sie ist keine öffentliche Mehrspieler-Veröffentlichung.

## Prüfungen und Veröffentlichung

```powershell
npm test
npm run build
```

Die Prüfungen umfassen die unveränderten Online-Regeln, bestehende menschliche Partien, Bot-Strategietests aus dem anderen Chat und die neue Serverintegration: Bot-Verwaltung, Berechtigungen, private Karten, atomare Ereignisse, konkurrierende Ausführung, Wiederaufnahme nach dem Ziehen, Ersatzzüge, Trainingswertung und Zustimmung aller Menschen zur Zusatzrunde.

Im Browser wurde eine lokale Partie mit zwei menschlichen Sitzungen und einem mittleren Bot angelegt und gespielt, einschließlich Namensauswahl, Beitritt, Änderung Leicht → Mittel, verdecktem Ziehen, automatischem Bot-Zug, offenem Ziehen und der Übergabe an den nächsten Menschen. Dabei wurde ausschließlich die lokale Testdatenbank verwendet.

Nach erfolgreichem Build die Änderungen wie gewohnt auf das bestehende Vercel-Projekt veröffentlichen. Die maximale Dauer der Spiel-API ist im Code auf 30 Sekunden gesetzt; ein zusätzlicher Worker oder Cronjob muss nicht eingerichtet werden. Danach empfiehlt sich eine erste private Online-Testrunde mit zwei Menschen und einem Bot, bevor ihr die App-Verteilung wieder aufgreift.
