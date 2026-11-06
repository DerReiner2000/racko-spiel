# Übergabe: Zahlenreihen-Spiel für Android und iOS

> Aktualisierung vom 6. November 2026: Server, Browser und App verwenden `shared/game.ts`; die bestehende Online-Version ist die fachliche Referenz. Die App bietet inzwischen lokales und gemeinsames Online-Spiel. Einrichtung und Prüfstatus stehen in `docs/ONLINE_APP.md`, der Regelabgleich in `docs/SPIELKERN.md`. `shared/bots.ts` bereitet die Integration der separat entwickelten Bot-Logik vor; Bots sind noch nicht aktiviert. Die folgenden Abschnitte dokumentieren den früheren Übergabestand; frühere Projektgrenzen werden durch diese Aktualisierung ersetzt.

Stand: 7. Oktober 2026. Diese Datei ist eine eigenständige Beschreibung der Spielmechanik und der vorhandenen Abläufe. Sie kann allein in ein komplett leeres Projekt übernommen werden. „Zahlenreihen-Spiel“ ist eine beschreibende Arbeitsbezeichnung; der endgültige App-Name steht noch nicht fest.

## 1. Ziel und Projektgrenzen

Eine eigenständige App für Android und iOS entwickeln, mit eigener Identität, Gestaltung und technischen Kennungen. Eine spätere Veröffentlichung in den beiden App-Stores ist das Ziel. Die bestehende private Online-Anwendung bleibt ein separates Projekt und wird dort weiterentwickelt.

Dieses Dokument beschreibt die tatsächlich implementierte Spielvariante. Es unterscheidet verbindliche Spielregeln, bestehende Betriebsarten und Empfehlungen für die neue Umsetzung. Es setzt keinen Zugriff auf das bisherige Repository, dessen Backend oder dessen Zugangsdaten voraus.

Für das neue Projekt sind noch festzulegen: endgültiger Name, Gestaltung und der Umfang der ersten Version. Insbesondere ist noch nicht entschieden, ob die neue App zunächst nur lokales Spielen, zusätzlich Online-Spiel oder beide Betriebsarten enthalten soll. Die bestehende lokale Test-App zeigt bereits, wie gemeinsames Spielen auf einem Gerät funktioniert.

## 2. Spielidee und Begriffe

Zwei bis vier Personen spielen mehrere Runden. Jede Person besitzt eine Reihe aus genau zehn Zahlenkarten an festen Plätzen. Durch Ziehen und Austauschen einzelner Karten soll diese Reihe von vorne nach hinten streng aufsteigen. Lücken zwischen Zahlen sind erlaubt.

Eine vollständig aufsteigende Reihe berechtigt zum ausdrücklichen Rundenabschluss. Wer sie erreicht, darf stattdessen weiterspielen, um einen höheren Bonus durch unmittelbar aufeinanderfolgende Zahlen zu erreichen. Dabei können andere Personen die Runde vorher beenden.

Neutrale Begriffe für die neue App:

- **Kartenreihe:** die zehn eigenen Karten an festen Positionen.
- **Ziehstapel:** verdeckter Vorrat noch nicht genommener Karten.
- **Ablagestapel:** offen abgelegte Karten; nur die oberste darf genommen werden.
- **Aktive Karte:** bereits gezogene Karte, deren Verwendung noch aussteht.
- **Direkte Folge:** benachbarte Karten mit jeweils genau einem Zahlenschritt Abstand.
- **Reihe fertig:** vorläufige Beschriftung für das freiwillige Beenden einer Runde.
- **Rundengewinner:** die Person, die eine gültige Reihe ausdrücklich anmeldet.
- **Partiegewinner:** alle Personen mit der höchsten Gesamtpunktzahl am Partieende.

## 3. Karten und Einstellungen

Jede Zahl kommt im Kartensatz genau einmal vor. Es gibt keine Farben als Regelmerkmal, keine Joker und keine Sonderkarten.

| Personen | Zahlen | Karten insgesamt | Ausgeteilt | Im Ziehstapel nach dem Austeilen |
| --- | --- | ---: | ---: | ---: |
| 2 | 1 bis 50 | 50 | 20 | 30 |
| 3 | 1 bis 60 | 60 | 30 | 30 |
| 4 | 1 bis 75 | 75 | 40 | 35 |

Vor einer Partie werden Personen und ihre feste Sitzreihenfolge, die geplante Rundenzahl und eine optionale Mindestfolge festgelegt. In der bisherigen Oberfläche sind 1 bis 20 geplante Runden auswählbar; die lokale Test-App schlägt drei Runden vor. Einstellbare Mindestfolge:

