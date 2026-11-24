# DESIGN – Ramifold

Status: **vorgeschlagen** (Requirements 10.4: kein vorhandenes Design-System, keine Marke, keine Komponentenbibliothek vorgegeben). Verbindlich wird es erst mit der Freigabe des Designs (Gate „Wie“). Umsetzung (`ui-constraints` v2, ADR-001): React + TypeScript mit **React Aria Components** ohne Fertig-Bibliothek mit eigenem Look; alle Tokens unten werden als CSS Custom Properties umgesetzt. Technische Machbarkeit jeder Komponente beurteilt der Software Architect im Cross-Check. **Stitch-Mockups und ihr HTML sind nur visuelle Referenz**, nie Umsetzungsvorlage.

Leitidee: ruhiges, dichtes Arbeitswerkzeug für lange Planungssitzungen am Desktop (≥ 1280 px). Lesbarkeit vor Dekoration, wenige Farben, Status nie nur über Farbe.

## Farben
| Token | Hex | Rolle |
|---|---|---|
| bg | #FFFFFF | Seitenhintergrund, Lese- und Arbeitsflächen |
| surface | #F6F8FA | Seitenleisten (Baum), Kopfzeile, Chat-Hintergrund |
| border | #6B7280 | Rand von Eingabefeldern und Schaltflächen (UI-Komponenten, 4,8:1) |
| divider | #D0D7DE | Trennlinien ohne Informationsfunktion |
| text | #1F2328 | Haupttext |
| text-muted | #4B5563 | Sekundärtext, Zeitstempel, Hilfetexte |
| primary | #1D4ED8 | Primäraktionen, Links, Auswahl, Fokus-Akzent |
| on-primary | #FFFFFF | Text auf primary |
| primary-subtle | #E8EEFD | ausgewählter Baumknoten, Infobanner |
| focus | #0B57D0 | Fokusrahmen 2 px + 2 px Abstand |
| error | #B42318 | Fehlertext, Fehlerrand; Hintergrund error-subtle #FDECEA |
| success | #067647 | Erfolg, Status „Fixed plan“; Hintergrund #E7F6EC |
| warning | #8A4B08 | Warnhinweise, Status „Concept“; Hintergrund #FEF3C7 |
| status-open | #4B5563 | Status „No result yet“; Hintergrund #EEF0F3 |

Kontrast (berechnet, WCAG 1.4.3 ≥ 4,5:1 Text, ≥ 3:1 Komponenten): text/bg 15,8; text-muted/bg 7,6; on-primary/primary 6,7; primary/bg 6,7; primary/primary-subtle 5,8; border/bg 4,8; error/bg 6,6; error/error-subtle 5,8; success/Hintergrund 5,1; warning/Hintergrund 6,1; status-open/Hintergrund 6,6; focus/bg 6,4.

## Typografie
Headline und Body: **Inter**, Code/Inline-Code/Codeblöcke: **JetBrains Mono** (beide SIL Open Font License 1.1). Basis 15 px / 22 px Zeilenhöhe (Fließtext in Chat und Ergebnis 15 px). Stufen: Seitentitel 22/28 semibold, Abschnitt 17/24 semibold, Label/Meta 13/18 medium, Baumzeile 14/20. Alle Größen in rem, damit Browser-Textvergrößerung greift (WCAG 1.4.4, bis 200 %).

