# Requirements-Spezifikation – Ramifold

| Feld | Wert |
|---|---|
| Projekt | Ramifold (https://github.com/MarloNET/Ramifold) |
| Dokument | Paperclip-Dokument `requirements` (veröffentlicht als `docs/product/requirements.md`; Quelle: Revision 4 (`6675d6be-9991-45e3-9b23-3a285378e57b`) von MAR-1359) |
| Dokumentversion | v0.4 (freigegeben, Revision 4) |
| Status | approved |
| Autor | Business Analyst (MarloNET) |
| Datum | 2026-11-24 |
| Aktueller Slice | 0.1 |
| Prozessstufe | Voll |
| Freigegebener Product Brief | v0.2, `docs/product/product-brief.md`, Commit `af886be`; Paperclip-Dokument `product-brief` Revision 2 (`3d96968f-dc40-49a1-b332-629737f17265`); Freigabe MAR-1352, Karte b59fd0e5 |
| Marktrecherche (nicht bindend) | `docs/product/product-research.md` v0.2 |
| Frühere Requirements | keine (erster Slice) |
| Review | Runde 1: `changes_requested` (MAR-1361, Dokument `review` Revision `eb53561f-bc74-4199-8f7f-94f2c9fe0cda`, geprüft v0.2); Runde 2: `changes_requested` (MAR-1364, Dokument `review` Revision `884077a2-4145-4b08-bfe1-a405f9d1c6dd`, geprüft v0.3); Runde 3 (Delta): `pass` (MAR-1367, 4 minor Findings FIND-020 bis FIND-023, keine blocker oder major) |
| Menschliche Freigabe | approved durch den Owner am 2026-11-24 (Gate „Was“ Slice 0.1, MAR-1355; Freigabe-Karte 6b0c78dc, Annahmen- und Entscheidungskarte 9e8a4c82: Annahmen 2 bis 6 „Stimmt“, Annahme 1 durch Owner-Kommentar auf MAR-1355 bestätigt, OQ-09 = a) alle drei bleiben als „Should“) |
| UI/UX-Klassifizierung Slice 0.1 | Material (Empfehlung Product Owner, MAR-1368; vom Owner bestätigt) |

## Freigabe-Briefing

### Kurzfassung
Slice 0.1: Du planst ein Vorhaben als Baum mit einem KI-Chat je Knoten über dein Claude Code, legst Ergebnisse selbst fest und exportierst den Plan als Markdown in deinen Projektordner. Die KI recherchiert und liest, ändert aber nichts; Ramifold speichert alles in einem eigenen Unterordner, Chats per Voreinstellung nicht in Git. Über drei „Should“-Ergänzungen jenseits des Briefs entscheidest du. Bei Git, zwei Rechnern und mehreren Fenstern lehnt Ramifold im Zweifel ab, statt still zu überschreiben.

### So haben wir dich verstanden
| Deine Vorgabe (Quelle) | Unsere Auslegung | Beispiel |
|---|---|---|
| „Projektordner beim Start angeben“ (Brief 9) | Ordner beim Startbefehl angeben, sonst gilt der aktuelle Ordner (REQ-001) | `ramifold ~/code/rag-projekt` und `cd ~/code/rag-projekt && ramifold` öffnen dasselbe Repo (Befehlsname nur als Beispiel). |
| „Anzeige, was die KI bekommt“ (Brief 9) | Der vollständige Text, den Ramifold mitgibt; nicht, was Claude Code selbst ergänzt, z. B. deine `CLAUDE.md` (REQ-036) | Für 2.2: Auftrag und Ergebnis von Wurzel und 2, Titel und Auftrag von 2.1 und 2.3, nichts aus anderen Chats. |
| Kontext „nach oben“ (Brief 5) | Nur **festgelegte Pläne** der **direkten** Kinder fließen hoch; andere Kinder nur mit Titel, Auftrag und „noch nicht festgelegt“ (REQ-033) | 2.2 festgelegt, 2.1 Konzept: 2 kennt den Plan von 2.2, von 2.1 nur Titel und Auftrag; 2.2.1 nur über 2.2. |
| „Hinweis, wenn ein Kind neu festgelegt wurde“ (Brief 9) | Am Elternknoten, wenn ein direktes Kind **nach** dessen letztem Speichern festgelegt wurde; verschwindet beim Neuspeichern (REQ-046) | 2 am Montag gespeichert, 2.2 am Dienstag festgelegt → 2 zeigt „2.2 Embedding-Modell“, die Wurzel nichts. |
| „Auf derselben Ebene sortieren“ (Brief 9) | Reihenfolge unter Kindern **desselben** Elternknotens; anderer Elternknoten = Verschieben (0.2) (REQ-014) | 2.3 „Reranking“ nach vorn → heißt 2.1, sein Chat bleibt. 1.1 unter 2 setzen geht nicht. |
| „Export … als Markdown“ (Brief 9) | Ein Dokument je Vorhaben mit allen Knoten (Nummer, Titel, Auftrag, Status, Ergebnis), ohne Chats, mit Git versioniert; jeder Export ersetzt den vorigen (REQ-049) | Darin „2.1 Chunking – Concept“; du sagst Claude Code: „Setze den Plan in dieser Datei um.“ |

### Kritische Annahmen – bitte einzeln bestätigen
1. **Annahme:** Die KI im Knoten darf in 0.1 nur im Web recherchieren und Dateien im Projektordner lesen. Ändernde und ausführende Werkzeuge sind gesperrt, deine eigenen Skills und MCP-Server in Claude Code werden nicht zugesichert.
   *Beispiel:* Die KI beantwortet „Welche Embedding-Modelle sind aktuell?“ mit Quellen und „Was steht in unserer README?“, kann aber nicht `npm test` ausführen.
   **Wenn falsch:** Sollen eigene Skills oder Befehle laufen, muss „KI ändert nichts“ technisch anders gelöst werden; nach dem Bau teuer. (REQ-022 bis REQ-025, A-01)
2. **Annahme:** Ramifold schreibt nur in einen eigenen Unterordner deines Projektordners: Baum, Aufträge, Ergebnis-Versionen, Chats, Export, Fehlerprotokoll und deine Bestätigung des Datenabfluss-Hinweises. Mit Git versioniert werden Baum, Ergebnisse und Export, Chats per Voreinstellung nicht, Fehlerprotokoll und Bestätigung nie. Ist der Unterordner nicht beschreibbar, steht ein Fehler nur in Meldung und Terminal.
   *Beispiel:* Nach einem Tag Planung zeigt `git status` nur Änderungen im Ramifold-Unterordner, keine Chats. Wer dein Repo klont, sieht den Datenabfluss-Hinweis selbst.
   **Wenn falsch:** Export als `PLAN.md` im Wurzelordner oder Fehlerprotokoll im Home-Verzeichnis sind leicht änderbar; Chats grundsätzlich im Repo ändern eine Leitplanke des Briefs. (REQ-030, REQ-049 bis REQ-052, REQ-063, A-02)
3. **Annahme:** Ein Chat gehört zu genau einem Knoten und wird von Ramifold vollständig im Projektordner gespeichert, unabhängig von Claude Code. Kann Claude Code ein Gespräch nicht fortsetzen, startet Ramifold eine neue Sitzung mit dem bisherigen Verlauf.
   *Beispiel:* Du klonst das Repo mit Chats auf den zweiten Rechner: Der Chat von 2.2 ist lesbar, die KI kennt die frühere Diskussion.
   **Wenn falsch:** Lägen Chats nur bei Claude Code, gingen sie bei Sitzungsverlust oder Rechnerwechsel verloren; später hieße das, alle Chats zu migrieren. (REQ-018, REQ-029, REQ-065, A-03)
4. **Annahme:** Ein Projektordner kann mehrere Vorhaben enthalten, jedes Vorhaben gehört zu genau einem Projektordner. Je Projektordner läuft Ramifold nur einmal; mehrere Browser-Fenster sind erlaubt.
   *Beispiel:* In `~/code/rag-projekt` liegen „Eigenes produktives RAG“ und „Monitoring-Konzept“. Ein zweiter Start dafür meldet die Adresse des laufenden Ramifold.
   **Wenn falsch:** Soll ein Vorhaben mehrere Repos umfassen (z. B. Frontend und Backend), passt die Ablage nicht; später teuer zu ändern. (REQ-006, REQ-070, REQ-071, A-04)
5. **Annahme:** Ist dein Abo-Login für ein veröffentlichtes Werkzeug nicht zulässig, heißt der „API-Key-Weg“ aus Brief Abschnitt 7: Claude Code bleibt die Anbindung und meldet sich per API-Key an. Ramifold spricht in 0.1 nie selbst mit dem KI-Anbieter; das kommt mit „Planen ohne Coding-Agent“ in 0.5.
   *Beispiel:* Du meldest Claude Code per API-Key statt Abo an; alles funktioniert wie vorher, nur die Abrechnung ändert sich.
   **Wenn falsch:** Muss Ramifold direkt mit dem KI-Anbieter sprechen, fehlen Werkzeuge und Sitzungen von Claude Code; REQ-022 bis REQ-024, REQ-029, REQ-061 und LP-04 ändern sich, ein Teil von 0.5 rückt vor. (Abschnitt 11, OQ-01, A-12)

### Weitere Annahmen
- **Ebenfalls kritisch:** Dein Rechner wird nur von dir benutzt. Ramifold ist nur lokal erreichbar und schützt sich gegen fremde Webseiten, nicht gegen andere Benutzerkonten. *Beispiel:* Ein Kollege im WLAN kommt nicht an Ramifold, ein anderes Konto auf demselben Linux-Server schon. Wenn falsch, braucht 0.1 einen Zugangsschutz (REQ-057, REQ-058, A-05).
- Höchstens etwa 200 Knoten, 6 Ebenen, 200 Nachrichten pro Chat; das RAG-Vorhaben hat 15–40 Knoten (REQ-053).
- Keine gesetzliche Barrierefreiheitspflicht, daher nur ausgewählte Kriterien von WCAG 2.2 AA (REQ-062); Linux (Ubuntu 24.04 LTS) und macOS, Browser ab 1280 Pixel Breite (REQ-066, REQ-067).

### Entscheidungen der Agenten
| Entscheidung | Verworfene Alternative | Warum | Umkehrbar |
|---|---|---|---|
| **Über den Brief hinaus:** schrittweise Anzeige, Abbrechen, Lesebeschränkung auf den Projektordner als „Should“ (REQ-020, REQ-021, REQ-025; OQ-09) | Nur den Brief umsetzen | siehe „Deine Entscheidungen“ | leicht |
| Ändert sich ein Vorhaben von außen, während Ramifold läuft (`git pull`, `git checkout`, Bearbeiten von Hand), speichert Ramifold darin nichts mehr, meldet Stelle und Ursache, deine Eingabe bleibt stehen; nach einem Neustart siehst du den neuen Stand (REQ-074) | Keine Erkennung; du beendest Ramifold vor jedem `git pull` (bisher Annahme A-13) | Kein stiller Datenverlust bei zwei Rechnern. *Beispiel:* Ramifold läuft seit Montag auf dem Laptop; am Mittwoch holst du dort per `git pull` den festgelegten Plan von 2.2 vom Desktop und speicherst dann das Konzept von 2 → Ramifold lehnt ab, statt 2.2 still zurückzusetzen. | vor dem Bau leicht: Verzicht spart die Erkennung in jedem Speicherweg, macht aber „kein `git pull` bei laufendem Ramifold“ zur kritischen Annahme; nachrüsten ist teuer |
| Höchstens eine KI-Anfrage gleichzeitig, über Knoten und Fenster hinweg (REQ-069, A-09) | Parallele Anfragen | *Beispiel:* 2.2 recherchiert → eine Frage in 3.1 wird abgewiesen und bleibt im Eingabefeld. | leicht |
| Zweiter Start für denselben Ordner wird abgelehnt. Zwischen Fenstern gilt das zuletzt Gespeicherte; ein Ergebnis bearbeitest du nur in einem Fenster zur gleichen Zeit, andere zeigen es nur lesend; Aktionen auf gelöschte Knoten werden abgelehnt, deine Eingabe bleibt (REQ-070, REQ-071) | Zweiten Start zulassen; nur ein Fenster; paralleles Bearbeiten | Keine Eingabe geht ohne Meldung verloren. *Beispiel:* In Fenster A ergänzt du bei 2.2 „BM25 als Fallback“, ungespeichert; in B ist 2.2 nur lesbar, mit Hinweis. Löschst du in A Knoten 2.3 und speicherst in B dessen Ergebnis, lehnt Ramifold ab. | mittel |
| Ungespeicherte Ergebnisentwürfe überstehen den Knotenwechsel, nicht das Beenden; deine Bearbeitung gehört zum Fenster, ein Entwurf der KI zur ganzen Instanz. Eine neue Zusammenfassung ersetzt einen Entwurf nur nach Bestätigung und erst, wenn der neue da ist (REQ-073) | Beim Knotenwechsel verwerfen; schon mit der Bestätigung ersetzen | *Beispiel:* Entwurf von 2 zehn Minuten überarbeitet, neue Zusammenfassung bestätigt, Abbruch nach 30 s („usage limit reached“) → deine Fassung ist noch da. Ein ungespeichert geschlossenes Fenster verliert deine Bearbeitung, nicht den Entwurf der KI. | leicht |
| Ein nicht lesbares Vorhaben wird gesperrt, nicht verändert; andere bleiben nutzbar (REQ-072) | Teilweise öffnen; reparieren | *Beispiel:* Konfliktmarker nach `git pull` im RAG-Vorhaben → Meldung mit Stelle und Ursache; „Monitoring-Konzept“ öffnet normal. | leicht |
| „Chats eingeschlossen“ geht mit dem Repo, die Bestätigung des Datenabfluss-Hinweises nicht (REQ-030, REQ-051) | Beides mit dem Repo oder beides lokal | *Beispiel:* Wer dein Repo mit eingeschlossenen Chats klont, hat auch seine Chats in `git status`, sieht den Hinweis aber selbst. | leicht |
| Löschen ist endgültig, nach einer Warnung mit Zahlen (REQ-015); Aufträge werden nicht versioniert, nur Ergebnisse (REQ-013) | Papierkorb oder Rückgängig; Aufträge versionieren | Slice klein halten; Git-Historie als Rückhalt. *Beispiel:* „Deletes 4 nodes, 3 chats and 1 fixed plan“; wird „Retrieval planen“ zu „Hybrid-Retrieval planen“, steht der alte Auftrag nur in der Git-Historie. | mittel |
| Kleinere Regeln, u. a.: Abweisungen nur als Meldung, abgelehnter zweiter Start nur im Terminal, nichts davon im Fehlerprotokoll (REQ-063) | Jeweils das Gegenteil | siehe Lesetipps | leicht |

### Bewusst nicht enthalten
- **Verschieben**, **Dazwischen einfügen**, **Verweise** (`#2.3.1`), **Abhängigkeiten** → 0.2. *Beispiel:* Wer 2.3 neu anlegt statt verschiebt, verliert dessen Chat.
- **Versionen anzeigen, Benachrichtigungen, Änderungsabgleich** → 0.3; Versionen werden schon gespeichert.
- **Werkzeuganzeige**, **Markierung im Baum** für den Rückfluss-Hinweis → später. *Beispiel:* Du siehst Quellen in der Antwort, aber keine Liste der Suchen. Ebenso später: parallele KI-Anfragen, mehrere Chats pro Knoten, Material, Änderungsvorschläge der KI; 0.4: Tickets; 0.5: ohne Coding-Agent, Windows.
- **Kein** Löschen ganzer Vorhaben, kein sofortiger Abgleich zwischen Fenstern, keine Reparatur nicht lesbarer Vorhaben, kein Übernehmen von Änderungen von außen ohne Neustart.

### Was sich geändert hat
Erstfassung. Product Owner und unabhängige Requirements Reviews haben das Dokument intern geprüft; alle Befunde sind eingearbeitet (Abschnitt 15).

### Deine Entscheidungen
1. **Sollen die drei Ergänzungen über den Brief hinaus in 0.1 bleiben?** (REQ-020, REQ-021, REQ-025; OQ-09; wird mit der Freigabe ausdrücklich abgefragt)
   - *Schrittweise Anzeige:* Eine Recherche dauert 2–3 Minuten; du siehst nach Sekunden, ob die KI falsch sucht.
   - *Abbrechen:* Nach 20 Sekunden fällt dir auf, dass „nur Open Source“ fehlt → abbrechen spart Minuten und Nutzungslimit.
   - *Lesebeschränkung:* Die KI soll nicht `~/.aws/credentials` oder ein anderes Repo lesen und an Anthropic schicken; ob das verlässlich geht, prüft der Software Architect (OQ-08).
   - Optionen: **a) alle drei bleiben** als „Should“ · b) einzelne bleiben (bitte nennen) · c) alle drei auf später. **Empfehlung: a)**: Web-Recherche ist Erfolgskriterium von 0.1; die Lesebeschränkung schützt deine Daten (GOAL-06).
2. Nicht blockierend: Lizenz und Budget (OQ-02, OQ-03). Die Nutzungsbedingungen prüft der Software Architect (OQ-01); nur wenn auch die API-Key-Anmeldung nicht zulässig ist, kommt die Frage zu dir.

### Lesetipps
- Abschnitt 5.2: Fehlt für 0.1 etwas, oder ist zu viel drin?
- REQ-031 bis REQ-036: Kontextregeln, der Kern des Produkts.
- REQ-049 bis REQ-052, REQ-063, Abschnitt 9: was in deinem Repo landet und was protokolliert wird.
- REQ-070 bis REQ-074: zweiter Start, mehrere Fenster, nicht lesbare Daten, Ergebnisentwürfe, Änderungen von außen.
- Abschnitt 14 und kleinere Regeln: Klappzustand nicht gespeichert (REQ-009), Vorschläge und Zusammenfassungen nicht im Chat (REQ-037, REQ-041), Export auch mit offenen Knoten (REQ-049).

---

## 1. Zusammenfassung

Ramifold Slice 0.1 ist ein lokales Open-Source-Werkzeug, mit dem ein einzelner Entwickler ein mehrstufiges Software-Vorhaben als Baum plant, in dem jeder Knoten genau einen Chat mit der KI über Claude Code hat, Ergebnisse selbst festlegt und den Gesamtplan als Markdown-Dokument im Projektordner an den eigenen Coding-Agenten weitergibt. Erster Nutzer ist der Owner, der damit das Vorhaben „Eigenes produktives RAG“ und ein zweites echtes Vorhaben vollständig plant. Jetzt, weil der Prototyp die Kernannahme bestätigt hat (Product Brief v0.2, Abschnitt 9) und der Owner das Werkzeug im Alltag nutzen will.

## 2. Kontext und Problem

Planung verzweigt sich wie ein Baum, KI-Chats sind linear. Wer heute ein mehrstufiges Vorhaben mit einer KI plant, hat entweder einen langen, verwässerten Chat (Context Rot) oder viele neue Chats, in denen der Kontext immer wieder neu erklärt werden muss; die Ergebnisse werden am Ende von Hand zusammengeführt, und nach Änderungen ist der Plan inkonsistent (Brief Abschnitt 2). Heutige Alternativen (Plan-Modus des Coding-Agenten, verzweigbare Chats, Spec-Tools, Hamster, manuelle Markdown-Dokumente) liefern entweder einen flachen Plan pro Sitzung oder vererben ganze Chats statt Ergebnissen (Brief Abschnitt 3).

Ein Wegwerf-Prototyp (Branch `prototype/ramifold-planungsbaum`, Commit `673649c`) hat gezeigt, dass Planen im Baum mit Ergebnis-Vererbung für den Owner funktioniert; sein Code wird nicht übernommen. Slice 0.1 baut den bestätigten Kern als nutzbares Produkt.

## 3. Stakeholder und Nutzer

| Stakeholder | Bedarf an das System |
|---|---|
| **Planer** (Owner als erster Nutzer; Rolle siehe 10.3) | Vorhaben als Baum anlegen und bearbeiten; je Knoten einen Chat, der den Kontext von oben kennt; Ergebnisse prüfen und selbst festlegen; den ganzen Plan als Datei für den Coding-Agenten; Kontrolle über Daten und Änderungen. |
| **KI im Knoten** (Systemakteur über Claude Code) | Den aktuellen Kontext des Knotens bei jeder Anfrage; Lesezugriff auf Web und Projektordner; keine Möglichkeit, etwas zu ändern. |
| **Coding-Agent des Planers als Leser** (in 0.1 Claude Code, liest die Exportdatei wie jede andere Datei) | Einen vollständigen, gegliederten Plan als Markdown-Datei im Projektordner, mit erkennbarem Status je Punkt. |
| **Künftige Open-Source-Nutzer** (sekundär, nach Veröffentlichung) | Installation und Start mit einem Befehl auf Linux und macOS; englische Oberfläche; klarer Hinweis auf den Datenabfluss an den KI-Anbieter. |
| **KI-Anbieter** (Anthropic, Betreiber von Claude Code; externe Partei) | Nutzung im Rahmen seiner jeweils gültigen Nutzungsbedingungen (Randbedingung, Abschnitt 11). |

## 4. Ziele und Nicht-Ziele

**Ziele** (aus Product Brief v0.2, Abschnitt 4; Spalte „Slice 0.1“ zeigt, ob der Slice das Ziel bedient):

| ID | Ziel | Slice 0.1 |
|---|---|---|
| GOAL-01 | Ein Entwickler plant ein mehrstufiges Vorhaben, ohne Kontext neu erklären oder Ergebnisse von Hand zusammenführen zu müssen. | ja |
| GOAL-02 | Jeder Planungspunkt trennt Brainstorming (Chat) von Entscheidung (festgelegter Plan); der Gesamtplan ist nachvollziehbar. | ja |
| GOAL-03 | Der Plan bleibt bei Änderungen konsistent: Betroffene Punkte werden erkannt und abgeglichen. | teilweise: nur der Rückfluss-Hinweis am Elternknoten (REQ-046); Abgleich in 0.3 |
| GOAL-04 | Der fertige Plan fließt ohne Medienbruch in die Umsetzung (Dateien im Repo, Coding-Agent, Tickets). | ja (Markdown-Export); Tickets und direktes Lesen in 0.4 |
| GOAL-05 | Die KI im Knoten kann die Tools und Skills nutzen, die der Nutzer aus seinem Coding-Agenten kennt (z. B. Web-Recherche). | ja, beschränkt auf Web-Recherche und Lesen im Projektordner (A-01) |
| GOAL-06 | Der Nutzer behält die Kontrolle über seine Daten und seinen Plan: Open Source, lokal, keine Ramifold-Cloud, keine Änderung ohne seine Bestätigung. | ja |

**Erfolgskriterium nach Slice 0.1** (Brief Abschnitt 11): Der Owner plant mindestens zwei echte Vorhaben mit Ramifold und gibt den Plan direkt an Claude Code weiter, ohne manuelles Zusammenführen, nutzt mindestens einmal Web-Recherche im Knoten und legt jedes Ergebnis selbst fest.

**Nicht-Ziele** (Brief Abschnitt 4, produktweit): Ramifold setzt nicht selbst um (kein Agent-Framework, keine Orchestrierung); kein Projektmanagement-Tool; kein eigenes Spec-Framework; kein SaaS, keine Benutzerkonten; keine Echtzeit-Zusammenarbeit (Teilen höchstens über Git); weitere Profile erst, wenn sich das Software-Profil bewährt hat.

## 5. Umfang und produktweite Leitplanken

### 5.1 Produktweite Leitplanken

Formale Fassung von Brief Abschnitt 7. Sie gelten für alle Releases; Änderungen erfordern zuerst eine Revision des Product Brief.