- **0:** Eine streng aufsteigende Zehnerreihe reicht für den Rundenabschluss.
- **3:** Zusätzlich muss irgendwo in der Reihe eine direkte Folge aus mindestens drei Karten liegen.
- **4:** Zusätzlich muss irgendwo in der Reihe eine direkte Folge aus mindestens vier Karten liegen.

Diese Einstellung gilt für die ganze Partie. Der Folgenbonus wird in allen drei Varianten nach derselben Tabelle vergeben. Die Mindestfolge verändert nur die Berechtigung zum Rundenabschluss.

## 4. Rundenaufbau und Kartenrichtung

1. Für jede Runde einen vollständigen neuen Kartensatz passend zur Personenzahl erzeugen.
2. Den gesamten Satz zufällig mischen. Die bisherigen Umsetzungen verwenden Fisher–Yates.
3. Zehn Austeildurchgänge durchführen: In jedem Durchgang erhält jede Person in Sitzreihenfolge genau eine Karte.
4. Die ausgeteilten Karten in ihrer vorgegebenen Reihenfolge ablegen; niemand darf sie beim Austeilen sortieren.
5. Die verbleibenden Karten bilden den verdeckten Ziehstapel.
6. Der Ablagestapel startet **leer**. Es wird zu Beginn keine Karte aufgedeckt.
7. Aktive Karte und Ziehquelle sind leer. Rundenpunkte und vorherige Rundenergebnisse werden zurückgesetzt; Gesamtpunkte und Anzahl der Rundensiege bleiben erhalten.

### Eindeutige Orientierung

Die aktuelle Datenhaltung speichert die Kartenreihe von hinten nach vorne. In der vertikalen Darstellung steht der erste Arrayeintrag oben/hinten und der letzte unten/vorne. Geprüft und gewertet wird in der umgekehrten Richtung: **von unten/vorne nach oben/hinten**.

| Bedeutung | Bisheriger Arrayindex | Position in einer vertikalen Darstellung |
| --- | ---: | --- |
| Hinten, Ende der Wertungsrichtung | 0 | Oben |
| Vorne, Beginn der Wertungsrichtung | 9 | Unten |

Jede neue ausgeteilte Karte wird am Arrayanfang eingefügt. Dadurch liegt die zuerst an eine Person ausgeteilte Karte nach allen zehn Durchgängen an Index 9/vorne; die zuletzt ausgeteilte liegt an Index 0/hinten. Diese Zuordnung entspricht der implementierten Logik.

Beispiel einer gültigen Reihe:

```text
Gespeichert / angezeigt von oben nach unten:
[48, 44, 39, 32, 27, 21, 16, 11, 7, 2]

Für Regeln und Punkte gelesen von vorne nach hinten:
[2, 7, 11, 16, 21, 27, 32, 39, 44, 48]
```

Die neue Engine darf alternativ direkt in Wertungsrichtung speichern. Wichtig ist, dass Darstellung, Platzwahl, Austeilen und Wertung dieselbe dokumentierte Zuordnung verwenden. Karten dürfen bei der Prüfung nur in Leserichtung betrachtet, niemals nach ihren Zahlen sortiert werden.

### Wer beginnt?

Die erste startende Person wird einmal pro Partie zufällig gewählt. In jeder folgenden Runde beginnt die nächste Person der festen Sitzreihenfolge. Innerhalb jeder Runde laufen die Züge ebenfalls zyklisch in dieser Reihenfolge.

```text
Startindex einer Runde = (erster Startindex + Rundennummer - 1) modulo Personenzahl
Nächster Zugindex      = (aktueller Zugindex + 1) modulo Personenzahl
```

Der Rundengewinner bestimmt nicht, wer die nächste Runde beginnt.

## 5. Stapel und Kartenbewegungen

### Ziehstapel

Der Ziehstapel ist verdeckt. Vor dem Ziehen ist sein nächster Kartenwert unbekannt; die Oberfläche kann die verbleibende Kartenzahl zeigen. Die aktive Person nimmt ausschließlich die oberste Karte. Technisch liegt die oberste Karte in der bisherigen Umsetzung am Arrayende und wird mit `pop()` entnommen.

### Ablagestapel

Abgelegte Karten werden oben auf den Stapel gelegt, technisch mit `push()`. Nur der letzte Arrayeintrag ist die offen angebotene Karte. Beim Nehmen wird er mit `pop()` entfernt; danach wird die darunterliegende Karte sichtbar. Es ist nicht erlaubt, eine ältere Karte gezielt auszuwählen oder die Ablage zu durchsuchen.

