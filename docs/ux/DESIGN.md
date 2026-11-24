# DESIGN – Ramifold
Status: **vom Owner gewählt am 2026-11-24 (MAR-1390): Look A „Werkbank“** (Alternativen und Begründung: `looks/looks.md`). Quelle der Mockup-Werte: `mockups/base.css`. Umsetzung (`ui-constraints` v3, ADR-001): React + TypeScript mit React Aria Components; alle Tokens als CSS Custom Properties.

## Charakter
Kompakt, nüchtern, präzise. Ramifold läuft stundenlang neben Terminal und Coding-Agent, der Planer liest viel Markdown und bedient mit der Tastatur; deshalb zeigt der Look viel Baum und Inhalt zugleich, auf kühlen Grautönen. Orientierung: Editor- und Terminal-Werkzeuge (Dichte), Git-Oberflächen (Statussymbole).
Mut zeigt der Look an einer Stelle: dem **Statussystem** (Symbol je Ergebnisstatus im Baum, gestrichelt – Punkt – Haken). Alles andere bleibt ruhig; Farbe tragen nur Auswahl, Status und die eine Primäraktion (Petrol).
Bewusst vermieden: Karten für alles, ein Radius überall, Schlagschatten, Verläufe, Großbuchstaben-Beschriftungen, Inter und Standard-Blau. Statt Statuswörtern im Baum stehen Symbole; das Wort ist Tooltip und zugänglicher Name.

## Farben
| Token | Hex | Rolle |
|---|---|---|
| bg | #FFFFFF | Arbeits- und Lesefläche, Kopfzeile |
| surface | #F3F5F7 | Tabellenkopf |
| tree-bg | #EDF0F3 | Baumspalte |
| hover | #E6EBEF | Hover auf Icon-Buttons |
| divider | #D3D9DF | Trennlinien ohne Informationsfunktion |
| border | #66727F | Rand von Eingabefeldern und Schaltflächen |
| text | #17202A | Haupttext |
| text-muted | #4A5561 | Sekundärtext, Zeitstempel, Hilfetexte |
| primary | #0B6073 | Primäraktion, Links, Markenname; Fläche der Primärschaltfläche |
| on-primary | #FFFFFF | Text auf primary |
| tree-sel-bg / -text / -bar | #D5E7EA / #0A3F4C / #0B6073 | ausgewählter Baumknoten (plus 3-px-Balken) |
| focus | #0B57D0 | Fokusrahmen 2 px, Abstand 2 px |
| status-none | #4A5561 | „No result yet“ (gestrichelter Kreis); Pille #EBEEF1 / Text #3C4651 |
| status-concept | #8A4B08 | „Concept“ (Kreis mit Punkt); Pille #FCEFD2 / Text #7A4206 |
| status-fixed | #0A6B3D | „Fixed plan“ (Kreis mit Haken); Pille #DDF2E5 / Text #08592F |
| info | #0B57D0 | Info, „AI running“; Banner #E8F0FD, Rand #B4CCF3, Text #0A3E94 |
| error | #B42318 | Fehler, Löschen; Banner #FDECEA, Rand #F0B5AF, Text #8E1B12 |
| warning | Banner #FEF3C7, Rand #E6CE82, Text #6E3B05 | Warnungen |
| success | Banner #E4F5EA, Rand #A8D9BC, Text #08592F | Erfolg |
| you-bg | #E3F0F2 (Rand #B6D4DA) | Nachrichten des Planers |

Gemessene Kontraste (berechnet, Skript, WCAG 2.2): text/bg 16,5; text-muted/bg 7,6; text-muted/tree-bg 6,6; on-primary/primary 7,2; primary/bg 7,2; border/bg 4,9 (Komponente, Ziel 3:1); Baumauswahl 9,0; Status im Baum: concept 5,9, fixed 5,8, none 6,6 (Symbole, Ziel 3:1); Pillen 7,1 bis 8,2; Banner info 8,6, error 7,9, warning 8,2, success 7,5; focus/bg 6,4; text/you-bg 14,1.