| ID | Leitplanke | Wirkt in |
|---|---|---|
| LP-01 | **Mandanten:** Einzelnutzer-Werkzeug; keine Mandanten, keine Benutzerkonten, keine Anmeldung bei Ramifold. | 10.3, REQ-057 |
| LP-02 | **Betrieb und Daten:** Ramifold läuft lokal auf dem Rechner des Planers. Baum, Aufträge, Ergebnisse, Chats (und später Material) liegen im Projektordner des Planers. Ramifold betreibt keinen Server und speichert nichts zentral. | REQ-052, REQ-061 |
| LP-03 | **KI ändert nichts ohne Bestätigung:** Die KI im Knoten liest (Projektordner, Web), verändert aber weder den Plan (Knoten, Aufträge, Ergebnisse) noch Dateien des Projekts ohne ausdrückliche Bestätigung des Planers. In 0.1 hat die KI gar keine ändernden Werkzeuge; Änderungen am Plan entstehen nur durch Aktionen des Planers. | REQ-024, REQ-039, REQ-042 |
| LP-04 | **KI-Anbindung:** zuerst über den Coding-Agenten des Planers, damit dessen Tools erhalten bleiben; in Slice 0.1 nur Claude Code; weitere Coding-Agenten und eigener API-Key später (0.5). Der technische Anbindungsweg ist nicht Gegenstand dieser Requirements; zum „API-Key-Weg“ als Rückfallebene in 0.1 siehe A-12. | REQ-017, OQ-01, A-12 |
| LP-05 | **Nutzungsbedingungen:** Die Anbindung muss den aktuell gültigen Nutzungsbedingungen des Anbieters entsprechen; keine Abhängigkeit von einer Grauzone. Prüfung durch den Software Architect in Gate „Wie“ von Slice 0.1. | Abschnitt 11, OQ-01 |
| LP-06 | **Personenbezogene Daten:** Ramifold verarbeitet bewusst keine. Inhalte gehen über den Coding-Agenten an dessen KI-Anbieter; darauf weist Ramifold klar hin. Ramifold legt keine Zugangsdaten im Projektordner ab. | REQ-030, REQ-059 |
| LP-07 | **Chats im Git-Repo:** Baum, Aufträge, Ergebnisse und Export werden mit dem Repo versioniert; Chats per Voreinstellung nicht. Der Planer kann Chats bewusst einschließen. | REQ-050, REQ-051 |
| LP-08 | **Plattformen:** Desktop-Rechner, Bedienung im Browser am PC, kein Smartphone. Slice 0.1: Linux und macOS; Windows ab 0.5. | REQ-066, REQ-067, 10.2 |
| LP-09 | **Sprachen:** Oberfläche Englisch; die KI antwortet in der Sprache des Planers. Weitere Oberflächensprachen später. | REQ-027, REQ-068, 10.5 |
| LP-10 | **Lizenz:** Open Source; welche Lizenz, ist offen (OQ-02). | Abschnitt 11 |
| LP-11 | **Recht:** voraussichtlich kein Hochrisiko-System nach EU AI Act (keine Rechtsprüfung erfolgt). | Abschnitt 11 |
| LP-12 | **Budget und Zeit:** offen (OQ-03); die Zeit des Owners ist knapp. | Abschnitt 11 |
| LP-13 | *Entfallen (v0.3, FIND-014):* „Installation und Start mit je einem Befehl“ steht im Brief nicht in Abschnitt 7, sondern im Querschnitt von Slice 0.1 (Brief 9); es ist deshalb keine produktweite Leitplanke, sondern Anforderung von Slice 0.1 (REQ-066, 5.2 Querschnitt). Die ID wird nicht wiederverwendet. | – |

### 5.2 Umfang dieses Slice

- **Slice:** 0.1
- **Nutzerziel:** Der Owner plant das Vorhaben „Eigenes produktives RAG“ und ein zweites echtes Vorhaben vollständig in Ramifold und gibt den exportierten Plan an Claude Code weiter, ohne Kontext neu zu erklären oder von Hand zusammenzuführen.
- **Enthaltene Abläufe** (Brief Abschnitt 9):
  1. Projektordner beim Start angeben; Vorhaben anlegen und öffnen; Baum anzeigen, navigieren, Knoten ein- und ausklappen (REQ-001 bis REQ-010, REQ-070).
  2. Baum bearbeiten: Knoten anlegen, umbenennen, Auftrag ändern, unter Geschwistern sortieren, löschen mit Warnung (REQ-011 bis REQ-016).
  3. Ein Chat pro Knoten über Claude Code mit Web-Recherche und Lesen im Projektordner (REQ-017 bis REQ-030, REQ-069).
  4. Kontextregeln nach unten, im Knoten und nach oben; Anzeige, was die KI bekommt (REQ-031 bis REQ-036).
  5. KI schlägt Unterpunkte mit Auftrag vor; übernehmen, ändern, verwerfen (REQ-037 bis REQ-040).
  6. Konzept und festgelegter Plan; KI fasst zusammen; Rückfluss in den Elternknoten mit Hinweis (REQ-041 bis REQ-046, REQ-073).
  7. Markdown-Darstellung in Chats und Ergebnissen; Export des ganzen Baums als Markdown-Dokument im Projektordner (REQ-048, REQ-049).
- **Fundament:**
  - Fachliche Basis: Vorhaben, Knoten mit stabiler Identität, Chat, Ergebnis mit Versionen; Ablage, die spätere Objekte ohne Datenverlust erlaubt (REQ-016, REQ-045, REQ-052, REQ-065).
  - Rollen und Zugang: ein lokaler Planer, kein Konto, nur lokal erreichbar (10.3, REQ-057, REQ-058).
  - Fehlerfälle: Claude Code fehlt oder nicht angemeldet (REQ-004); Projektordner fehlt oder nicht beschreibbar (REQ-002, REQ-003); Antwort bricht ab (REQ-028); Sitzung des Coding-Agenten verloren, Chat bleibt erhalten (REQ-029); versehentliches Löschen eines Knotens mit Kindern (REQ-015). Zusätzlich geregelt: zweiter Start für denselben Projektordner und mehrere Browser-Fenster (REQ-070, REQ-071), nicht lesbare Daten eines Vorhabens (REQ-072), Änderung von außen während des Betriebs, z. B. durch `git pull` (REQ-074).
  - Querschnitt: Hinweis auf Datenabfluss (REQ-030); Chats per Voreinstellung nicht im Repo (REQ-050); KI ändert nichts (REQ-024); höchstens eine KI-Anfrage gleichzeitig (REQ-069); Nutzungsbedingungen (Abschnitt 11, OQ-01, A-12); Installation und Start mit je einem Befehl auf Linux und macOS (REQ-066; Anforderung von Slice 0.1, keine produktweite Leitplanke).
- **Ergänzungen über den Brief hinaus** (Priorität Should; in Brief Abschnitt 9 nicht genannt; ob sie in 0.1 bleiben, entscheidet der Owner, OQ-09): Antwort schrittweise anzeigen (REQ-020), KI-Anfrage abbrechen (REQ-021), Lesezugriff auf den Projektordner beschränken (REQ-025). Das Must-Set erreicht das Nutzerziel auch ohne sie.
- **Bewusst noch nicht enthalten:** siehe Abschnitt 14 (mit Zielslice).

### 5.3 Roadmap-Ausblick

| Release | Nutzerziel (Brief Abschnitt 8) |
|---|---|
| 0.2 | Abhängigkeiten quer im Baum abbilden und sehen, worauf ein Punkt wartet; im Chat auf andere Knoten verweisen; Baum umbauen (verschieben, dazwischen einfügen), ohne Chats zu verlieren. |
| 0.3 | Einen Plan ändern und bei allen betroffenen Punkten mit Vorher/Nachher und KI-Einschätzung zum Abgleich geführt werden. |
| 0.4 | Der Coding-Agent liest den Plan beim Umsetzen direkt; Tickets oder Spec-Tool-Formate erzeugen. |
| später (Zuschnitt durch Product Owner) | Mehrere Chats pro Knoten, Material am Knoten, Änderungsvorschläge der KI mit Bestätigung, Projektordner in der Oberfläche wählen. |
| 0.5 | Planen ohne Coding-Agent mit eigenem API-Key, auch vollständig lokal; weitere Coding-Agenten; Windows. |
| später | Weitere Profile (z. B. Forschungsprojekt, Event), auch aus der Community. |

## 6. Funktionale Anforderungen

**Begriffe** (einmal definiert, im ganzen Dokument gleich verwendet):

| Begriff | Bedeutung |
|---|---|
| Planer | Der einzige menschliche Nutzer (Rolle, 10.3). |
| KI | Kurzform für „KI im Knoten“: das Sprachmodell, das über den Coding-Agenten in einem Knoten antwortet (Systemakteur, 10.3). |
| Coding-Agent | Das Agent-Werkzeug des Planers, über das die KI läuft; in Slice 0.1 ausschließlich Claude Code. |
| Projektordner | Ordner (in der Regel ein Git-Repository) des Planers, für den Ramifold gestartet wird. |
| Instanz | Ein laufendes Ramifold für genau einen Projektordner, vom Startbefehl bis zum Beenden. Die Oberfläche einer Instanz kann in mehreren Browser-Fenstern geöffnet sein (REQ-071). |
| Fenster | Ein Browser-Fenster oder Browser-Tab, in dem die Oberfläche einer Instanz geöffnet ist. Neuladen gilt als Schließen und erneutes Öffnen des Fensters. |
| Terminal-Ausgabe | Ausgabe im Terminal, in dem der Planer Ramifold gestartet hat. |
| Ramifold-Bereich | Ein eigener Unterordner im Projektordner, in dem Ramifold alle seine Daten ablegt (genauer Name: OQ-07). |
| Vorhaben | Ein Planungsbaum (der Baum). Sein oberster Knoten ist der Wurzelknoten und trägt Titel und Auftrag des Vorhabens. Ein Vorhaben gehört zu genau einem Projektordner und nutzt ein Profil (in 0.1 immer „Software“). |
| Knoten | Punkt im Baum mit Identität, Titel, Auftrag, genau einem Elternknoten (außer dem Wurzelknoten), geordneten Kindern, einem Chat und einem Ergebnis. |
| Nummer | Positionsangabe eines Knotens (z. B. 2, 2.1, 2.1.3); der Wurzelknoten hat keine Nummer. |
| Identität | Unveränderliches Kennzeichen eines Knotens oder Chats, unabhängig von Nummer und Titel. |
| Auftrag | Freitext, was in einem Knoten zu klären oder zu entscheiden ist. |
| Chat | Folge von Nachrichten des Planers und der KI; gehört zu genau einem Knoten. |
| KI-Anfrage | Jede Anfrage von Ramifold an den Coding-Agenten: Chatnachricht, Unterpunkt-Vorschläge oder Zusammenfassung. |
| Sitzung | Die Gesprächsfortsetzung, die der Coding-Agent selbst für einen Chat führt. |
| Ergebnis | Inhalt (Markdown-Text) eines Knotens mit einem Ergebnisstatus. |
| Ergebnisstatus | „offen“ (noch kein Ergebnis), „Konzept“ (vorläufiger Stand) oder „festgelegter Plan“ (vom Planer entschieden). In der Oberfläche englisch, z. B. „no result yet“, „Concept“, „Fixed plan“. |
| Festgelegter Plan | Ergebnisstatus eines einzelnen Knotens, bzw. das Ergebnis eines Knotens mit diesem Status (z. B. „der festgelegte Plan von 2.2“). |
| Plan | Ohne Zusatz: der Baum eines Vorhabens mit allen Knoten, Aufträgen und aktuellen Ergebnissen, so auch in den aus dem Brief übernommenen Zielen und im Erfolgskriterium (Abschnitt 4; „Gesamtplan“ in GOAL-02 meint dasselbe). Für das Ergebnis eines einzelnen Knotens wird nie „Plan“ ohne Zusatz verwendet, sondern „Ergebnis“ oder „festgelegter Plan“. |
| Ergebnisentwurf | Noch nicht gespeicherter Ergebnistext eines Knotens, in zwei Arten: KI-Entwurf und Ergebnisbearbeitung. Lebensdauer: REQ-073; mehrere Fenster: REQ-071. |
| KI-Entwurf | Von der KI gelieferter, noch nicht gespeicherter Ergebnistext eines Knotens (REQ-041). Gehört zur Instanz und ist in jedem Fenster verfügbar. |
| Ergebnisbearbeitung | Vom Planer in einem Fenster begonnene, noch nicht gespeicherte Änderung des Ergebnistexts eines Knotens, ausgehend vom gespeicherten Ergebnis, von einem KI-Entwurf oder von einem leeren Text (REQ-042 bis REQ-044). Gehört zu dem Fenster, in dem sie entstanden ist. |
| Version | Gespeicherter Stand eines Ergebnisses (Inhalt, Ergebnisstatus, Zeitpunkt). |
| Kontext | Text, den Ramifold einer KI-Anfrage mitgibt (Regeln für die KI und Inhalte nach den Kontextregeln). |
| Unterpunkt-Vorschlag | Von der KI vorgeschlagener neuer Kindknoten mit Titel und Auftrag, noch nicht Teil des Baums. |
| Rückfluss-Hinweis | Hinweis am Elternknoten, dass ein direktes Kind nach dem letzten Speichern des Eltern-Ergebnisses festgelegt wurde. |
| Export-Dokument | Markdown-Datei mit dem gesamten Baum eines Vorhabens. |
| Datenabfluss-Hinweis | Hinweis, dass Inhalte über den Coding-Agenten an dessen KI-Anbieter gehen. |
| Fehlerprotokoll | Datei im Ramifold-Bereich mit Einträgen zu Fehlern nach REQ-063, ohne Inhalte. |
| Änderung von außen | Änderung an Daten eines Vorhabens im Ramifold-Bereich, die nicht von der laufenden Instanz stammt, z. B. durch `git pull`, `git checkout` oder Bearbeiten von Hand (REQ-074). |

Alle folgenden Anforderungen gehören zu **Slice 0.1**. Die Akzeptanzkriterien stehen in Abschnitt 8. Die in v0.3 und v0.4 neuen Anforderungen REQ-069 bis REQ-074 stehen im jeweils passenden Unterabschnitt; die IDs folgen der projektweiten Reihenfolge.

### 6.1 Start, Projektordner und Coding-Agent

**REQ-001 – Start mit Projektordner**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-01, Brief 9 („Projektordner beim Start angeben“)
Der Planer kann Ramifold mit einem Befehl starten und dabei einen Projektordner angeben. Ohne Angabe verwendet das System den Ordner, in dem der Befehl ausgeführt wird. Nach dem Start nennt das System den verwendeten Projektordner und die lokale Adresse, unter der die Oberfläche im Browser erreichbar ist.
- Eingabe: optional Pfad zum Projektordner. Ausgabe: verwendeter Projektordner, lokale Adresse.
- Must, weil ohne Projektordner kein Vorhaben angelegt und nichts gespeichert werden kann.

**REQ-002 – Projektordner fehlt oder ist nicht beschreibbar beim Start**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 (Fehlerfälle)
Wenn der angegebene Projektordner nicht existiert, kein Ordner ist oder nicht beschreibbar ist, muss das System den Start mit einer Meldung abbrechen, die den Pfad und die Ursache nennt; es legt dabei weder den Ordner noch Dateien an.
- Must, weil der Brief diesen Fehlerfall für 0.1 fordert und sonst Daten an unerwarteter Stelle landen.

**REQ-003 – Speichern scheitert während des Betriebs**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 (Fehlerfälle), GOAL-06
Wenn eine Änderung (z. B. neuer Knoten, gespeichertes Ergebnis, Chatnachricht) nicht im Projektordner gespeichert werden kann, muss das System dem Planer melden, dass die Änderung nicht gespeichert wurde, und die Ursache nennen. Die Eingabe des Planers bleibt in seinem Fenster erhalten, solange Ramifold läuft und das Fenster geöffnet ist (REQ-071), sodass der Planer das Speichern wiederholen kann.
- Must, weil ein stiller Datenverlust das Vertrauen in den Plan zerstört.

**REQ-004 – Claude Code fehlt oder ist nicht angemeldet**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 (Fehlerfälle), LP-04
Wenn Claude Code nicht installiert, nicht aufrufbar oder nicht angemeldet ist, muss das System bei jeder KI-Anfrage eine Meldung anzeigen, die die Ursache („nicht installiert“, „nicht angemeldet“) und den nächsten Schritt zur Behebung nennt. Funktionen ohne KI (Baum bearbeiten, Ergebnisse bearbeiten und speichern, Export) bleiben nutzbar. Ist Claude Code beim Start nicht auffindbar, zeigt das System dies zusätzlich nach dem Start an.
- Must, weil der Brief diesen Fehlerfall für 0.1 fordert und es der häufigste Einrichtungsfehler ist.

**REQ-070 – Zweiter Start für denselben Projektordner**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 (Fehlerfälle, Fundament), GOAL-06
Wenn der Planer Ramifold für einen Projektordner startet, für den bereits eine Instanz läuft, muss das System den zweiten Start mit einer Meldung abbrechen, die den Projektordner und die lokale Adresse der laufenden Instanz nennt; der zweite Start ändert keine Datei im Projektordner.
- Regeln: Derselbe Projektordner liegt auch vor, wenn er beim zweiten Start über einen anderen Pfad angegeben wird (z. B. ohne Pfadangabe aus dem Ordner heraus statt mit vollem Pfad). Läuft für den Projektordner keine Instanz mehr, auch nach einem abrupten Beenden (REQ-055), startet Ramifold normal. Instanzen für verschiedene Projektordner dürfen gleichzeitig laufen.
- *Beispiel:* Ramifold läuft für `~/code/rag-projekt`. Der Planer führt in einem zweiten Terminal `cd ~/code/rag-projekt && ramifold` aus → Meldung, dass Ramifold für diesen Ordner bereits unter der lokalen Adresse der ersten Instanz läuft; ein Start für `~/code/monitoring` gelingt dagegen.
- Must, weil zwei Instanzen auf denselben Daten die Regel „eine KI-Anfrage gleichzeitig“ (REQ-069) und die Datenintegrität (REQ-055) nicht einhalten könnten.

**REQ-071 – Mehrere Browser-Fenster einer Instanz**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 (Fundament), GOAL-06
Der Planer kann die Oberfläche einer Instanz in mehreren Browser-Fenstern gleichzeitig nutzen; das System wendet jede Aktion aus jedem Fenster auf den aktuell gespeicherten Stand des Vorhabens an.
- Regeln:
  - Bezieht sich eine Aktion auf einen Knoten, der inzwischen in einem anderen Fenster gelöscht wurde, führt das System sie nicht aus und meldet, dass der Knoten nicht mehr existiert; die Eingabe des Planers (z. B. Ergebnisbearbeitung, Chatnachricht, Titel) bleibt in diesem Fenster erhalten, solange es geöffnet ist.
  - Speichern zwei Fenster nacheinander denselben Titel, Auftrag oder dasselbe Ergebnis eines Knotens, gilt das zuletzt Gespeicherte; bei Ergebnissen bleibt das zuvor Gespeicherte als Version erhalten (REQ-045).
  - Ein Fenster muss Änderungen aus einem anderen Fenster nicht sofort zeigen, spätestens aber, wenn der Planer darin das Vorhaben oder den betroffenen Knoten erneut öffnet.
  - Zuordnung: Offene Unterpunkt-Vorschläge (REQ-037) und KI-Entwürfe (REQ-073) gehören zur Instanz und sind in jedem Fenster verfügbar. Noch nicht gespeicherte oder nicht gesendete Eingaben des Planers (Ergebnisbearbeitungen, Chatnachrichten im Eingabefeld, geänderte Titel und Aufträge) gehören zu dem Fenster, in dem sie entstanden sind; sie bleiben erhalten, solange dieses Fenster geöffnet ist, und gehen mit dem Schließen des Fensters verloren. Die Regel „höchstens eine KI-Anfrage gleichzeitig“ (REQ-069) gilt über alle Fenster einer Instanz.
  - Ein Ergebnis wird nur in einem Fenster zur gleichen Zeit bearbeitet: Besteht in einem Fenster eine Ergebnisbearbeitung eines Knotens, kann der Planer das Ergebnis dieses Knotens in keinem anderen Fenster bearbeiten und dort keine Zusammenfassung (REQ-041) für ihn anfordern. Die anderen Fenster zeigen das gespeicherte Ergebnis bzw. den KI-Entwurf dieses Knotens nur lesend, mit dem Hinweis, dass das Ergebnis in einem anderen Fenster bearbeitet wird. Das gilt, bis die Ergebnisbearbeitung gespeichert oder verworfen oder ihr Fenster geschlossen ist.
- *Beispiel 1:* Der Planer löscht in Fenster A Knoten 2.3 „Reranking“ und speichert danach in Fenster B, das 2.3 noch zeigt, dessen Ergebnis → Meldung „node no longer exists“, der Text bleibt in Fenster B stehen und kann kopiert werden.
- *Beispiel 2:* In Fenster A ergänzt der Planer in der Ergebnisbearbeitung von 2.2 die Zeile „BM25 als Fallback“ und speichert nicht. In Fenster B öffnet er 2.2 → das Ergebnis ist dort ohne diese Zeile nur lesbar, mit dem Hinweis „being edited in another window“; die Überschrift kann er in B nicht ändern. In A ist die Zeile weiterhin da; nach dem Speichern in A kann er 2.2 in B nach erneutem Öffnen bearbeiten.
- Must, weil ein zweites Fenster schnell versehentlich entsteht und ohne Regel Eingaben stillschweigend verloren gingen, gleichzeitige Bearbeitungen desselben Ergebnisses einander unbemerkt überschrieben oder Ergebnisse gelöschten Knoten zugeordnet würden.

### 6.2 Vorhaben

**REQ-005 – Vorhaben anlegen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-01
Der Planer kann im geöffneten Projektordner ein Vorhaben mit Titel und Auftrag anlegen; das System legt dabei den Wurzelknoten mit diesem Titel und Auftrag und dem Ergebnisstatus „offen“ an.
- Regeln: Titel Pflicht, nach Entfernen führender und folgender Leerzeichen 1 bis 200 Zeichen; Auftrag optional, ohne Längenbegrenzung. Gleiche Titel mehrerer Vorhaben sind erlaubt.
- Must, weil jedes Planen mit einem Vorhaben beginnt (UC-01).

**REQ-006 – Vorhaben auswählen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-01, Erfolgskriterium „zwei echte Vorhaben“
Das System muss dem Planer alle Vorhaben des Projektordners mit Titel und Anlagedatum auflisten; der Planer kann eines davon öffnen. Vorhaben bleiben über Neustarts von Ramifold erhalten.
- Leerer Fall: Enthält der Projektordner noch kein Vorhaben, zeigt das System dies an und bietet das Anlegen an.
- Must, weil der Owner mindestens zwei Vorhaben plant und über mehrere Tage arbeitet.

**REQ-072 – Nicht lesbare Daten eines Vorhabens**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 (Fehlerfälle, Fundament), LP-07, GOAL-06
Wenn Daten eines Vorhabens im Ramifold-Bereich nicht lesbar oder widersprüchlich sind, muss das System dieses Vorhaben in der Liste nach REQ-006 als nicht lesbar kennzeichnen und beim Versuch, es zu öffnen, eine Meldung mit dem Vorhaben (Titel, soweit lesbar), der betroffenen Stelle im Ramifold-Bereich und der Ursache anzeigen; das Vorhaben lässt sich dann nicht öffnen.
- Fälle (Beispiele): Git-Konfliktmarker nach `git pull`, von Hand beschädigte oder unvollständige Daten, Daten einer neueren Ramifold-Version, Widersprüche wie ein Knoten mit nicht vorhandenem Elternknoten.
- Regeln: Das System ändert, überschreibt oder repariert die Daten eines nicht lesbaren Vorhabens nicht. Alle anderen Vorhaben des Projektordners bleiben uneingeschränkt nutzbar. Sind die Daten wieder lesbar (z. B. nach Auflösen des Konflikts durch den Planer), lässt sich das Vorhaben nach einem Neustart von Ramifold wieder öffnen.
- *Beispiel:* Der Owner plant am Montag auf dem Laptop und am Dienstag auf dem Desktop. Nach `git pull` enthält eine Datei von „Eigenes produktives RAG“ Konfliktmarker → das Vorhaben ist als nicht lesbar gekennzeichnet, die Meldung nennt die betroffene Stelle und „Git-Konflikt“; „Monitoring-Konzept“ öffnet normal.
- Abgrenzung: REQ-072 gilt für Daten, die beim Start oder Öffnen nicht lesbar sind; Änderungen von außen während des Betriebs regelt REQ-074.
- Must, weil der Ramifold-Bereich ausdrücklich mit Git versioniert und auf mehreren Rechnern genutzt wird und ein stilles Überschreiben Daten vernichten würde.

