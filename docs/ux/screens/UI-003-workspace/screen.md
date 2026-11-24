# UI-003 – Arbeitsbereich: Baum und Knoten (Workspace)

- Zweck: Den Baum eines Vorhabens überblicken, bearbeiten und navigieren und im gewählten Knoten Auftrag, Ergebnis und Chat bearbeiten.
- Flows: FLOW-002, FLOW-003, FLOW-004 (Auslöser), FLOW-005, FLOW-006, FLOW-007, FLOW-008
- Anforderungen: REQ-007 bis REQ-016, REQ-017 bis REQ-024, REQ-027 bis REQ-030, REQ-036, REQ-041 bis REQ-046, REQ-049, REQ-069, REQ-071, REQ-073, REQ-074, REQ-048, REQ-061, REQ-004, REQ-062; AC-REQ-007-01 bis AC-REQ-010-02, AC-REQ-046-*
- Rollen: Planer (einzige Rolle). „Permission“-Zustand = Ergebnis in diesem Fenster nur lesbar, weil es in einem anderen Fenster bearbeitet wird (REQ-071). Der Zustand „read-only“ (ganzes Vorhaben nur lesbar, REQ-074) und „server-down“ (Ramifold beendet) sind eigene Zustände (siehe unten).
- Gerät(e): Desktop ab 1280 px
- Artefakte: `default.png` (Stitch 8047d918dd124dd7acc231b316f5af3d), `empty.png` (6101580aa5f74b408c0222a63d53642e, leerer Knoten + KI läuft in anderem Knoten), `error.png` (232f3a936a4c4e4e84698908bddb5381, Claude Code nicht angemeldet + Chat unvollständig + Sitzung neu aufgebaut), `permission.png` (e39c743407b64ee9ab1d5446e7f35293, Ergebnis nur lesbar + „außerhalb geändert“); Gerät DESKTOP; Export 2026-11-24

## Aufbau
Kopfzeile (48 px) · linke Spalte „Plan“ (Baum, 320 px) · rechter Arbeitsbereich mit: Knotenkopf (Nummer, Titel, Aktionen) → Block „Objective“ → Banner-Bereich → Abschnitt „Result“ → Abschnitt „Chat“ (Verlauf, Eingabe). Die Abschnitte stehen untereinander im scrollbaren Arbeitsbereich; Baum und Kopfzeile scrollen nicht mit.

## Angezeigte Daten
| Element | Inhalt | Quelle (fachlich) | Hinweise (Format, Kürzung, Sortierung) |
|---|---|---|---|
| Kopfzeile | „Ramifold“; Brotkrumen „Projects / <Vorhabentitel>“ („Projects“ ist Link zu UI-001); Link „Data notice“; Button „Export“; im Zustand „read-only“ zusätzlich Marke „Read-only“ (Symbol + Text) | Vorhaben | Vorhabentitel bei Überlänge mit „…“ gekürzt |
| Baumzeile | Auf-/Zuklapp-Pfeil (nur bei Kindern), Nummer, Titel, Statusmarke; eingeklappt zusätzlich „+n“ (Zahl verborgener Nachkommen) | Knoten, Ergebnisstatus | Wurzelknoten ohne Nummer, fett; Titel > Zeilenbreite mit „…“ gekürzt, voller Titel als Tooltip und im Knotenkopf; Reihenfolge nach Position; Nummern aus Position (REQ-008) |
| Statusmarke | Symbol + Text: „No result yet“ / „Concept“ / „Fixed plan“ | Ergebnisstatus | nie nur Farbe |
| Markierung „AI running“ | Symbol + Text neben der Statusmarke des Knotens, in dem eine KI-Anfrage läuft | REQ-019 | in jedem Fenster sichtbar |
| Markierung „Draft“ | Text „Draft“ neben Statusmarke, wenn für den Knoten ein KI-Entwurf oder in diesem Fenster eine Ergebnisbearbeitung vorliegt | REQ-073 | Hinweis, dass ungespeicherter Text existiert |
| Knotenkopf | „<Nummer> <Titel>“ | Knoten | Titel umbricht auf mehrere Zeilen |
| Objective | Auftrag als Markdown dargestellt | Knoten | leer: Text „No objective.“ |
| Rückfluss-Hinweis | Banner (Info): „Child <Nr> <Titel> was fixed after this result was last saved.“ bzw. „Children <Nr> <Titel>, <Nr> <Titel> were fixed after this result was last saved.“ | REQ-046 | nur bei Knoten mit gespeichertem Ergebnis; verschwindet nach erneutem Speichern des Ergebnisses; nicht bei Status „No result yet“ |
| Result | Statusmarke, Ergebnistext als Markdown; leer: „No result yet.“ | aktuelle Version | Markdown nach REQ-048 (Überschriften, Absätze, Hervorhebung, Listen, Links, Inline-Code, Codeblöcke, Tabellen); Inhalte werden nie als Code ausgeführt (REQ-060); Links öffnen in neuem Tab. Bilder in Markdown werden **nicht geladen** (REQ-061): ein Bild `![Architektur](https://…/a.png)` erscheint als Text-Link „Architektur“ mit kleinem Bildsymbol davor (Symbol + Text, Tooltip „Images are not loaded. Opens in a new tab.“); Klick öffnet die Adresse in einem neuen Tab; bei leerem Alternativtext lautet der Linktext „Image“ (Adresse im Tooltip); bei unvollständigem Markdown im Stream (z. B. `![Arch](http`) erscheint der Rohtext, bis die Zeile vollständig ist. Gilt gleich für Objective, Result und Chat. |
| Chat-Verlauf | Nachrichten in zeitlicher Reihenfolge: Absender „You“/„AI“, Zeitpunkt (lokale Zeit, „Nov 24, 10:42“), Text als Markdown; Zustandsmarken „incomplete“, „aborted“, „not sent“ | Chat | Leer: „No messages yet.“; bei Öffnen Scroll ans Ende; neue Nachricht scrollt nach unten, außer der Planer hat nach oben gescrollt |
| Systemzeile | „Session was rebuilt from the saved chat history.“ | REQ-029 | Zeile im Verlauf an der Stelle der betroffenen Antwort |
| Laufanzeige | in der laufenden KI-Nachricht: „AI request running in <Nr> <Titel>“ + Button „Stop“ (Should) | REQ-019, REQ-021 | bei Antwort-Teilen (Should, REQ-020) erscheint der gelieferte Text sofort darüber |

