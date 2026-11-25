# UI-007 – Knoten löschen (Warndialog)

- Zweck: Vor dem endgültigen Löschen eines Knotens mit Nachkommen die Folgen zeigen und ausdrücklich bestätigen lassen.
- Flows: FLOW-002
- Anforderungen: REQ-015; AC-REQ-015-01 bis AC-REQ-015-05
- Rollen: Planer
- Gerät(e): Desktop ab 1280 px
- Artefakte: default.png (Viewport 1366 px, gerendert 2026-11-24; Stand: aktuell; Quelle `default.html`)

## Screen-Konzept
- Hauptaufgabe: Die Folgen des Löschens erkennen und bewusst bestätigen oder abbrechen.
- Nutzung: selten; Initialfokus auf der sicheren Wahl „Cancel“.
- Primär: die Zahlenliste der Folgen; Aktion „Delete permanently“ (destruktiv, mit Text).
- Sekundär: „Cancel“.
- Bei Bedarf: Fehlerbanner im Dialog.
- Muster: Warndialog (`alertdialog`) mit Warnsymbol `triangle-alert` im Kopf (rot); ein Fehlerbanner im Dialog (Zustand „error“) trägt `circle-x` (Fehlerzustand, `DESIGN.md`).
- Akzent: Rot nur an Symbol und Schaltfläche.

## Angezeigte Daten
| Element | Inhalt | Quelle | Hinweise |
|---|---|---|---|
| Titel | „Delete <Nr> <Titel>?“ | Knoten | – |
| Text | „This permanently deletes the following. There is no undo.“ | – | – |
| Zahlen | „<n> nodes (this node and all sub-nodes)“, „<n> chats with at least one message“, „<n> fixed plans“ | Zählung des Teilbaums | Zeile mit 0 bleibt sichtbar („0 fixed plans“); Singular/Plural korrekt („1 node“, „1 fixed plan“) |

## Eingaben und Validierung
Keine Eingaben. Das Löschen wird nicht für den Wurzelknoten angeboten (AC-REQ-015-04): dort fehlt der Button „Delete“ im Knotenkopf.

## Aktionen
| Aktion | Auslöser | Voraussetzung / Rolle | Ergebnis bei Erfolg | Ergebnis bei Fehler | Navigation danach |
|---|---|---|---|---|---|
| Delete permanently | Destruktiver Button | Planer | Knoten, Nachkommen, Chats, Ergebnisse, Versionen gelöscht; läuft in einem betroffenen Knoten eine KI-Anfrage, wird sie beendet, ihre Antwort erscheint nirgends; Nummern neu berechnet; Toast „Node deleted“ | Speichern scheitert: MSG-002 im Dialog; von außen geändert: MSG-005; Knoten schon gelöscht: MSG-004 | Elternknoten ausgewählt |
| Cancel / ESC | Button (Initialfokus), Taste | – | nichts gelöscht | – | UI-003, Fokus auf „Delete“ |

## Zustände
| Zustand | Darstellung | Artefakt | Text / Microcopy |
|---|---|---|---|
| default | Dialog, Initialfokus auf „Cancel“ | default.png | siehe oben |
| loading | „Deleting…“, Buttons deaktiviert | nur Text | „Deleting…“ |
| error | Banner im Dialog mit Symbol `circle-x` und Text | nur Text | MSG-002 / -004 / -005 |
| empty / validation / permission / success | nicht anwendbar | – | – |

## Responsive und Barrierefreiheit
`role="alertdialog"`, Beschreibung = Text + Zahlenliste; Fokus-Falle; Zahlenliste als `<ul>`. Der destruktive Button ist rot **mit Text**, nicht nur Farbe.

## Bekannte Abweichungen im Mockup
keine. Der Hintergrund zeigt Beispielinhalt (abgedunkelt) und ist nicht verbindlich.

## Annahmen und offene Fragen
Keine.

## Ergänzung Runde 2
Zustand „read-only“ (MSG-005) und „server-down“ (MSG-013): „Delete permanently“ deaktiviert, Banner im Dialog. Siehe UI-003.