### Auslieferung von Schriften und Icons (REQ-056, REQ-061)
Ramifold läuft ohne Internet und baut selbst keine Verbindungen nach außen auf. Deshalb: **keine Web-Fonts, Icons oder Skripte von einem CDN** (die Stitch-Exporte referenzieren teils Google Fonts und Material Symbols per CDN; das gilt nicht für die Umsetzung).
- **Schriften:** Inter und JetBrains Mono als mitgelieferte Dateien (woff2, nur benötigte Schnitte: regular, medium, semibold) *oder*, falls der Software Architect das nicht bündeln will, nur der Systemfallback. Das Layout darf nicht von den Schriftmetriken abhängen (keine festen Breiten für Text).
- **Fallback-Stack Text:** `Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- **Fallback-Stack Code:** `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`.
- **Icons:** Material Symbols (Outlined, Apache License 2.0) als **mitgelieferte Inline-SVGs**, nur die verwendeten Symbole (Auf-/Zuklapp-Pfeil, Status „offen/Halbkreis/Haken“, Warnung, Fehler, Info, Schließen, Bild-Link). Jedes Icon hat Text daneben oder `aria-label`; Icons allein tragen keine Information. Die endgültige Auswahl und Lizenzprüfung gehören in die Baseline des Software Architects.

## Form und Dichte
Eckenradius 6 px (Stitch: ROUND_EIGHT als nächste Stufe), 8er-Raster, Dichte normal bis kompakt (Baumzeile 32 px Höhe, Schaltflächen 36 px, Mindest-Zielgröße 32 × 32 px). Layout: Kopfzeile 48 px; links Baumspalte 320 px (nicht verstellbar in 0.1), rechts Arbeitsbereich flexibel, Lesebreite für Fließtext höchstens 80 Zeichen.

## Komponentenregeln
- **Buttons:** primär (gefüllt primary, höchstens einer pro Bereich), sekundär (Rand border, Text text), destruktiv (gefüllt error, nur im Löschdialog), Text-Button (Link-Stil) für Nebenaktionen. Beschriftung = Ergebnis der Aktion („Save as concept“). Deaktiviert: Text text-muted, Rand divider, `aria-disabled`, mit Grund als sichtbarem Hilfetext oder Tooltip.
- **Formulare:** Label immer sichtbar über dem Feld, Pflichtfeld mit „(required)“ im Label, Fehlertext unter dem Feld in error mit Symbol, Fokus springt bei Fehler zum ersten fehlerhaften Feld.
- **Baum:** Zeile = Auf-/Zuklapp-Pfeil (nur bei Kindern), Nummer, Titel, Statusmarke. Ausgewählt: primary-subtle plus 3 px Balken links (nicht nur Farbe). Eingeklappt: Zahl verborgener Nachkommen als „+4“.
- **Statusmarken (Ergebnisstatus):** Pille mit Symbol und Text – „No result yet“ (offener Kreis, status-open), „Concept“ (Halbkreis, warning), „Fixed plan“ (Haken, success).
- **Feedback:** *Banner* (oben im Arbeitsbereich, bleibt bis erledigt, `role="alert"` bei Fehlern, `role="status"` bei Info) für Zustände, die den Planer betreffen; *Inline* (unter Feld) für Validierung; *Toast* nur für flüchtige Erfolgsmeldungen (z. B. „Saved“), 6 s, schließbar, nie als einziger Träger einer Fehlermeldung. Dialoge sind modal, Fokus-Falle, ESC schließt, Fokus kehrt zum Auslöser zurück.
- **Chat:** Planer-Nachrichten rechtsbündig in primary-subtle, KI-Nachrichten linksbündig auf bg mit Rand divider; Absender als Text („You“, „AI“) und Zeitpunkt. Zustandsmarken „incomplete“, „aborted“, „not saved“ als Text-Pille unter der Nachricht.
- **Leerzustände:** kurzer Satz plus genau eine Folgeaktion.
- **Markdown-Darstellung:** Überschriften, Listen, Tabellen (mit Rand divider, horizontal scrollbar bei Überbreite), Codeblöcke (surface, JetBrains Mono, horizontal scrollbar), Links (öffnen in neuem Tab, `rel="noopener noreferrer"`). Kein eingebettetes HTML.
  - **Bilder werden nicht geladen** (REQ-061). Ein Bild erscheint als Link mit Alternativtext: Bildsymbol (Inline-SVG) + Linktext in Link-Stil, z. B. `![Architektur](https://…/a.png)` → „🖼 Architektur“. Tooltip: „Images are not loaded. Opens in a new tab.“ Leerer Alternativtext → Linktext „Image“, Adresse im Tooltip. Kein Platzhalterkasten, keine Lade- oder Fehlergrafik. Tastaturfokus wie bei jedem Link. Gilt in Ergebnis, Chat, Objective und der Vorschau von UI-004.
- **Banner „ganzes Fenster“** (`read-only`, `server-down`): volle Breite, nicht schließbar, `role="alert"`, error-subtle mit Symbol und Text; steht über allem anderen Inhalt (server-down über der Kopfzeile, read-only oberhalb des Knotenkopfes) und verschiebt den Inhalt statt ihn zu überdecken.

## Barrierefreiheit
Ziele: WCAG 2.2 AA für die sechs Kriterien aus REQ-062 (1.4.3, 1.4.4, 2.1.1, 2.4.3, 2.4.7, 4.1.2). Fokusdarstellung: 2 px focus-Rahmen mit 2 px Abstand, nie entfernt. Mindest-Zielgröße 32 × 32 px. Bewegung: keine dekorativen Animationen; Laufanzeige als Text plus statisches Symbol, Animation nur dezent und bei `prefers-reduced-motion` abgeschaltet.

## Nicht verwenden
- Kopf- und Navigationselemente, die nicht im Screen-Inventar stehen: Einstellungs-Zahnrad, Avatar/Profil, Benachrichtigungsglocke, globale Suche, Hamburger-Menü, Bottom-Navigation, Seitenleisten-Menüs außer dem Baum, Dark-Mode-Schalter, Hilfe-Icon
- Platzhalter-, Hilfe- oder Marketingtexte, die nicht in `screen.md` stehen; Onboarding-Touren
- Kennzahlen, Diagramme, Fortschrittsbalken, Badges, Footer ohne Grundlage in den Requirements
- Verläufe, Schlagschatten außer dezentem Dialog-Schatten, dekorative Animationen, mehr als ein Primärbutton pro Bereich
- Anzeigen für Werkzeuge oder Skills der KI, Modellauswahl, Versionsverläufe, Verweise/Abhängigkeiten (spätere Slices)
