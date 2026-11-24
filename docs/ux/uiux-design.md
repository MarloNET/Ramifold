# UI/UX Design – Ramifold

## 1. Metadaten und Grundlage

| Feld | Wert |
|---|---|
| Projekt | Ramifold |
| Slice | 0.1 (erster Slice; kein früheres Design) |
| Version | 0.1 (Runde 1) |
| Status | **Entwurf**, zur Prüfung durch den Product Owner; Design-System „vorgeschlagen“ |
| Klassifizierung | Material |
| Autor | UI/UX Designer (Agent), Design-Task MAR-1372 |
| Datum | 2026-11-24 |
| Branch / PR | `design/MAR-1372` / Draft Pull Request gegen `main` (Commit siehe Übergabe in der Task) |
| Quellen | Product Brief v0.2 (`docs/product/product-brief.md`, Commit `af886be`); Requirements v0.4 (`docs/product/requirements.md`, Commit `3c85c33`, Gate „Was“ freigegeben); Marktrecherche `docs/product/product-research.md` (nicht verbindlich) |
| `ui-constraints` | **liegen nicht vor**; Annahmen in Abschnitt 8 |
| Stitch | Projekt `17557905236438839052`; Design-System-Asset `assets/15206542824351583325`; Budget 26/40 (siehe `stitch-log.md`) |
| Sprache | Dokumente Deutsch; **Oberflächentexte Englisch** (REQ-068, LP-09); Beispielinhalte (Titel, Aufträge, Chat) deutsch, weil der Planer auf Deutsch plant |

## Freigabe-Briefing

### Kurzfassung
Slice 0.1 von Ramifold: Ein einzelner Entwickler plant ein Vorhaben als Baum. Die Oberfläche besteht aus einer Vorhabenliste und einem Arbeitsbereich mit Baum links und dem gewählten Knoten rechts (Auftrag, Ergebnis, Chat). Dazu kommen elf Screens und Dialoge für Anlegen, Bearbeiten, Vorschläge, Ergebnis speichern, Kontext, Datenabfluss-Hinweis und Fehlerfälle. Das Design-System ist neu und ausdrücklich nur „vorgeschlagen“. Die wichtigsten Weichen: Ergebnis festlegen geschieht mit einem Klick, Sortieren geht über „Move up/Move down“ statt Ziehen, und beim Bearbeiten eines Ergebnisses ist der Chat des Knotens ausgeblendet.

### So haben wir dich verstanden
| Deine Vorgabe (Quelle) | Unsere Auslegung | Beispiel |
|---|---|---|
| „Baum anzeigen, navigieren, ein-/ausklappen“ (Brief 9, REQ-007 bis REQ-010) | Baum und Knotenansicht stehen auf **einer** Seite nebeneinander; der Baum bleibt beim Arbeiten sichtbar (UI-003). | Der Owner liest links „2.2 Embedding-Modell – Concept“, klickt es an und sieht rechts Auftrag, Ergebnis und Chat. |
| „Auf derselben Ebene sortieren“ (Brief 9, REQ-014) | Zwei Aktionen „Move up“ / „Move down“ im Knotenkopf, kein Ziehen mit der Maus. | „Reranking“ steht als 2.3 unten; der Planer klickt zweimal „Move up“, es wird 2.1. |
| „Hinweis, wenn ein Kind neu festgelegt wurde“ (Brief 9, REQ-046) | Ein Info-Banner im geöffneten Elternknoten nennt Nummer und Titel jedes Kindes. Im Baum gibt es keine Markierung (REQ-047 ist entfallen). | Beim Öffnen von „2 Retrieval“ steht: „Child 2.1 Chunking was fixed after this result was last saved.“ |
| „Anzeige, was die KI bekommt“ (Brief 9, REQ-036) | Seitenpanel mit dem vollständigen Kontexttext, nur lesbar. | Button „Show context“ unter dem Eingabefeld öffnet ein Panel mit Regeln, Vorfahren, Geschwistern und dem Knoten selbst. |
| „Datenabfluss-Hinweis vor der ersten KI-Anfrage“ (REQ-030) | Dialog mit Checkbox „I understand and want to continue“; ohne Haken kein Weiter. Danach über „Data notice“ in der Kopfzeile jederzeit lesbar. | Der Planer sendet die erste Frage; der Dialog erscheint; nach „Continue“ geht die Frage los. Bricht er ab, bleibt die Frage im Eingabefeld. |
| „Ergebnis prüfen, bearbeiten, als Konzept speichern oder festlegen“ (REQ-041 bis REQ-044) | Ein Editor mit Quelltext und Vorschau; der Status ergibt sich aus dem Button („Save as concept“ oder „Save as fixed plan“). | Die KI liefert einen Entwurf; der Planer ändert einen Satz und klickt „Save as fixed plan“. |
| „Oberfläche Englisch“ (REQ-068) | Alle Texte im Design sind englisch, auch Meldungen und Dialoge; Beispielinhalte der Mockups sind deutsch. | Schaltfläche „Export“, Meldung „A title is required.“, Titel „Retrieval“ des Knotens bleibt Inhalt. |