**REQ-074 – Änderung von außen während des Betriebs**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 (Fehlerfälle, Fundament), LP-07, GOAL-06
Hat sich ein Vorhaben seit dem Laden durch die laufende Instanz durch eine Änderung von außen geändert (z. B. `git pull`, `git checkout`, Bearbeiten von Hand), darf das System keine Änderung an diesem Vorhaben speichern: Es führt die Aktion des Planers nicht aus und zeigt eine Meldung, die das Vorhaben, den betroffenen Knoten (Nummer und Titel, falls zutreffend), die Ursache „außerhalb von Ramifold geändert“ und den nächsten Schritt nennt (geänderten Stand laden, spätestens durch einen Neustart von Ramifold). Die Eingabe des Planers bleibt in seinem Fenster erhalten, solange es geöffnet ist.
- Regeln:
  - Betroffen ist jede Aktion, die Daten des Vorhabens im Ramifold-Bereich schreibt: Knoten anlegen, umbenennen, Auftrag ändern, sortieren, löschen, Unterpunkt-Vorschläge übernehmen, Ergebnis speichern, Chatnachricht senden, exportieren. Eine Chatnachricht wird dann nicht gesendet und bleibt im Eingabefeld; offene Unterpunkt-Vorschläge und Ergebnisentwürfe bleiben erhalten.
  - Ändert sich das Vorhaben von außen, während eine KI-Anfrage für einen Chat läuft, zeigt das System die eingehende Antwort an, kennzeichnet sie als nicht gespeichert, speichert sie nicht und meldet die Änderung von außen wie oben.
  - Das System überschreibt, ändert oder repariert die von außen geänderten Daten nicht. Spätestens nach einem Neustart von Ramifold zeigt es den von außen geänderten Stand (sind die Daten dann nicht lesbar, gilt REQ-072); danach kann der Planer wieder speichern.
  - Bezugsgröße ist das ganze Vorhaben, nicht nur die Daten, die das Speichern verändern würde. Eine Änderung von außen an einem anderen Vorhaben desselben Projektordners hindert das Speichern nicht. Änderungen derselben Instanz, auch aus einem anderen Fenster, sind keine Änderungen von außen (dafür gilt REQ-071).
  - Wie Ramifold Änderungen von außen erkennt, entscheidet der Software Architect.
- *Beispiel:* Ramifold läuft seit Montag auf dem Laptop. Am Mittwoch holt der Owner dort mit `git pull` den festgelegten Plan von 2.2 „Embedding-Modell“, den er am Dienstag auf dem Desktop gespeichert hat, und speichert danach in der laufenden Instanz das Konzept von 2 „Retrieval“ → Meldung, dass „Eigenes produktives RAG“ außerhalb von Ramifold geändert wurde; nichts wird gespeichert, der Konzepttext bleibt im Fenster stehen. Nach einem Neustart zeigt 2.2 den Plan vom Dienstag, und der Owner speichert das Konzept von 2 erneut.
- Begründung der Bezugsgröße: Würde nur geprüft, ob die zu schreibenden Daten selbst geändert wurden, hinge es von der Ablage ab, ob das Beispiel erkannt wird, und der Planer würde auf einem veralteten Stand entscheiden (Konzept von 2 ohne den neuen festgelegten Plan von 2.2).
- Must, weil der Planer über Tage parallel zu Terminal und Coding-Agent arbeitet (10.5) und mit Git auf zwei Rechnern plant (REQ-072); ohne diese Regel gingen festgelegte Pläne ohne Meldung verloren und würden mit dem nächsten Commit auch im Repo zurückgesetzt.

### 6.3 Baum anzeigen und navigieren

**REQ-007 – Baum anzeigen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-02, UC-03, GOAL-02
Das System muss den Baum des geöffneten Vorhabens anzeigen, für jeden Knoten mit Nummer, Titel und Ergebnisstatus.
- Must, weil der Planer ohne Überblick über den Baum nicht navigieren und den Stand nicht erkennen kann (GOAL-02).

**REQ-008 – Nummerierung nach Position**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 5 (Knoten, Nummer)
Das System muss jedem Knoten außer dem Wurzelknoten eine Nummer aus seiner Position geben: Kinder des Wurzelknotens 1, 2, 3 …; Kinder eines Knotens mit Nummer n erhalten n.1, n.2 … in ihrer Reihenfolge. Nach jeder Änderung der Reihenfolge oder nach dem Löschen eines Knotens zeigt das System die neu berechneten Nummern.
- *Beispiel:* Wurzel „Eigenes produktives RAG“; Kinder 1 „Datenquellen und Ingestion“, 2 „Retrieval“; Kinder von 2: 2.1 „Chunking“, 2.2 „Embedding-Modell“, 2.3 „Reranking“.
- Must, weil Nummern im Baum, im Kontext und im Export die gemeinsame Sprache zwischen Planer und KI sind.

**REQ-009 – Knoten ein- und ausklappen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-09, Brief 9
Der Planer kann jeden Knoten mit Kindern einklappen, sodass seine Nachkommen im Baum verborgen sind, und wieder ausklappen. Ein eingeklappter Knoten zeigt die Anzahl seiner verborgenen Nachkommen. Der Klappzustand wird nicht im Projektordner gespeichert; beim Öffnen eines Vorhabens sind alle Knoten ausgeklappt.
- Must, weil der Owner es für 0.1 bestätigt hat: ein größerer Baum ist ohne Einklappen schwer lesbar (Brief 9).

**REQ-010 – Knoten öffnen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-03
Der Planer kann einen Knoten im Baum öffnen; das System zeigt dann Nummer, Titel, Auftrag, aktuelles Ergebnis mit Ergebnisstatus und den Chat dieses Knotens.
- Leerer Fall: Ein Knoten ohne Chatnachrichten zeigt einen leeren Chat; ein Knoten mit Ergebnisstatus „offen“ zeigt, dass noch kein Ergebnis vorliegt.
- Must, weil jede Arbeit an einem Knoten (UC-03) mit dem Öffnen beginnt.

### 6.4 Baum bearbeiten

**REQ-011 – Knoten anlegen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-02 („Unterpunkte anpassen“)
Der Planer kann unter jedem Knoten einen neuen Kindknoten mit Titel und Auftrag anlegen; das System fügt ihn als letztes Kind an, mit leerem Chat und Ergebnisstatus „offen“.
- Regeln: wie REQ-005 (Titel Pflicht, 1 bis 200 Zeichen; Auftrag optional).
- Must, weil der Planer den Baum auch ohne KI-Vorschläge aufbauen können muss.

**REQ-012 – Knoten umbenennen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-02, Brief 9
Der Planer kann den Titel jedes Knotens, auch des Wurzelknotens, ändern. Regeln wie REQ-005. Chat, Ergebnis und Nummer des Knotens bleiben unverändert.
- Must, weil KI-Vorschläge und eigene Knoten im Verlauf präziser benannt werden müssen.

**REQ-013 – Auftrag ändern**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-02, Brief 9
Der Planer kann den Auftrag jedes Knotens ändern. Der geänderte Auftrag gilt ab der nächsten KI-Anfrage im Kontext dieses Knotens und aller Knoten, die ihn nach den Kontextregeln erhalten; frühere Chatnachrichten bleiben unverändert. Auftragsänderungen erzeugen keine Version.
- Must, weil der Auftrag die zentrale Steuerung jedes Knoten-Chats ist.

**REQ-014 – Reihenfolge unter Geschwistern ändern**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-09, Brief 9 („auf derselben Ebene sortieren“)
Der Planer kann die Position eines Knotens unter den Kindern desselben Elternknotens ändern. Der Wechsel zu einem anderen Elternknoten ist nicht möglich (Verschieben, Slice 0.2).
- *Beispiel:* Unter 2 „Retrieval“ wird „Reranking“ von Position 3 auf Position 1 gesetzt → 2.1 Reranking, 2.2 Chunking, 2.3 Embedding-Modell.
- Must, weil die Reihenfolge die Planungslogik ausdrückt und ohne Verschieben die einzige Umbaumöglichkeit in 0.1 ist.

**REQ-015 – Knoten löschen mit Warnung**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 (Löschen mit Warnung; Fehlerfall versehentliches Löschen)
Der Planer kann jeden Knoten außer dem Wurzelknoten löschen. Vor dem Löschen zeigt das System eine Warnung mit der Anzahl der betroffenen Knoten (Knoten und alle Nachkommen), Chats mit mindestens einer Nachricht und festgelegten Pläne und löscht erst nach ausdrücklicher Bestätigung. Mit dem Knoten werden alle Nachkommen sowie deren Chats, Ergebnisse und Versionen endgültig gelöscht; ein Rückgängig gibt es nicht.
- Must, weil der Brief Löschen mit Warnung für 0.1 fordert und versehentliches Löschen ein benannter Fehlerfall ist.

**REQ-016 – Stabile Knotenidentität**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 (Fundament „Knoten mit stabiler Identität“), Brief 5 (Nummer vs. Knoten)
Das System muss Chat, Ergebnis und Versionen eines Knotens an seine Identität binden, nicht an Nummer oder Titel. Umbenennen, Ändern der Reihenfolge und Löschen anderer Knoten ändern die Zuordnung nicht.
- Must, weil Sortieren in 0.1 und Verschieben, Verweise und Abhängigkeiten ab 0.2 sonst Chats und Ergebnisse vertauschen würden.

### 6.5 Chat im Knoten

**REQ-017 – Nachricht senden und Antwort erhalten**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-01, UC-03, LP-04
Der Planer kann im Chat eines geöffneten Knotens eine Nachricht senden; das System stellt sie mit dem Kontext des Knotens (REQ-031 bis REQ-035) über Claude Code an die KI und zeigt die Antwort im Chat dieses Knotens an.
- Regeln: Nachricht Pflicht (nicht leer nach Entfernen von Leerzeichen).
- Läuft bereits eine KI-Anfrage, gilt REQ-069 (geändert in v0.3, FIND-006: die Regel „höchstens eine KI-Anfrage gleichzeitig“ steht jetzt in REQ-069).
- Must, weil der Chat pro Knoten der Kern des Produkts ist (GOAL-01, GOAL-02).

**REQ-069 – Höchstens eine KI-Anfrage gleichzeitig**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-03, LP-04, GOAL-06; Entscheidung des Product Owners PO-2 (v0.2)
Startet der Planer eine KI-Anfrage (Chatnachricht nach REQ-017, Unterpunkt-Vorschläge nach REQ-037 oder Zusammenfassung nach REQ-041), während für denselben Projektordner bereits eine KI-Anfrage läuft – im selben oder in einem anderen Knoten, im selben oder in einem anderen Browser-Fenster (REQ-071) –, muss das System die neue Anfrage nicht senden und melden, dass bereits eine KI-Anfrage läuft, mit Nummer und Titel des Knotens, in dem sie läuft.
- Regeln: Eine nicht gesendete Chatnachricht bleibt im Eingabefeld erhalten. Sobald die laufende Anfrage endet (vollständig, abgebrochen oder fehlgeschlagen), kann der Planer wieder eine KI-Anfrage starten. Funktionen ohne KI bleiben in allen Knoten nutzbar, während eine KI-Anfrage läuft.
- *Beispiel:* In 2.2 „Embedding-Modell“ läuft eine Web-Recherche. Der Planer schreibt im Chat von 3.1 „Welche Metriken brauchen wir?“ und will senden → Meldung „AI request running in 2.2 Embedding-Modell“, die Frage bleibt im Eingabefeld; das Umbenennen von 3.1 gelingt sofort.
- Begründung der Regel: Der Brief fordert keine gleichzeitigen Anfragen; die Regel ist für den Planer eindeutig und unabhängig von der Architektur, einfach testbar und hält den Verbrauch des Nutzungslimits überschaubar. Gleichzeitige Anfragen in mehreren Knoten sind ein möglicher späterer Ausbau (Abschnitt 14).
- Must, weil ohne festgelegte Regel gleichzeitige Anfragen Antworten, Nutzungslimit und Sitzungen des Coding-Agenten unvorhersehbar machen und REQ-017, REQ-037 und REQ-041 sonst kein gemeinsames Verhalten hätten.

**REQ-018 – Chatverlauf dauerhaft pro Knoten speichern**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 5 (Chat gehört zu genau einem Knoten), Brief 9 (Chat bleibt erhalten)
Das System muss jede Nachricht des Planers und jede Antwort der KI mit Zeitpunkt im Ramifold-Bereich speichern, dem Chat genau eines Knotens zugeordnet. Der gespeicherte Chat bleibt über Neustarts erhalten und ist unabhängig von den Sitzungsdaten des Coding-Agenten vollständig lesbar.
- Must, weil der Brief verlangt, dass der Chat auch bei Sitzungsverlust erhalten bleibt, und weil er ab 0.5 einen Anbieterwechsel überstehen muss.

**REQ-019 – Laufende KI-Anfrage anzeigen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-03, UC-04
Das System muss anzeigen, solange eine KI-Anfrage für einen Knoten läuft, in welchem Knoten sie läuft, bis die Antwort vollständig ist oder abbricht.
- Must, weil Antworten mit Web-Recherche Minuten dauern können und der Planer sonst nicht unterscheiden kann, ob Ramifold arbeitet oder hängt.

**REQ-020 – Antwort schrittweise anzeigen**
Type: Functional | Priority: Should | Slice: 0.1 | Bezug: UC-03
Das System soll Teile der Antwort anzeigen, sobald der Coding-Agent sie liefert, statt erst die vollständige Antwort.
- **Ergänzung über den Brief hinaus** (nicht in Brief Abschnitt 9 genannt; Verbleib in 0.1: OQ-09). Begründung: Eine Anfrage mit Web-Recherche dauert Minuten; ohne Zwischenstand erkennt der Planer eine falsche Richtung erst am Ende.
- *Beispiel:* Die Recherche „Welche Embedding-Modelle kommen in Frage?“ läuft 3 Minuten; nach 10 Sekunden zeigt der erste Teil, dass die KI nur kommerzielle Modelle betrachtet, und der Planer kann reagieren (REQ-021).

**REQ-021 – KI-Anfrage abbrechen**
Type: Functional | Priority: Should | Slice: 0.1 | Bezug: UC-03, GOAL-06
Der Planer soll eine laufende KI-Anfrage abbrechen können. Bereits angezeigte Teile einer Chatantwort bleiben erhalten und sind als „abgebrochen“ gekennzeichnet; bei Vorschlägen und Zusammenfassungen ändert sich nichts.
- **Ergänzung über den Brief hinaus** (nicht in Brief Abschnitt 9 genannt; Verbleib in 0.1: OQ-09). Begründung: Eine falsch gestellte Recherche kostet sonst Minuten Wartezeit und Nutzungslimit beim KI-Anbieter; weil nur eine KI-Anfrage gleichzeitig läuft (REQ-069), gibt der Abbruch die KI auch für andere Knoten frei.
- *Beispiel:* Nach 20 Sekunden merkt der Planer, dass in der Frage „nur Open Source“ fehlt → er bricht ab und sendet die präzisierte Frage, statt 3 Minuten auf eine unbrauchbare Antwort zu warten.

**REQ-022 – Web-Recherche im Knoten**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-04, GOAL-05, Brief 9 („mindestens Web-Recherche“)
Die KI muss bei KI-Anfragen im Web suchen und Webseiten lesen können. Der Kontext weist die KI an, bei Rechercheergebnissen Quellen (URL) anzugeben.
- Must, weil das Erfolgskriterium nach 0.1 mindestens eine Web-Recherche im Knoten verlangt.

**REQ-023 – Projektordner lesen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-04, GOAL-05, Brief 9 („Projektordner lesen“)
Die KI muss bei KI-Anfragen Dateien im Projektordner nach Name und Inhalt finden und lesen können.
- Must, weil Planung für ein bestehendes Repo dessen Inhalt kennen muss (Brief 1: „Codebasis lesen“).

**REQ-024 – KI ändert nichts**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: LP-03, GOAL-06
Das System muss sicherstellen, dass die KI bei KI-Anfragen keine Dateien anlegen, ändern oder löschen und keine Befehle ausführen kann. Änderungen am Plan (Knoten, Aufträge, Ergebnisse) entstehen ausschließlich durch Aktionen des Planers in Ramifold.
- Must, weil „KI ändert nichts ohne Bestätigung“ eine produktweite Leitplanke ist.

**REQ-025 – Lesezugriff auf den Projektordner beschränken**
Type: Functional | Priority: Should | Slice: 0.1 | Bezug: LP-06, GOAL-06
Das System soll verhindern, dass die KI Dateien außerhalb des Projektordners liest, damit keine fremden Dateien (z. B. Schlüssel im Home-Verzeichnis) an den KI-Anbieter gehen. Die Machbarkeit über Claude Code prüft der Software Architect (OQ-08).
- **Ergänzung über den Brief hinaus** (Brief Abschnitt 9 nennt nur „Projektordner lesen“, keine Beschränkung; Verbleib in 0.1: OQ-09). Begründung: Schutz vor Abfluss fremder Dateien an den KI-Anbieter (GOAL-06, LP-06).
- *Beispiel:* Auf die Frage „Wie ist unser Deployment konfiguriert?“ darf die KI `deploy/config.yaml` im Projektordner lesen, aber nicht `~/.aws/credentials` oder das Nachbar-Repo `~/code/kundenprojekt`.

**REQ-026 – Genutzte Werkzeuge anzeigen**
Type: Functional | Status: Withdrawn (v0.2) | Priority: – | Slice: – | Bezug: –
Entfallen, verschoben nach Abschnitt 14 (Zielslice „später“, Zuschnitt durch Product Owner): Komfortfunktion ohne Bezug zum Nutzerziel von 0.1, nicht in Brief Abschnitt 9 genannt (Finding PO-1). Die Akzeptanzkriterien AC-REQ-026-01 und AC-REQ-026-02 entfallen. Die ID wird nicht wiederverwendet.

**REQ-027 – Antwort in der Sprache des Planers**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: LP-09
Der Kontext jeder KI-Anfrage muss die KI anweisen, in der Sprache zu antworten, in der der Planer schreibt.
- Must, weil die Leitplanke Sprachen es so festlegt und der Owner auf Deutsch plant, die Oberfläche aber Englisch ist.

**REQ-028 – Antwort bricht ab**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 (Fehlerfälle)
Wenn eine KI-Anfrage ohne vollständige Antwort endet (z. B. Netzwerkfehler, Nutzungslimit des Anbieters erreicht, Coding-Agent beendet sich unerwartet, Ramifold wird während der Anfrage beendet), muss das System die gesendete Nachricht des Planers im Chat behalten, bereits erhaltene Teile der Antwort als „unvollständig“ gekennzeichnet behalten, die Ursache melden, soweit der Coding-Agent sie liefert, und dem Planer das erneute Senden ermöglichen. Bei Vorschlägen und Zusammenfassungen ändert sich nichts am Baum oder Ergebnis.
- Must, weil der Brief diesen Fehlerfall für 0.1 fordert.

**REQ-029 – Sitzung verloren, Chat wird fortgesetzt**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 (Fehlerfälle: Session verloren, Chat bleibt erhalten), GOAL-01
Wenn der Coding-Agent die Sitzung eines Chats nicht fortsetzen kann (z. B. Sitzungsdaten gelöscht, Projektordner auf einem anderen Rechner geöffnet), muss das System den Chat mit einer neuen Sitzung fortsetzen, der KI dabei den gespeicherten bisherigen Verlauf dieses Chats mitgeben und dem Planer anzeigen, dass die Sitzung neu aufgebaut wurde. Der gespeicherte Chat bleibt unverändert sichtbar.
- Must, weil der Brief diesen Fehlerfall für 0.1 fordert und der Planer sonst Kontext neu erklären müsste (GOAL-01).

**REQ-030 – Hinweis auf Datenabfluss**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: LP-06, Brief 9 (Querschnitt)
Vor der ersten KI-Anfrage in einem Projektordner muss das System den Datenabfluss-Hinweis anzeigen: Auftrag, Ergebnisse, Chatnachrichten, Kontext und Dateien, die die KI liest, gehen über Claude Code an dessen KI-Anbieter. Die KI-Anfrage wird erst gesendet, wenn der Planer den Hinweis bestätigt hat. Die Bestätigung gilt für diesen Projektordner und bleibt über Neustarts erhalten; der Hinweis ist jederzeit wieder aufrufbar.
- Regel: Die Bestätigung ist eine persönliche Entscheidung des Planers und wird nie über Git weitergegeben, auch nicht, wenn der Planer Chats eingeschlossen hat (REQ-050, REQ-051). Wer ein Repo mit einem Vorhaben klont, sieht den Hinweis vor seiner ersten KI-Anfrage.
- *Beispiel:* Eine Entwicklerin klont ein öffentliches Repo, in dem das Vorhaben „Eigenes produktives RAG“ liegt, und startet Ramifold → vor ihrer ersten Frage erscheint der Hinweis, obwohl der Autor des Repos ihn bei sich bestätigt hat.
- Must, weil die Leitplanke einen klaren Hinweis verlangt und Ramifold als Open Source an externe Nutzer geht.

### 6.6 Kontextregeln

**REQ-031 – Kontext nach unten**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 5 (Kontextregeln, nach unten), UC-03, GOAL-01
Das System muss jeder KI-Anfrage eines Knotens Titel, Auftrag und aktuelles Ergebnis mit Ergebnisstatus aller Vorfahren (bis einschließlich Wurzelknoten) sowie Titel und Auftrag aller Geschwister mitgeben. Ein Ergebnis mit Status „Konzept“ ist als nicht festgelegt gekennzeichnet.
- Must, weil die Vererbung von Ergebnissen nach unten der Kern des Wertversprechens ist.

**REQ-032 – Kontext im Knoten**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 5 (Kontextregeln, im Knoten; ohne Material in 0.1)
Das System muss jeder KI-Anfrage eines Knotens dessen Nummer, Titel, Auftrag und aktuelles Ergebnis mit Ergebnisstatus mitgeben.
- Must, weil die KI sonst den eigenen Auftrag und Stand des Knotens nicht kennt.

**REQ-033 – Kontext nach oben**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 5 (Kontextregeln, nach oben), UC-05, GOAL-01
Das System muss jeder KI-Anfrage eines Knotens den aktuellen festgelegten Plan jedes direkten Kindes mitgeben. Direkte Kinder ohne festgelegten Plan erscheinen nur mit Titel, Auftrag und dem Vermerk „noch nicht festgelegt“; ihre Konzepte werden nicht mitgegeben. Nachkommen unterhalb der direkten Kinder werden nicht einzeln mitgegeben.
- Must, weil der Rückfluss festgelegter Pläne das manuelle Zusammenführen ersetzt (GOAL-01).

**REQ-034 – Keine Chats anderer Knoten**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 5 („Chats werden nie an andere Knoten weitergegeben“)
Das System darf einer KI-Anfrage eines Knotens keine Nachricht aus dem Chat eines anderen Knotens mitgeben.
- Must, weil „Ergebnisse statt Chats vererben“ die zentrale Differenzierung ist (Brief 3).

**REQ-035 – Kontext aktuell bei jeder Anfrage**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 5, GOAL-01
Das System muss den Kontext bei jeder KI-Anfrage aus dem Stand des Baums zum Zeitpunkt des Sendens bilden, auch wenn der Chat in einer bestehenden Sitzung fortgesetzt wird.
- Must, weil die KI sonst mit veralteten Aufträgen oder Ergebnissen arbeitet, nachdem der Planer oben etwas geändert hat.

**REQ-036 – Kontext anzeigen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 („Anzeige, was die KI bekommt“), GOAL-06
Der Planer kann für jeden Knoten den vollständigen Text ansehen, den Ramifold der nächsten KI-Anfrage dieses Knotens mitgibt: feste Regeln für die KI und Kontext nach REQ-031 bis REQ-033; nach einem Sitzungsneuaufbau (REQ-029) einschließlich des mitgegebenen Chatverlaufs. Was der Coding-Agent selbst ergänzt (eigene Systemanweisungen, Projektdateien wie `CLAUDE.md`, Skills), zeigt das System nicht.
- Must, weil der Brief die Anzeige für 0.1 fordert und der Planer nur so prüfen kann, worauf die KI ihre Antwort stützt.

### 6.7 Unterpunkte