Der Stapel entsteht durch ausgetauschte eigene Karten und ungenutzt abgelegte Karten aus dem verdeckten Vorrat. Er kann zeitweise leer sein. Dann ist offenes Ziehen gesperrt.

### Leerer Ziehstapel

Erst wenn jemand verdeckt ziehen möchte und der Ziehstapel leer ist, wird nachgemischt:

1. Die oberste Ablagekarte separat aufbewahren.
2. Alle darunterliegenden Ablagekarten mischen und als neuen verdeckten Ziehstapel verwenden.
3. Die aufbewahrte Karte bleibt als einzige Karte offen auf der Ablage.
4. Aus dem neu gebildeten Ziehstapel genau eine Karte ziehen.

Bei null oder nur einer Ablagekarte gibt es nichts zum Nachmischen. Verdecktes Ziehen ist dann nicht möglich. Eine vorhandene offene Karte kann weiterhin nach den üblichen Regeln genommen werden. In einem intakten Spiel mit den vorgegebenen Kartenzahlen bleiben außerhalb der Kartenreihen genügend Karten; dieser Sonderfall ist trotzdem abzusichern.

## 6. Vollständiger Spielzug

Nur die aktive Person darf handeln. Ein normaler Zug besteht aus genau einem Ziehen und einer anschließenden Kartenentscheidung.

### Phase A: Vor dem Ziehen

Ohne aktive Karte bestehen folgende Möglichkeiten:

- Eine gültige eigene Zehnerreihe ausdrücklich anmelden und die Runde sofort beenden.
- Eine Karte verdeckt vom Ziehstapel ziehen.
- Die oberste offene Ablagekarte nehmen, sofern eine vorhanden ist.

Ein Zug kann nicht einfach übersprungen werden. Nach dem Ziehen wird die Quelle gespeichert. Beide Ziehaktionen bleiben gesperrt, bis die aktive Karte verarbeitet wurde.

### Phase B: Die gezogene Karte verwenden

**Austausch:** Die Person wählt einen der zehn festen Plätze. Die aktive Karte ersetzt ausschließlich die Karte an diesem Platz. Die verdrängte Karte kommt oben auf den offenen Ablagestapel. Die anderen neun Plätze bleiben unverändert. Die Reihe hat weiterhin zehn Karten.

**Ungenutzt ablegen:** Nur eine verdeckt gezogene Karte darf direkt oben auf die Ablage gelegt werden. Die eigene Reihe bleibt unverändert; der Zug endet.

**Pflicht bei offener Karte:** Eine vom Ablagestapel genommene Karte muss in die eigene Reihe eingebaut werden. Sie darf nicht ungenutzt zurückgelegt werden.

Karten innerhalb der eigenen Reihe dürfen weder verschoben noch untereinander getauscht oder automatisch sortiert werden. Auch eine bereits aufsteigende Reihe darf durch einen Austausch wieder unvollständig werden.

### Phase C: Nach einem Austausch

Ist die neue Reihe gültig, bietet die Oberfläche zwei Möglichkeiten:

1. **Reihe fertig:** Austausch und Rundenabschluss gemeinsam bestätigen.
2. **Für Bonus weiterspielen:** Austausch bestätigen und den Zug an die nächste Person weitergeben.

Ist die Reihe nicht gültig, endet der Zug unmittelbar nach dem Austausch. Nach jedem normalen Zugabschluss werden aktive Karte und Quelle geleert und der Zugindex weitergeschaltet.

Es gibt keine allgemeine zusätzliche Aktionsphase nach dem Ablegen oder nach einem bereits bestätigten Austausch. Wer bei einer gültigen Reihe weiterspielt, darf sie beim nächsten eigenen Zug vor dem Ziehen anmelden, falls sie weiterhin gültig ist. Nach dem Ziehen kann nicht separat angemeldet werden; ein Rundenabschluss ist dann nur zusammen mit einem gültigen Austausch möglich.

Der Entscheidungsdialog sollte den vorgeschlagenen Austausch als Vorschau behandeln. Bis zur Wahl einer Option bleibt der verbindliche Zustand unverändert; weitere Kartenaktionen sind gesperrt. Austausch und Abschluss werden als eine Zustandsänderung verarbeitet.

## 7. Gültige Reihe und direkte Folgen

Für den Rundenabschluss müssen genau zehn Karten vorhanden sein. In Wertungsrichtung gilt für jede benachbarte Paarung `nächste Karte > vorherige Karte`. Gleiche Werte und Abwärtsbewegungen sind unzulässig. Zahlenlücken sind zulässig.