### Kritische Annahmen – bitte einzeln bestätigen
1. **Annahme (Fenster-Entwürfe):** Ungespeicherte Ergebnistexte und ungesendete Chat-Eingaben bleiben beim Wechsel zwischen Knoten und zur Vorhabenliste **im selben Fenster** erhalten. Beim Neuladen oder Schließen des Fensters gehen sie verloren; der Browser fragt vorher nach.
   *Beispiel:* Der Planer überarbeitet 10 Minuten das Ergebnis von 2 „Retrieval“, öffnet kurz 3 „Evaluation“ und kehrt zurück: der Text ist da (Baumzeile 2 trägt die Marke „Draft“). Drückt er F5, fragt der Browser „Leave site?“; bestätigt er, ist der Text weg.
   **Wenn falsch:** Würde der Text beim Neuladen erhalten bleiben sollen (Speichern im Browser), wäre das eine neue Funktion mit Datenschutzfolgen (Entwürfe außerhalb des Ramifold-Bereichs). Die Browser-Rückfrage ist eine Ergänzung des Designs, keine Anforderung. (`screen.md` UI-004, UI-003; REQ-071, REQ-073)
2. **Annahme (Festlegen mit einem Klick):** „Save as fixed plan“ speichert sofort, ohne zusätzlichen Bestätigungsdialog.
   *Beispiel:* Der Planer klickt in UI-004 „Save as fixed plan“: Das Ergebnis von 2.2 ist festgelegt, der Elternknoten 2 zeigt den Rückfluss-Hinweis. Ein Fehlklick lässt sich korrigieren, indem er das Ergebnis erneut bearbeitet und als „Concept“ speichert (REQ-044).
   **Wenn falsch:** Wünscht der Owner einen Bestätigungsdialog, kommt ein Dialog hinzu (kleiner Aufwand, aber ein weiterer Screen). (UI-004; REQ-043)
3. **Annahme (Export ohne Rückfrage):** „Export“ schreibt das Export-Dokument sofort und überschreibt das vorherige Dokument desselben Vorhabens ohne Rückfrage; danach steht ein Banner mit dem Pfad im Arbeitsbereich.
   *Beispiel:* Der Planer exportiert „Eigenes produktives RAG“ am Montag und nochmals am Dienstag; die Montagsdatei ist weg (nur Git hat sie noch). Banner: „Exported to <Pfad>“.
   **Wenn falsch:** Müsste vor dem Überschreiben gefragt werden, kommt ein Dialog hinzu. (UI-003; REQ-049)
4. **Annahme (Chat während des Bearbeitens):** Solange der Editor offen ist (UI-004), ist der Chat dieses Knotens ausgeblendet. Der Planer kann den Knoten wechseln und zurückkehren; der Entwurf bleibt (REQ-073).
   *Beispiel:* Beim Überarbeiten möchte er in 2.2 eine Rückfrage an die KI stellen. Er muss erst speichern oder den Editor verlassen (zu einem anderen Knoten und zurück zeigt wieder den Editor, nicht den Chat).
   **Wenn falsch:** Wollen wir Editor und Chat gleichzeitig, wird UI-003/UI-004 umgebaut (Editor über dem Chat); das ändert das Seitenlayout und alle Mockups mit Ergebnisbereich. (UI-004; siehe auch „Deine Entscheidungen“)
5. **Annahme (Zugang zum Datenabfluss-Hinweis):** Der Hinweis hat bewusst eine Checkbox; „Data notice“ steht dauerhaft in der Kopfzeile aller Seiten (nicht in einem Einstellungsmenü, das es nicht gibt).
   *Beispiel:* Eine Entwicklerin klont das Repo, startet Ramifold und sendet ihre erste Frage: Der Hinweis erscheint, obwohl der Autor ihn bei sich bestätigt hat (AC-REQ-030-06).
   **Wenn falsch:** Ohne Checkbox wäre die Bestätigung ein einfacher Klick; rechtlich/ethisch schwächer, aber leichter änderbar. (UI-009; REQ-030, LP-06)

### Weitere Annahmen
- Titel und Auftrag bleiben auch dann änderbar, wenn das Ergebnis in einem anderen Fenster bearbeitet wird; nur das Ergebnis ist gesperrt (REQ-071, Beispiel 2 – „Überschrift“ lesen wir als Überschrift im Ergebnistext). *Beispiel:* In Fenster B kann der Planer „Embedding“ in „Embedding-Modell“ umbenennen, obwohl A das Ergebnis bearbeitet. (A-UX-05)
- Die Vorhabenliste ist nach Anlagedatum aufsteigend sortiert (älteste zuerst). *Beispiel:* „Eigenes produktives RAG“ (3. Nov) steht über „Monitoring-Konzept“ (17. Nov). (A-UX-07)
- Wortlaut der Schritte bei „Claude Code nicht angemeldet“ („run claude and sign in“) ist ein Platzhalter, den der Software Architect prüft. (MSG-001)
- Breite des Baums ist fest (320 px); Verstellen gehört nicht zu 0.1. (A-UX-08)
- Die Should-Funktionen aus OQ-09 (Antwort schrittweise anzeigen, Abbrechen) sind im Design enthalten; fallen sie weg, entfallen im Chat die Teilantwort-Anzeige und der Button „Stop“ (UI-003). Die Lesebeschränkung (REQ-025) hat keine Oberflächenwirkung außer dem Text von UI-009.