## Typografie
**IBM Plex Sans** (Text) und **IBM Plex Mono** (Code, Quelltext, Pfade, Kontexttext). Beide SIL Open Font License 1.1, als lokale woff2-Dateien ausgeliefert (Latin; Sans 400/500/600/700, Mono 400), keine CDN-Verbindung (REQ-056, REQ-061). Fallback Text: `system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; Code: `ui-monospace, Menlo, Consolas, monospace`. Das Layout hängt nicht von den Schriftmetriken ab.
Größen (rem, damit Textvergrößerung bis 200 % greift): Basis 0,9 rem / 1,5; Baumzeile 0,88 rem; Seitentitel und Knotentitel 1,35 rem semibold; Abschnitt 1,05 rem semibold; Marke/Meta 0,8 rem. Zahlen in Tabellen und Baumnummern mit tabellarischen Ziffern.

## Form und Dichte
Radius nach Ebene: Marken und Baumzeile 3 px, Schaltflächen und Felder 4 px, Ergebnisfläche, Nachrichten, Dialoge 6 px, Pillen voll rund. 4-/8-px-Raster. Dicht: Baumzeile 30 px, Schaltfläche 32 px, Mindest-Zielgröße 32 × 32 px. Kopfzeile 48 px, Baumspalte 320 px (fest in 0.1), Arbeitsbereich mit Innenabstand 20/32 px, Lesebreite für Fließtext höchstens 84 Zeichen. Dialogbreite 560 px (breit 620 px), Kontext-Panel 640 px; ein dezenter Schatten nur an Dialog und Panel.

## Icons
**Lucide** (ISC-Lizenz), Linienstil, Strichstärke 1,75, Größe 1,15 em (Baum und Pillen 14 px), als mitgelieferte Inline-SVGs (`mockups/icons.svg`), nur die verwendeten. Ein Icon, eine Bedeutung.
| Bedeutung | Icon | Farbe | Zugänglicher Name / Tooltip |
|---|---|---|---|
| kein Ergebnis | circle-dashed | status-none | „No result yet“ |
| Concept | circle-dot | status-concept | „Concept“ |
| Fixed plan | circle-check | status-fixed | „Fixed plan“ |
| KI läuft | loader-circle (mit Text „AI running“) | info | „AI running“ |
| Info | info | info | – (Text steht daneben) |
| Fehler / nicht gesendet / unvollständig | circle-x | error | Text steht daneben |
| Warnung / nicht lesbar | triangle-alert | warning bzw. error | Text steht daneben |
| Ergebnis gesperrt | lock | text-muted | „being edited in another window“ bzw. „Read-only“ |
| Bild-Link (Bilder werden nicht geladen) | image | Link | Tooltip „Images are not loaded. Opens in a new tab.“ |
| Umbenennen / Auftrag bearbeiten / Unterpunkt hinzufügen / nach oben / nach unten | text-cursor-input / file-text / plus / arrow-up / arrow-down | text-muted | „Rename“ / „Edit objective“ / „Add child“ / „Move up“ / „Move down“ |
| Ergebnis bearbeiten / Zusammenfassen / Vorschläge | pencil / sparkles / list-tree | text | Text steht daneben |
| Senden / Stopp / Kontext / Export / Löschen | send / square / eye / download / trash-2 | je Schaltfläche | Text steht daneben |
| Auf-/Zuklappen | chevron-right / chevron-down | tree-muted | `aria-expanded` |
Ein Statussymbol allein trägt die Information über seine Form (nicht nur Farbe); das Wort steht im zugänglichen Namen und im Tooltip. Im Baum gehört der Tooltip zur Zeile, nicht zum Symbol: Er erscheint bei Mausposition auf der Zeile und bei Tastaturfokus auf der Zeile (ohne Zusatzbedienung, `Esc` blendet ihn aus, WCAG 1.4.13); der zugängliche Name der Baumzeile enthält das Statuswort („2.2 Embedding-Modell, Concept“). Ein Icon steht für genau eine Bedeutung; „pencil“ ist ausschließlich „Edit result“. Die Statuspille im Abschnitt „Result“ zeigt Symbol und Wort.

## Komponentenregeln
- **Buttons:** primär (gefüllt primary, höchstens einer je Bereich), sekundär (Rand border), Text-Button für Nebenaktionen, destruktiv (gefüllt error, nur im Löschdialog; „Delete“ im Knotenkopf ist ein roter Text-Button mit Symbol). Beschriftung = Ergebnis der Aktion. Icon-Buttons: Tooltip, zugänglicher Name, 32 × 32 px. Deaktiviert: `aria-disabled`, gedämpft, bleibt fokussierbar.
- **Formulare:** Label immer sichtbar über dem Feld, Pflichtfeld „(required)“ im Label, Fehlertext unter dem Feld in error mit Symbol, roter Rand 2 px, Fokus auf das erste fehlerhafte Feld.
- **Baum:** Zeile = Auf-/Zuklapp-Pfeil, Nummer, Titel, „+n“, Markierungen „AI running“ und „Draft“, Statussymbol rechts. Ausgewählt: tree-sel-bg und 3-px-Balken.
- **Pillen und Marken:** Status-Pille mit Symbol und Wort im Ergebnis; Zustandsmarken an Nachrichten („incomplete“, „aborted“, „not sent“) als Text-Pille mit Symbol und Ursache.
- **Feedback:** Banner (bleibt, `role="alert"` bzw. `status`), Inline unter Feldern, Toast nur für flüchtigen Erfolg (6 s, schließbar). Dialoge modal, Fokus-Falle, ESC schließt, Fokus kehrt zurück.
- **Chat:** Planer rechts auf you-bg, KI links auf bg mit Rand divider; Absender als Text („You“, „AI“) und Zeit.
- **Muster:** Master-Detail (Baum links, Knoten rechts), Dialog für Formulare und Bestätigungen, Seitenpanel für den Kontext (UI-008), Sammelbereich der Vorschlagskarten (UI-005), Icon-Zeile für Knotenaktionen, Tooltips für Icons.
- **Leerzustände:** ein Satz und genau eine Folgeaktion.
- **Markdown:** Überschriften, Listen, Tabellen (Rand divider, horizontal scrollbar), Codeblöcke (code-bg, Mono, scrollbar), Links in neuem Tab; keine eingebetteten Bilder, ein Bild erscheint als Link mit Bild-Icon.
- **Banner „ganzes Fenster“** (`read-only`, `server-down`): volle Breite, nicht schließbar, error-Farben, schiebt den Inhalt statt ihn zu überdecken.

## Barrierefreiheit
Ziel WCAG 2.2 AA für die sechs Kriterien aus REQ-062 (1.4.3, 1.4.4, 2.1.1, 2.4.3, 2.4.7, 4.1.2). Fokus: 2 px focus-Rahmen mit 2 px Abstand, nie entfernt. Mindest-Zielgröße 32 × 32 px. Keine dekorativen Animationen; die Laufanzeige ist Symbol plus Text, eine Drehung nur dezent und bei `prefers-reduced-motion` abgeschaltet.

## Nicht verwenden
(a) Elemente ohne Grundlage im Screen-Inventar, in den `screen.md` oder in den Requirements: Einstellungs-Zahnrad, Avatar/Profil, Benachrichtigungsglocke, globale Suche, Hamburger-Menü, Bottom-Navigation, Seitenleisten-Menüs außer dem Baum, Dark-Mode-Schalter, Hilfe-Icon, Kennzahlen, Diagramme, Fortschrittsbalken, Badges, Footer, Marketing-, Hilfe- und Platzhaltertexte, Onboarding; Anzeigen für Werkzeuge oder Skills der KI, Modellauswahl, Versionsverläufe, Verweise (spätere Slices).
(b) Projektspezifisch: Verläufe, Schlagschatten außer an Dialog und Panel, dekorative Animationen, mehr als ein Primärbutton je Bereich, Großbuchstaben-Beschriftungen, Schriften und Icons von einem CDN.