Eine direkte Folge besteht aus benachbarten Karten mit `nächste Karte = vorherige Karte + 1`. Sie darf an beliebiger Stelle der Reihe beginnen. Eine Lücke oder Abwärtsbewegung beendet die aktuelle direkte Folge. Maßgeblich ist die längste zusammenhängende direkte Folge in der gesamten Reihe, nicht die Summe mehrerer Folgen.

Beispiele, jeweils in Wertungsrichtung:

- `[2, 7, 11, 16, 21, 27, 32, 39, 44, 48]`: vollständig aufsteigend, längste direkte Folge 1; Abschluss nur bei Mindestfolge 0.
- `[2, 7, 8, 9, 16, 21, 27, 32, 39, 48]`: vollständig aufsteigend, direkte Folge 3; Abschluss bei Mindestfolge 0 oder 3.
- `[2, 7, 8, 9, 10, 21, 27, 32, 39, 48]`: vollständig aufsteigend, direkte Folge 4; Abschluss in allen Varianten.
- `[2, 7, 11, 9, 16, 21, 27, 32, 39, 48]`: nicht vollständig aufsteigend; kein Abschluss möglich.

Eine gültige Reihe beendet die Runde niemals automatisch. Das gilt auch, wenn jemand zufällig bereits eine gültige Anfangsreihe erhält: Sie darf erst im eigenen Zug ausdrücklich angemeldet werden.

## 8. Rundenwertung

Beim gültigen Rundenabschluss endet die Runde sofort für alle. Niemand erhält noch einen abschließenden Zug. Alle Kartenreihen werden für die gemeinsame Auswertung offengelegt.

### Grundpunkte für jede Person

Von vorne nach hinten zählen, beginnend mit der ersten Karte. Diese zählt immer. Jede weitere Karte zählt nur so lange, wie sie größer als ihre unmittelbare Vorgängerin ist. Beim ersten Verstoß endet die Zählung endgültig. Spätere aufsteigende Abschnitte zählen nicht mehr.

```text
Grundpunkte = Länge des aufsteigenden Anfangsabschnitts × 5
```

Eine normale Zehnerreihe bringt somit mindestens 5 und höchstens 50 Grundpunkte. Bei einer leeren Reihe wären es 0; leere Reihen gehören nicht zu einem gültigen laufenden Spiel.

Beispiel: `[3, 8, 12, 10, 17, 23, 29, 35, 42, 49]` in Wertungsrichtung zählt nur die ersten drei Karten und bringt 15 Grundpunkte.

### Zuschläge nur für den Rundengewinner

Der Rundengewinner erhält 25 zusätzliche Punkte und genau einen Bonus für die längste direkte Folge:

| Längste direkte Folge | Bonuspunkte |
| --- | ---: |
| 0 bis 2 | 0 |
| 3 | 50 |
| 4 | 100 |
| 5 | 200 |
| 6 bis 10 | 400 |

Mehrere direkte Folgen werden nicht addiert. Eine Folge aus sieben bis zehn Karten bringt denselben Bonus wie eine Sechserfolge. Alle anderen Personen erhalten nur ihre Grundpunkte, auch bei einer eigenen direkten Folge oder einer ebenfalls vollständigen Reihe.

```text
Rundenpunkte = Grundpunkte + Abschlusszuschlag + Folgenbonus
Gesamtpunkte nach der Runde = bisherige Gesamtpunkte + Rundenpunkte
```

Ein gültiger Rundengewinner hat immer 50 Grundpunkte. Mögliche Siegerwertungen sind daher 75, 125, 175, 275 oder 475 Punkte. Beispiel: Eine vollständige Reihe mit längster direkter Folge 4 ergibt `50 + 25 + 100 = 175` Punkte. Die Zahl der Rundensiege wird für diese Person um eins erhöht.

Die Auswertung soll Grundpunkte, Abschlusszuschlag und Bonus getrennt nachvollziehbar machen. Die bisherigen Daten enthalten diese Aufschlüsselung bereits; die Oberflächen zeigen vor allem die gesamte Rundenpunktzahl.

## 9. Weitere Runden und Partieende

Nach jedem Rundenabschluss folgt eine Ergebnisansicht. Dort sind Rundenpunkte, Gesamtstand und alle Kartenreihen sichtbar. Für eine neue Runde wird der vollständige Kartensatz neu erzeugt, gemischt und ausgeteilt. Alte Stapel werden nicht weiterverwendet.

Vor der geplanten letzten Runde wird mit „Nächste Runde“ fortgesetzt. Nach der geplanten letzten Runde können die Beteiligten das Endergebnis aufrufen oder die Partie um eine Runde verlängern. Eine Zusatzrunde erhöht sowohl die aktuelle als auch die geplante Rundenzahl um eins; vorhandene Punkte bleiben bestehen. Weitere Zusatzrunden sind möglich. Die anfängliche Einstellgrenze von 20 Runden begrenzt im bisherigen Ablauf nicht die Zahl späterer Zusatzrunden.