### Entscheidungen der Agenten
| Entscheidung | Verworfene Alternative | Warum | Umkehrbar |
|---|---|---|---|
| Baum und Knoten auf einer Seite (Zweispalter) | getrennte Seiten (Baum → Knoten) | REQ-053/10.6: Baum bleibt beim Arbeiten sichtbar; Wechsel zwischen Knoten ohne Seitenwechsel | mittel |
| „Move up/Move down“ statt Drag-and-drop | Ziehen mit der Maus | Tastaturbedienung ist Pflicht (REQ-062, 2.1.1); Drag-and-drop wäre zusätzliche Funktion | leicht |
| Dialoge für Anlegen/Umbenennen/Auftrag (ein Formular, drei Modi) | Inline-Bearbeiten im Baum | weniger Zustände, einheitliche Validierung | leicht |
| Vorschläge als Panel mit Karten (Titel+Auftrag bearbeitbar, „Accept“/„Discard“, „Accept all“/„Discard all“) | Dialog mit Liste | Prüf-Workflow mit mehreren Einträgen braucht Platz (10.6) | mittel |
| Kontext als Seitenpanel (nur lesbar, kein Kopieren) | eigene Seite | lange Texte, schneller Wechsel zurück | leicht |
| Status immer Symbol + Text („No result yet“, „Concept“, „Fixed plan“) | nur Farbe/Symbol | WCAG 1.4.1-Geist, REQ-062; Begriffe aus der Requirements-Begriffstabelle | leicht |
| Bei schmalem Fenster (Zoom ≥ 125 %) wird der Baum zum aufklappbaren Bereich | zwei Spalten mit horizontalem Scrollen | REQ-062: „bei 200 % Zoom kein Verlust von Inhalt oder Funktion“ | leicht |
| Ein Toast nur für flüchtigen Erfolg; Fehler immer als Banner (bleibt) | Toasts für alles | REQ-003/-004/-074 verlangen, dass der Planer Meldungen nicht verpasst | leicht |
| Header ohne Einstellungen, Profil, Suche (kein Menü) | übliches App-Menü | nicht in den Requirements; vermeidet Platzhalter | leicht |

### Bewusst nicht enthalten
- Keine Anzeige für Werkzeuge/Skills der KI und kein Platz dafür: *Beispiel:* Es gibt keinen Menüpunkt „Tools“ und kein ausgegrautes Feld. Eine spätere Anzeige könnte als weitere Textaktion neben „Show context“ stehen; das ist nur ein Hinweis, kein Element.
- Keine Versionsansicht, Verweise, Abhängigkeiten, Verschieben in andere Eltern, mehrere Chats, Material, Einstellungen, Suche, Benutzerkonto, Dark Mode (spätere Slices oder nicht vorgesehen).
- Kein Mobil-/Tablet-Layout (REQ-067).
- Keine Mockups für Terminal-Ausgaben (REQ-001, -002, -070, -063); nur Text in Abschnitt 5.
- Keine HTML-Exporte der Stitch-Mockups im Repository (siehe Abschnitt 8).

### Was sich geändert hat
Erstfassung.

### Deine Entscheidungen
1. **Editor und Chat gleichzeitig?** Optionen: (a) Chat beim Bearbeiten ausgeblendet (aktueller Entwurf); (b) Editor über dem Chat, beides sichtbar. Empfehlung: (a) für 0.1, einfacher; (b), falls der Owner beim Überarbeiten oft nachfragt.
2. **Festlegen mit Bestätigung?** Optionen: (a) ein Klick (Entwurf); (b) kleiner Bestätigungsdialog. Empfehlung: (a), weil Korrektur möglich ist (REQ-044).
3. **Should-Funktionen aus OQ-09** (REQ-020/-021): im Design enthalten. Entscheidung des Owners zum Slice-Zuschnitt (OQ-09) steht aus; das Design lässt sich ohne Umbau kürzen.

### Lesetipps
- `screens/UI-003-workspace/screen.md`: der Kern des Produkts, mit allen Aktionen und Zuständen.
- `screens/UI-004-result-editor/screen.md`: Speichern/Festlegen und die Entwurfsregeln (REQ-073).
- `screens/UI-009-data-notice/screen.md`: Wortlaut und Ablauf des Datenabfluss-Hinweises.
- Abschnitt 5 unten: alle Meldungen im Wortlaut.
- `DESIGN.md`: das vorgeschlagene Design-System mit gemessenen Kontrasten.

