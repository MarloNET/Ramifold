# UI-006 – Knoten-Formular (Dialog: Add child / Rename / Edit objective)

- Zweck: Titel und/oder Auftrag eines Knotens erfassen oder ändern.
- Flows: FLOW-002
- Anforderungen: REQ-011, REQ-012, REQ-013, REQ-005 (Regeln); AC-REQ-011-*, AC-REQ-012-*, AC-REQ-013-*
- Rollen: Planer
- Gerät(e): Desktop ab 1280 px
- Artefakte: default.png (Modus Add child), validation.png (Modus Rename, leerer Titel) (Viewport 1366 px, gerendert 2026-11-24; Stand: aktuell; Quellen `default.html`, `validation.html`)

## Screen-Konzept
- Hauptaufgabe: Titel und/oder Auftrag eines Knotens erfassen oder ändern.
- Nutzung: häufig, kurz, Tastatur; Fokus im ersten Feld.
- Primär: Feld „Title (required)“ bzw. „Objective“ und die Aktion des Modus („Add node“, „Save title“, „Save objective“).
- Sekundär: „Cancel“, Schließen-Icon, Feld „Objective“ (Add child).
- Bei Bedarf: Fehlertext unter dem Feld (erst bei Validierung).
- Muster: modaler Dialog, einspaltiges Formular; `validation.png` ist das Muster für alle Formulare.
- Akzent: keiner.

## Angezeigte Daten
Modus bestimmt Titel und Felder:
| Modus | Dialogtitel | Felder | Primärbutton |
|---|---|---|---|
| Add child | „Add child to <Nr> <Titel>“ (Wurzel: ohne Nr) | Title (required), Objective (leer) | „Add node“ |
| Rename | „Rename <Nr> <Titel>“ | Title (required, vorbelegt) | „Save title“ |
| Edit objective | „Edit objective of <Nr> <Titel>“ | Objective (vorbelegt) | „Save objective“ |

## Eingaben und Validierung
| Feld | Typ | Pflicht | Regel | Fehlermeldung (Wortlaut) |
|---|---|---|---|---|
| Title | einzeiliger Text | ja | nach Trim 1–200 Zeichen | „A title is required.“ / „The title can be at most 200 characters.“ |
| Objective | mehrzeiliger Text | nein | keine Begrenzung | – |

Validierung beim Absenden; Fehlertext unter dem Feld mit Symbol, roter Rand; Fokus auf erstes fehlerhaftes Feld; Eingaben bleiben. Bei „Rename“ mit leerem Titel behält der Knoten seinen Titel (AC-REQ-012-02).

## Aktionen
| Aktion | Auslöser | Voraussetzung / Rolle | Ergebnis bei Erfolg | Ergebnis bei Fehler | Navigation danach |
|---|---|---|---|---|---|
| Primärbutton | Klick, Strg/Cmd+Enter | gültige Eingaben | Add: Knoten als letztes Kind, Status „No result yet“, leerer Chat, Toast „Node added“; Rename/Objective: Änderung gespeichert, Nummer/Chat/Ergebnis unverändert (Auftrag erzeugt keine Version), Toast „Saved“; Auftrag gilt ab der nächsten KI-Anfrage | Speichern scheitert: MSG-002 im Dialog, Eingaben bleiben; Knoten gelöscht: MSG-004; von außen geändert: MSG-005 | Dialog schließt; bei „Add child“ wird der neue Knoten ausgewählt, sonst bleibt die Auswahl |
| Cancel / „x“ / ESC | – | – | schließt ohne Änderung; Fokus zurück zum auslösenden Button | – | UI-003 |

## Zustände
| Zustand | Darstellung | Artefakt | Text / Microcopy |
|---|---|---|---|
| default | Dialog mit Fokus im ersten Feld | nur Text (Layout wie UI-002) | – |
| loading | Primärbutton „Saving…“, Felder gesperrt | nur Text | „Saving…“ |
| empty / permission / success | nicht anwendbar (success = Dialog schließt, Toast) | – | – |
| error | Banner im Dialog mit Symbol `circle-x` | nur Text | MSG-002 / MSG-004 / MSG-005 |
| validation | Fehlertext + roter Rand + Symbol | validation.png | „A title is required.“ |
| disabled | „Add child“/„Rename“ sind in einem Fenster nicht gesperrt, auch wenn das Ergebnis in anderem Fenster bearbeitet wird | – | – |

## Responsive und Barrierefreiheit
Wie UI-002 (Fokus-Falle, ESC, Beschriftungen, Pflichtfeld „(required)“). Fehlertext verbunden über `aria-describedby`, Feld `aria-invalid`.

## Bekannte Abweichungen im Mockup
keine. Der rote Rand des Titelfeldes in `validation.png` ist gewollt, ergänzt durch Symbol und Text.

## Annahmen und offene Fragen
Keine.

## Ergänzung Runde 2
Zustand „read-only“ (MSG-005) und „server-down“ (MSG-013): Bestätigung deaktiviert, Eingaben bleiben markierbar, Banner im Dialog. Siehe UI-003.