## Eingaben und Validierung
| Feld | Typ | Pflicht | Regel | Fehlermeldung (Wortlaut) |
|---|---|---|---|---|
| Message | mehrzeiliger Text | ja zum Senden | nicht leer nach Entfernen von Leerzeichen; keine Längenbegrenzung; Enter = Zeilenumbruch, Strg/Cmd+Enter = Senden | kein Text: „Send“ ist deaktiviert (`aria-disabled`), keine Meldung |

Das Eingabefeld hat kein Platzhaltertext. Der Inhalt bleibt bei jedem Fehler (REQ-003, -069, -074, -028) im Feld erhalten; ungesendeter Text gehört zum Fenster (REQ-071).

## Aktionen
| Aktion | Auslöser | Voraussetzung / Rolle | Ergebnis bei Erfolg | Ergebnis bei Fehler | Navigation danach |
|---|---|---|---|---|---|
| Knoten öffnen | Klick/Enter auf Baumzeile | – | Knoten wird im Arbeitsbereich angezeigt | Knoten inzwischen gelöscht: MSG-004, Baum aktualisiert | bleibt in UI-003 |
| Ein-/Ausklappen | Pfeil, Pfeiltasten ←/→ | Knoten mit Kindern | Nachkommen verborgen/sichtbar; Klappzustand nur bis Neuladen | – | – |
| Rename | Textbutton im Knotenkopf | – | Dialog UI-006 (Modus „Rename“) | – | UI-006 |
| Edit objective | Textbutton | – | Dialog UI-006 (Modus „Edit objective“) | – | UI-006 |
| Add child | Textbutton | – | Dialog UI-006 (Modus „Add child“) | – | UI-006 |
| Move up / Move down | Textbutton im Knotenkopf (nicht im Mockup, siehe Abweichungen) | Knoten außer Wurzel; „Move up“ deaktiviert beim ersten, „Move down“ beim letzten Kind | Knoten tauscht Position mit Geschwister; Nummern neu berechnet; Fokus bleibt auf der Aktion; Statusmeldung „Moved to position <n>“ (role=status) | MSG-002 / MSG-004 / MSG-005 | bleibt |
| Delete | Textbutton (nicht beim Wurzelknoten) | Knoten außer Wurzel | Dialog UI-007 | – | UI-007 |
| Show context | Button unter Eingabe | – | Seitenpanel UI-008 | – | UI-008 |
| Send | Primärbutton, Strg/Cmd+Enter | Text vorhanden; keine andere KI-Anfrage läuft; Datenabfluss-Hinweis bestätigt | Nachricht erscheint im Chat, Laufanzeige ≤ 1 s, Antwort erscheint im Chat; Eingabefeld geleert | Hinweis unbestätigt: UI-009 (Nachricht bleibt im Feld); Anfrage läuft anderswo: MSG-003; Claude Code fehlt/zu alt/nicht angemeldet: MSG-001 (Nachricht bleibt im Feld; „zu alt“ nennt v2.1.248 und `claude update`); Ramifold beendet: MSG-013; Antwort bricht ab: MSG-007; Speichern scheitert: MSG-002; von außen geändert: MSG-005 | bleibt |
| Stop (Should) | Button in laufender Antwort | KI-Anfrage läuft | Anfrage endet; bereits gezeigter Text bleibt als „aborted“ | – | bleibt |
| Send again | Textbutton an Nachricht mit „not sent“ | Nachricht nicht gesendet | wie Send mit dem Text dieser Nachricht | wie Send | bleibt |
| Suggest sub-items | Button unter Eingabe | wie Send (ohne Textpflicht) | Anfrage läuft (Status „AI request running in …“), danach Panel UI-005 | MSG-009 (keine Vorschläge), MSG-001/-003/-007 | UI-005 |
| Summarize with AI | Button im Abschnitt „Result“ | wie Send; besteht ein Ergebnisentwurf dieses Fensters oder ein KI-Entwurf: zuerst UI-010 | Anfrage läuft; Ergebnis des Knotens in allen Fenstern nur lesbar; bei Eingang des Entwurfs öffnet UI-004 mit „AI draft, not saved yet“ | Fehler/Abbruch: Entwurf unverändert, MSG-007 | UI-004 |
| Edit result | Button im Abschnitt „Result“ | Ergebnis nicht in anderem Fenster in Bearbeitung | UI-004 mit gespeichertem Text (oder leer) | – | UI-004 |
| Review AI draft | Button im Hinweis „There is an unsaved AI draft for this node.“ | KI-Entwurf vorhanden, in keinem Fenster in Bearbeitung | UI-004 mit dem KI-Entwurf | – | UI-004 |
| Export | Button Kopfzeile | Vorhaben geöffnet | Export-Dokument im Ramifold-Bereich geschrieben; Banner (success, role=status, bleibt bis geschlossen): „Exported to <Pfad>“ mit Schließen-Button „Dismiss“; erneuter Export überschreibt ohne Rückfrage (REQ-049) | MSG-002 / MSG-005 | bleibt |
| Check again | Button im Banner MSG-011 | Ergebnis in anderem Fenster in Bearbeitung | Sperre wird neu geprüft: ist sie aufgehoben, verschwindet das Banner und „Edit result“/„Summarize with AI“ sind aktiv; sonst bleibt MSG-011 (Hinweis, dass es einen Moment dauern kann) | MSG-013 | bleibt |
| Projects (Brotkrume) | Link | – | Vorhabenliste; Entwürfe und ungesendete Eingaben dieses Fensters bleiben erhalten, solange das Fenster geöffnet ist | – | UI-001 |
| Data notice | Link Kopfzeile | – | UI-009 (Ansichtsmodus) | – | UI-009 |