Beim endgültigen Beenden gewinnen alle Personen mit der höchsten Gesamtpunktzahl. Gleichstände sind erlaubt; es gibt keinen zusätzlichen Vergleich nach Rundensiegen oder Bonusfolgen und keine automatische Entscheidungsrunde.

Die Rundenansicht sortiert nach Rundenpunkten, die Endansicht nach Gesamtpunkten. Bei Gleichstand muss die neue Oberfläche gemeinsame Platzierungen verständlich darstellen.

## 10. Bestehende Betriebsarten

### Online-Spiel auf mehreren Geräten

- Die private Web-Anwendung verwendet Next.js/React und ein Supabase-Backend.
- Eine Person erstellt eine Lobby, wählt geplante Rundenzahl und Mindestfolge und erhält einen fünfstelligen Spielcode. Der Code verwendet Großbuchstaben und Zahlen ohne einige leicht verwechselbare Zeichen.
- Die Personenzahl wird erst beim Start aus den zwei bis vier anwesenden Personen abgeleitet. Der Gastgeber startet die Partie; die Beitrittsreihenfolge bildet die Sitzreihenfolge.
- Nach der Namensauswahl zeigt eine Übersicht wartende und bereits laufende Partien. In eine laufende Partie können nur bisherige Teilnehmer zurückkehren.
- Bisher werden Namen aus einer festen privaten Liste ausgewählt. Wiederbeitritt über denselben Namen erneuert die Sitzung und ihre Zugangskennung. Das ist ein Komfortablauf des privaten Spiels; für eine öffentliche Online-App wäre eine eigenständige Identitätslösung erforderlich.
- Jede Person sieht während der Runde ihre eigene Kartenreihe; die fremden Reihen werden erst beim Rundenabschluss aufgedeckt. Die Reihenfolge des Ziehstapels wird nicht an die Clients ausgeliefert.
- Der Server prüft Sitzung, aktive Person, Spielphase und Aktion und verarbeitet Spielzustände verbindlich. Gleichzeitige Zustandsänderungen werden über einen Versionsvergleich abgefangen.
- Realtime-Nachrichten melden Änderungen; Clients laden danach ihre aktualisierte Spielansicht. Ein periodischer Abgleich alle 15 Sekunden dient nur als Ersatz bei unterbrochener Realtime-Verbindung. Eine Aktivitätsmeldung erfolgt alle fünf Minuten.
- Der Gastgeber startet reguläre Folgerunden. Nach der letzten geplanten Runde stimmt jede Person separat einer Zusatzrunde zu. Erst bei Zustimmung aller startet sie automatisch. Eine Stimme zählt nur einmal; eine Rücknahme ist bisher nicht vorgesehen.
- Nach der letzten geplanten Runde kann jede teilnehmende Person das Endergebnis aufrufen. Dafür ist kein einstimmiges Beenden erforderlich. Nach endgültigem Abschluss gibt es im bisherigen Ablauf keine Fortsetzung derselben Partie.
- Abgeschlossene Partien fließen in eine dauerhafte Statistik ein: Partien, Runden, Siege, Gesamtpunkte sowie Durchschnitt pro Runde und Partie. Bei Gleichstand erhalten alle Partiegewinner einen Sieg. Die bestehende Rangliste wird nach Durchschnitt pro Partie absteigend sortiert; eine zusätzliche Sortierung bei gleichen Werten ist nicht festgelegt.
- Ohne Aktivität aller Geräte wird eine Partie nach 15 Minuten beim nächsten minütlichen Bereinigungslauf entfernt. Abgebrochene Partien werden nicht gewertet. Das bloße Verlassen eines Geräts beendet nicht sofort die Partie für die anderen.
- Wenn eine Person nach dem Verlassen eine neue Partie erstellt und ihre vorherige Sitzung mit übergibt, entfernt die bestehende Anwendung die vorherige Partie vollständig. Dieses Verhalten ist eine private Betriebsentscheidung, keine Spielregel.

Die aktive gezogene Karte ist im bisherigen Online-Zustand technisch Teil der gemeinsamen Antwort, obwohl die Oberfläche sie nur der aktiven Person anzeigt. **Empfehlung für eine neue Online-App:** Auch diesen Kartenwert serverseitig gegenüber anderen Personen verbergen, wenn er verdeckt gezogen wurde. Die Quelle und eine neutrale Zugmeldung dürfen öffentlich bleiben. Nach Austausch oder Ablage gelten die normalen Sichtbarkeitsregeln.