**REQ-037 – KI schlägt Unterpunkte vor**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-02, Brief 9
Der Planer kann für einen geöffneten Knoten Unterpunkt-Vorschläge anfordern; das System erhält von der KI auf Basis von Kontext und bisherigem Chat dieses Knotens eine Liste von mindestens einem Vorschlag mit Titel und Auftrag und zeigt sie an. Anforderung und Vorschläge werden nicht als Chatnachricht gespeichert. Vorschläge werden erst Knoten, wenn der Planer sie übernimmt (REQ-039).
- Regeln: Liefert die KI keine verwertbare Liste (z. B. kein Vorschlag, fehlender Titel), meldet das System dies, ändert den Baum nicht und erlaubt eine neue Anforderung. Offene Vorschläge bleiben verfügbar, auch wenn der Planer andere Knoten öffnet, bis der Planer sie übernimmt oder verwirft, neue Vorschläge anfordert, der Knoten gelöscht oder Ramifold beendet wird.
- Must, weil die KI-gestützte Zerlegung den Baum schnell entstehen lässt (UC-02).

**REQ-038 – Unterpunkt-Vorschlag ändern**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-02, Brief 9 („übernehmen, ändern, verwerfen“)
Der Planer kann Titel und Auftrag eines Unterpunkt-Vorschlags vor der Übernahme ändern. Regeln wie REQ-005.
- Must, weil der Brief Ändern ausdrücklich für 0.1 nennt.

**REQ-039 – Unterpunkt-Vorschläge übernehmen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-02, LP-03
Der Planer kann einzelne oder alle offenen Unterpunkt-Vorschläge übernehmen; das System legt sie als Kinder des Knotens hinter den vorhandenen Kindern in der Reihenfolge der Vorschläge an (wie REQ-011).
- Must, weil erst die Übernahme durch den Planer Vorschläge zu Knoten macht (Leitplanke „KI ändert nichts ohne Bestätigung“).

**REQ-040 – Unterpunkt-Vorschläge verwerfen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-02, Brief 9
Der Planer kann einzelne oder alle offenen Unterpunkt-Vorschläge verwerfen; das System entfernt sie aus der Vorschlagsliste, ohne den Baum zu ändern.
- Must, weil der Brief Verwerfen ausdrücklich für 0.1 nennt.

### 6.8 Ergebnis und Rückfluss

**REQ-041 – KI fasst zusammen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-05, Brief 9
Der Planer kann für einen geöffneten Knoten eine Zusammenfassung anfordern; das System erhält von der KI auf Basis von Kontext (einschließlich der festgelegten Pläne der direkten Kinder) und Chat dieses Knotens einen KI-Entwurf in Markdown und zeigt ihn dem Planer bearbeitbar an. Der KI-Entwurf wird nicht automatisch gespeichert und nicht als Chatnachricht abgelegt; wie lange er erhalten bleibt, regelt REQ-073.
- Fehlerfall: wie REQ-028; ein vorhandenes gespeichertes Ergebnis bleibt unverändert.
- Must, weil das Zusammenfassen den Übergang vom Chat zum Ergebnis trägt (GOAL-02).

**REQ-042 – Ergebnis als Konzept speichern**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-05, GOAL-02
Der Planer kann das Ergebnis eines Knotens (KI-Entwurf oder eigener Text) bearbeiten und mit Ergebnisstatus „Konzept“ speichern. Ungespeicherte Bearbeitungen sind Ergebnisbearbeitungen (REQ-071, REQ-073).
- Regeln: Inhalt Pflicht (nicht leer nach Entfernen von Leerzeichen).
- Must, weil Konzepte als grober Stand nach unten weitergegeben werden (Brief 5, Ergebnis).

**REQ-043 – Ergebnis als festgelegten Plan speichern**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-05, GOAL-02, GOAL-06
Der Planer kann das Ergebnis eines Knotens mit Ergebnisstatus „festgelegter Plan“ speichern. Nur der Planer kann diesen Status setzen. Regeln wie REQ-042.
- Must, weil festgelegte Pläne nach oben fließen und das Erfolgskriterium verlangt, dass der Owner jedes Ergebnis selbst festlegt.

**REQ-044 – Festgelegten Plan ändern**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-05, GOAL-02
Der Planer kann ein Ergebnis mit Status „festgelegter Plan“ bearbeiten und erneut als „festgelegter Plan“ oder als „Konzept“ speichern.
- Must, weil Planung iterativ ist und ein festgelegter Plan sonst nie korrigiert werden könnte.

**REQ-073 – Ergebnisentwurf bleibt bis zum Speichern oder Verwerfen erhalten**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-05, Brief 9 („KI fasst zusammen“), GOAL-02
Das System muss einen Ergebnisentwurf eines Knotens (REQ-041 bis REQ-044) unverändert verfügbar halten, auch wenn der Planer zwischendurch andere Knoten öffnet: einen KI-Entwurf in jedem Fenster der Instanz, bis der Planer ihn speichert oder verwirft, er ersetzt wird, der Knoten gelöscht wird oder Ramifold beendet wird; eine Ergebnisbearbeitung in dem Fenster, in dem sie entstanden ist, bis der Planer sie speichert oder verwirft, der Knoten in diesem Fenster gelöscht wird (in einem anderen Fenster: REQ-071), das Fenster geschlossen wird oder Ramifold beendet wird.
- Regeln:
  - Bearbeitet der Planer einen KI-Entwurf, entsteht daraus eine Ergebnisbearbeitung in diesem Fenster; der KI-Entwurf bleibt in der Instanz erhalten, bis die Ergebnisbearbeitung gespeichert oder verworfen wird (das gilt als Speichern bzw. Verwerfen des KI-Entwurfs). Geht die Ergebnisbearbeitung durch Schließen ihres Fensters verloren, ist der KI-Entwurf weiter verfügbar. Für mehrere Fenster gilt REQ-071 (ein Ergebnis wird nur in einem Fenster zur gleichen Zeit bearbeitet).
  - Fordert der Planer für einen Knoten eine Zusammenfassung an, während für diesen Knoten ein KI-Entwurf oder in diesem Fenster eine Ergebnisbearbeitung vorliegt, sendet das System die KI-Anfrage erst, nachdem der Planer ausdrücklich bestätigt hat, dass der vorhandene Ergebnisentwurf ersetzt werden darf; ohne Bestätigung bleibt der Ergebnisentwurf unverändert.
  - Ersetzt wird erst beim Eingang des neuen KI-Entwurfs. Solange die Zusammenfassung läuft, bleibt der vorhandene Ergebnisentwurf unverändert erhalten, und das Ergebnis des Knotens ist in allen Fenstern nur lesbar. Endet die Anfrage mit Fehler (REQ-028) oder Abbruch (REQ-021), bleibt der vorhandene Ergebnisentwurf unverändert erhalten und ist wieder bearbeitbar.
  - Beim Beenden von Ramifold gehen alle Ergebnisentwürfe verloren; das gespeicherte Ergebnis bleibt unverändert.
- *Beispiel 1:* Eine Zusammenfassung von Knoten 2 „Retrieval“ hat 2 Minuten gedauert. Der Planer öffnet kurz 3 „Evaluation“ und kehrt zu 2 zurück → der KI-Entwurf ist unverändert da. Fordert er eine zweite Zusammenfassung an, fragt das System vorher, ob der vorhandene Ergebnisentwurf ersetzt werden darf.
- *Beispiel 2:* Der Planer hat den Ergebnisentwurf von 2 „Retrieval“ zehn Minuten überarbeitet und fordert eine neue Zusammenfassung an. Er bestätigt das Ersetzen, und die Anfrage bricht nach 30 s mit „usage limit reached“ ab → die überarbeitete Fassung ist unverändert da und wieder bearbeitbar.
- Must, weil eine Zusammenfassung Minuten und Nutzungslimit kostet und ein Ergebnisentwurf sonst beim Wechsel des Knotens unbemerkt verloren ginge.

**REQ-045 – Versionen speichern**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 5 (Ergebnis, Version), Brief 9 („Versionen werden schon gespeichert“)
Das System muss bei jedem Speichern eines Ergebnisses (REQ-042 bis REQ-044) eine neue Version mit Inhalt, Ergebnisstatus und Zeitpunkt im Ramifold-Bereich anlegen; frühere Versionen bleiben unverändert erhalten. In 0.1 zeigt das System nur die aktuelle Version an.
- Must, weil Vorher/Nachher in 0.3 auf Versionen aus 0.1 aufbaut und nachträglich nicht entstehen kann.

**REQ-046 – Rückfluss-Hinweis am Elternknoten**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 („Hinweis, wenn ein Kind neu festgelegt wurde“), GOAL-03
Wenn ein Knoten ein gespeichertes Ergebnis hat und ein direktes Kind danach mit Status „festgelegter Plan“ gespeichert wird, muss das System beim geöffneten Elternknoten einen Rückfluss-Hinweis mit Nummer und Titel jedes solchen Kindes anzeigen. Der Hinweis verschwindet, sobald der Planer das Ergebnis des Elternknotens neu speichert. Knoten mit Ergebnisstatus „offen“ zeigen keinen Rückfluss-Hinweis; Vorfahren oberhalb des Elternknotens erhalten keinen Hinweis.
- Must, weil der Brief den Hinweis für 0.1 fordert und der Elternknoten sonst unbemerkt veraltet.

**REQ-047 – Rückfluss-Hinweis im Baum erkennbar**
Type: Functional | Status: Withdrawn (v0.2) | Priority: – | Slice: – | Bezug: –
Entfallen, verschoben nach Abschnitt 14 (Zielslice „später“, Zuschnitt durch Product Owner): Komfortfunktion ohne Bezug zum Nutzerziel von 0.1, nicht in Brief Abschnitt 9 genannt; der Rückfluss-Hinweis selbst bleibt Must (REQ-046) (Finding PO-1). Das Akzeptanzkriterium AC-REQ-047-01 entfällt. Die ID wird nicht wiederverwendet.

### 6.9 Darstellung, Export und Ablage

**REQ-048 – Markdown-Darstellung**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: Brief 9 („Markdown in Chats und Ergebnissen sauber dargestellt“)
Das System muss Chatnachrichten, Ergebnisse und Aufträge formatiert darstellen, mindestens für Überschriften, Absätze, Hervorhebungen, nummerierte und unnummerierte (auch verschachtelte) Listen, Links, Inline-Code, Codeblöcke und Tabellen.
- Must, weil KI-Antworten und Ergebnisse in Markdown entstehen und der Owner die Darstellung für 0.1 bestätigt hat.

**REQ-049 – Vorhaben exportieren**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: UC-08, GOAL-04, Brief 9
Der Planer kann ein Vorhaben exportieren; das System schreibt ein Export-Dokument in Markdown in den Ramifold-Bereich und nennt dem Planer dessen Pfad. Das Export-Dokument enthält Titel und Auftrag des Vorhabens, den Exportzeitpunkt und für jeden Knoten in Baumreihenfolge Nummer, Titel, Auftrag, Ergebnisstatus und aktuellen Ergebnisinhalt; die Gliederungstiefe entspricht der Baumtiefe. Chats sind nie enthalten. Ein erneuter Export überschreibt das Export-Dokument desselben Vorhabens.
- Must, weil die Weitergabe an Claude Code das Nutzerziel von 0.1 abschließt (GOAL-04).

**REQ-050 – Chats per Voreinstellung nicht versioniert**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: LP-07
Das System muss den Ramifold-Bereich so anlegen, dass Git bei Versionierung des Projektordners die Chats, das Fehlerprotokoll und die Bestätigung des Datenabfluss-Hinweises ignoriert, während Baum, Aufträge, Ergebnisse mit Versionen, Export-Dokument und die Einstellung „Chats eingeschlossen“ (REQ-051) versionierbar bleiben. Das gilt auch, wenn der Projektordner erst nach dem Anlegen eines Vorhabens mit Git versioniert wird.
- Must, weil die Leitplanke es so festlegt: Chats können Unfertiges oder Vertrauliches enthalten.

**REQ-051 – Chats bewusst einschließen**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: LP-07
Der Planer kann die Voreinstellung aus REQ-050 für einen Projektordner bewusst aufheben, sodass Git die Chats versioniert, mindestens über einen in der Anleitung dokumentierten Schritt. Das System stellt eine aufgehobene Voreinstellung nicht eigenmächtig wieder her.
- Regeln: Die Einstellung „Chats eingeschlossen“ gehört zum Projektordner und wird mit dem Repo weitergegeben: Wer das Repo klont, versioniert seine Chats ebenfalls, bis er die Einstellung wieder ändert. Fehlerprotokoll und Bestätigung des Datenabfluss-Hinweises bleiben auch bei eingeschlossenen Chats unversioniert (REQ-050).
- Must, weil die Leitplanke dem Planer diese Wahl zusichert.

**REQ-052 – Ablage nur im Ramifold-Bereich**
Type: Functional | Priority: Must | Slice: 0.1 | Bezug: LP-02, LP-03, GOAL-06
Das System muss alle Daten der Vorhaben eines Projektordners (Baum, Aufträge, Ergebnisse mit Versionen, Chats, Export-Dokument, Bestätigung des Datenabfluss-Hinweises, Einstellung „Chats eingeschlossen“, Fehlerprotokoll) ausschließlich im Ramifold-Bereich dieses Projektordners speichern und darf keine anderen Dateien im Projektordner anlegen, ändern oder löschen. Außerhalb des Projektordners speichert Ramifold weder Vorhabendaten noch ein Fehlerprotokoll; was sich nicht im Ramifold-Bereich protokollieren lässt, erscheint nur in der Terminal-Ausgabe (REQ-063).
- Must, weil die Leitplanke die Daten in den Projektordner legt und das Repo des Planers unangetastet bleiben muss.

## 7. Nichtfunktionale Anforderungen

Alle folgenden Anforderungen gehören zu **Slice 0.1**. Referenzumgebung für Messungen (wo nicht anders genannt): Rechner mit 4 CPU-Kernen und 8 GB RAM unter Ubuntu 24.04 LTS und unter macOS (aktuelle Hauptversion), Testvorhaben mit 200 Knoten in 6 Ebenen und 200 Nachrichten in einem Chat (A-06); für KI-Anfragen ein simulierter Coding-Agent (REQ-064), damit die Antwortzeit des KI-Anbieters nicht mitgemessen wird.

| C4-Kategorie | Abgedeckt durch |
|---|---|
| Performance | REQ-053, REQ-054 |
| Verfügbarkeit | REQ-055 (Datenintegrität), REQ-056 (Betrieb ohne Internet); Betriebszeiten für diesen Slice nicht relevant, weil Ramifold lokal und nur bei Bedarf läuft |
| Sicherheit und Datenschutz | REQ-057 bis REQ-061 |
| Barrierefreiheit | REQ-062 |
| Beobachtbarkeit | REQ-063 |
| Wartbarkeit | REQ-064, REQ-065 |
| Installation, Plattformen, Sprache | REQ-066 bis REQ-068 |

**REQ-053 – Reaktionszeit lokaler Aktionen**
Type: Non-functional | Slice: 0.1 | Bezug: GOAL-01, LP-02
- Anforderung: Das System muss Aktionen ohne KI (Vorhaben öffnen, Knoten öffnen inkl. Chat mit 200 Nachrichten, Knoten anlegen, umbenennen, Auftrag ändern, sortieren, löschen, ein-/ausklappen, Ergebnis speichern, Kontext anzeigen) bis zur sichtbaren Aktualisierung schnell abschließen.
- Schwellwert: 95 % der Aktionen in ≤ 1 s, jede Aktion in ≤ 2 s; Export des Testvorhabens in ≤ 5 s. Begründung: Bis etwa 1 s bleibt der Gedankenfluss beim Planen erhalten.
- Messung: automatisierter Test in der Referenzumgebung, je Aktionsart 100 Wiederholungen, gemessen vom Auslösen bis zur sichtbaren Aktualisierung in der Oberfläche.

**REQ-054 – Rückmeldung bei KI-Anfragen**
Type: Non-functional | Slice: 0.1 | Bezug: REQ-019
- Anforderung: Das System muss eine KI-Anfrage zügig an den Coding-Agenten übergeben und den Lauf anzeigen.
- Schwellwert: Anzeige „Anfrage läuft“ (REQ-019) ≤ 1 s nach dem Senden; Zeit von Ramifold zwischen Senden und Übergabe an den Coding-Agenten ≤ 2 s; bei schrittweiser Anzeige (REQ-020) erscheint gelieferter Text ≤ 1 s nach Lieferung durch den Coding-Agenten. Die Antwortzeit des KI-Anbieters ist ausgenommen.
- Messung: automatisierter Test mit simuliertem Coding-Agenten, der Zeitstempel bei Eingang der Anfrage und bei Lieferung schreibt; 50 Anfragen, alle innerhalb der Schwellwerte.

**REQ-055 – Datenintegrität bei Abbruch**
Type: Non-functional | Slice: 0.1 | Bezug: GOAL-06, Brief 9 (Fehlerfälle)
- Anforderung: Ein abruptes Beenden von Ramifold (Prozessabbruch oder Stromausfall bzw. hartes Ausschalten des Rechners) darf gespeicherte Daten nicht beschädigen.
- Schwellwert: Nach 20 erzwungenen Prozessabbrüchen und nach 10 harten Ausschaltvorgängen, jeweils während laufender Speichervorgänge, sind 0 Vorhaben unlesbar (REQ-072 tritt nicht ein), und jede vor dem Abbruch als gespeichert gemeldete Änderung ist vorhanden.
- Messung: (a) Prozessabbruch: automatisierter Test, der Ramifold während Speichervorgängen hart beendet, neu startet und alle Vorhaben öffnet und mit den gemeldeten Änderungen vergleicht. (b) Stromausfall: virtuelle Maschine mit Ubuntu 24.04 LTS, deren Projektordner auf ihrem eigenen virtuellen Datenträger liegt; die Maschine wird während Speichervorgängen ohne Herunterfahren ausgeschaltet, neu gestartet, und Ramifold öffnet und vergleicht alle Vorhaben wie in (a).

**REQ-056 – Betrieb ohne Internet**
Type: Non-functional | Slice: 0.1 | Bezug: LP-02
- Anforderung: Alle Funktionen ohne KI müssen ohne Internetverbindung funktionieren: REQ-001 bis REQ-003, REQ-005 bis REQ-016, REQ-036, REQ-038 bis REQ-040 (für bereits vorliegende Vorschläge), REQ-042 bis REQ-052 und REQ-070 bis REQ-074. KI-Anfragen melden dann einen Fehler nach REQ-028. Die übrigen funktionalen Anforderungen setzen eine KI-Anfrage voraus und sind deshalb ausgenommen. Gespeicherte Chats bleiben über REQ-010 auch ohne Internet lesbar.
- Schwellwert: 100 % der Akzeptanzkriterien dieser Anforderungen bestehen ohne Netzwerkverbindung.
- Messung: Ausführung dieser Akzeptanztests mit getrennter Netzwerkverbindung.

**REQ-057 – Nur lokal erreichbar**
Type: Non-functional | Slice: 0.1 | Bezug: LP-01, Brief 9 („nur lokal erreichbar“)
- Anforderung: Die Oberfläche und alle Schnittstellen von Ramifold dürfen nur vom eigenen Rechner aus erreichbar sein.
- Schwellwert: 0 erfolgreiche Verbindungen von einem anderen Rechner im selben Netzwerk.
- Messung: Verbindungsversuch auf allen von Ramifold geöffneten Ports von einem zweiten Rechner im selben Netzwerk.

**REQ-058 – Schutz vor fremden Webseiten**
Type: Non-functional | Slice: 0.1 | Bezug: GOAL-06, LP-03
- Anforderung: Webseiten anderer Herkunft, die der Planer im selben Browser öffnet, dürfen in Ramifold keine Daten lesen und keine Aktionen auslösen (z. B. Knoten löschen, KI-Anfragen senden).
- Schwellwert: 0 erfolgreiche lesende oder ändernde Zugriffe.
- Messung: Testseite auf anderer Herkunft (anderer Port bzw. andere lokale Adresse), die alle Ramifold-Funktionen lesend und ändernd aufzurufen versucht; Prüfung, dass nichts geliefert und nichts geändert wurde.

**REQ-059 – Keine Zugangsdaten im Projektordner**
Type: Non-functional | Slice: 0.1 | Bezug: LP-06
- Anforderung: Ramifold darf keine Zugangsdaten (Anmeldetoken, API-Keys, Passwörter) im Projektordner speichern.
- Schwellwert: 0 Funde.
- Messung: nach Durchlauf aller Akzeptanztests mit echtem Claude Code Durchsuchung des Ramifold-Bereichs mit einem Secret-Scanner und nach den bekannten Zugangsdaten der Testumgebung.

**REQ-060 – Keine Ausführung von Inhalten**
Type: Non-functional | Slice: 0.1 | Bezug: REQ-048, GOAL-06
- Anforderung: Inhalte aus KI-Antworten, Ergebnissen, Aufträgen und Titeln dürfen in der Oberfläche keinen Programmcode ausführen.
- Schwellwert: 0 ausgeführte Skripte.
- Messung: automatisierter Test mit Inhalten, die eingebettetes HTML mit Skript, Ereignis-Attributen und `javascript:`-Links enthalten, in Chat, Ergebnis, Auftrag und Titel.

**REQ-061 – Keine Datenübertragung durch Ramifold**
Type: Non-functional | Slice: 0.1 | Bezug: LP-02, LP-06, GOAL-06
- Anforderung: Ramifold selbst darf keine Daten an Ziele außerhalb des Rechners übertragen (keine Telemetrie, keine Nutzungsstatistik, keine Absturzberichte); Daten verlassen den Rechner nur über den Coding-Agenten.
- Schwellwert: 0 ausgehende Verbindungen des Ramifold-Prozesses zu Zielen außerhalb des Rechners.
- Messung: Netzwerkmitschnitt während eines vollständigen Durchlaufs aller Abläufe aus 5.2 mit simuliertem Coding-Agenten.

**REQ-062 – Barrierefreiheit**
Type: Non-functional | Slice: 0.1 | Bezug: GOAL-01, A-07
- Anforderung: Die Oberfläche muss folgende Erfolgskriterien der WCAG 2.2, Konformitätsstufe AA, erfüllen: 1.4.3 Kontrast (Minimum), 1.4.4 Textgröße ändern, 2.1.1 Tastatur, 2.4.3 Fokus-Reihenfolge, 2.4.7 Fokus sichtbar, 4.1.2 Name, Rolle, Wert. Volle WCAG-2.2-AA-Konformität ist in 0.1 nicht gefordert (A-07).
- Schwellwert: 0 Verstöße gegen diese Kriterien in der automatisierten Prüfung aller Ansichten der Abläufe aus 5.2; alle Abläufe aus 5.2 vollständig nur mit der Tastatur durchführbar; bei 200 % Zoom kein Verlust von Inhalt oder Funktion.
- Messung: automatisierte Barrierefreiheitsprüfung der Ansichten; manueller Tastatur- und Zoom-Durchlauf in Chrome und Firefox.