## Zustände
| Zustand | Darstellung | Artefakt | Text / Microcopy |
|---|---|---|---|
| default | Baum, Knoten mit Ergebnis und Chat; KI-Antwort läuft | default.png | siehe oben |
| loading | Beim Öffnen des Vorhabens „Loading plan…“ im Baum, Arbeitsbereich leer; beim Öffnen eines Knotens „Loading node…“ im Arbeitsbereich (Ziel ≤ 1 s) | nur Text | „Loading plan…“, „Loading node…“ |
| empty | Neuer Knoten: Result „No result yet.“ mit Statusmarke „No result yet“, Chat „No messages yet.“; Wurzel ohne Kinder: Baum zeigt nur die Wurzel | empty.png | „No result yet.“ / „No messages yet.“ |
| error | Banner oben im Arbeitsbereich (role=alert, bleibt bis behoben/geschlossen) + Zustandsmarken an Nachrichten; Claude Code: drei Fälle „nicht gefunden/installiert“, **„zu alt“**, „nicht angemeldet“; alle lassen Funktionen ohne KI zu | error.png (zeigt „nicht angemeldet“; „zu alt“ nur Text, gleiche Darstellung) | MSG-001, MSG-002, MSG-007 |
| read-only | **Ganzes Vorhaben nur lesbar** ab Erkennung einer Änderung von außen bis zum Neustart (REQ-074). Dauerhaftes, nicht schließbares Banner MSG-005 (`role=alert`) oberhalb des Knotenkopfes; es bleibt beim Wechsel des Knotens stehen. Kopfzeile trägt Marke „Read-only“. **Deaktiviert** (`aria-disabled`, Grund = Banner): Add child, Rename, Edit objective, Move up/down, Delete, Send, Suggest sub-items, Summarize with AI, Edit result, Save as concept/fixed plan, Discard draft, Export. **Weiter nutzbar:** Baum lesen und navigieren, Knoten öffnen, Ergebnis/Chat/Objective lesen, Show context, Data notice, Brotkrume „Projects“ und Anlegen/Öffnen **anderer** Vorhaben (AC-REQ-074-06). **Text bleibt zum Kopieren stehen:** Eingabefeld, Ergebnistext im Editor (nur lesbar, markierbar), Karten in UI-005. Jede weitere speichernde Aktion wird mit MSG-005 abgewiesen, ohne etwas zu ändern. Eine eingehende KI-Antwort wird angezeigt, mit Marke „not saved“ (MSG-012). Offene Dialoge: siehe unten. Kein Weg aus dem Zustand außer Neustart; Neuladen des Fensters genügt nicht und verwirft Ungespeichertes. Andere Fenster der Instanz zeigen den Zustand, sobald dort die nächste speichernde Aktion abgewiesen wird oder das Vorhaben neu geöffnet wird (kein Live-Abgleich). | nur Text (Mockup nicht erstellt, Layout wie `permission.png` mit Banner) | MSG-005, MSG-012 |
| server-down | **Ramifold läuft nicht mehr.** Dauerhaftes, nicht schließbares Banner MSG-013 (`role=alert`) ganz oben im Fenster, über der Kopfzeile, in jedem Screen (auch UI-001). Der geladene Stand bleibt sichtbar. Alle Aktionen, die Ramifold brauchen (Knoten öffnen, Senden, Speichern, Export, Dialoge bestätigen), sind `aria-disabled`; es erscheint keine Einzelfehlermeldung je Aktion. Eingaben (Message, Editor, Dialogfelder) bleiben stehen und lassen sich markieren und kopieren, solange das Fenster offen ist. Eine laufende Antwort endet mit Marke „incomplete“. Kein automatisches Wiederverbinden. | nur Text | MSG-013 |
| validation | nicht anwendbar im Arbeitsbereich selbst (Eingaben in Dialogen); Nachricht leer: Send deaktiviert | – | – |
| permission | Ergebnis nur lesbar: „Edit result“ und „Summarize with AI“ deaktiviert mit sichtbarem Text „being edited in another window“; Info-Banner MSG-011 mit Button „Check again“. Die Sperre endet nach dem Schließen des anderen Fensters mit Verzögerung (bis etwa 15 s); bis dahin kann MSG-011 weiter erscheinen, das Banner erklärt das. Es gibt keinen Live-Abgleich: das Banner verschwindet erst nach „Check again“ oder erneutem Öffnen des Knotens; Titel und Auftrag des Knotens bleiben änderbar (Auslegung: REQ-071 sperrt nur das Ergebnis; „Überschrift“ im Beispiel 2 = Überschrift im Ergebnistext, siehe Annahme A-UX-05) | permission.png | MSG-011 |
| disabled | Senden/Suggest/Summarize deaktiviert, solange eine KI-Anfrage läuft (Text MSG-003 beim Versuch) – Schaltflächen bleiben fokussierbar (`aria-disabled`), Erklärung per MSG-003; „Move up/down“ an den Enden | empty.png | MSG-003 |
| success | Toast „Saved“ nach Speichern; Banner „Exported to …“; Toast „Node added“, „Node deleted“, „Moved to position n“ | nur Text | siehe Kapitel Meldungen in `uiux-design.md` |