## 2. Nutzer, Umfang und Designziele
- **Nutzer:** ein lokaler Planer (Entwickler, erster Nutzer der Owner), Desktop/Laptop mit Tastatur und Maus; lange Sitzungen über mehrere Tage parallel zu Terminal und Coding-Agent (10.5). Die KI und der Coding-Agent sind Systemakteure ohne eigene Oberfläche.
- **Plattformen:** Browser Chrome/Chromium, Firefox, Safari (macOS), ab 1280 px Breite; kein Smartphone/Tablet (REQ-067).
- **Umfang Slice 0.1:** Vorhaben anlegen/wählen, Baum anzeigen/bearbeiten, Chat pro Knoten mit Kontextanzeige, Unterpunkt-Vorschläge, Ergebnis (Zusammenfassen, Konzept/festgelegter Plan), Rückfluss-Hinweis, Export, Datenabfluss-Hinweis, Fehler- und Mehrfenster-Fälle, sechs WCAG-2.2-AA-Kriterien (REQ-062).
- **Nicht-Ziele:** siehe „Bewusst nicht enthalten“; keine früheren Slices vorhanden.
- **Designziele:** ruhig, dicht, lesbar; Aufgabe vor Dekoration; jeder Zustand und jede Meldung verständlich ohne Handbuch; vollständig per Tastatur bedienbar.
- **Randbedingungen:** Oberflächensprache Englisch; keine Konten; nur lokal; keine Marke vorgegeben (10.4).

## 3. User Journeys und Navigation

Übersicht: `flows/flow.svg`.

| ID | Flow | Normaler Pfad | Alternativen / Fehlerpfade | Screens |
|---|---|---|---|---|
| FLOW-001 | Start, Vorhaben wählen oder anlegen | 1 Planer startet Ramifold im Terminal (TERM-001), öffnet die Adresse im Browser → 2 UI-001 zeigt Liste → 3 „Open“ per Titel → UI-003; oder 4 „New project“ → 5 UI-002 (Title, Objective) → „Create project“ → UI-003 mit Wurzelknoten | Leere Liste (UI-001 empty); Vorhaben nicht lesbar → „Details“ → UI-011; Claude Code fehlt → Banner MSG-001; Start-Fehler nur im Terminal (TERM-002, -003) | UI-001, UI-002, UI-011 |
| FLOW-002 | Baum bearbeiten und navigieren | 1 Knoten anklicken/mit Pfeiltasten wählen → 2 ein-/ausklappen → 3 „Add child“ (UI-006) → 4 „Rename“/„Edit objective“ (UI-006) → 5 „Move up/down“ → 6 „Delete“ (UI-007, Bestätigung) | Titel leer/zu lang (Validierung); Knoten in anderem Fenster gelöscht (MSG-004); Speichern scheitert (MSG-002) | UI-003, UI-006, UI-007 |
| FLOW-003 | Chat im Knoten | 1 Knoten öffnen → 2 Nachricht schreiben, „Send“ (beim ersten Mal UI-009 bestätigen) → 3 Laufanzeige → 4 Antwort (Markdown) im Chat → optional „Show context“ (UI-008) | KI läuft anderswo (MSG-003); Claude Code fehlt/nicht angemeldet (MSG-001); Antwort bricht ab (MSG-007); Sitzung neu aufgebaut (MSG-008); „Stop“ (Should) | UI-003, UI-008, UI-009 |
| FLOW-004 | Unterpunkte vorschlagen | 1 „Suggest sub-items“ → 2 Laufanzeige → 3 UI-005 mit Vorschlagskarten → 4 Titel/Auftrag ändern → 5 „Accept“/„Accept all“ oder „Discard“/„Discard all“ → neue Kinder im Baum | keine verwertbare Liste (MSG-009); Titel leer; Abbruch (MSG-007) | UI-003, UI-005 |
| FLOW-005 | Ergebnis festlegen und Rückfluss | 1 „Summarize with AI“ (ggf. UI-010) → 2 Laufanzeige, Ergebnis lesbar gesperrt → 3 UI-004 mit KI-Entwurf → 4 bearbeiten → 5 „Save as concept“ oder „Save as fixed plan“ → 6 beim Elternknoten erscheint der Rückfluss-Hinweis (Banner) | Fehler/Abbruch: Entwurf unverändert (MSG-007); leeres Ergebnis (Validierung); „Edit result“ ohne KI direkt; „Discard draft“ | UI-003, UI-004, UI-010 |
| FLOW-006 | Export | 1 „Export“ in der Kopfzeile → 2 Banner „Exported to <Pfad>“ | Speichern scheitert (MSG-002), außerhalb geändert (MSG-005) | UI-003 |
| FLOW-007 | Mehrere Fenster, Änderung von außen | Zweites Fenster zeigt dieselbe Instanz; Ergebnis in Fenster A in Bearbeitung → Fenster B zeigt es nur lesbar (MSG-011); nach Speichern in A erneut öffnen | Knoten in A gelöscht → Aktion in B abgewiesen (MSG-004); `git pull` ändert Vorhaben → Speichern abgewiesen (MSG-005), Text bleibt | UI-003 (permission/error), UI-004 |
| FLOW-008 | Datenabfluss-Hinweis | 1 Erste KI-Anfrage → 2 UI-009 (Bestätigung) → 3 „Continue“ → Anfrage geht los; später „Data notice“ (Ansichtsmodus) | Abbruch: nichts gesendet, Nachricht bleibt | UI-009 |

**Informationsarchitektur.** Zwei Ebenen: (1) Vorhabenliste des Projektordners (UI-001); (2) Arbeitsbereich eines Vorhabens (UI-003) mit dem Baum als einziger Navigation. Navigation: Brotkrume „Projects / <Titel>“ in der Kopfzeile führt zurück; „Data notice“ in jeder Kopfzeile. Die Kopfzeile hat rechts Platz für weitere Aktionen späterer Slices (Textlinks/Buttons), ohne Umbau; die Bereiche des Arbeitsbereichs (Result, Chat) können später um Abschnitte erweitert werden. Hinweis zur späteren Werkzeuganzeige: sie kann als zusätzliche Textaktion im Chat-Bereich neben „Show context“ stehen; in 0.1 gibt es dafür weder Screen noch Element.