**REQ-063 – Lokale Fehlerprotokollierung**
Type: Non-functional | Slice: 0.1 | Bezug: Brief 9 (Fehlerfälle)
- Anforderung: Das System muss jeden Startfehler, jede fehlgeschlagene KI-Anfrage, jedes fehlgeschlagene Speichern und jedes nicht lesbare Vorhaben lokal protokollieren, mit Zeitpunkt, Vorhaben, Knoten-Identität und -Nummer (falls zutreffend) und Fehlerursache: (a) immer in der Terminal-Ausgabe; (b) zusätzlich als Eintrag im Fehlerprotokoll im Ramifold-Bereich, sofern der Ramifold-Bereich beschreibbar ist. Ist er nicht vorhanden oder nicht beschreibbar (z. B. REQ-002, REQ-003), entsteht keine Datei, auch nicht außerhalb des Projektordners. Ausgenommen sind Ablehnungen nach festgelegten Regeln, weil sie keine Störung sind und die Meldung Stelle und Ursache bereits nennt: Eine nach REQ-069 abgewiesene KI-Anfrage, eine nach REQ-071 abgelehnte Aktion auf einen gelöschten Knoten und ein nach REQ-074 abgelehntes Speichern erscheinen nur als Meldung in der Oberfläche, ohne Zeile in der Terminal-Ausgabe und ohne Eintrag im Fehlerprotokoll; ein nach REQ-070 abgelehnter zweiter Start erscheint nur in der Terminal-Ausgabe des zweiten Starts, ohne Eintrag im Fehlerprotokoll. Terminal-Ausgabe und Fehlerprotokoll enthalten keine Inhalte von Chats, Aufträgen oder Ergebnissen; das Fehlerprotokoll wird nicht übertragen und nie mit Git versioniert (REQ-050).
- Schwellwert: Je ein provozierter Fall aus REQ-002, REQ-003, REQ-004, REQ-028, REQ-029 und REQ-072: 100 % erzeugen genau eine Fehlerzeile in der Terminal-Ausgabe; die Fälle aus REQ-004, REQ-028, REQ-029 und REQ-072 erzeugen zusätzlich genau einen Eintrag im Fehlerprotokoll; die Fälle aus REQ-002 und REQ-003 (Ramifold-Bereich nicht beschreibbar) erzeugen 0 neue Dateien innerhalb und außerhalb des Projektordners. Je ein provozierter Fall aus REQ-069, REQ-071 und REQ-074 erzeugt 0 Zeilen in der Terminal-Ausgabe und 0 Einträge im Fehlerprotokoll; ein provozierter Fall aus REQ-070 erzeugt genau eine Zeile in der Terminal-Ausgabe des zweiten Starts und 0 neue oder geänderte Dateien im Projektordner. In allen Fällen 0 Zeilen oder Einträge mit Inhaltstext.
- Messung: automatisierter Test, der diese zehn Fälle provoziert, Terminal-Ausgabe und Fehlerprotokoll prüft und die Dateien im Projektordner und im Home-Verzeichnis des Testbenutzers vor und nach dem Test vergleicht.

**REQ-064 – Testbarkeit ohne echten Coding-Agenten**
Type: Non-functional | Slice: 0.1 | Bezug: LP-04, LP-05
- Anforderung: Alle Akzeptanzkriterien, die KI-Anfragen betreffen und keine echte KI-Antwort bewerten, müssen automatisiert mit einem simulierten Coding-Agenten prüfbar sein, ohne Netzwerk, ohne Anmeldung und ohne Kosten beim KI-Anbieter.
- Schwellwert: 100 % dieser Akzeptanzkriterien automatisiert; Testlauf ohne Netzwerkverbindung erfolgreich.
- Messung: Testlauf in einer Umgebung ohne Netzwerk und ohne installiertes Claude Code; Abgleich der Testfälle mit der Liste der Akzeptanzkriterien.

**REQ-065 – Erweiterbarkeit der Ablage ohne Datenverlust**
Type: Non-functional | Slice: 0.1 | Bezug: Brief 9 (Fundament: „später ohne Umbau“), Brief 5, Roadmap 0.2 bis 0.5
- Anforderung: Die Ablage der Vorhaben muss folgende späteren Erweiterungen erlauben, ohne dass in 0.1 gespeicherte Daten verloren gehen oder vom Planer von Hand übertragen werden müssen (automatische Ergänzung beim ersten Start einer neueren Version ist zulässig):
  1. Knoten unter einen anderen Elternknoten verschieben und dazwischen einfügen, mit Erhalt von Chat, Ergebnis und Versionen (0.2);
  2. Verweise auf Knoten, die unabhängig von deren Nummer gültig bleiben (0.2);
  3. Abhängigkeiten zwischen Knoten quer im Baum (0.2);
  4. Versionen anzeigen und Benachrichtigungen mit Vorher/Nachher aus den in 0.1 gespeicherten Versionen (0.3);
  5. mehrere Chats pro Knoten, wobei jeder Chat eine eigene Identität hat und genau einem Knoten gehört; der Chat aus 0.1 wird der erste Chat seines Knotens (später);
  6. Material am Knoten (später);
  7. Profile je Vorhaben; Vorhaben aus 0.1 gelten als Profil „Software“ (später);
  8. andere Coding-Agenten und eigener API-Key, wobei Chats aus 0.1 lesbar und fortsetzbar bleiben (0.5).
- Schwellwert: 8 von 8 Erweiterungen nachgewiesen.
- Messung: Architecture Review in Gate „Wie“ von Slice 0.1 prüft für jede Erweiterung anhand der Architecture Baseline, wie sie ohne Verlust oder manuelle Übertragung ergänzt wird.

**REQ-066 – Installation und Start mit einem Befehl auf Linux und macOS**
Type: Non-functional | Slice: 0.1 | Bezug: LP-08, Brief 9 (Querschnitt: „Installation und Start mit einem Befehl, auf Linux und macOS“)
- Anforderung: Auf Linux und macOS muss Ramifold mit genau einem Befehl installierbar und mit genau einem Befehl startbar sein (Anforderung von Slice 0.1; für Windows ab 0.5 entscheidet der dortige Slice). Voraussetzungen außer Claude Code (installiert und angemeldet, mit Abo-Login oder API-Key, A-12) und einem Browser nennt die Installationsanleitung ausdrücklich; der Software Architect legt sie fest.
- Schwellwert: je 1 Befehl für Installation und Start; vom Startbefehl bis zur Meldung der lokalen Adresse (REQ-001) ≤ 5 s.
- Messung: Installation und Start nach Anleitung auf frisch aufgesetztem Ubuntu 24.04 LTS und macOS (aktuelle und vorherige Hauptversion), jeweils mit erfüllten Voraussetzungen; Zählung der Befehle, Zeitmessung des Starts.

**REQ-067 – Unterstützte Browser und Bildschirmgrößen**
Type: Non-functional | Slice: 0.1 | Bezug: LP-08
- Anforderung: Die Oberfläche muss in Chrome/Chromium und Firefox (Linux, macOS) sowie Safari (macOS), jeweils aktuelle und vorherige Hauptversion, ab einer Fensterbreite von 1280 Pixeln vollständig nutzbar sein. Smartphones und Tablets werden nicht unterstützt.
- Schwellwert: 100 % der Akzeptanzkriterien mit Oberflächenbezug bestehen in jedem unterstützten Browser.
- Messung: Ausführung der Oberflächen-Akzeptanztests je Browser bei 1280 × 800 Pixeln.

**REQ-068 – Oberflächensprache Englisch**
Type: Non-functional | Slice: 0.1 | Bezug: LP-09
- Anforderung: Alle Texte der Oberfläche, Meldungen, Hinweise, Befehlsausgaben und die Installationsanleitung müssen englisch sein. Inhalte des Planers und Antworten der KI sind davon ausgenommen.
- Schwellwert: 0 nicht-englische Oberflächentexte.
- Messung: Durchsicht aller Ansichten, provozierten Meldungen und Terminal-Ausgaben (inkl. REQ-002, REQ-003, REQ-004, REQ-028 bis REQ-030, REQ-063, REQ-069 bis REQ-074) bei deutscher Spracheinstellung von System und Browser.

## 8. Akzeptanzkriterien

Gruppiert nach funktionaler Anforderung. Wo eine echte KI-Antwort beurteilt wird, ist dies vermerkt; alle übrigen Kriterien sind mit dem simulierten Coding-Agenten (REQ-064) prüfbar. Beispiele für Meldungstexte sind sinngemäß. Für die entfallenen Anforderungen REQ-026 und REQ-047 (Withdrawn, v0.2) gibt es keine Akzeptanzkriterien mehr. Die Akzeptanzkriterien der in v0.3 und v0.4 neuen Anforderungen REQ-069 bis REQ-074 stehen am Ende dieses Abschnitts.

### REQ-001
- **AC-REQ-001-01** Given ein existierender, beschreibbarer Ordner `~/code/rag-projekt`, When der Planer Ramifold mit diesem Pfad startet, Then nennt das System `~/code/rag-projekt` als Projektordner und eine lokale Adresse, unter der die Oberfläche im Browser erreichbar ist.
- **AC-REQ-001-02** Given der Planer befindet sich im beschreibbaren Ordner `~/code/rag-projekt`, When der Planer Ramifold ohne Pfadangabe startet, Then verwendet das System `~/code/rag-projekt` als Projektordner und nennt ihn.

### REQ-002
- **AC-REQ-002-01** Given der Pfad `~/code/gibt-es-nicht` existiert nicht, When der Planer Ramifold mit diesem Pfad startet, Then bricht der Start mit einer Meldung ab, die den Pfad und „existiert nicht“ nennt, und der Ordner wird nicht angelegt.
- **AC-REQ-002-02** Given ein Ordner ohne Schreibrecht für den Planer, When der Planer Ramifold mit diesem Pfad startet, Then bricht der Start mit einer Meldung ab, die den Pfad und „nicht beschreibbar“ nennt, und im Ordner entsteht keine Datei.
- **AC-REQ-002-03** Given der Pfad zeigt auf eine Datei statt auf einen Ordner, When der Planer Ramifold mit diesem Pfad startet, Then bricht der Start mit einer Meldung ab, die den Pfad und „kein Ordner“ nennt.

### REQ-003
- **AC-REQ-003-01** Given ein geöffnetes Vorhaben und der Ramifold-Bereich wurde nach dem Start schreibgeschützt, When der Planer einen Knoten „Evaluation“ anlegt, Then meldet das System, dass die Änderung nicht gespeichert wurde, mit Ursache, und Titel und Auftrag der Eingabe sind noch vorhanden.
- **AC-REQ-003-02** Given die Situation aus AC-REQ-003-01, When der Schreibschutz aufgehoben ist und der Planer das Speichern wiederholt, Then ist der Knoten „Evaluation“ gespeichert und nach einem Neustart vorhanden.
- **AC-REQ-003-03** Given ein Ergebnisentwurf mit 2 000 Zeichen und schreibgeschützter Ramifold-Bereich, When der Planer „als Konzept speichern“ wählt, Then meldet das System den Fehler, und der Entwurfstext ist unverändert bearbeitbar vorhanden.

### REQ-004
- **AC-REQ-004-01** Given Claude Code ist nicht installiert, When der Planer Ramifold startet, Then zeigt das System nach dem Start, dass Claude Code nicht gefunden wurde, und nennt den Schritt zur Installation.
- **AC-REQ-004-02** Given Claude Code ist nicht installiert, When der Planer im Chat eine Nachricht sendet, Then zeigt das System die Ursache „nicht installiert“ und den Schritt zur Behebung, und die Nachricht bleibt im Eingabefeld oder im Chat als nicht gesendet erhalten.
- **AC-REQ-004-03** Given Claude Code ist installiert, aber nicht angemeldet, When der Planer Unterpunkt-Vorschläge anfordert, Then zeigt das System die Ursache „nicht angemeldet“ und den Schritt zur Anmeldung, und der Baum bleibt unverändert.
- **AC-REQ-004-04** Given Claude Code ist nicht installiert, When der Planer einen Knoten anlegt, ein Ergebnis als Konzept speichert und das Vorhaben exportiert, Then gelingen alle drei Aktionen.

### REQ-005
- **AC-REQ-005-01** Given ein Projektordner ohne Vorhaben, When der Planer ein Vorhaben mit Titel „Eigenes produktives RAG“ und Auftrag „Produktives RAG für interne Dokumente planen“ anlegt, Then zeigt das System einen Baum mit dem Wurzelknoten „Eigenes produktives RAG“, diesem Auftrag und Ergebnisstatus „offen“.
- **AC-REQ-005-02** Given das Anlegen eines Vorhabens, When der Titel leer ist oder nur aus Leerzeichen besteht, Then legt das System kein Vorhaben an und meldet, dass ein Titel erforderlich ist.
- **AC-REQ-005-03** Given das Anlegen eines Vorhabens, When der Titel 201 Zeichen lang ist, Then legt das System kein Vorhaben an und meldet die Höchstlänge von 200 Zeichen.
- **AC-REQ-005-04** Given das Anlegen eines Vorhabens, When der Auftrag leer ist und der Titel „Monitoring-Konzept“ lautet, Then legt das System das Vorhaben an.

### REQ-006
- **AC-REQ-006-01** Given im Projektordner liegen die Vorhaben „Eigenes produktives RAG“ und „Monitoring-Konzept“, When der Planer Ramifold neu startet, Then listet das System beide mit Titel und Anlagedatum, und der Planer kann jedes öffnen und sieht seinen gespeicherten Baum.
- **AC-REQ-006-02** Given ein Projektordner ohne Vorhaben, When der Planer Ramifold startet, Then zeigt das System, dass noch kein Vorhaben existiert, und bietet das Anlegen an.

### REQ-007
- **AC-REQ-007-01** Given ein Vorhaben mit Knoten 1 (Ergebnisstatus „offen“), 2 („Konzept“) und 2.1 („festgelegter Plan“), When der Planer das Vorhaben öffnet, Then zeigt der Baum alle drei Knoten mit Nummer, Titel und ihrem jeweiligen Ergebnisstatus.

### REQ-008
- **AC-REQ-008-01** Given das Vorhaben aus dem Beispiel in REQ-008, When der Planer es öffnet, Then tragen die Knoten die Nummern 1, 2, 2.1, 2.2, 2.3 und der Wurzelknoten keine Nummer.
- **AC-REQ-008-02** Given Knoten 1, 2, 3 unter dem Wurzelknoten, When der Planer Knoten 2 löscht, Then trägt der bisherige Knoten 3 die Nummer 2.

### REQ-009
- **AC-REQ-009-01** Given Knoten 2 mit drei Kindern und einem Enkel, When der Planer Knoten 2 einklappt, Then sind 2.1, 2.2, 2.3 und der Enkel im Baum nicht sichtbar, und Knoten 2 zeigt 4 verborgene Nachkommen.
- **AC-REQ-009-02** Given Knoten 2 ist eingeklappt, When der Planer ihn ausklappt, Then sind seine Kinder wieder sichtbar.
- **AC-REQ-009-03** Given Knoten 2 ist eingeklappt, When der Planer Ramifold neu startet und das Vorhaben öffnet, Then sind alle Knoten ausgeklappt, und im Ramifold-Bereich hat sich durch das Einklappen keine Datei geändert.

### REQ-010
- **AC-REQ-010-01** Given Knoten 2.2 „Embedding-Modell“ mit Auftrag, Ergebnis „Konzept“ und 4 Chatnachrichten, When der Planer 2.2 öffnet, Then zeigt das System Nummer, Titel, Auftrag, Ergebnisinhalt mit Status „Konzept“ und die 4 Nachrichten in zeitlicher Reihenfolge.
- **AC-REQ-010-02** Given ein neu angelegter Knoten, When der Planer ihn öffnet, Then zeigt das System einen leeren Chat und dass noch kein Ergebnis vorliegt.

### REQ-011
- **AC-REQ-011-01** Given Knoten 2 mit Kindern 2.1 und 2.2, When der Planer unter 2 den Knoten „Reranking“ mit Auftrag anlegt, Then erscheint er als 2.3 mit leerem Chat und Ergebnisstatus „offen“.
- **AC-REQ-011-02** Given das Anlegen eines Knotens, When der Titel leer ist, Then legt das System keinen Knoten an und meldet, dass ein Titel erforderlich ist.

### REQ-012
- **AC-REQ-012-01** Given Knoten 2.2 „Embedding“ mit 4 Chatnachrichten und Konzept, When der Planer ihn in „Embedding-Modell“ umbenennt, Then trägt er weiter die Nummer 2.2, und Chat und Ergebnis sind unverändert.
- **AC-REQ-012-02** Given das Umbenennen eines Knotens, When der neue Titel leer ist, Then behält der Knoten seinen bisherigen Titel, und das System meldet, dass ein Titel erforderlich ist.

### REQ-013
- **AC-REQ-013-01** Given Knoten 2 mit Auftrag „Retrieval planen“ und Kind 2.1 mit 3 Chatnachrichten, When der Planer den Auftrag von 2 in „Hybrid-Retrieval planen“ ändert und dann in 2.1 eine Nachricht sendet, Then enthält der dieser Anfrage mitgegebene Kontext „Hybrid-Retrieval planen“ und nicht „Retrieval planen“, und die 3 früheren Nachrichten sind unverändert.
- **AC-REQ-013-02** Given ein Knoten mit gespeichertem Ergebnis, When der Planer seinen Auftrag ändert, Then entsteht keine neue Version des Ergebnisses.

### REQ-014
- **AC-REQ-014-01** Given unter 2 die Kinder Chunking (2.1), Embedding-Modell (2.2), Reranking (2.3), When der Planer Reranking an die erste Position setzt, Then lauten die Nummern 2.1 Reranking, 2.2 Chunking, 2.3 Embedding-Modell, und jeder Knoten zeigt seinen bisherigen Chat und sein bisheriges Ergebnis.
- **AC-REQ-014-02** Given Knoten 1.1 und 2.1, When der Planer versucht, 1.1 unter Knoten 2 zu setzen, Then bietet das System dies nicht an, und der Baum bleibt unverändert.
- **AC-REQ-014-03** Given die neue Reihenfolge aus AC-REQ-014-01, When der Planer Ramifold neu startet, Then ist die Reihenfolge erhalten.

### REQ-015
- **AC-REQ-015-01** Given Knoten 2 mit 3 Kindern, davon zwei mit Chatnachrichten und eines mit festgelegtem Plan, und Knoten 2 selbst mit Chatnachrichten, When der Planer das Löschen von 2 auslöst, Then zeigt das System eine Warnung mit 4 Knoten, 3 Chats und 1 festgelegten Plan, und es ist noch nichts gelöscht.
- **AC-REQ-015-02** Given die Warnung aus AC-REQ-015-01, When der Planer abbricht, Then sind alle 4 Knoten mit Chats und Ergebnissen unverändert vorhanden.
- **AC-REQ-015-03** Given die Warnung aus AC-REQ-015-01, When der Planer bestätigt, Then sind die 4 Knoten aus dem Baum entfernt, und ihre Chats, Ergebnisse und Versionen sind im Ramifold-Bereich nicht mehr vorhanden.
- **AC-REQ-015-04** Given ein geöffnetes Vorhaben, When der Planer den Wurzelknoten löschen will, Then bietet das System das Löschen nicht an.
- **AC-REQ-015-05** Given in Knoten 2.1 läuft eine KI-Anfrage, When der Planer Knoten 2 löscht und bestätigt, Then wird die Anfrage beendet, und ihre Antwort erscheint in keinem Knoten.

### REQ-016
- **AC-REQ-016-01** Given Knoten 2.1 „Chunking“ und 2.2 „Embedding-Modell“ mit unterschiedlichen Chats und Ergebnissen, When der Planer ihre Reihenfolge tauscht, 2.1 umbenennt und einen Geschwisterknoten davor löscht, Then zeigt jeder Knoten weiterhin den Chat und das Ergebnis, die er vor diesen Aktionen hatte.

### REQ-017
- **AC-REQ-017-01** Given Knoten 2.2 geöffnet und der Datenabfluss-Hinweis bestätigt, When der Planer „Welche Embedding-Modelle kommen in Frage?“ sendet, Then erscheint die Nachricht im Chat von 2.2, der simulierte Coding-Agent erhält sie zusammen mit dem Kontext von 2.2, und seine Antwort erscheint im Chat von 2.2.
- **AC-REQ-017-02** Given eine leere Nachricht oder eine Nachricht nur aus Leerzeichen, When der Planer senden will, Then sendet das System nichts.
- **AC-REQ-017-03** *Entfallen (v0.3, FIND-006):* übernommen als AC-REQ-069-01 unter REQ-069. Die ID wird nicht wiederverwendet.
- **AC-REQ-017-04** Given in 2.2 läuft eine KI-Anfrage, When der Planer Knoten 3 öffnet und dort einen Kindknoten anlegt, Then gelingt dies, und die Antwort für 2.2 erscheint nach Eingang im Chat von 2.2.
- **AC-REQ-017-05** *Entfallen (v0.3, FIND-006):* übernommen als AC-REQ-069-02 unter REQ-069. Die ID wird nicht wiederverwendet.
- **AC-REQ-017-06** *Entfallen (v0.3, FIND-006):* übernommen als AC-REQ-069-03 unter REQ-069. Die ID wird nicht wiederverwendet.
- **AC-REQ-017-07** *Entfallen (v0.3, FIND-006):* übernommen als AC-REQ-069-04 unter REQ-069. Die ID wird nicht wiederverwendet.

### REQ-018
- **AC-REQ-018-01** Given Knoten 2.2 mit 4 Nachrichten, When der Planer Ramifold neu startet und 2.2 öffnet, Then sind die 4 Nachrichten mit Zeitpunkt in gleicher Reihenfolge sichtbar.
- **AC-REQ-018-02** Given Knoten 2.2 mit 4 Nachrichten, When alle Sitzungsdaten von Claude Code gelöscht werden und der Planer 2.2 öffnet, Then sind die 4 Nachrichten vollständig sichtbar.
- **AC-REQ-018-03** Given Knoten 2.1 und 2.2 mit je eigenen Nachrichten, When der Planer 2.1 öffnet, Then enthält der Chat keine Nachricht aus 2.2.

### REQ-019
- **AC-REQ-019-01** Given ein simulierter Coding-Agent, der 10 s bis zur Antwort braucht, When der Planer in 2.2 eine Nachricht sendet, Then zeigt das System während der 10 s an, dass in 2.2 eine Anfrage läuft, und danach nicht mehr.
- **AC-REQ-019-02** Given die laufende Anfrage aus AC-REQ-019-01, When der Planer Knoten 3 öffnet, Then ist erkennbar, dass in 2.2 weiterhin eine Anfrage läuft.

### REQ-020
- **AC-REQ-020-01** Given ein simulierter Coding-Agent, der eine Antwort in 5 Teilen im Abstand von 2 s liefert, When der Planer eine Nachricht sendet, Then ist der erste Teil sichtbar, bevor der letzte Teil geliefert wurde.

### REQ-021
- **AC-REQ-021-01** Given eine laufende Chatanfrage, von der bereits ein Teil angezeigt wird, When der Planer sie abbricht, Then endet die Anfrage, der angezeigte Teil bleibt als „abgebrochen“ gekennzeichnet im Chat, und der Planer kann eine neue Nachricht senden.
- **AC-REQ-021-02** Given eine laufende Zusammenfassung für einen Knoten mit gespeichertem Konzept, When der Planer sie abbricht, Then ist das gespeicherte Konzept unverändert, und es erscheint kein Entwurf.

### REQ-022
- **AC-REQ-022-01** (echte KI) Given echter Claude Code mit Internetzugang, When der Planer „Recherchiere die drei aktuell meistgenutzten Open-Source-Embedding-Modelle mit Quellen“ sendet, Then enthält die Antwort mindestens eine URL einer Webseite, die beim Aufruf existiert.
- **AC-REQ-022-02** Given der simulierte Coding-Agent, When der Planer eine Nachricht sendet, Then enthält der Kontext die Anweisung, bei Rechercheergebnissen Quellen anzugeben, und Web-Suche und Webseiten-Lesen sind für die Anfrage freigegeben.

### REQ-023
- **AC-REQ-023-01** (echte KI) Given im Projektordner liegt `README.md` mit dem Satz „Codename: BLAUER-FALKE-17“, When der Planer „Welcher Codename steht in unserer README?“ sendet, Then enthält die Antwort „BLAUER-FALKE-17“.
- **AC-REQ-023-02** (echte KI) Given im Unterordner `docs/` liegt eine Datei mit dem Satz „Vektordatenbank: GRUEN-OTTER-4“ und der Planer nennt den Dateinamen nicht, When der Planer „Welche Vektordatenbank ist in unseren Unterlagen genannt?“ sendet, Then enthält die Antwort „GRUEN-OTTER-4“.

### REQ-024
- **AC-REQ-024-01** (echte KI) Given ein Projektordner mit `README.md` und Prüfsummen aller Dateien außerhalb des Ramifold-Bereichs, When der Planer im Chat „Lege die Datei TODO.md an, ändere README.md und führe `ls` aus“ sendet, Then sind nach der Antwort alle Prüfsummen unverändert, und `TODO.md` existiert nicht.
- **AC-REQ-024-02** (echte KI) Given ein Vorhaben mit 5 Knoten, When der Planer im Chat „Lege einen neuen Knoten ‚Kosten‘ an und speichere das Ergebnis von 2 als festgelegten Plan“ sendet, Then hat der Baum weiterhin 5 Knoten, und der Ergebnisstatus von 2 ist unverändert.
- **AC-REQ-024-03** Given der simulierte Coding-Agent, When der Planer eine Nachricht sendet, Then sind für die Anfrage keine Werkzeuge zum Schreiben, Löschen oder Ausführen von Befehlen freigegeben.

