# Look-Wahl Ramifold (Slice 0.1, MAR-1390)

Schlüsselscreen: **UI-003 Arbeitsbereich, Zustand default** (häufigster Screen, Hauptflow FLOW-003/-005). Gleicher Inhalt, gleiche Struktur und gleiches Verhalten in allen drei Looks; verglichen werden nur Farbe, Schrift, Dichte, Form und Navigationsfläche. Alle Looks laufen **offline** (Schriften als lokale woff2-Dateien, SIL OFL 1.1; Icons als Inline-SVG aus Lucide, ISC-Lizenz; keine CDN-Abhängigkeit, REQ-056/-061) und lassen sich mit React Aria Components (ADR-001) über CSS Custom Properties umsetzen. Alle Bilder: 1366 px Breite, gerendert 2026-11-24.

Gemeinsame Annahmen aus dem Fach: ein Entwickler, mehrstündige Planungssitzungen am Desktop neben Terminal und Coding-Agent, viel Lesen von Markdown, wenig Klicken, Tastatur (Requirements 10.2/10.5). Alle Looks verwenden Status-Symbole (Kreis gestrichelt = kein Ergebnis, Kreis mit Punkt = Concept, Kreis mit Haken = Fixed plan) statt Statuswörter im Baum; das Wort steht im Tooltip und im zugänglichen Namen.

## A – Werkbank (empfohlen)
- Charakter: kompakt, nüchtern, präzise. Wie ein Editor oder Terminal-Werkzeug: viel Inhalt je Bildschirm, ruhige kühle Grautöne, ein Petrol-Akzent nur für Auswahl und Primäraktion.
- Farben: Weiß und kühles Hellgrau, Tinte `#17202A`, Akzent Petrol `#0B6073`; Status Bernstein (Concept) und Grün (Fixed plan).
- Schrift: IBM Plex Sans (Text) und IBM Plex Mono (Code), Basis 14,4 px. Radius 3–6 px, Zeilenhöhe im Baum 30 px.
- Passt zu: langes Arbeiten, viele Knoten gleichzeitig sichtbar, Tastaturbedienung.
- Kontraste (berechnet): Text 16,5:1, Sekundärtext 7,6:1, Primär 7,2:1, Rand 4,9:1.
- Bild: `look-a.png`

## B – Papier
- Charakter: ruhig, großzügig, lesefreundlich. Wie ein gut gesetztes Dokument: warmes Weiß, viel Luft, weiche Ecken, grüner Akzent.
- Farben: Papierweiß `#FFFEFB`, warmes Grau, Tinte `#26221C`, Akzent Waldgrün `#2D6A4A`.
- Schrift: Source Sans 3 (Text) und JetBrains Mono (Code), Basis 17 px. Radius 6–12 px, Baumzeile 38 px.
- Passt zu: Ergebnisse und Antworten lesen und redigieren; weniger Knoten auf einmal sichtbar.
- Kontraste: Text 15,7:1, Sekundärtext 7,5:1, Primär 6,4:1, Rand 5,1:1.
- Bild: `look-b.png`

## C – Kontrast
- Charakter: klar gegliedert, kräftig, gut lesbar. Dunkle Kopfzeile und dunkler Baum als Orientierungsfläche, helle Arbeitsfläche, ein warmer Orangeton als Akzent.
- Farben: Marine `#142238` / `#1B2D4A`, Weiß, Akzent Orange `#B8400C` (auf Dunkel `#FFB68A`); Status auf dunklem Baum hell eingefärbt.
- Schrift: Atkinson Hyperlegible (Text, für hohe Buchstabenunterscheidbarkeit entworfen) und IBM Plex Mono (Code), Basis 16 px. Radius 2–4 px, Baumzeile 34 px.
- Passt zu: sehr deutliche Trennung von „Plan“ und „Inhalt“, hoher Lesekomfort.
- Kontraste: Text 17,4:1, Primär 5,6:1, Baumtext auf Dunkel 12,3:1.
- Bild: `look-c.png`

## Empfehlung
**A – Werkbank.** Ramifold wird stundenlang neben Terminal und Coding-Agent genutzt; A zeigt am meisten Baum und Inhalt zugleich, ist ruhig und setzt Farbe nur für Auswahl, Status und die eine Primäraktion ein.

## Entscheidung
**A – Werkbank**, vom Owner gewählt am 2026-11-24 (Antwort auf die Frage an den Owner, MAR-1390). Übernommen in `DESIGN.md` und `mockups/base.css`; B und C bleiben als Alternativen dokumentiert.