**Navigationsregeln.** Ein Klick auf eine Baumzeile öffnet den Knoten im Arbeitsbereich; die Auswahl bleibt beim Wechsel zur Liste und zurück nicht erhalten (beim Öffnen immer Wurzelknoten). Dialoge sind modal und geben den Fokus an den Auslöser zurück. Nach „Create project“ → UI-003; nach „Add child“ → neuer Knoten ausgewählt; nach Löschen → Elternknoten.

## 4. Screen-Katalog

| ID | Name | Zweck | Rollen | Anforderungen | Zustände (Mockup / Text) | Ordner |
|---|---|---|---|---|---|---|
| UI-001 | Vorhabenliste | Vorhaben listen, öffnen, anlegen | Planer | REQ-005, -006, -072, -004 | default, empty (Mockup); loading, error, disabled (Text) | `screens/UI-001-project-list/` |
| UI-002 | Vorhaben anlegen (Dialog) | Titel/Auftrag erfassen | Planer | REQ-005 | default (Mockup); loading, error, validation (Text/Muster) | `screens/UI-002-create-project/` |
| UI-003 | Arbeitsbereich (Baum + Knoten) | Baum bearbeiten, Knoten mit Ergebnis und Chat | Planer | REQ-007–016, -017–024, -027–030, -036, -041–046, -049, -069, -071, -073, -074 | default, empty, error, permission (Mockup); loading, disabled, success (Text) | `screens/UI-003-workspace/` |
| UI-004 | Ergebnis bearbeiten | Ergebnis als Markdown bearbeiten, speichern | Planer | REQ-041–046, -073, -003 | default (Mockup); loading, empty, error, validation, disabled, success (Text) | `screens/UI-004-result-editor/` |
| UI-005 | Unterpunkt-Vorschläge | Vorschläge prüfen, ändern, übernehmen, verwerfen | Planer | REQ-037–040 | default (Mockup); loading, empty, error, validation (Text) | `screens/UI-005-suggestions/` |
| UI-006 | Knoten-Formular (Dialog) | Knoten anlegen, umbenennen, Auftrag ändern | Planer | REQ-011–013 | validation (Mockup); default, loading, error (Text) | `screens/UI-006-node-form/` |
| UI-007 | Knoten löschen (Dialog) | Folgen zeigen, bestätigen | Planer | REQ-015 | default (Mockup); loading, error (Text) | `screens/UI-007-delete-node/` |
| UI-008 | Kontext anzeigen (Panel) | gesendeten Kontext lesen | Planer | REQ-036 | default (Mockup); loading, error (Text) | `screens/UI-008-context/` |
| UI-009 | Datenabfluss-Hinweis (Dialog) | Bestätigung vor erster KI-Anfrage; Ansicht | Planer | REQ-030 | default (Mockup); Ansichtsmodus, loading, error (Text) | `screens/UI-009-data-notice/` |
| UI-010 | Ergebnisentwurf ersetzen (Dialog) | Ersetzen bestätigen | Planer | REQ-073 | default (Mockup) | `screens/UI-010-replace-draft/` |
| UI-011 | Vorhaben nicht lesbar (Dialog) | Ursache und nächster Schritt | Planer | REQ-072 | default (Mockup) | `screens/UI-011-project-unreadable/` |

Zählregel: UI-001 bis UI-011 sind stabil; keine zurückgezogenen IDs.

## 5. Interaktion, Zustände und Meldungen

**Querschnittsregeln.**
- *Validierung:* beim Absenden, Fehlertext unter dem Feld (Symbol + Text, `aria-describedby`), Fokus auf das erste fehlerhafte Feld, Eingaben bleiben. Titel: Pflicht, nach Trim 1–200 Zeichen („A title is required.“ / „The title can be at most 200 characters.“); Ergebnis: nicht leer („The result cannot be empty.“); Chat: leer → „Send“ deaktiviert.
- *Feedback:* Banner (bleibt, `role=alert`/`status`), Toast nur für flüchtigen Erfolg (6 s, schließbar), Dialoge modal. Fehler nennen Ursache und nächsten Schritt und enthalten keine Inhaltstexte aus dem Plan.
- *Eingaben bleiben immer erhalten* bei Fehlern (REQ-003, -069, -071, -074).
- *Einzelne KI-Anfrage (REQ-069):* Solange eine läuft, zeigt der Baum „AI running“ am betroffenen Knoten; „Send“, „Suggest sub-items“ und „Summarize with AI“ in jedem Knoten sind `aria-disabled` und erklären beim Aktivieren per MSG-003, warum nichts passiert; alle Funktionen ohne KI bleiben nutzbar.
- *Bestätigung vor Zerstörung:* nur beim Löschen (UI-007), Ersetzen eines Entwurfs (UI-010) und Verwerfen geänderter Texte.
- *Tastatur:* Strg/Cmd+Enter sendet/bestätigt in Formularen und im Chat; ESC schließt Dialoge.

