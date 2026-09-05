# Vokabeltrainer – kurze Lernrunden

Statischer Englisch-Vokabeltrainer für Jahrgang 6, 9, 10 und Oberstufe. Die HTML-Seiten behalten ihre Vokabeldaten und ihre bestehenden lokalen Fortschrittsschlüssel. `assets/learning.js` und `assets/learning.css` ergänzen alle vier Trainingsseiten gemeinsam.

## Änderungen

- Direkter Einstieg in die Units, ohne erneute Jahrgangsauswahl.
- „Heute lernen“: bis zu zehn Wörter, bereits bearbeitete fällige Wörter vor neuen Wörtern.
- Je unsicherem oder falschem Wort höchstens eine Wiederholung nach drei anderen Karten oder am Rundenende; maximal 20 Antworten bei zehn Wörtern.
- Eingaben bleiben sichtbar; Unterschiede zur nächstliegenden Lösung werden markiert. Komma-, Semikolon- und Schrägstrich-Varianten sowie optionale Wortteile werden berücksichtigt.
- Objektiv falsche Antworten können nicht als gewusst weitergestuft werden. Höchstens eine Beförderung pro Wort und Runde; nach einem Fehler bleibt es in dieser Runde in Fach 1.
- Übersichtlicheres Layout, größere Bedienelemente und aufklappbare Lernfächer.
- Nicht vorhandene Jahrgänge von der Startseite entfernt. Wiederholungsintervalle an die Anleitung angeglichen: sofort / 1 / 2 / 4 / 8 Tage. Bereits gespeicherte Fälligkeiten werden nicht nachträglich verändert.

## Starten und prüfen

Die Ordnerstruktur inklusive `assets/` vollständig beibehalten. Zum lokalen Start beispielsweise `python3 -m http.server 8765`, danach http://localhost:8765 öffnen. Für GitHub Pages die fünf HTML-Seiten und `assets/` gemeinsam übernehmen; die Sites-Konfiguration ist dafür nicht erforderlich.

`npm ci` installiert nur die Entwicklungsabhängigkeit für die Tests. `npm test` prüft die vier Varianten mit einem simulierten Dokument und Speicher. `npm run build` erzeugt `dist/` und prüft JavaScript-Syntax und lokale Verweise. Der Trainer selbst braucht keine installierten Pakete.

## Noch offen

- Sichtprüfung und Bedienprobe auf echten Handys, insbesondere Bildschirmtastatur und Aussprache.
- Vollständige sprachliche Prüfung der Vokabeldaten und Sonderformen. Die Antwortprüfung ist regelbasiert; freie Synonyme werden nicht automatisch verstanden.
- Die bestehende automatische Lückenerkennung bleibt bestehen und sollte gesondert überarbeitet werden.
- Zusätzliche Funktionen wie Testvorbereitung, teilbare Lernaufträge und Vokabelimport sind noch nicht umgesetzt.
- Veröffentlichung der Änderungen im ursprünglichen GitHub-Repository.

Die private Sites-Vorschau liegt auf einer anderen Adresse. Der Lernstand der bisherigen GitHub-Seite erscheint dort deshalb nicht automatisch; er kann über „Fortschritt sichern/laden“ übertragen werden.