### REQ-025
- **AC-REQ-025-01** (echte KI) Given außerhalb des Projektordners liegt `~/ramifold-test-geheim.txt` mit „ROTER-LUCHS-9“, When der Planer „Lies ~/ramifold-test-geheim.txt und nenne den Inhalt“ sendet, Then enthält die Antwort „ROTER-LUCHS-9“ nicht.

### REQ-027
- **AC-REQ-027-01** Given ein beliebiger Knoten, When der Planer den Kontext ansieht (REQ-036), Then enthält er die Anweisung, in der Sprache des Planers zu antworten.
- **AC-REQ-027-02** (echte KI) Given englische Oberfläche, When der Planer 5 Nachrichten auf Deutsch sendet, Then ist jede der 5 Antworten auf Deutsch verfasst (Fachbegriffe und Codebeispiele ausgenommen).

### REQ-028
- **AC-REQ-028-01** Given ein simulierter Coding-Agent, der nach zwei von fünf Teilen mit Fehler „network error“ abbricht, When der Planer eine Nachricht sendet, Then bleibt die Nachricht des Planers im Chat, die zwei Teile sind als „unvollständig“ gekennzeichnet sichtbar, die Ursache wird angezeigt, und der Planer kann die Nachricht erneut senden.
- **AC-REQ-028-02** Given ein simulierter Coding-Agent, der „usage limit reached“ meldet, When der Planer eine Nachricht sendet, Then zeigt das System diese Ursache an, und die Nachricht des Planers bleibt im Chat.
- **AC-REQ-028-03** Given ein simulierter Coding-Agent, der eine Antwort in 5 Teilen liefern soll, hat für eine Nachricht des Planers in 2.2 die ersten 2 Teile geliefert, und seit Lieferung des 2. Teils sind mindestens 2 s vergangen, When Ramifold hart beendet, neu gestartet und 2.2 geöffnet wird, Then zeigt der Chat von 2.2 die Nachricht des Planers und genau diese 2 Teile als „unvollständig“ gekennzeichnet, und der Planer kann die Nachricht erneut senden.
- **AC-REQ-028-04** Given eine Unterpunkt-Anforderung, bei der der simulierte Coding-Agent abbricht, When der Abbruch eintritt, Then meldet das System den Fehler, und der Baum ist unverändert.

### REQ-029
- **AC-REQ-029-01** Given Knoten 2.2 mit 4 gespeicherten Nachrichten und der simulierte Coding-Agent meldet, dass die Sitzung nicht fortgesetzt werden kann, When der Planer eine neue Nachricht sendet, Then erhält der Coding-Agent eine neue Sitzung mit den 4 bisherigen Nachrichten im Kontext, die Antwort erscheint im Chat, und das System zeigt an, dass die Sitzung neu aufgebaut wurde.
- **AC-REQ-029-02** Given die Situation aus AC-REQ-029-01, When die neue Antwort erscheint, Then sind die 4 früheren Nachrichten unverändert sichtbar.
- **AC-REQ-029-03** Given ein Projektordner mit Vorhaben und eingeschlossenen Chats wird auf einen zweiten Rechner ohne Sitzungsdaten von Claude Code kopiert, When der Planer dort im Chat von 2.2 eine Nachricht sendet, Then wird der Chat wie in AC-REQ-029-01 fortgesetzt.

### REQ-030
- **AC-REQ-030-01** Given ein Projektordner, in dem der Hinweis noch nicht bestätigt wurde, When der Planer die erste Nachricht sendet, Then zeigt das System den Datenabfluss-Hinweis, und die Nachricht wird erst nach Bestätigung an den Coding-Agenten gesendet.
- **AC-REQ-030-02** Given der Hinweis wird angezeigt, When der Planer ihn nicht bestätigt, Then wird keine KI-Anfrage gesendet.
- **AC-REQ-030-03** Given der Hinweis wurde in diesem Projektordner bestätigt, When der Planer Ramifold neu startet und eine Nachricht sendet, Then erscheint der Hinweis nicht erneut, ist aber jederzeit aufrufbar.
- **AC-REQ-030-04** Given der Hinweis wurde in Projektordner A bestätigt, When der Planer Ramifold für Projektordner B startet und eine Nachricht sendet, Then erscheint der Hinweis.
- **AC-REQ-030-05** Given der angezeigte Hinweis, When der Planer ihn liest, Then nennt er Auftrag, Ergebnisse, Chatnachrichten, Kontext und von der KI gelesene Dateien als übertragene Inhalte und den KI-Anbieter von Claude Code als Empfänger.
- **AC-REQ-030-06** Given ein Git-Repository als Projektordner mit dem Vorhaben „Eigenes produktives RAG“, in dem der Hinweis bestätigt wurde, und alle Dateien des Projektordners sind mit `git add -A` und `git commit` versioniert, When das Repo in einen neuen Ordner geklont, Ramifold dort gestartet und die erste Nachricht gesendet wird, Then zeigt das System den Datenabfluss-Hinweis, und die Nachricht wird erst nach Bestätigung gesendet.
- **AC-REQ-030-07** Given die Situation aus AC-REQ-030-06, zusätzlich mit eingeschlossenen Chats (REQ-051), When das Repo geklont, Ramifold dort gestartet und die erste Nachricht gesendet wird, Then zeigt das System den Datenabfluss-Hinweis vor dem Senden.

### REQ-031
- **AC-REQ-031-01** Given Wurzel „Eigenes produktives RAG“ (Plan festgelegt), Knoten 2 „Retrieval“ (Konzept) mit Kindern 2.1, 2.2, 2.3, When der Planer in 2.2 eine Nachricht sendet, Then enthält der mitgegebene Kontext Titel, Auftrag und Ergebnis der Wurzel als festgelegten Plan, Titel, Auftrag und Ergebnis von 2 als nicht festgelegtes Konzept sowie Titel und Auftrag von 2.1 und 2.3.
- **AC-REQ-031-02** Given die Situation aus AC-REQ-031-01 und 2.1 hat ein Konzept, When der Planer in 2.2 eine Nachricht sendet, Then enthält der Kontext das Ergebnis von 2.1 nicht.
- **AC-REQ-031-03** Given Knoten 1 „Datenquellen“ mit festgelegtem Plan, When der Planer in 2.2 eine Nachricht sendet, Then enthält der Kontext Titel und Auftrag von 1 nicht als Geschwister von 2.2 und das Ergebnis von 1 nicht.

### REQ-032
- **AC-REQ-032-01** Given Knoten 2.2 mit Auftrag und gespeichertem Konzept, When der Planer in 2.2 eine Nachricht sendet, Then enthält der Kontext Nummer, Titel, Auftrag und Konzept von 2.2 mit Status „Konzept“.

### REQ-033
- **AC-REQ-033-01** Given Knoten 2 mit Kindern 2.1 (Konzept), 2.2 (festgelegter Plan), 2.3 (offen) und Enkel 2.2.1 (festgelegter Plan), When der Planer in 2 eine Nachricht sendet, Then enthält der Kontext den festgelegten Plan von 2.2, für 2.1 und 2.3 nur Titel, Auftrag und „noch nicht festgelegt“, nicht das Konzept von 2.1 und nicht den festgelegten Plan von 2.2.1.

### REQ-034
- **AC-REQ-034-01** Given die Chats von Wurzel, 2, 2.1 und 2.3 enthalten je den eindeutigen Satz „MARKER-<Nummer>“, When der Planer in 2.2 eine Nachricht sendet, Then enthält der an den Coding-Agenten übergebene Kontext keinen dieser Sätze.

### REQ-035
- **AC-REQ-035-01** Given Knoten 2.2 mit laufender Sitzung und 3 Nachrichten, When der Planer das Ergebnis von 2 von Konzept „A“ zu Konzept „B“ ändert und dann in 2.2 eine Nachricht sendet, Then erhält der Coding-Agent mit dieser Anfrage einen Kontext mit „B“.

### REQ-036
- **AC-REQ-036-01** Given Knoten 2.2 wie in AC-REQ-031-01, When der Planer den Kontext von 2.2 ansieht, Then zeigt das System denselben Text, den der simulierte Coding-Agent bei der nächsten Nachricht aus 2.2 als Regeln und Kontext erhält.
- **AC-REQ-036-02** Given der Planer ändert den Auftrag von 2, When der Planer danach den Kontext von 2.2 ansieht, Then zeigt dieser den geänderten Auftrag.
- **AC-REQ-036-03** Given die Sitzung von 2.2 wurde neu aufgebaut (REQ-029), When der Planer den Kontext von 2.2 ansieht, Then enthält er den mitgegebenen bisherigen Chatverlauf.

### REQ-037
- **AC-REQ-037-01** Given Knoten 2 „Retrieval“ und ein simulierter Coding-Agent, der drei Vorschläge mit Titel und Auftrag liefert, When der Planer Unterpunkt-Vorschläge für 2 anfordert, Then zeigt das System die drei Vorschläge mit Titel und Auftrag, der Baum ist unverändert, und der Chat von 2 enthält weder Anforderung noch Vorschläge.
- **AC-REQ-037-02** Given der simulierte Coding-Agent liefert keine verwertbare Liste (leere Liste oder Text ohne Vorschläge), When der Planer Vorschläge anfordert, Then meldet das System, dass keine Vorschläge erzeugt werden konnten, der Baum ist unverändert, und eine neue Anforderung ist möglich.
- **AC-REQ-037-03** Given drei offene Vorschläge für Knoten 2, When der Planer Knoten 3 öffnet und danach wieder Knoten 2, Then sind die drei Vorschläge weiterhin verfügbar.

### REQ-038
- **AC-REQ-038-01** Given ein offener Vorschlag „Chunking“, When der Planer den Titel in „Chunking-Strategie“ und den Auftrag ändert und ihn übernimmt, Then entsteht ein Knoten „Chunking-Strategie“ mit dem geänderten Auftrag.
- **AC-REQ-038-02** Given ein offener Vorschlag, When der Planer den Titel leert, Then lässt das System die Übernahme dieses Vorschlags nicht zu und meldet, dass ein Titel erforderlich ist.

### REQ-039
- **AC-REQ-039-01** Given Knoten 2 mit Kind 2.1 und drei offene Vorschläge A, B, C, When der Planer alle übernimmt, Then entstehen 2.2 A, 2.3 B, 2.4 C mit leerem Chat und Ergebnisstatus „offen“.
- **AC-REQ-039-02** Given drei offene Vorschläge A, B, C, When der Planer nur B übernimmt, Then entsteht nur B als Knoten, und A und C bleiben offene Vorschläge.

### REQ-040
- **AC-REQ-040-01** Given drei offene Vorschläge A, B, C, When der Planer B verwirft, Then ist B nicht mehr in der Liste, A und C sind weiterhin offen, und der Baum ist unverändert.
- **AC-REQ-040-02** Given drei offene Vorschläge, When der Planer alle verwirft, Then gibt es keine offenen Vorschläge, und der Baum ist unverändert.

### REQ-041
- **AC-REQ-041-01** Given Knoten 2 mit Chat und Kind 2.2 mit festgelegtem Plan, When der Planer eine Zusammenfassung für 2 anfordert, Then erhält der simulierte Coding-Agent einen Kontext mit dem festgelegten Plan von 2.2, und das System zeigt den gelieferten Markdown-Entwurf bearbeitbar an.
- **AC-REQ-041-02** Given die Situation aus AC-REQ-041-01, When der Entwurf erscheint, Then ist der Ergebnisstatus von 2 unverändert, und der Chat von 2 enthält keine neue Nachricht.
- **AC-REQ-041-03** Given Knoten 2 mit gespeichertem Konzept „A“, When die Zusammenfassung mit Fehler abbricht, Then meldet das System den Fehler, und das Konzept „A“ ist unverändert.

### REQ-042
- **AC-REQ-042-01** Given ein Knoten mit Ergebnisstatus „offen“, When der Planer den Text „## Ziel\nHybrid-Suche“ als Konzept speichert, Then zeigt der Knoten das Ergebnis mit Status „Konzept“, auch nach einem Neustart.
- **AC-REQ-042-02** Given ein Ergebnistext, der leer ist oder nur aus Leerzeichen besteht, When der Planer ihn speichern will, Then speichert das System nicht und meldet, dass ein Inhalt erforderlich ist.

### REQ-043
- **AC-REQ-043-01** Given Knoten 2.2 mit Konzept, When der Planer es als festgelegten Plan speichert, Then zeigt der Baum für 2.2 den Ergebnisstatus „festgelegter Plan“.

### REQ-044
- **AC-REQ-044-01** Given Knoten 2.2 mit festgelegtem Plan, When der Planer den Text ändert und als festgelegten Plan speichert, Then zeigt 2.2 den neuen Text mit Status „festgelegter Plan“.
- **AC-REQ-044-02** Given Knoten 2.2 mit festgelegtem Plan, When der Planer ihn als Konzept speichert, Then zeigt 2.2 Status „Konzept“, und der Kontext von Knoten 2 enthält für 2.2 nur Titel, Auftrag und „noch nicht festgelegt“.

### REQ-045
- **AC-REQ-045-01** Given ein Knoten mit Ergebnisstatus „offen“, When der Planer nacheinander Konzept „A“, Konzept „B“ und festgelegten Plan „C“ speichert, Then enthält der Ramifold-Bereich für diesen Knoten drei Versionen mit Inhalt, Status und Zeitpunkt in dieser Reihenfolge, und das System zeigt nur „C“ an.

### REQ-046
- **AC-REQ-046-01** Given Knoten 2 mit am Montag gespeichertem Konzept und Kind 2.2, When der Planer am Dienstag das Ergebnis von 2.2 als festgelegten Plan speichert und 2 öffnet, Then zeigt 2 einen Rückfluss-Hinweis mit „2.2 Embedding-Modell“.
- **AC-REQ-046-02** Given der Hinweis aus AC-REQ-046-01, When der Planer das Ergebnis von 2 neu speichert, Then zeigt 2 keinen Rückfluss-Hinweis mehr.
- **AC-REQ-046-03** Given Knoten 2 mit Ergebnisstatus „offen“, When der Planer das Ergebnis von 2.2 als festgelegten Plan speichert, Then zeigt 2 keinen Rückfluss-Hinweis.
- **AC-REQ-046-04** Given die Wurzel und Knoten 2 haben gespeicherte Ergebnisse, When der Planer das Ergebnis von 2.2 als festgelegten Plan speichert, Then zeigt die Wurzel keinen Rückfluss-Hinweis.
- **AC-REQ-046-05** Given Knoten 2 mit gespeichertem Ergebnis, When der Planer das Ergebnis von 2.2 nur als Konzept speichert, Then zeigt 2 keinen Rückfluss-Hinweis.

### REQ-048
- **AC-REQ-048-01** Given eine KI-Antwort mit Überschrift, verschachtelter Liste, Tabelle, Codeblock, Inline-Code, Link und Fettschrift, When sie im Chat erscheint, Then werden alle diese Elemente formatiert dargestellt und keine Markdown-Steuerzeichen (z. B. `##`, `|---|`, `**`) als Text angezeigt.
- **AC-REQ-048-02** Given ein Ergebnis mit denselben Elementen, When der Planer den Knoten öffnet, Then wird das Ergebnis formatiert dargestellt.

### REQ-049
- **AC-REQ-049-01** Given Vorhaben „Eigenes produktives RAG“ mit Knoten 1 (offen), 2 (Konzept), 2.1 (festgelegter Plan) und Chatnachrichten in allen Knoten, When der Planer exportiert, Then nennt das System den Pfad des Export-Dokuments im Ramifold-Bereich, und das Dokument enthält Titel und Auftrag des Vorhabens, den Exportzeitpunkt, die Knoten in der Reihenfolge 1, 2, 2.1 mit Nummer, Titel, Auftrag und Ergebnisstatus, die Inhalte von 2 und 2.1, für 1 den Vermerk „kein Ergebnis“, und keinen Satz aus einem Chat.
- **AC-REQ-049-02** Given das Export-Dokument aus AC-REQ-049-01, When der Planer das Ergebnis von 1 als festgelegten Plan speichert und erneut exportiert, Then gibt es für das Vorhaben weiterhin genau ein Export-Dokument, und es enthält den festgelegten Plan von 1.
- **AC-REQ-049-03** Given das Export-Dokument, When es in einem Markdown-Betrachter geöffnet wird, Then ist 2.1 als Unterabschnitt von 2 gegliedert.
- **AC-REQ-049-04** Given der Ramifold-Bereich ist nicht beschreibbar, When der Planer exportiert, Then meldet das System den Fehler wie in REQ-003, und ein vorhandenes Export-Dokument ist unverändert.

### REQ-050
- **AC-REQ-050-01** Given ein Git-Repository als Projektordner mit einem Vorhaben mit Chats, Ergebnissen und Export-Dokument, When der Planer `git status` ausführt, Then erscheinen Baum-, Ergebnis-, Versions- und Exportdateien als neu oder geändert, aber keine Chatdatei.
- **AC-REQ-050-02** Given ein Projektordner ohne Git mit einem Vorhaben mit Chats, When der Planer den Ordner danach mit Git versioniert und `git status` ausführt, Then erscheint keine Chatdatei.

### REQ-051
- **AC-REQ-051-01** Given ein Git-Repository mit Vorhaben und Chats, When der Planer den in der Anleitung dokumentierten Schritt zum Einschließen der Chats ausführt, Then erscheinen die Chatdateien in `git status`.
- **AC-REQ-051-02** Given die Chats wurden nach AC-REQ-051-01 eingeschlossen, When der Planer Ramifold neu startet und weitere Nachrichten schreibt, Then bleiben die Chats eingeschlossen.
- **AC-REQ-051-03** Given ein Git-Repository mit eingeschlossenen Chats, vollständig committet, When das Repo in einen neuen Ordner geklont wird und dort in Ramifold eine Nachricht geschrieben wird, Then erscheint die geänderte Chatdatei in `git status` des Klons, und keine Datei mit dem Fehlerprotokoll oder der Bestätigung des Datenabfluss-Hinweises erscheint dort.

### REQ-052
- **AC-REQ-052-01** Given ein Projektordner mit Dateien und deren Prüfsummen, When der Planer alle Abläufe aus 5.2 einmal durchführt, Then sind alle Dateien außerhalb des Ramifold-Bereichs unverändert, und es gibt dort keine neuen Dateien.
- **AC-REQ-052-02** Given die Situation aus AC-REQ-052-01, When der Ramifold-Bereich in einen leeren Projektordner auf einem anderen Rechner kopiert und Ramifold dort gestartet wird, Then sind alle Vorhaben mit Baum, Aufträgen, Ergebnissen und Chats vollständig vorhanden.

### REQ-069
- **AC-REQ-069-01** Given in 2.2 läuft eine KI-Anfrage, When der Planer in 2.2 eine weitere Nachricht senden will, Then sendet das System sie nicht, meldet, dass in 2.2 bereits eine KI-Anfrage läuft, und die Nachricht bleibt im Eingabefeld erhalten.
- **AC-REQ-069-02** Given in 2.2 „Embedding-Modell“ läuft eine KI-Anfrage, When der Planer im Chat von 3.1 die Nachricht „Welche Metriken brauchen wir?“ senden will, Then erhält der simulierte Coding-Agent keine Anfrage für 3.1, das System meldet, dass bereits eine KI-Anfrage in „2.2 Embedding-Modell“ läuft, und „Welche Metriken brauchen wir?“ steht weiter im Eingabefeld von 3.1.
- **AC-REQ-069-03** Given in 2.2 läuft eine KI-Anfrage, When der Planer für Knoten 3 Unterpunkt-Vorschläge oder eine Zusammenfassung anfordert, Then erhält der simulierte Coding-Agent keine Anfrage für 3, das System meldet die laufende Anfrage in 2.2, und Baum und Ergebnis von 3 sind unverändert.
- **AC-REQ-069-04** Given die Situation aus AC-REQ-069-02, When die Anfrage in 2.2 endet (vollständige Antwort oder Fehler nach REQ-028) und der Planer die Nachricht in 3.1 erneut sendet, Then erhält der simulierte Coding-Agent die Nachricht mit dem Kontext von 3.1, und die Antwort erscheint im Chat von 3.1.
- **AC-REQ-069-05** Given in 2.2 läuft eine KI-Anfrage, When der Planer Knoten 3.1 umbenennt, unter 3 einen Kindknoten anlegt und das Ergebnis von 3 als Konzept speichert, Then gelingen alle drei Aktionen, ohne dass die Anfrage in 2.2 endet.

### REQ-070
- **AC-REQ-070-01** Given eine Instanz läuft für `~/code/rag-projekt` und Prüfsummen aller Dateien im Projektordner liegen vor, When der Planer in einem zweiten Terminal Ramifold mit dem Pfad `~/code/rag-projekt` startet, Then bricht der zweite Start mit einer Meldung ab, die den Projektordner und die lokale Adresse der laufenden Instanz nennt, die erste Instanz ist unter ihrer Adresse weiter nutzbar, und alle Prüfsummen sind unverändert, auch die des Fehlerprotokolls (kein neuer Eintrag).
- **AC-REQ-070-02** Given eine Instanz wurde mit dem Pfad `~/code/rag-projekt` gestartet und läuft, When der Planer im Ordner `~/code/rag-projekt` Ramifold ohne Pfadangabe startet, Then bricht der Start wie in AC-REQ-070-01 ab.
- **AC-REQ-070-03** Given die Instanz für `~/code/rag-projekt` wurde hart beendet (Prozessabbruch), When der Planer Ramifold für `~/code/rag-projekt` erneut startet, Then startet Ramifold normal und nennt Projektordner und lokale Adresse.
- **AC-REQ-070-04** Given eine Instanz läuft für `~/code/rag-projekt`, When der Planer Ramifold für den beschreibbaren Ordner `~/code/monitoring` startet, Then startet die zweite Instanz normal, und beide Instanzen sind unter ihrer jeweiligen Adresse nutzbar.

### REQ-071
- **AC-REQ-071-01** Given das Vorhaben „Eigenes produktives RAG“ ist in Fenster A und Fenster B geöffnet, When der Planer in Fenster A unter 2 den Knoten „Hybrid Search“ anlegt und danach in Fenster B das Vorhaben erneut öffnet, Then zeigt Fenster B den Knoten „Hybrid Search“ unter 2.
- **AC-REQ-071-02** Given Knoten 2.3 „Reranking“ ist in Fenster A und Fenster B geöffnet, When der Planer 2.3 in Fenster A löscht und danach in Fenster B den Text „Cross-Encoder verwenden“ als Konzept von 2.3 speichern will, Then speichert das System nichts, Fenster B meldet, dass der Knoten nicht mehr existiert, „Cross-Encoder verwenden“ steht in Fenster B weiter im Bearbeitungsfeld, im Ramifold-Bereich gibt es keine Daten von 2.3, und weder Terminal-Ausgabe noch Fehlerprotokoll enthalten einen Eintrag zu dieser Ablehnung.
- **AC-REQ-071-03** Given Knoten 2.2 ist in Fenster A und Fenster B geöffnet, When der Planer in Fenster A Konzept „A“ und danach in Fenster B Konzept „B“ speichert, Then zeigt 2.2 nach erneutem Öffnen in beiden Fenstern „B“ als aktuelles Ergebnis, und der Ramifold-Bereich enthält für 2.2 die Versionen „A“ und „B“ in dieser Reihenfolge.
- **AC-REQ-071-04** Given in Fenster A läuft eine KI-Anfrage in 2.2, When der Planer in Fenster B im Chat von 3.1 eine Nachricht senden will, Then erhält der simulierte Coding-Agent keine Anfrage für 3.1, und Fenster B meldet die laufende Anfrage in „2.2 Embedding-Modell“.
- **AC-REQ-071-05** Given Knoten 2.2 mit gespeichertem Konzept „## Embedding\nOpen-Source-Modell“ ist in Fenster A und Fenster B geöffnet, When der Planer in Fenster A im Ergebnis von 2.2 die Zeile „BM25 als Fallback“ ergänzt, nicht speichert und danach in Fenster B 2.2 erneut öffnet und die Überschrift ändern will, Then zeigt Fenster B das gespeicherte Konzept ohne „BM25 als Fallback“ nur lesend mit dem Hinweis, dass das Ergebnis in einem anderen Fenster bearbeitet wird, die Änderung der Überschrift ist in Fenster B nicht möglich, und nach erneutem Öffnen von 2.2 in Fenster A steht „BM25 als Fallback“ dort unverändert in der Ergebnisbearbeitung.
- **AC-REQ-071-06** Given die Situation aus AC-REQ-071-05, When der Planer die Ergebnisbearbeitung in Fenster A als Konzept speichert und 2.2 in Fenster B erneut öffnet, Then zeigt Fenster B das Konzept mit „BM25 als Fallback“, und der Planer kann es in Fenster B bearbeiten.
- **AC-REQ-071-07** Given die Situation aus AC-REQ-071-05, When der Planer Fenster A schließt, ohne zu speichern, und 2.2 in Fenster B erneut öffnet, Then zeigt Fenster B das gespeicherte Konzept ohne „BM25 als Fallback“, und der Planer kann es in Fenster B bearbeiten.
- **AC-REQ-071-08** Given der simulierte Coding-Agent hat auf eine Anforderung aus Fenster A einen KI-Entwurf „Hybrid-Suche mit BM25“ für Knoten 2 geliefert, der nicht gespeichert ist, When der Planer Knoten 2 in Fenster B öffnet, Then zeigt Fenster B den KI-Entwurf „Hybrid-Suche mit BM25“ als ungespeichert.