### Lokales Spielen auf einem Gerät

- Die vorhandene lokale Test-App verwendet React Native mit Expo und lokale Speicherung über AsyncStorage. Nach der Installation benötigt der Spielbetrieb weder Internet noch das private Backend.
- Zwei bis vier Personen wählen vorab ihre Namen; die Reihenfolge der Auswahl ist die Sitzreihenfolge. Eine separate Netzwerklobby entfällt.
- Vor jedem Zug erscheint eine blickdichte Übergabeansicht mit dem Namen der nächsten Person. Erst durch ausdrückliches Aufdecken wird deren Kartenreihe sichtbar.
- Nach einem Zugwechsel, beim Fortsetzen eines gespeicherten Spiels und beim Wechsel der App in den Hintergrund wird die Reihe wieder verborgen. Manuelles Verbergen ist ebenfalls möglich.
- Änderungen des Spielzustands werden lokal gespeichert, einschließlich aktiver gezogener Karte und Quelle. Eine unterbrochene Partie kann an derselben Stelle fortgesetzt werden.
- Nach einer Runde sind alle Reihen gemeinsam sichtbar. Die Oberfläche bietet reguläre Folgerunden, Zusatzrunden und das Endergebnis an.
- Zusatzrunden werden in der lokalen Test-App über eine gemeinsame Schaltfläche gestartet. Eine getrennte Abstimmung aller Personen ist dort nicht implementiert.
- Der lokale Prototyp führt keine dauerhafte Statistik über mehrere Partien.
- Das Löschen einer gespeicherten Partie wird ausdrücklich bestätigt. Eine neue Partie startet mit null Gesamtpunkten und null Rundensiegen.

Sichtschutz bedeutet hier Schutz vor versehentlichem Mitlesen in der Oberfläche; eine Verschlüsselung der lokalen Daten ist im Prototyp nicht implementiert.

## 11. Ansichten und Bedienung für die neue App

Der folgende Aufbau bildet die bestehenden Funktionen ab, ohne deren konkrete Gestaltung vorzugeben:

1. **Start:** neue Partie, gespeicherte Partie fortsetzen, Regeln; bei Online-Umfang zusätzlich Beitritt und Partieübersicht.
2. **Vorbereitung:** zwei bis vier Namen und Reihenfolge, Rundenzahl, Mindestfolge. Für die neue öffentliche App freie Namen statt einer fest eingebauten privaten Namensliste vorsehen.
3. **Lobby, falls online:** Code, Beteiligte, Einstellungen und Start durch den Gastgeber.
4. **Geräteübergabe, falls lokal:** Name der aktiven Person und bewusstes Aufdecken.
5. **Spiel:** zehn feste Kartenplätze, klare Beschriftung der Wertungsrichtung, aktive Person, Rundenstand, Gesamtpunkte, verdeckter Vorrat mit Anzahl, oberste Ablagekarte und Bereich für die aktive Karte.
6. **Abschlussentscheidung:** gültige Reihe anmelden oder für Bonus weiterspielen.
7. **Rundenergebnis:** Punkteaufschlüsselung, Gesamtstand, Auswahl aller Kartenreihen und Fortsetzung.
8. **Endergebnis:** sämtliche Partiegewinner, Gesamtpunkte und Beginn einer neuen Partie.

Kartenwerte müssen gut lesbar sein. Farbe oder Position eines Zahlenmarkers können die Größe einer Zahl zusätzlich visualisieren, sind aber niemals regelrelevant. Die bestehende Darstellung nutzt eine vertikale, überlappende Reihe und daneben drei Bereiche für aktive Karte, verdeckten Stapel und Ablage. Eine neue Darstellung darf davon abweichen, wenn die festen Plätze und die Wertungsrichtung eindeutig bleiben.

Nicht verfügbare Aktionen deaktivieren und verständlich begründen: falsche Person am Zug, aktive Karte noch offen, leere Ablage oder nicht erfüllte Abschlussbedingung. Bei aktivierter Mindestfolge soll die benötigte Länge sichtbar sein. Bedienelemente benötigen verständliche Beschriftungen für Screenreader und ausreichend große Berührungsflächen.

## 12. Vorschlag für ein neutrales Datenmodell

Diese Kennungen sind ein Vorschlag für die neue Implementierung, keine Pflicht zur Übernahme bestehender Quelltexte:

```text
GameState
  schemaVersion
  mode: local | online
  status: setup | lobby | playing | round_end | finished
  players: Player[]                    // feste Sitzreihenfolge
  playerCount: 2 | 3 | 4
  totalRounds                         // positive ganze Zahl
  currentRound                        // beginnt bei 1
  directRunRequirement: 0 | 3 | 4
  startingPlayerIndex                  // zufälliger Start der ersten Runde
  turnIndex
  deck: number[]                      // oberste Karte am Arrayende
  discard: number[]                   // oberste Karte am Arrayende
  drawnCard: number | null
  drawnFrom: deck | discard | null
  roundResults: RoundResult[]
  extraRoundVotes: playerId[]          // bei Online-Abstimmung
  gameWinnerIds: playerId[]

Player
  id
  name
  hand: number[10]                    // Speicher- und Wertungsrichtung festlegen
  roundScore
  totalScore
  roundsWon

RoundResult
  playerId
  hand                               // unveränderlicher Stand beim Rundenende
  basePoints
  completionPoints
  bonusPoints
  total
```

Für Online-Spiel kommen Lobbycode, Gastgeberkennung, authentifizierte Sitzungen, Änderungsversionsnummer und Aktivitätszeitpunkt hinzu. Sitzungsgeheimnisse gehören nicht in die öffentliche Spielansicht. Die Version des Speicherformats und die Versionsnummer für gleichzeitige Änderungen erfüllen verschiedene Aufgaben und sollten getrennt benannt werden.

Empfohlene fachliche Aktionen: `createGame`, `startRound`, `drawCard`, `swapCard`, `discardDrawnCard`, `declareCompletion`, `nextRound`, `voteExtraRound`, `finishGame`. Die Engine soll unabhängig von Oberfläche, Speicherung und Netzwerk testbar sein. Anzeigenachrichten werden aus dem Zustand erzeugt und bestimmen nicht die Regeln.

Die Zugphase lässt sich aus `drawnCard` und `drawnFrom` ableiten. Alternativ kann sie ausdrücklich als `before_draw` oder `card_pending` modelliert werden. Ein Dialogzustand gehört in die Oberfläche und ersetzt keine Regelprüfung.

## 13. Invarianten und technische Qualitätsanforderungen

- Während einer laufenden Runde enthält jede Reihe genau zehn Karten.
- Jede Zahl des Kartensatzes liegt genau einmal vor: in einer Reihe, im Ziehstapel, im Ablagestapel oder als aktive Karte.
- Die Gesamtzahl dieser Karten bleibt unverändert. Rundenergebnis-Snapshots sind Kopien zur Anzeige und keine zusätzlichen Spielkarten.
- Eine aktive Karte existiert genau dann, wenn eine Ziehquelle existiert.
- Nach dem Ziehen ist weiteres Ziehen unmöglich, bis Austausch oder zulässige Ablage abgeschlossen ist.
- Offene Karten können ausschließlich durch Austausch verarbeitet werden.
- Ungültige Aktionen verändern weder Karten noch Punkte oder Zugindex.
- Ein Rundenabschluss wird vollständig validiert und genau einmal gewertet. Eine ungültige Abschlussanmeldung zusammen mit einem Austausch darf nicht teilweise angewendet werden.
- Partiestatistiken dürfen auch bei Wiederholung einer Anfrage oder Wiederaufnahme nicht doppelt gebucht werden. Für Online-Spiel ist eine atomare beziehungsweise idempotente Verbuchung vorzusehen; der private Prototyp bucht Statistik und Spielzustand bislang getrennt.
- Der nächste Rundenstart ist nur aus `round_end` erlaubt; der endgültige Abschluss nur nach Erreichen der geplanten Rundenzahl. Die neue Engine soll diese Regeln selbst prüfen, auch wenn die Oberfläche die passenden Schaltflächen bereits begrenzt.
- Personenzahl, ganzzahlige Rundenzahl, Mindestfolge und Platzindizes werden an der Eingabegrenze validiert. Platzindizes liegen zwischen 0 und 9.
- Lokale Spielstände werden nach abgeschlossenen Zustandsänderungen zuverlässig gespeichert. Beim Laden werden Formatversion, Kartenbestand und Zustandskonsistenz geprüft; die neue Umsetzung sollte hier umfassender validieren als der Prototyp.
- Bei Online-Spiel werden vollständige fremde Kartenreihen und die verdeckte Stapelreihenfolge niemals an andere Clients übertragen.

Diese Anforderungen beschreiben robuste Zielbedingungen für die neue App. Sie sind keine Behauptung, dass sämtliche Randfälle bereits im Prototyp abgesichert sind.

## 14. Konkrete Abnahmefälle

Alle Beispielreihen in dieser Tabelle sind in **Wertungsrichtung von vorne nach hinten** angegeben.