## Responsive und Barrierefreiheit
- Ab 1024 px Breite: zwei Spalten wie im Mockup. Darunter (Zoom ≥ 125 % bei 1280 px, REQ-062): Baum wird zu einem aufklappbaren Bereich oberhalb des Arbeitsbereichs (Button „Show plan“ / „Hide plan“, `aria-expanded`), Arbeitsbereich einspaltig, Textbuttons des Knotenkopfes umbrechen.
- Baum: `role="tree"`, Zeilen `role="treeitem"` mit `aria-level`, `aria-expanded`, `aria-selected`; ein Tab-Stopp (Roving Tabindex); ↑/↓ Fokus, → aufklappen bzw. in Kind, ← zuklappen bzw. zum Elternknoten, Home/End, Enter öffnet den Knoten.
- Tab-Reihenfolge: Kopfzeile → Baum → Knotenkopf-Aktionen → Banner-Aktionen → Result-Aktionen → Chat-Verlauf (fokussierbarer Bereich) → Message → Suggest sub-items → Show context → Send.
- Fokussichtbar 2 px, nie entfernt; alle Aktionen per Tastatur (REQ-062 / 2.1.1). Chat-Verlauf `role="log"` mit `aria-live="polite"`; Fehlerbanner `role="alert"`; Laufanzeige `role="status"`.
- Statusmarken und Zustandsmarken immer Symbol + Text; ausgewählter Baumknoten zusätzlich zur Farbe mit Balken.
- Lange Tabellen/Codeblöcke in Markdown scrollen horizontal im eigenen Bereich (kein Verlust bei 200 % Zoom).