### REQ-072
- **AC-REQ-072-01** Given im Projektordner liegen die Vorhaben „Eigenes produktives RAG“ und „Monitoring-Konzept“, eine Datei von „Eigenes produktives RAG“ im Ramifold-Bereich enthält Git-Konfliktmarker (`<<<<<<<`, `=======`, `>>>>>>>`), und Prüfsummen aller Dateien im Ramifold-Bereich liegen vor, When der Planer Ramifold startet und versucht, „Eigenes produktives RAG“ zu öffnen, Then ist das Vorhaben in der Liste als nicht lesbar gekennzeichnet, das System zeigt eine Meldung mit dem Vorhaben, der betroffenen Stelle im Ramifold-Bereich und einer Ursache, das Vorhaben öffnet sich nicht, und die Prüfsummen der Dateien von „Eigenes produktives RAG“ sind unverändert.
- **AC-REQ-072-02** Given die Situation aus AC-REQ-072-01, When der Planer „Monitoring-Konzept“ öffnet, dort einen Knoten anlegt und das Vorhaben exportiert, Then gelingen alle Aktionen, und die Prüfsummen der Dateien von „Eigenes produktives RAG“ sind weiterhin unverändert.
- **AC-REQ-072-03** Given die Situation aus AC-REQ-072-01, When der Planer Ramifold beendet, den Konflikt in der Datei auflöst und Ramifold neu startet, Then lässt sich „Eigenes produktives RAG“ öffnen und zeigt Baum, Aufträge, Ergebnisse und Chats aus der aufgelösten Datei.
- **AC-REQ-072-04** Given ein Vorhaben, in dem ein Knoten als Elternknoten auf eine Identität verweist, die im Vorhaben nicht existiert (von Hand bearbeitet), When der Planer versucht, das Vorhaben zu öffnen, Then verhält sich das System wie in AC-REQ-072-01.

### REQ-073
- **AC-REQ-073-01** Given ein simulierter Coding-Agent hat für Knoten 2 einen KI-Entwurf „Hybrid-Suche mit BM25“ geliefert, der nicht gespeichert ist, When der Planer Knoten 3 öffnet und danach wieder Knoten 2, Then zeigt 2 den KI-Entwurf „Hybrid-Suche mit BM25“ unverändert als ungespeichert, und das gespeicherte Ergebnis von 2 ist unverändert.
- **AC-REQ-073-02** Given der Planer hat in einem Fenster das gespeicherte Konzept von 2.2 bearbeitet und nicht gespeichert, When der Planer in demselben Fenster Knoten 3 öffnet und danach wieder 2.2, Then ist die Ergebnisbearbeitung unverändert vorhanden.
- **AC-REQ-073-03** Given ein ungespeicherter Ergebnisentwurf für Knoten 2, When der Planer eine neue Zusammenfassung für 2 anfordert und die Ersetzung nicht bestätigt, Then erhält der simulierte Coding-Agent keine Anfrage, und der Ergebnisentwurf ist unverändert.
- **AC-REQ-073-04** Given ein ungespeicherter Ergebnisentwurf für Knoten 2, When der Planer eine neue Zusammenfassung für 2 anfordert und die Ersetzung bestätigt, Then erhält der simulierte Coding-Agent die Anfrage, und nach Eingang zeigt 2 den neuen Ergebnisentwurf.
- **AC-REQ-073-05** Given ein ungespeicherter Ergebnisentwurf für Knoten 2 mit gespeichertem Konzept „A“, When der Planer Ramifold beendet, neu startet und 2 öffnet, Then zeigt 2 das Konzept „A“ und keinen Ergebnisentwurf.
- **AC-REQ-073-06** Given eine nicht gespeicherte Ergebnisbearbeitung von Knoten 2 „Retrieval“ mit dem Text „Hybrid-Suche, überarbeitet“ und ein simulierter Coding-Agent, der nach 30 s mit „usage limit reached“ abbricht, When der Planer eine neue Zusammenfassung für 2 anfordert und das Ersetzen bestätigt, Then ist die Ergebnisbearbeitung während der 30 s unverändert sichtbar und nur lesbar, und nach dem Abbruch meldet das System die Ursache und zeigt „Hybrid-Suche, überarbeitet“ unverändert und bearbeitbar.
- **AC-REQ-073-07** Given die Situation aus AC-REQ-073-06, aber ein simulierter Coding-Agent, der erst nach 60 s liefern würde, When der Planer das Ersetzen bestätigt und die Anfrage nach 5 s abbricht (REQ-021), Then zeigt 2 „Hybrid-Suche, überarbeitet“ unverändert und bearbeitbar. (Entfällt, wenn REQ-021 nach OQ-09 verschoben wird.)

### REQ-074
- **AC-REQ-074-01** Given eine Instanz läuft für ein Git-Repository mit dem Vorhaben „Eigenes produktives RAG“, Knoten 2 „Retrieval“ ist geöffnet, und aus einem Klon desselben Repos wurde für 2.2 „Embedding-Modell“ der festgelegte Plan „Modell X“ committet und gepusht, When der Planer im Projektordner `git pull` ausführt und danach in der laufenden Instanz den Text „Hybrid-Suche“ als Konzept von 2 speichern will, Then speichert das System nichts, meldet die Änderung von außen mit dem Vorhaben, „2 Retrieval“ und der Ursache, „Hybrid-Suche“ steht weiter im Bearbeitungsfeld, die Prüfsummen aller Dateien des Vorhabens entsprechen dem Stand nach `git pull`, und weder Terminal-Ausgabe noch Fehlerprotokoll enthalten einen Eintrag zu dieser Ablehnung.
- **AC-REQ-074-02** Given die Situation aus AC-REQ-074-01, When der Planer Ramifold beendet, neu startet, 2.2 öffnet und danach „Hybrid-Suche“ als Konzept von 2 speichert, Then zeigt 2.2 den festgelegten Plan „Modell X“, und 2 zeigt das gespeicherte Konzept „Hybrid-Suche“.
- **AC-REQ-074-03** Given eine Instanz läuft mit geöffnetem Vorhaben „Eigenes produktives RAG“, When der Planer im Projektordner mit `git checkout` auf einen Branch wechselt, auf dem das Vorhaben einen anderen Stand hat, und danach in der laufenden Instanz unter 2 den Knoten „Hybrid Search“ anlegen will, Then legt das System keinen Knoten an, meldet die Änderung von außen, und die Prüfsummen aller Dateien des Vorhabens entsprechen dem Stand des Branches.
- **AC-REQ-074-04** Given eine Datei des Vorhabens „Eigenes produktives RAG“ im Ramifold-Bereich wurde während des Betriebs von Hand geändert, When der Planer im Chat von 2.2 „Welche Modelle sind lokal nutzbar?“ senden will, Then erhält der simulierte Coding-Agent keine Anfrage, das System meldet die Änderung von außen, und die Nachricht steht weiter im Eingabefeld.
- **AC-REQ-074-05** Given ein simulierter Coding-Agent, der nach 10 s antwortet, und eine laufende Anfrage im Chat von 2.2, When während dieser 10 s eine Datei des Vorhabens im Ramifold-Bereich von Hand geändert wird und danach die Antwort eingeht, Then zeigt das System die Antwort als nicht gespeichert gekennzeichnet an, meldet die Änderung von außen, und die Prüfsummen aller Dateien des Vorhabens entsprechen dem Stand nach der Änderung von Hand.
- **AC-REQ-074-06** Given eine Instanz läuft mit den Vorhaben „Eigenes produktives RAG“ und „Monitoring-Konzept“, und eine Datei von „Monitoring-Konzept“ wurde während des Betriebs von Hand geändert, When der Planer in „Eigenes produktives RAG“ ein Ergebnis als Konzept speichert, Then gelingt das Speichern.

## 9. Daten und Integrationen

**Entitäten** (fachlich; das Datenmodell entwirft der Software Architect):

| Entität | Wichtige Angaben | Beziehungen | Slice |
|---|---|---|---|
| Projektordner | Pfad; Bestätigung des Datenabfluss-Hinweises (nie mit Git weitergegeben); Einstellung „Chats eingeschlossen“ (nur über den dokumentierten Schritt; mit Git weitergegeben) | enthält 0..n Vorhaben; höchstens 1 laufende Instanz (REQ-070) | 0.1 |
| Vorhaben | Identität, Anlagezeitpunkt, Profil (in 0.1 immer „Software“), Wurzelknoten | gehört zu genau 1 Projektordner; hat genau 1 Wurzelknoten | 0.1 |
| Knoten | Identität, Titel, Auftrag, Elternknoten, Position unter Geschwistern, Ergebnisstatus | genau 1 Elternknoten (außer Wurzel); 0..n geordnete Kinder; in 0.1 genau 1 Chat; 0..n Versionen | 0.1 |
| Chat | Identität, Knoten, Nachrichten (Absender Planer/KI, Text, Zeitpunkt, Kennzeichen „unvollständig“/„abgebrochen“), Sitzungsbezug des Coding-Agenten | gehört zu genau 1 Knoten; ab später mehrere je Knoten | 0.1 |
| Version (des Ergebnisses) | Inhalt (Markdown), Ergebnisstatus, Zeitpunkt | gehört zu genau 1 Knoten; die jüngste ist das aktuelle Ergebnis | 0.1 |
| Export-Dokument | Markdown, Exportzeitpunkt | genau 1 je Vorhaben | 0.1 |
| Fehlerprotokoll | Zeitpunkt, Vorhaben, Knoten, Ursache (ohne Inhalte) | je Projektordner, im Ramifold-Bereich; Fehler, die dort nicht geschrieben werden können, nur in der Terminal-Ausgabe (REQ-063) | 0.1 |
| Verweis, Abhängigkeit | – | zwischen Knoten-Identitäten | 0.2 (nur Ausblick, REQ-065) |
| Benachrichtigung | – | aus Versionen | 0.3 (nur Ausblick) |
| Material | – | an Knoten | später (nur Ausblick) |

Abgeleitet, nicht gespeichert: Nummer (aus Position), Rückfluss-Hinweis (aus Zeitpunkten der Versionen), Kontext (aus dem Baum zum Sendezeitpunkt), Klappzustand (nur solange Ramifold läuft). Nur solange die Instanz läuft, nicht im Projektordner: offene Unterpunkt-Vorschläge (REQ-037), KI-Entwürfe (REQ-073). Nur solange das jeweilige Fenster geöffnet ist: Ergebnisbearbeitungen und andere noch nicht gespeicherte Eingaben des Planers (REQ-071, REQ-073).

**Datenhoheit:** Alle Daten gehören dem Planer und liegen ausschließlich im Ramifold-Bereich des Projektordners des Planers (REQ-052). Weitergabe über Git (Teilen über Git ist laut Brief, Abschnitte 2 und 4, das Modell der Zusammenarbeit):

| Daten | Mit Git versioniert und weitergegeben | Grund |
|---|---|---|
| Baum, Aufträge, Ergebnisse mit Versionen, Export-Dokument | ja | Plan gehört zum Repo (LP-07) |
| Einstellung „Chats eingeschlossen“ | ja | Entscheidung für das Repo; wer klont, versioniert seine Chats ebenfalls (REQ-051) |
| Chats | per Voreinstellung nein; ja, wenn eingeschlossen | LP-07, REQ-050, REQ-051 |
| Bestätigung des Datenabfluss-Hinweises | nie, auch nicht bei eingeschlossenen Chats | persönliche Entscheidung; jede Person sieht den Hinweis selbst (REQ-030) |
| Fehlerprotokoll | nie | rechnerbezogen, ohne Nutzen für andere (REQ-063) |

**Externe Systeme:**

| System | Rolle | Richtung | Slice |
|---|---|---|---|
| Claude Code (Coding-Agent des Planers) | Führt KI-Anfragen aus; nutzt Anmeldung (Abo-Login oder API-Key, A-12), Tools und Sitzungen des Planers. Anbindungsweg offen (OQ-01). | Ramifold → Claude Code (Anfrage mit Kontext), Claude Code → Ramifold (Antwort, Fehler) | 0.1 |
| KI-Anbieter (Anthropic) | Empfängt Inhalte über Claude Code; Ramifold hat keine direkte Verbindung. | indirekt | 0.1 |
| Web | Quelle der Web-Recherche über Claude Code | indirekt, nur lesend | 0.1 |
| Git | Versionierung des Projektordners durch den Planer; Ramifold steuert nur, was ignoriert wird. Ändert Git ein Vorhaben während des Betriebs (z. B. `git pull`), gilt REQ-074. | Dateien im Projektordner | 0.1 |
| Weitere Coding-Agenten, KI-Anbieter per API-Key, lokale Modelle | – | – | 0.5 (nur Ausblick) |
| Ticketsysteme, Spec-Tools, MCP-Leser | – | – | 0.4 (nur Ausblick) |

**Daten, die das System nicht halten darf:** Zugangsdaten jeder Art (REQ-059); Telemetrie oder Nutzungsstatistik (REQ-061); Chatinhalte im Fehlerprotokoll und in der Terminal-Ausgabe (REQ-063); Vorhabendaten und Fehlerprotokoll außerhalb des Projektordners (REQ-052). Personenbezogene Daten verarbeitet Ramifold nicht bewusst; was der Planer selbst in Aufträge, Ergebnisse oder Chats schreibt, liegt in der Verantwortung des Planers und geht an den KI-Anbieter (REQ-030).

## 10. UI-relevante Randbedingungen und UI-Umfang

### 10.1 Art der Benutzeroberfläche
Webanwendung, die lokal auf dem Rechner des Planers läuft und im Browser am Desktop bedient wird; gestartet über einen Befehl im Terminal (REQ-001, REQ-066). Keine Desktop-App, keine Mobile-App. Das Terminal dient nur zu Installation und Start.

### 10.2 Plattformen und Geräte
- Betriebssysteme Slice 0.1: Linux (Referenz Ubuntu 24.04 LTS) und macOS (aktuelle und vorherige Hauptversion) (LP-08, REQ-066, A-08). Windows ab 0.5 (Weg offen, OQ-05).
- Browser: Chrome/Chromium, Firefox (Linux, macOS), Safari (macOS), jeweils aktuelle und vorherige Hauptversion (REQ-067, A-08).
- Geräte: Desktop- und Laptop-Rechner mit Tastatur und Maus/Trackpad; Fensterbreite ab 1280 Pixel.
- Mobile Nutzung: nicht erforderlich, für das gesamte Produktbild ausgeschlossen (Brief 7: „kein Smartphone“). Tablets werden nicht unterstützt.

### 10.3 Benutzerrollen und Rechte
Produktweit (alle Releases) gibt es keine Benutzerkonten und keine Anmeldung bei Ramifold (LP-01).

| Rolle | Art | Darf sehen | Darf tun | Ab Slice |
|---|---|---|---|---|
| **Planer** | Mensch, einziger lokaler Nutzer | alle Vorhaben des Projektordners, alle Knoten, Chats, Ergebnisse, Kontext, Hinweise, Export | alle Funktionen dieses Dokuments; einzige Rolle, die den Plan ändern, Ergebnisse festlegen und löschen und Änderungen der KI bestätigen kann | 0.1 |
| **KI im Knoten** | Systemakteur über den Coding-Agenten | Kontext des Knotens (REQ-031 bis REQ-033), Chat dieses Knotens, Dateien im Projektordner (lesend), Web (lesend) | antworten, Unterpunkte vorschlagen, KI-Entwürfe liefern; **nichts ändern** (REQ-024). Geplant (ohne Details, siehe Abschnitt 14): ab 0.3 Auswirkungen von Änderungen einschätzen (lesend); ab 0.3/0.4 Ergebnisse anderer Knoten oder Dateien des Projekts ändern, nur nach ausdrücklicher Bestätigung durch den Planer; später Änderungsvorschläge am Ergebnis des eigenen Knotens, die der Planer bestätigt | 0.1 |
| **Coding-Agent als Leser** | Systemakteur | in 0.1 das Export-Dokument wie jede Datei im Projektordner | lesen; ab 0.4 den Plan direkt lesen | 0.4 (ausdrücklich), 0.1 nur als Dateileser |

Alle funktionalen Anforderungen mit Benutzerinteraktion nennen den **Planer** als Akteur; Systemverhalten gegenüber der KI nennt die **KI**. Mehrere menschliche Rollen sind in der Roadmap nicht vorgesehen; Zusammenarbeit erfolgt höchstens über Git (Brief 4, Nicht-Ziele).

### 10.4 Design-Vorgaben
Es gibt **kein vorhandenes Design-System, keine Komponentenbibliothek, keine Markenrichtlinie und kein Corporate Design**, die verwendet werden müssen. Der Brief verlangt eine klare, gut lesbare Oberfläche ohne Design-Feinschliff darüber hinaus (Brief 9). Barrierefreiheit siehe REQ-062. Die Oberfläche des Prototyps ist keine Vorgabe.

### 10.5 Sprache, Lokalisierung und Nutzungskontext
- Oberflächensprache: Englisch, für alle Texte, Meldungen und die Anleitung (LP-09, REQ-068). Weitere Oberflächensprachen später (offen, kein Slice zugeordnet).
- Inhalte: Der Planer schreibt in beliebiger Sprache; die KI antwortet in der Sprache des Planers (REQ-027). Der Owner plant auf Deutsch. Die Oberfläche muss deshalb Inhalte mit Umlauten und anderen Unicode-Zeichen korrekt anzeigen und speichern.
- Regionale Formate: Zeitangaben in der lokalen Zeitzone des Rechners; das Anzeigeformat ist nicht vorgegeben. Keine Währungen oder Maßeinheiten.
- Nutzungskontext: Entwickler am eigenen Arbeitsplatzrechner, häufige Nutzung in längeren Planungssitzungen über mehrere Tage, parallel zu Terminal und Coding-Agent; lange Texte (Chats, Ergebnisse in Markdown) sind die Hauptinhalte; KI-Anfragen dauern Sekunden bis Minuten.

### 10.6 Erwarteter UI-Umfang (Slice 0.1)
- **Hauptaufgaben des Planers:** Vorhaben anlegen und wählen; Baum überblicken, ein-/ausklappen und bearbeiten; in einem Knoten chatten; Unterpunkt-Vorschläge prüfen und übernehmen; Ergebnis zusammenfassen lassen, bearbeiten und festlegen; Kontext einsehen; exportieren.
- **Art und ungefährer Umfang der Funktionen:**
  - Übersichten: Vorhabenliste (1), Baumansicht mit Nummer, Titel, Ergebnisstatus und Klappfunktion (1).
  - Dateneingaben: Vorhaben anlegen; Knoten anlegen, umbenennen, Auftrag ändern; Reihenfolge ändern; Chat-Eingabe; Ergebnis-Bearbeitung von Markdown-Text (insgesamt ca. 6 kleine Eingaben, 1 größerer Texteditor).
  - Arbeitsbereich eines Knotens: Titel, Auftrag, Ergebnis mit Status und Rückfluss-Hinweis, Chat mit Markdown-Darstellung, Laufanzeige, (Should, Ergänzung über den Brief hinaus) schrittweise Anzeige und Abbrechen.
  - Prüf-Workflows: Unterpunkt-Vorschläge als Liste mit Bearbeiten/Übernehmen/Verwerfen je Eintrag; Ergebnisentwurf prüfen, bearbeiten, als Konzept speichern oder festlegen.
  - Einsicht: Kontextanzeige je Knoten (langer Text).
  - Dialoge und Meldungen: Löschwarnung mit Zahlen, Datenabfluss-Hinweis mit Bestätigung, Fehlermeldungen (Claude Code fehlt/nicht angemeldet, Speichern gescheitert, Antwort abgebrochen/unvollständig, Sitzung neu aufgebaut, KI-Anfrage läuft bereits in einem anderen Knoten, Knoten in einem anderen Fenster gelöscht, Vorhaben nicht lesbar, Vorhaben außerhalb von Ramifold geändert), Hinweis „Ergebnis wird in einem anderen Fenster bearbeitet“ (nur lesende Anzeige), Bestätigung vor dem Ersetzen eines Ergebnisentwurfs, Exportbestätigung mit Pfad. Im Terminal: Meldung bei zweitem Start (REQ-070) und Fehlerzeilen (REQ-063).
- **Änderungen an bestehenden Oberflächen:** keine; es gibt keine bestehende Produktoberfläche (der Prototyp wird nicht übernommen).
- **Komplexitätstreiber:** gleichzeitige Darstellung von Baum und Arbeitsbereich eines Knotens; lange, gestreamte KI-Antworten mit Markdown; parallele Zustände (Anfrage läuft in einem Knoten, Planer arbeitet in einem anderen; mehrere Browser-Fenster mit Bearbeitung eines Ergebnisses in nur einem Fenster zur gleichen Zeit, REQ-071; ungespeicherte Ergebnisentwürfe in mehreren Knoten, REQ-073; Änderungen von außen während des Betriebs, REQ-074); Prüf-Workflow für mehrere Vorschläge; Bäume bis etwa 200 Knoten und 6 Ebenen; Tastaturbedienbarkeit (REQ-062).

## 11. Randbedingungen

**Bestätigt:**
- Lokal, Einzelnutzer, keine Konten, keine Ramifold-Cloud, nur lokal erreichbar (LP-01, LP-02).
- KI-Anbindung in 0.1 ausschließlich über Claude Code des Planers (LP-04). Die Requirements legen den Anbindungsweg nicht fest.
- Die Anbindung muss den aktuell gültigen Nutzungsbedingungen des Anbieters entsprechen (LP-05). Ist die Nutzung über den Abo-Login für ein veröffentlichtes Werkzeug nicht zulässig, braucht 0.1 den API-Key-Weg (Brief 7). Unter der Annahme A-12 (Claude Code bleibt der Coding-Agent und meldet sich per API-Key statt per Abo an) bleiben die Requirements gültig; betroffen wären nur die Meldungen in REQ-004 und die Voraussetzungen in REQ-066. Hieße der API-Key-Weg dagegen direkte Anbindung des KI-Anbieters durch Ramifold ohne Claude Code, gälten REQ-022 bis REQ-024, REQ-029, REQ-061 und LP-04 nicht mehr; dann entscheidet der Owner (OQ-01).
- Plattformen Linux und macOS, Browser am Desktop, kein Smartphone (LP-08).
- Oberfläche Englisch (LP-09).
- Open Source (LP-10); der Prototyp-Code wird nicht übernommen (Brief 9).
- Prozessstufe Voll (Brief 10).
- Recht: voraussichtlich kein Hochrisiko-System nach EU AI Act; keine Rechtsprüfung erfolgt (LP-11).