| Fall | Erwartetes Ergebnis |
| --- | --- |
| Start mit 2 / 3 / 4 Personen | Jede Person hat 10 Karten; Ziehstapel hat 30 / 30 / 35; Ablage ist leer. |
| Austeilen mit vorgegebenem Kartenstrom | Keine Sortierung; erste erhaltene Karte vorne, letzte hinten bei der beschriebenen bisherigen Speicherung. |
| Startende Person über mehrere Runden | Zufälliger erster Start, danach zyklischer Wechsel unabhängig vom Rundengewinner. |
| Zweites Ziehen bei aktiver Karte | Abgewiesen, Zustand unverändert. |
| Austausch an Platz 4 | Genau dieser Platz wird ersetzt; alte Karte ist neue oberste Ablagekarte. |
| Verdeckte Karte ungenutzt ablegen | Reihe unverändert, Karte oben auf Ablage, nächste Person am Zug. |
| Offene Karte ungenutzt ablegen | Abgewiesen; Karte bleibt aktiv und muss eingebaut werden. |
| Von leerer Ablage ziehen | Abgewiesen. |
| Ziehstapel leer, Ablage `[12, 31, 8]` | `8` bleibt offen liegen; `12` und `31` werden gemischt, davon wird eine Karte gezogen. |
| Ziehstapel leer, höchstens eine Ablagekarte | Kein verdecktes Ziehen; kein Kartenverlust und keine Veränderung. |
| Vollständige Reihe ohne direkte Folge | Abschluss bei Mindestfolge 0; bei 3 oder 4 abgewiesen. |
| Vollständige Reihe mit Dreierfolge | Abschluss bei Mindestfolge 0 oder 3; 125 Siegerpunkte. |
| Vollständige Reihe mit Viererfolge | Abschluss in allen Varianten; 175 Siegerpunkte. |
| Längste direkte Folge 5 / 6 / 7 | Sieger erhält 275 / 475 / 475 Punkte. |
| Zwei getrennte Dreierfolgen | Nur ein Bonus von 50 Punkten für den Rundengewinner. |
| `[3, 8, 12, 10, 17, 23, 29, 35, 42, 49]` | 15 Grundpunkte; kein Abschluss möglich. |
| Erste zwei Karten `[9, 3, ...]` | 5 Grundpunkte. |
| Andere Person hat auch eine vollständige Reihe | 50 Grundpunkte, kein Abschlusszuschlag und kein Folgenbonus. |
| Gültige Reihe, Entscheidung zum Weiterspielen | Runde läuft weiter; nächste Person am Zug. |
| Abschluss außerhalb des eigenen Zuges oder mit aktiver Karte | Abgewiesen, außer als Bestandteil eines zulässigen Austauschs im eigenen Zug. |
| Gültiger Rundenabschluss | Sofortige gemeinsame Auswertung; keine weiteren Züge; Punkte nur einmal addiert. |
| Folgerunde | Neuer vollständiger Satz, neue Hände, leere Ablage; Gesamtpunkte bleiben erhalten. |
| Online-Zusatzrunde | Start erst nach eindeutiger Zustimmung aller; doppelte Stimme zählt nicht. |
| Gleichstand am Partieende | Alle Personen mit höchster Punktzahl als Gewinner anzeigen. |
| Lokale Wiederaufnahme mitten im Zug | Identische aktive Karte, Quelle und Reihen; zunächst blickdichte Übergabeansicht. |
| App geht in den Hintergrund | Eigene Reihe wird vor der Rückkehr verborgen. |

## 15. Auftrag für das neue leere Projekt

Dieses Dokument als fachliche Ausgangsbasis verwenden. Eine neue eigenständige App mit neuem Namen, eigenen Texten, Gestaltung, Symbolen, Paketkennungen und Speicherkennungen entwickeln. Die private Online-Anwendung bleibt unabhängig bestehen.

Zuerst die Betriebsarten der ersten Version festlegen. Anschließend die neutrale Regelengine samt Abnahmefällen umsetzen, darauf Spielansichten und Speicherung aufbauen und zuletzt den gewählten Online-Umfang ergänzen. Die bestehenden Spielregeln nicht stillschweigend verändern: Insbesondere leere Anfangsablage, feste Kartenplätze, Leserichtung, Pflicht zum Einbauen offener Karten, freiwilliger Rundenabschluss und Siegerbonus müssen erhalten bleiben.

Installierbare Android- und iOS-Versionen sind das Entwicklungsziel. App-Store-Auftritt, endgültige Produktidentität und Veröffentlichung sind nachgelagerte Arbeiten; dieses Dokument beschreibt keine bereits abgeschlossene Store-Freigabe.