## Bekannte Abweichungen im Mockup
| Element | Screens | Grund |
|---|---|---|
| Absenderbezeichnung „Planner“ und „Ramifold AI“ statt „You“ / „AI“ | default.png | von Stitch erzeugt; verbindlich sind „You“ und „AI“ |
| Rückfluss-Hinweis nennt „Child 2.2.1 Quantisierung“, obwohl 2.2 im Baum keine Kinder zeigt | default.png | Beispieldaten inkonsistent; verbindlich: der Hinweis nennt ein tatsächliches Kind |
| Statusmarken im Baum nur als Symbol (ohne Text) | empty.png, error.png, permission.png (und UI-004, UI-005) | Screenshot nach Bereinigung nicht neu gerendert; verbindlich: Symbol + Text („Fixed plan“, „Concept“, „No result yet“) |
| Überschrift in Banner, Platzhaltertexte, Zähler „Plan (n nodes)“, „New root“, „Status legend“ | – | per Bereinigung entfernt (Stitch-Log); sollten in den Mockups nicht mehr vorkommen, nicht Teil des Designs |
| Schaltflächen „Move up / Move down“, „Show plan / Hide plan“, Markierung „Draft“, Hinweis „There is an unsaved AI draft…“ | alle | im Mockup nicht dargestellt, aber in diesem `screen.md` festgelegt |
| Kopfbereich im Mockup „error.png“ zeigt Ergebnis eingeklappt auf eine Zeile | error.png | nur Darstellung zur Platzersparnis im Mockup; verbindlich: Result-Abschnitt wie default |
| Textbuttons „Rename“, „Edit objective“, „Add child“, „Delete“ in einigen Mockups als Rand-Buttons | permission.png | gleiche Aktionen, Darstellung als Textbutton nach DESIGN.md |
| Header: Pille „Concept“ neben Knotentitel | permission.png | nicht Teil des Designs; Status des Ergebnisses steht im Abschnitt „Result“ |
| HTML-Exporte | alle | nicht exportiert (siehe `uiux-design.md`, Abschnitt 8) |

## Annahmen und offene Fragen
- Breite des Baums fest 320 px; Verstellen und Persistenz sind nicht Teil von 0.1.
- Die Sortierreihenfolge-Aktion „Move up/Move down“ statt Drag-and-drop ist Designentscheidung (Tastaturbedienung, REQ-062).
- Wortlaut der Schritte in MSG-001 (Anmeldebefehl, `claude update`) prüft der Software Architect; ebenso, ob „zu alt“ nach dem Update einen Neustart braucht (Annahme: ja, wie „nicht installiert“).

## Dialoge im Zustand „read-only“ (REQ-074)
Wird die Änderung von außen erkannt, während ein Dialog offen ist, bleibt der Dialog stehen; sein Fehlerbanner zeigt MSG-005, die Bestätigungsaktion ist deaktiviert, Felder bleiben markierbar, „Cancel/Close“ bleibt aktiv (Text geht erst mit dem Schließen verloren; MSG-005 sagt das). Gilt für UI-005 („Accept“, „Accept all“, „Discard“, „Discard all“ deaktiviert, Karten lesbar), UI-006 und UI-007 (Bestätigung deaktiviert), UI-010 („Summarize and replace“ deaktiviert). UI-004: Editor nur lesbar, „Save as …“ und „Discard draft“ deaktiviert.

## Zustand „server-down“ in Dialogen
Offene Dialoge zeigen zusätzlich MSG-013 im Dialogbanner; Bestätigungsaktionen sind deaktiviert, Eingaben bleiben stehen.