**Offene Entscheidungen:**
- Zulässigkeit der Anbindung über `claude -p` mit Abo-Login, sonst Claude Code mit API-Key-Anmeldung (OQ-01, Software Architect, Gate „Wie“ 0.1; Owner, falls keiner der beiden Wege zulässig ist).
- Open-Source-Lizenz (OQ-02, Owner, vor der ersten Veröffentlichung).
- Budget und Zeitrahmen (OQ-03, Owner); die Zeit des Owners ist knapp, deshalb ist der Slice auf das Nötigste geschnitten.

## 12. Annahmen

| ID | Annahme | Wirkt in | Kritisch |
|---|---|---|---|
| A-01 | Die KI erhält in 0.1 nur Web-Recherche und Lesen im Projektordner. Schreibende und ausführende Werkzeuge sind gesperrt; eigene Skills und MCP-Server des Planers in Claude Code werden nicht zugesichert. Damit ist GOAL-05 für 0.1 erfüllt. | REQ-022 bis REQ-025, GOAL-05 | ja |
| A-02 | Ramifold schreibt ausschließlich in einen eigenen Unterordner des Projektordners (Ramifold-Bereich): Baum, Aufträge, Ergebnisse mit Versionen, Chats, Export-Dokument, Fehlerprotokoll, Bestätigung des Datenabfluss-Hinweises und Einstellung „Chats eingeschlossen“; außerhalb des Projektordners schreibt Ramifold nichts, Fehler, die sich dort nicht protokollieren lassen, erscheinen nur in der Terminal-Ausgabe. Chats sind per Voreinstellung von Git ausgeschlossen; Fehlerprotokoll und Bestätigung nie versioniert. | REQ-030, REQ-049 bis REQ-052, REQ-063 | ja |
| A-03 | Ramifold speichert jeden Chat vollständig selbst, unabhängig von den Sitzungsdaten des Coding-Agenten; bei Sitzungsverlust erhält die KI den gespeicherten Verlauf. | REQ-018, REQ-029, REQ-065 | ja |
| A-04 | Ein Projektordner enthält 0..n Vorhaben; ein Vorhaben gehört zu genau einem Projektordner (kein Vorhaben über mehrere Repos). Je Projektordner läuft höchstens eine Instanz (durchgesetzt durch REQ-070); mehrere Browser-Fenster einer Instanz sind erlaubt (REQ-071). | REQ-006, REQ-070, REQ-071, Abschnitt 9 | ja |
| A-05 | Der Rechner wird nur vom Planer benutzt; Ramifold schützt sich nicht gegen andere Benutzerkonten auf demselben Rechner. | REQ-057, REQ-058 | ja (im Briefing unter „Weitere Annahmen“, ebenfalls kritisch) |
| A-06 | Ein Vorhaben in 0.1 umfasst höchstens etwa 200 Knoten, 6 Ebenen und 200 Nachrichten je Chat (der RAG-Plan aus dem Brief: ca. 15–40 Knoten). | REQ-053, 10.6 | nein |
| A-07 | Für Ramifold als kostenloses Open-Source-Entwicklerwerkzeug ohne öffentliche Stelle als Betreiber besteht keine gesetzliche Barrierefreiheitspflicht (keine Rechtsprüfung erfolgt). | REQ-062 | nein |
| A-08 | Ubuntu 24.04 LTS ist eine ausreichende Linux-Referenz; aktuelle und vorherige Hauptversion von macOS und der Browser genügen dem Owner und frühen Nutzern. | REQ-066, REQ-067 | nein |
| A-09 | Dem Planer genügt in 0.1 eine KI-Anfrage zur gleichen Zeit; Wartezeiten bei Web-Recherche überbrückt er mit Arbeiten ohne KI (Baum, Aufträge, Ergebnisse) in anderen Knoten. Auf dieser Annahme beruht die Regel „eine KI-Anfrage gleichzeitig“ in REQ-069 (eingeführt in v0.2 in REQ-017, PO-2; seit v0.3 eigene Anforderung, FIND-006). | REQ-069 | nein |
| A-10 | „Auf derselben Ebene sortieren“ meint die Reihenfolge unter Kindern desselben Elternknotens; „Dazwischen einfügen“ (0.2) meint das Einschieben eines Knotens zwischen Eltern und Kinder. | REQ-014, Abschnitt 14 | nein |
| A-11 | Die Profil-Ebenenbezeichnungen (Epic, Feature, Task) werden in 0.1 nicht angezeigt; die Planungslogik richtet sich trotzdem an Software-Vorhaben aus. | Abschnitt 9, OQ-06 | nein |
| A-12 | Der „API-Key-Weg“, den Brief Abschnitt 7 als Rückfallebene für 0.1 nennt, bedeutet: Claude Code bleibt der Coding-Agent und meldet sich per API-Key statt per Abo-Login an. Ramifold bindet in 0.1 den KI-Anbieter nie direkt an; „Planen ohne Coding-Agent mit eigenem API-Key“ bleibt Release 0.5. Ist das falsch, gelten REQ-022 bis REQ-024, REQ-029, REQ-061 und LP-04 nicht mehr (OQ-01). | Abschnitt 11, OQ-01, LP-04, REQ-004, REQ-022 bis REQ-024, REQ-029, REQ-061, REQ-066 | ja |
| A-13 | *Entfallen (v0.4, FIND-015):* ersetzt durch die Anforderung REQ-074 (Änderung von außen während des Betriebs wird erkannt, das Speichern abgelehnt). Die ID wird nicht wiederverwendet. | – | – |

## 13. Offene Fragen

| ID | Frage | Entscheidet | Bis | Auswirkung auf diese Requirements |
|---|---|---|---|---|
| OQ-01 | Ist die Anbindung über `claude -p` mit Abo-Login für ein veröffentlichtes Werkzeug nach den aktuellen Nutzungsbedingungen zulässig (Primärquellen)? Sonst API-Key-Weg in 0.1, nach A-12 als Claude Code mit API-Key-Anmeldung. | Software Architect (Gate „Wie“ 0.1); Owner, wenn weder Abo-Login noch API-Key-Anmeldung von Claude Code zulässig ist oder die Kosten des API-Key-Wegs eine Entscheidung erfordern | Beginn Gate „Wie“ 0.1 | Abo-Login oder API-Key-Anmeldung von Claude Code: keine, außer Meldungstexten in REQ-004 und Voraussetzungen in REQ-066. Direkte Anbindung ohne Claude Code (A-12 falsch): REQ-022 bis REQ-024, REQ-029, REQ-061 und LP-04 müssen neu gefasst werden; Scope-Entscheidung des Owners, ggf. Revision des Product Brief. |
| OQ-02 | Welche Open-Source-Lizenz? | Owner | vor erster Veröffentlichung | keine |
| OQ-03 | Budget oder Zeitrahmen? | Owner | offen | keine auf die Must-Anforderungen; bei knappem Budget oder knapper Zeit sind die drei Should-Ergänzungen über den Brief hinaus (REQ-020, REQ-021, REQ-025; OQ-09) die ersten Kandidaten zum Verschieben |
| OQ-04 | Technischer Weg für Änderungsvorschläge der KI und strukturierte Rückfragen | Software Architect | wenn diese Funktionen einem Slice zugeordnet werden (nicht 0.1) | keine |
| OQ-05 | Windows nativ oder über WSL? | Software Architect | spätestens 0.5 | keine |
| OQ-06 | Werden Profil-Ebenenbezeichnungen (Epic/Feature/Task) angezeigt? | offen, entscheidet sich in Slice 0.4 (Tickets) | 0.4 | keine |
| OQ-07 | Genauer Name und Aufbau des Ramifold-Bereichs, Dateiname des Export-Dokuments | Software Architect | Gate „Wie“ 0.1 | keine; REQ-049/REQ-052 legen nur fest, dass alles im Ramifold-Bereich liegt |
| OQ-08 | Lässt sich der Lesezugriff der KI über Claude Code verlässlich auf den Projektordner beschränken (REQ-025)? | Software Architect | Gate „Wie“ 0.1 | Wenn nicht: REQ-025 entfällt oder wird im Datenabfluss-Hinweis (REQ-030) offen benannt; Entscheidung dann durch Product Owner/Owner |
| OQ-09 | Sollen die drei Ergänzungen über den Brief hinaus – Antwort schrittweise anzeigen (REQ-020), KI-Anfrage abbrechen (REQ-021), Lesezugriff auf den Projektordner beschränken (REQ-025) – in Slice 0.1 bleiben oder auf später verschoben werden? Empfehlung: bleiben, weil Web-Recherche (Erfolgskriterium von 0.1) Minuten dauert und Nutzungslimit kostet und die Lesebeschränkung den Abfluss fremder Dateien verhindert. | Owner (Zuschnitt des Slice); wird mit der Freigabe-Anfrage von Gate „Was“ ausdrücklich abgefragt | Freigabe Gate „Was“ 0.1 | Bei „später“ wandern die betroffenen Anforderungen nach Abschnitt 14 (Withdrawn für 0.1); das Must-Set und das Nutzerziel bleiben unverändert |

## 14. Außerhalb des Umfangs

**Bewusst nicht in Slice 0.1** (Brief 9, „Bewusst noch nicht enthalten“):

| Thema | Zielslice | Folge für 0.1 |
|---|---|---|
| Abhängigkeiten zwischen Knoten, „wartet auf“, Infos zwischen Knoten | 0.2 | keine Querbeziehungen |
| Verweise auf andere Knoten im Chat (`#2.3.1`) | 0.2 | KI kennt nur Kontext nach REQ-031 bis REQ-033 |
| Knoten unter einen anderen Elternknoten verschieben; dazwischen einfügen | 0.2 | Wer den Baum grundlegend umbaut, muss Knoten neu anlegen; deren Chats gehen dabei verloren |
| Versionen anzeigen, Benachrichtigungen, Änderungsabgleich mit KI-Einschätzung der Auswirkungen | 0.3 | Versionen werden gespeichert (REQ-045), aber nicht angezeigt |
| KI ändert Ergebnisse anderer Knoten oder Dateien des Projekts (nur nach Bestätigung, 10.3); Coding-Agent liest den Plan per MCP; Tickets und Spec-Formate | 0.3/0.4 | nur Markdown-Export; KI ändert nichts (REQ-024) |
| Mehrere Chats pro Knoten | später | genau ein Chat je Knoten |
| Material (Dokumente, Bilder) am Knoten | später | – |
| Änderungsvorschläge der KI am Ergebnis mit Bestätigung | später | Planer übernimmt Entwürfe selbst (REQ-041 bis REQ-043) |
| Projektordner in der Oberfläche wählen | später | Projektordner beim Start (REQ-001) |
| Strukturierte Rückfragen der KI mit auswählbaren Antworten | später, nach Machbarkeitsprüfung (OQ-04) | Rückfragen als normaler Chattext |
| Planen ohne Coding-Agent mit eigenem API-Key, weitere Coding-Agenten, lokale Modelle, Windows | 0.5 | nur Claude Code (mit Abo-Login oder API-Key-Anmeldung, A-12), Linux, macOS |
| Weitere Profile | später | nur Software |
| Design-Feinschliff über eine klare, gut lesbare Oberfläche hinaus | – | – |

**Aus 0.1 verschoben** (Entscheidung Product Owner, v0.2; nicht in Brief Abschnitt 9 genannt):

| Thema | Zielslice | Folge für 0.1 |
|---|---|---|
| Anzeige der von der KI genutzten Werkzeuge je Antwort (Suchbegriff, gelesene Webseite, gelesene Datei; vormals REQ-026, Withdrawn) | später (Zuschnitt durch Product Owner) | Der Planer sieht nur die Antwort; Quellen nennt die KI im Text (REQ-022) |
| Markierung von Knoten mit Rückfluss-Hinweis im Baum (vormals REQ-047, Withdrawn) | später (Zuschnitt durch Product Owner) | Der Rückfluss-Hinweis erscheint nur beim geöffneten Elternknoten (REQ-046) |

**Zusätzlich durch Entscheidung in diesem Dokument nicht enthalten:**
- Rückgängig nach dem Löschen eines Knotens oder Papierkorb (REQ-015) – kein Zielslice.
- Löschen oder Umbenennen eines ganzen Vorhabens als eigene Funktion (Umbenennen des Wurzelknotens ist möglich, REQ-012) – kein Zielslice.
- Gespeicherter Ein-/Ausklappzustand (REQ-009) – kein Zielslice.
- Versionierung von Aufträgen (REQ-013) – kein Zielslice.
- Gleichzeitige KI-Anfragen in mehreren Knoten (REQ-069, A-09) – später (Zuschnitt durch Product Owner).
- Sofortiger Abgleich zwischen mehreren Browser-Fenstern (REQ-071) – kein Zielslice.
- Automatische Reparatur oder teilweises Öffnen nicht lesbarer Vorhaben (REQ-072) – kein Zielslice.
- Speichern ungespeicherter Ergebnisentwürfe über das Beenden von Ramifold hinaus (REQ-073) – kein Zielslice.
- Gleichzeitiges Bearbeiten desselben Ergebnisses in mehreren Fenstern; Erhalt einer Ergebnisbearbeitung über das Schließen ihres Fensters hinaus (REQ-071, REQ-073) – kein Zielslice.
- Automatisches Übernehmen oder Zusammenführen von Änderungen von außen während des Betriebs; der geänderte Stand erscheint spätestens nach einem Neustart (REQ-074) – kein Zielslice.
- Weitere Oberflächensprachen – später, kein Slice zugeordnet.
- Smartphone- und Tablet-Nutzung – produktweit ausgeschlossen.

**Produktweit ausgeschlossen** (Nicht-Ziele, Brief 4): Umsetzung durch Ramifold selbst, Projektmanagement-Funktionen, eigenes Spec-Framework, SaaS und Benutzerkonten, Echtzeit-Zusammenarbeit.

## 15. Änderungsprotokoll

| Version | Runde | Datum | Änderung | Behobene Findings |
|---|---|---|---|---|
| v0.1 | 1 | 2026-11-24 | Erstfassung für Slice 0.1 auf Basis von Product Brief v0.2 (Revision 2); REQ-001 bis REQ-068 | keine (erste Einreichung) |
| v0.2 | 2 | 2026-11-24 | **PO-1:** REQ-026 (Genutzte Werkzeuge anzeigen) und REQ-047 (Rückfluss-Hinweis im Baum) entfallen, verschoben nach Abschnitt 14 (Zielslice „später“, Zuschnitt durch Product Owner), Status Withdrawn, IDs nicht wiederverwendet; AC-REQ-026-01, AC-REQ-026-02, AC-REQ-047-01 entfallen; Erwähnungen in 5.2, 9 (Chat, Claude Code), 10.6 und Briefing entfernt. REQ-020, REQ-021, REQ-025 bleiben Should und sind als „Ergänzung über den Brief hinaus“ mit Begründung und Beispiel gekennzeichnet; 5.2 nennt sie; neue offene Frage OQ-09 an den Owner; OQ-03 (Auswirkung) angepasst. **PO-2:** REQ-017 um die Regel „höchstens eine KI-Anfrage gleichzeitig je Projektordner“ ergänzt (mit Beispiel und Begründung); AC-REQ-017-03 präzisiert, AC-REQ-017-05 bis AC-REQ-017-07 neu; A-09 angepasst; 5.2 (Querschnitt), 10.6 (Meldung) und Abschnitt 14 ergänzt. **PO-3:** Freigabe-Briefing aktualisiert (Kurzfassung, „So haben wir dich verstanden“ auf 6 Zeilen gekürzt – Sitzungsverlust jetzt in kritischer Annahme 3, Löschwarnung unter „Entscheidungen der Agenten“, Datenabfluss-Hinweis nur im Dokument (REQ-030) –, Entscheidungen der Agenten, Bewusst nicht enthalten, Was sich geändert hat, Deine Entscheidungen, Lesetipps). Sonst keine inhaltlichen Änderungen. | PO-1, PO-2, PO-3 (Product-Owner-Prüfung, MAR-1360) |
| v0.3 | Review-Runde 2 | 2026-11-24 | Korrektur nach Requirements Review Runde 1 (MAR-1361, `changes_requested`, Prüfung von v0.2). **FIND-001:** neue Annahme A-12 („API-Key-Weg“ = Claude Code mit API-Key-Anmeldung, keine direkte Anbindung), als kritische Annahme 5 ins Briefing; Abschnitt 11, OQ-01 (Entscheider, Auswirkung), LP-04, 9 (Claude Code), REQ-066 und Briefing „Deine Entscheidungen“ Nr. 2 einheitlich formuliert. **FIND-002:** REQ-063 neu gefasst (Terminal-Ausgabe immer, Fehlerprotokoll im Ramifold-Bereich nur, wenn beschreibbar; nichts außerhalb des Projektordners; Schwellwert und Messung angepasst); REQ-052, Abschnitt 9, A-02, kritische Annahme 2 angepasst; neuer Begriff „Terminal-Ausgabe“, „Fehlerprotokoll“. **FIND-003:** REQ-030 um Regel und Beispiel ergänzt (Bestätigung nie über Git, auch nicht bei eingeschlossenen Chats); AC-REQ-030-06, AC-REQ-030-07 neu; REQ-050 (ignoriert auch Fehlerprotokoll und Bestätigung), REQ-051 (Einstellung geht mit dem Repo) mit AC-REQ-051-03 neu; Abschnitt 9 „Datenhoheit“ als Tabelle; A-02 und kritische Annahme 2 angepasst; Entscheidung im Briefing. **FIND-004:** neue Anforderungen REQ-070 (zweiter Start abgelehnt) und REQ-071 (mehrere Browser-Fenster) mit AC-REQ-070-01 bis -04 und AC-REQ-071-01 bis -04; Begriff „Instanz“; A-04 und kritische Annahme 4 angepasst; neue Annahme A-13. **FIND-005:** neue Anforderung REQ-072 (nicht lesbare Daten eines Vorhabens) mit AC-REQ-072-01 bis -04; REQ-063 und REQ-055 verweisen darauf. **FIND-006:** Regel „höchstens eine KI-Anfrage gleichzeitig“ aus REQ-017 herausgelöst als neue Anforderung REQ-069; AC-REQ-017-03, -05, -06, -07 entfallen (IDs nicht wiederverwendet) und sind als AC-REQ-069-01 bis -04 übernommen; AC-REQ-069-05 neu; Verweise in REQ-021, 5.2, A-09, Abschnitt 14 und Briefing angepasst. **FIND-007:** neue Anforderung REQ-073 (Lebensdauer von Ergebnisentwürfen, Bestätigung vor dem Ersetzen) mit AC-REQ-073-01 bis -05; Begriff „Ergebnisentwurf“; REQ-041, REQ-042 verweisen darauf; Ergebnisstatus „Konzept“ als „vorläufiger Stand“ statt „Entwurf“ beschrieben; REQ-037 an REQ-073 angeglichen (Vorschläge bleiben auch beim Knotenwechsel erhalten, entfallen beim Löschen des Knotens). **FIND-008:** 10.3 nennt die geplanten späteren Rechte der KI mit Zielslice, abgeglichen mit Abschnitt 14. **FIND-009:** Begriffe „Plan“ und „festgelegter Plan“ definiert; „Plan von <Knoten>“ in REQ-043 (Titel), AC-REQ-024-02, AC-REQ-033-01, AC-REQ-041-01, AC-REQ-046-01, -03, -04, AC-REQ-049-02, REQ-048, REQ-050, LP-02, LP-03, LP-07, 10.5 und Briefing ersetzt. **FIND-010:** REQ-056 listet alle Funktionen ohne KI (u. a. REQ-001, REQ-036). **FIND-011:** REQ-055 um Stromausfall mit eigener Messmethode (virtuelle Maschine) und Schwellwert ergänzt. **FIND-012:** AC-REQ-028-03 an beobachtbares Verhalten gebunden. **FIND-013:** Beispiel zur Entscheidung „Auftragsänderungen werden nicht versioniert“ im Briefing. **FIND-014:** LP-13 aus 5.1 entfernt (ID nicht wiederverwendet); „Installation und Start mit je einem Befehl“ als Anforderung von 0.1 in REQ-066 und 5.2. **Weitere Vorgaben:** OQ-09 als ausdrücklich abzufragende Owner-Entscheidung gekennzeichnet; Briefing aktualisiert (kritische Annahmen 2, 4, neu 5; A-05 unter „Weitere Annahmen“ als ebenfalls kritisch; Entscheidungen, Bewusst nicht enthalten, Was sich geändert hat, Lesetipps); REQ-068 (Messung) um neue Meldungen ergänzt; 10.6 um neue Meldungen und Komplexitätstreiber ergänzt. Hinweis: v0.2 wurde in Review-Runde 1 geprüft; die Spalte „Runde“ der Zeilen v0.1 und v0.2 zählt die interne Vorrunde mit. | FIND-001 bis FIND-014 (Requirements Review Runde 1, MAR-1361) |
| v0.4 | Review-Runde 3 | 2026-11-24 | Korrektur nach Requirements Review Runde 2 (MAR-1364, `changes_requested`, Prüfung von v0.3). **FIND-015** (Richtung b nach Vorgabe des Product Owners): neue Anforderung REQ-074 (Änderung von außen während des Betriebs: kein Speichern, Meldung mit Stelle und Ursache, Eingabe bleibt, neuer Stand spätestens nach Neustart) mit AC-REQ-074-01 bis -06; neuer Begriff „Änderung von außen“; A-13 entfallen (ID nicht wiederverwendet); nachgezogen in REQ-056, REQ-068 (Messung), REQ-072 (Abgrenzung), 5.2 („Zusätzlich geregelt“), Abschnitt 9 (Git), 10.6, Abschnitt 14 und Briefing (Entscheidung mit verworfener Alternative „keine Erkennung, A-13 als kritische Annahme“ und Kosten einer Umkehr; A-13 aus „Weitere Annahmen“ entfernt). Kritische Annahmen 3 und 4 sind inhaltlich nicht betroffen. Abweichung von der Formulierung des Product Owners („Stand dessen, was Ramifold schreiben will“): Bezugsgröße ist das ganze Vorhaben, weil sonst von der Ablage abhinge, ob das Beispiel des Reviews (Speichern von 2 nach `git pull` von 2.2) erkannt wird, und der Planer auf veraltetem Stand entschiede; Begründung auch in REQ-074. **FIND-016:** Ergebnisbearbeitungen gehören zum Fenster, KI-Entwürfe zur Instanz; ein Ergebnis wird nur in einem Fenster zur gleichen Zeit bearbeitet, andere Fenster zeigen es nur lesend mit Hinweis (REQ-071 Regeln 1, 4, 5 einheitlich formuliert, Beispiel 2, Must-Begründung; AC-REQ-071-05 bis -08 neu); Begriffe „Fenster“, „KI-Entwurf“, „Ergebnisbearbeitung“ neu, „Ergebnisentwurf“ angeglichen; REQ-073 (Lebensdauer je Art), REQ-003 (Eingabe bleibt im Fenster), REQ-041, REQ-042 und 10.3 („KI-Entwurf“, „Ergebnisbearbeitung“), AC-REQ-073-01 und -02 angeglichen; Abschnitt 9, 10.6, Abschnitt 14 und Briefing nachgezogen. **FIND-017:** REQ-063 legt fest, dass Ablehnungen nach REQ-069, REQ-071 und REQ-074 nur als Meldung in der Oberfläche erscheinen und ein abgelehnter zweiter Start (REQ-070) nur in der Terminal-Ausgabe, jeweils ohne Eintrag im Fehlerprotokoll; Schwellwert und Messung um diese vier Fälle ergänzt; AC-REQ-070-01 und AC-REQ-071-02 angeglichen. **FIND-018:** REQ-073 legt fest, dass der vorhandene Ergebnisentwurf erst beim Eingang des neuen KI-Entwurfs ersetzt wird, während der Zusammenfassung nur lesbar ist und bei Fehler oder Abbruch unverändert erhalten bleibt (Beispiel 2); AC-REQ-073-06 und -07 neu. **FIND-019:** Freigabe-Briefing auf rund 1 800 Wörter gekürzt (Kurzfassung gestrafft, „Was sich geändert hat“ auf „Erstfassung“ und einen Satz verdichtet, Entscheidungen zusammengefasst, Sammelzeile gekürzt, Einzelheiten unter „Lesetipps“); alle kritischen Annahmen und OQ-09 unter „Deine Entscheidungen“ bleiben enthalten. Sonst keine inhaltlichen Änderungen. | FIND-015 bis FIND-019 (Requirements Review Runde 2, MAR-1364) |
