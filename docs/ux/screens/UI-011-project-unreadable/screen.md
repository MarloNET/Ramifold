# UI-011 – Vorhaben nicht lesbar (Dialog)

- Zweck: Dem Planer erklären, warum ein Vorhaben nicht geöffnet werden kann, wo das Problem liegt und was zu tun ist.
- Flows: FLOW-001 (Alternativpfad)
- Anforderungen: REQ-072; AC-REQ-072-*
- Rollen: Planer
- Gerät(e): Desktop ab 1280 px
- Artefakte: `default.png` (Stitch 944e9751160141f7acab4881e8995e52); Export 2026-11-24

## Angezeigte Daten
| Element | Inhalt | Quelle | Hinweise |
|---|---|---|---|
| Titel | „<Vorhabentitel> cannot be opened“ | Vorhaben | Titel soweit lesbar, sonst „This project cannot be opened“ |
| Text | „Ramifold cannot read the data of this project. Ramifold did not change anything.“ | – | – |
| Cause | Ursache, z. B. „Git conflict“, „Damaged data“, „Data from a newer Ramifold version“, „Inconsistent data“ | REQ-072 | genau eine Ursache in einfachen Worten |
| Location | betroffene Stelle im Ramifold-Bereich (Pfad, Monospace) | REQ-072 | der Pfad im Mockup (`.ramifold/projects/3f2a/tree.json`) ist ein Beispiel; echte Namen: OQ-07 |
| Anleitung | „Resolve the problem in your project folder, restart Ramifold, and open the project again. Your other projects are not affected.“ | – | – |

## Eingaben und Validierung
Keine.

## Aktionen
| Aktion | Auslöser | Voraussetzung / Rolle | Ergebnis bei Erfolg | Ergebnis bei Fehler | Navigation danach |
|---|---|---|---|---|---|
| Close | Primärbutton, ESC | – | Dialog schließt | – | UI-001, Fokus auf „Details“ |

Kein „Reparieren“ oder „Erneut versuchen“ (REQ-072: keine Reparatur).

## Zustände
| Zustand | Darstellung | Artefakt | Text / Microcopy |
|---|---|---|---|
| default | Dialog mit Fehlersymbol | default.png | siehe oben |
| andere | nicht anwendbar | – | – |

## Responsive und Barrierefreiheit
`role="alertdialog"`; Ursache/Ort als Definitionsliste (`dl`); Initialfokus auf „Close“.

## Bekannte Abweichungen im Mockup
Hintergrund zeigt die abgedunkelte Vorhabenliste; sonst keine.

## Annahmen und offene Fragen
Die Ursachen-Texte sind Beispiele; die vollständige Liste legt der Software Architect mit der Fehlererkennung fest.
