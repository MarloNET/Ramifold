# UI-001 – Vorhabenliste (Project list)

- Zweck: Alle Vorhaben des Projektordners zeigen, eines öffnen oder ein neues anlegen.
- Flows: FLOW-001 (Schritte 2–4), FLOW-008
- Anforderungen: REQ-005, REQ-006, REQ-072, REQ-004 (Banner), REQ-030 (Link „Data notice“), AC-REQ-006-01, AC-REQ-006-02, AC-REQ-072-*
- Seitentitel (Tab, CC-13): `Projects – <Ordnername> – Ramifold` (Ordnername = letzter Teil des Projektordners); bei „server-down“ Präfix „Stopped – “; Symbol (Favicon) in allen Instanzen gleich.
- Rollen: Planer (einzige Rolle, sieht und darf alles)
- Gerät(e): Desktop/Laptop, Browserfenster ab 1280 px Breite (Requirements 10.2)
- Artefakte: `default.png` (Stitch 094d269de9b1479eba9fa4fd9265ab55), `empty.png` (Stitch e6c0584c609b4e5d8b3f46f5599eec87); Gerät DESKTOP; Export 2026-11-24

## Angezeigte Daten
| Element | Inhalt | Quelle (fachlich) | Hinweise |
|---|---|---|---|
| Kopfzeile | Text „Ramifold“; „Project folder: <Pfad>“; Link „Data notice“; im simulierten Modus Marke „Simulated AI“ (siehe UI-003) | Projektordner (REQ-001), Datenabfluss-Hinweis | Pfad gekürzt mit `~`, bei Überlänge mittig mit „…“ gekürzt, voller Pfad als Tooltip/`title` |
| Titel | „Projects“ | – | – |
| Tabelle „Title“ / „Created“ | je Vorhaben Titel (Link) und Anlagedatum | Vorhaben | Sortierung: Anlagedatum aufsteigend (älteste zuerst, Annahme); Datumsformat „Nov 3, 2026“ in lokaler Zeitzone; Titel > 1 Zeile wird umbrochen |
| Statusmarke „Not readable“ | Symbol + Text, bei nicht lesbaren Vorhaben | REQ-072 | Titel, soweit lesbar; sonst Text „(untitled)“ |
| Banner „Claude Code nicht gefunden“ bzw. „zu alt“ | siehe MSG-001 | REQ-004 | nur wenn der Befund zu Claude Code negativ ist (beim Laden der Seite): nicht auffindbar (Text beim Start, KL-03) oder älter als v2.1.248; „zu alt“ nennt Mindestversion und `claude update` (kein Neustart nötig); Planen ohne KI bleibt möglich. Ein neuer Befund aus einer Anfrage in einem anderen Fenster erscheint hier erst beim nächsten Laden der Seite |

## Eingaben und Validierung
Keine Eingabefelder (Anlegen im Dialog UI-002).

## Aktionen
| Aktion | Auslöser | Voraussetzung / Rolle | Ergebnis bei Erfolg | Ergebnis bei Fehler | Navigation danach |
|---|---|---|---|---|---|
| Vorhaben öffnen | Klick/Enter auf Titel | lesbares Vorhaben | Vorhaben wird geladen | Laden scheitert (Daten unlesbar geworden): Dialog UI-011 | UI-003 des Vorhabens, Wurzelknoten ausgewählt, alle Knoten ausgeklappt |
| „New project“ | Button (in Titelzeile; im Leerzustand im Leerbereich) | – | Dialog UI-002 | – | UI-002 |
| „Details“ (nicht lesbar) | Button in der Zeile | Vorhaben nicht lesbar | Dialog UI-011 | – | UI-011 |
| „Data notice“ | Link Kopfzeile | – | Dialog UI-009 (Ansichtsmodus) | – | UI-009 |

## Zustände
| Zustand | Darstellung | Artefakt | Text / Microcopy |
|---|---|---|---|
| default | Tabelle mit Zeilen; Button „New project“ in der Titelzeile | default.png | siehe oben |
| loading | Beim Start der Seite Text „Loading projects…“ anstelle der Tabelle (Ziel ≤ 1 s, REQ-053) | nur Text | „Loading projects…“ |
| empty | Kein Vorhaben: Leerbereich mit Text und einem Primärbutton; Titelzeile ohne Button | empty.png | „No project in this folder yet.“ / „New project“ |
| error | Liste nicht ladbar (unerwarteter Fehler): Banner (role=alert) | nur Text | „The projects could not be loaded. Restart Ramifold and try again.“ Ein unlesbarer oder zu neuer Ramifold-Bereich (`area.json`) ist **kein** Zustand dieser Seite: Der Start bricht im Terminal ab (TERM-010, TERM-011) |
| server-down | Ramifold beendet: dauerhaftes Banner MSG-013 über der Kopfzeile; Liste bleibt sichtbar, „New project“ und Öffnen deaktiviert | nur Text | MSG-013 |
| validation | nicht anwendbar (keine Eingaben) | – | – |
| permission | nicht anwendbar (eine Rolle); nicht lesbares Vorhaben: Zeile ohne Öffnen-Link, nur „Details“ | default.png | „Not readable“ |
| disabled | Zeile eines nicht lesbaren Vorhabens: Titel als Text (kein Link), Text gedämpft (Kontrast bleibt ≥ 4,5:1) | default.png | – |

## Responsive und Barrierefreiheit
Tabelle ist eine echte Tabelle (`<table>`, Kopfzellen `th scope="col"`). Fokus-Reihenfolge: Link „Data notice“ → „New project“ → Zeilen (Titel-Link, ggf. „Details“). Bei Zoom 200 % bleibt der Inhaltsbereich einspaltig, Spalte „Created“ rutscht unter den Titel. Statusmarke immer Symbol + Text.

## Bekannte Abweichungen im Mockup
Keine bekannten Abweichungen gegen diese Beschreibung außer: Sortierung/Datumsformat im Mockup nur Beispiel. Die Sortierung ist eine Annahme (siehe `uiux-design.md`, Annahme A-UX-07).

## Annahmen und offene Fragen
- Pfadangabe im Kopf: der Projektordner ist in der Oberfläche sichtbar, damit der Planer sieht, für welchen Ordner die Instanz läuft (REQ-001 verlangt dies nur im Terminal) – Entscheidung des Designs, keine neue Funktion.