**Meldungen (Wortlaut, englisch).**
| ID | Wo | Typ | Text |
|---|---|---|---|
| MSG-001 | Banner nach Start / bei KI-Anfrage | Fehler | Start: „Claude Code was not found. Install Claude Code, then restart Ramifold. Planning without AI still works.“ · nicht installiert: „Claude Code is not installed. Install Claude Code and restart Ramifold, then send your message again.“ · nicht angemeldet: „Claude Code is not signed in. Open a terminal, run "claude" and sign in, then send your message again.“ (Schritte prüft der Software Architect) |
| MSG-002 | Banner / im Dialog | Fehler | „Your change was not saved. Cause: <cause>. Your input is still here; you can try again.“ |
| MSG-003 | Banner | Warnung | „AI request running in <Nr> <Titel>. Your message was not sent.“ (bei Vorschlägen/Zusammenfassung: „…Your request was not sent.“) |
| MSG-004 | Banner | Fehler | „This node no longer exists. It was deleted in another window. Your text stays here so you can copy it.“ |
| MSG-005 | Banner | Fehler | „"<Vorhaben>" was changed outside Ramifold. Nothing was saved. Restart Ramifold to load the changed version. Your text stays in this window.“ (+ „Affected: <Nr> <Titel>“ falls zutreffend) |
| MSG-007 | an der Nachricht + Banner | Warnung | Marke „incomplete“ oder „aborted“; Banner: „The AI answer is incomplete. Cause: <cause>. Your message is kept; send it again.“ |
| MSG-008 | Systemzeile im Chat | Info | „Session was rebuilt from the saved chat history.“ |
| MSG-009 | Banner | Warnung | „The AI returned no usable suggestions. The plan is unchanged. Try again.“ |
| MSG-010 | Banner (success) | Erfolg | „Exported to <Pfad>“ (Button „Dismiss“) |
| MSG-011 | Banner | Info | „This result is being edited in another window.“ (Bearbeiten/Zusammenfassen deaktiviert, „being edited in another window“) |
| MSG-012 | an der eingehenden Antwort | Warnung | Marke „not saved“; Banner MSG-005: Antwort wird angezeigt, aber nicht gespeichert (REQ-074) |

**Terminal-Ausgaben (nur Text, englisch, keine Mockups).**
| ID | Anlass | Text |
|---|---|---|
| TERM-001 | Start (REQ-001) | `Ramifold is running for <Projektordner>` / `Open http://127.0.0.1:<port> in your browser.` |
| TERM-002 | Startfehler Ordner (REQ-002) | `Cannot start: <Pfad> does not exist.` / `… is not a folder.` / `… is not writable.` |
| TERM-003 | Zweiter Start (REQ-070) | `Ramifold is already running for <Projektordner> at http://127.0.0.1:<port>.` |
| TERM-004 | Claude Code fehlt (REQ-004) | `Warning: Claude Code was not found. AI features will not work until it is installed.` |
Port und Adresse legt der Software Architect fest.

## 6. Responsive Verhalten und Barrierefreiheit

**Geräte.** Nur Desktop/Laptop ab 1280 px (REQ-067); Smartphone/Tablet nicht unterstützt. Breakpoint: **1024 CSS-px** – darunter (insbesondere bei Browser-Zoom ≥ 125 % auf 1280-px-Fenstern) wird der Baum zum aufklappbaren Bereich („Show plan“/„Hide plan“), der Arbeitsbereich einspaltig, UI-004 stapelt Quelltext und Vorschau, Dialoge füllen die Breite abzüglich 16 px. Text in rem, damit Browser-Textvergrößerung greift; Markdown-Tabellen/Codeblöcke scrollen horizontal im eigenen Bereich; lange Titel umbrechen im Knotenkopf und werden im Baum gekürzt (Tooltip, voller Titel im Kopf).

**Erfüllung der sechs WCAG-2.2-AA-Kriterien aus REQ-062.**
| Kriterium | Wie das Design es erfüllt | Evidenz / Prüfung |
|---|---|---|
| 1.4.3 Kontrast (Minimum) | Alle Text-/Hintergrundpaare ≥ 4,5:1, UI-Komponenten ≥ 3:1 | berechnet in `DESIGN.md` (z. B. Text 15,8; Sekundärtext 7,6; Primärbutton 6,7; Rand 4,8; Fehler 6,6). Mockups sind kein Beleg; automatisierte Prüfung bei Umsetzung |
| 1.4.4 Textgröße ändern | rem-Einheiten, Layout reflowt bei < 1024 px (siehe oben), keine festen Höhen für Text | manueller Zoom-Durchlauf 200 % (Chrome/Firefox) bei Umsetzung (REQ-062) |
| 2.1.1 Tastatur | Alle Aktionen per Tastatur: Baum nach ARIA-Tree-Muster (Pfeile, Home/End, Enter), „Move up/Move down“ statt Drag-and-drop, Dialoge mit Fokus-Falle und ESC, Strg/Cmd+Enter | je Screen im Abschnitt „Responsive und Barrierefreiheit“ |
| 2.4.3 Fokus-Reihenfolge | Reihenfolge folgt Lesereihenfolge: Kopfzeile → Baum → Knotenkopf → Banner → Result → Chat → Eingabe → Aktionen; Dialoge: Titel/erstes Feld → Aktionen; Fokus kehrt zum Auslöser zurück | `screen.md` UI-003 |
| 2.4.7 Fokus sichtbar | 2 px Fokusrahmen (#0B57D0) mit 2 px Abstand an allen Bedienelementen, nie entfernt | `DESIGN.md` |
| 4.1.2 Name, Rolle, Wert | Semantische Elemente (`button`, `table`, `dialog`, `tree`, `log`), sichtbare Labels, `aria-expanded/selected/disabled/invalid/busy`; Statusmarken als Text; Banner `role=alert/status` | `screen.md` je Screen |
Zusätzlich: Information nie nur durch Farbe (Status = Symbol + Text, Auswahl = Balken, Fehler = Symbol + Text); Animationen nur dezent, bei `prefers-reduced-motion` aus. Volle AA-Konformität ist nicht zugesagt (A-07).

## 7. Komponenten und visuelle Hinweise
Design-System: `DESIGN.md` (**vorgeschlagen**, wird mit der Freigabe verbindlich). Wiederverwendete Muster: Baumzeile mit Statusmarke, Statusmarke, Banner (info/warn/error/success), Toast, modaler Dialog (Standard/Alert), Formularfeld mit Label/Fehlertext, Karte (Vorschlag), Chat-Nachricht mit Zustandsmarke, Markdown-Darstellung, Seitenpanel (Kontext). Komponentenbibliothek: noch offen (Baseline).

## 8. Machbarkeit und Übergabehinweise
- **`ui-constraints`:** nicht vorhanden. Angenommen: moderne Evergreen-Browser, eine einseitige Webanwendung (SPA) im Browser, Echtzeit-Aktualisierung der Laufanzeige/Teilantworten (Streaming, REQ-020/-054) und Statusanzeige „AI running“ in allen Fenstern (Instanz-Zustand, REQ-071); Markdown-Rendering ohne Skriptausführung (REQ-060); Tastaturmuster des ARIA-Tree. Bei Abweichung zur Baseline: Cross-Check.
- **Nachführen mehrerer Fenster:** Ein Fenster muss Änderungen aus einem anderen nicht sofort zeigen, spätestens beim erneuten Öffnen (REQ-071); die Statusanzeige „AI running“ soll aber auch in anderen Fenstern sichtbar sein (REQ-019 AC-019-02) – der Software Architect entscheidet, ob dazu Echtzeit-Aktualisierung nötig ist.
- **Stitch-Mockups:** HTML-Exporte sind nur visuelle Referenz. **Nicht abgelegt:** Die HTML-Dateien der Mockups liegen nicht im Repository, weil der Stitch-Download den HTML-Text nur inline in den Agentenkontext liefert und das Ablegen als Datei mit den verfügbaren Werkzeugen nicht möglich war. Die PNG-Screenshots liegen im Repository; die Mockups sind ohnehin nicht Umsetzungsvorlage, `screen.md` ist verbindlich.
- **Bekannte Mockup-Abweichungen:** je Screen in „Bekannte Abweichungen im Mockup“ (u. a. Absenderlabels, Radiogruppe im Editor, Baumstatus nur als Symbol).
- **Cross-Check:** ausstehend (erst nach dem Baseline-Entwurf).

## 9. Traceability

| REQ | Flow | Screens | Anmerkung |
|---|---|---|---|
| REQ-001 | FLOW-001 | TERM-001, UI-001 (Projektordner im Kopf) | Terminal |
| REQ-002 | FLOW-001 | TERM-002 | nur Terminal |
| REQ-003 | FLOW-002/-005 | MSG-002 in UI-002/-003/-004/-006/-007 | |
| REQ-004 | FLOW-001/-003 | MSG-001, UI-001, UI-003 | |
| REQ-005 | FLOW-001 | UI-002 | |
| REQ-006 | FLOW-001 | UI-001 | |
| REQ-007, -008, -009, -010 | FLOW-002 | UI-003 | |
| REQ-011, -012, -013 | FLOW-002 | UI-003, UI-006 | |
| REQ-014 | FLOW-002 | UI-003 („Move up/down“) | |
| REQ-015 | FLOW-002 | UI-007 | |
| REQ-016 | FLOW-002 | keine eigene UI (Identität zeigt sich im Erhalt von Chat/Ergebnis in UI-003) | ohne UI |
| REQ-017, -018 | FLOW-003 | UI-003 | |
| REQ-019 | FLOW-003 | UI-003 (Laufanzeige, „AI running“) | |
| REQ-020, -021 | FLOW-003 | UI-003 (Teilantwort, „Stop“) | Should (OQ-09) |
| REQ-022, -023, -024 | FLOW-003 | keine eigene UI; Quellen erscheinen als Links in der Antwort (UI-003) | ohne UI |
| REQ-025 | – | Text in UI-009 | Should; keine eigene UI |
| REQ-027 | FLOW-003 | UI-008 (Anweisung im Kontext sichtbar) | |
| REQ-028 | FLOW-003 | UI-003 error, MSG-007 | |
| REQ-029 | FLOW-003 | UI-003 error, MSG-008 | |
| REQ-030 | FLOW-008 | UI-009 | |
| REQ-031–REQ-035 | FLOW-003 | UI-008 (Anzeige); Bildung ohne UI | |
| REQ-036 | FLOW-003 | UI-008 | |
| REQ-037, -038, -039, -040 | FLOW-004 | UI-005 | |
| REQ-041 | FLOW-005 | UI-003, UI-004, UI-010 | |
| REQ-042, -043, -044 | FLOW-005 | UI-004 | |
| REQ-045 | FLOW-005 | keine eigene UI (Version entsteht beim Speichern, nur aktuelle Version sichtbar) | ohne UI |
| REQ-046 | FLOW-005 | UI-003 (Banner) | |
| REQ-048 | FLOW-003/-005 | UI-003, UI-004 (Markdown) | |
| REQ-049 | FLOW-006 | UI-003 (Export, MSG-010) | |
| REQ-050, -051, -052 | – | keine UI (Ablage; Anleitung) | ohne UI |
| REQ-053, -054 | alle | Laden-/Laufzustände in `screen.md` (Zeiten) | |
| REQ-055, -056, -057, -058, -059, -060, -061 | – | keine UI (REQ-060: Markdown ohne Skriptausführung, Abschnitt 8) | ohne UI |
| REQ-062 | alle | Abschnitt 6, `DESIGN.md`, `screen.md` je Screen | |
| REQ-063 | – | TERM nur Terminal; keine UI | ohne UI |
| REQ-064, -065, -066 | – | keine UI | ohne UI |
| REQ-067 | alle | Abschnitt 6 | |
| REQ-068 | alle | alle Oberflächentexte englisch | |
| REQ-069 | FLOW-003/-004/-005 | MSG-003, UI-003 | |
| REQ-070 | FLOW-001 | TERM-003 | nur Terminal |
| REQ-071 | FLOW-007 | UI-003 permission, MSG-004, MSG-011 | |
| REQ-072 | FLOW-001 | UI-001, UI-011 | |
| REQ-073 | FLOW-005 | UI-004, UI-010, UI-003 („Draft“) | |
| REQ-074 | FLOW-007 | MSG-005, MSG-012, UI-003 permission | |
Entfallene Anforderungen REQ-026 und REQ-047: kein Design. Nicht abgedeckte Anforderungen: keine.

## 10. Entscheidungen, Annahmen, offene Fragen, Changelog

| ID | Annahme / Entscheidung | Status | Wirkt in |
|---|---|---|---|
| A-UX-01 | Zweispalter Baum + Knoten statt getrennter Seiten | vorgeschlagen | UI-003 |
| A-UX-02 | „Save as fixed plan“ ohne zusätzliche Bestätigung | vorgeschlagen (kritisch) | UI-004 |
| A-UX-03 | Chat beim Bearbeiten des Ergebnisses ausgeblendet | vorgeschlagen (kritisch) | UI-004 |
| A-UX-04 | Entwürfe/Eingaben bleiben beim Navigieren im Fenster; Browser-Rückfrage bei Neuladen | vorgeschlagen (kritisch) | UI-003, UI-004 |
| A-UX-05 | Titel/Auftrag bleiben änderbar, wenn das Ergebnis in anderem Fenster bearbeitet wird; „Überschrift“ (REQ-071 Beispiel 2) = Ergebnistext | Auslegung | UI-003 |
| A-UX-06 | „Move up/Move down“ statt Drag-and-drop | vorgeschlagen | UI-003 |
| A-UX-07 | Vorhabenliste aufsteigend nach Anlagedatum | vorgeschlagen | UI-001 |
| A-UX-08 | Baum 320 px fest | vorgeschlagen | UI-003 |
| A-UX-09 | „Accept all“ blockiert bei ungültigem Titel | Auslegung | UI-005 |
| A-UX-10 | Export ohne Rückfrage; Banner mit Pfad | vorgeschlagen (kritisch) | UI-003 |
| A-UX-11 | Datenabfluss-Hinweis mit Checkbox; Zugang über Kopfzeile | vorgeschlagen (kritisch) | UI-009 |
| A-UX-12 | Zusätzliche Elemente, die in den Requirements nicht wörtlich stehen, aber Anforderungen bedienbar machen: „Move up/down“, „Back to node“/„Show suggestions (n)“, Marke „Draft“, Hinweis „unsaved AI draft“ + „Review AI draft“, „Show plan/Hide plan“ bei Zoom, Projektordner im Kopf von UI-001 | zur Prüfung durch den Product Owner | UI-001, UI-003, UI-005 |

**Offene Fragen:** (1) Owner: Editor und Chat gleichzeitig? (Briefing). (2) Owner/OQ-09: Should-Funktionen bleiben? (3) Software Architect: Schritte in MSG-001 (Anmeldung), Echtzeit-Aktualisierung über Fenster, Format der Ursache in UI-011, Name des Ramifold-Bereichs (OQ-07, Beispielpfade in Mockups). (4) Product Owner: Wunsch nach HTML-Exporten (technisch derzeit nicht möglich).

**Changelog.** 0.1 (2026-11-24): Erstfassung, Slice 0.1, UI-001 bis UI-011, FLOW-001 bis FLOW-008.
