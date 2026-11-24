# UI-011 – Vorhaben nicht lesbar (Dialog)

- Zweck: Dem Planer erklären, warum ein Vorhaben nicht geöffnet werden kann, wo das Problem liegt und was zu tun ist.
- Flows: FLOW-001 (Alternativpfad)
- Anforderungen: REQ-072; AC-REQ-072-*
- Rollen: Planer
- Gerät(e): Desktop ab 1280 px
- Artefakte: default.png (Viewport 1366 px, gerendert 2026-11-24; Stand: aktuell; Quelle `default.html`)

## Screen-Konzept
- Hauptaufgabe: Verstehen, warum ein Vorhaben nicht geöffnet werden kann und was zu tun ist.
- Nutzung: selten, nur im Fehlerfall; Lesen.
- Primär: Ursache („Cause“) und Anleitung; Aktion „Close“.
- Sekundär: Ort der Störung („Location“, Monospace).
- Bei Bedarf: nichts.
- Muster: Fehlerdialog (`alertdialog`) mit Definitionsliste (Ursache, Ort).
- Akzent: Rot nur am Fehlersymbol.

## Angezeigte Daten
| Element | Inhalt | Quelle | Hinweise |
|---|---|---|---|
| Titel | „<Vorhabentitel> cannot be opened“ | Vorhaben | Titel soweit lesbar, sonst „This project cannot be opened“ |
| Text | „Ramifold cannot read the data of this project. Ramifold did not change anything.“ | – | – |
| Cause | Ursache, z. B. „Git conflict“, „Damaged data“, „Data from a newer Ramifold version“, „Inconsistent data“ | REQ-072 | genau eine Ursache in einfachen Worten |
| Location | betroffene Stelle im Ramifold-Bereich (Pfad, Monospace) | REQ-072 | der Pfad im Mockup (`.ramifold/plans/<planId>/nodes/<nodeId>.json`) ist ein Beispiel; echte Namen: OQ-07 |
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
keine. Der Pfad (`.ramifold/plans/p-7f3a/nodes/n-21c4.json`) ist ein Beispiel; echte Namen: OQ-07.

## Annahmen und offene Fragen
Ursachenliste (festgeschrieben, CC-10): „Git conflict“ (Konfliktmarker in einer Plandatei), „Damaged data“ (Datei nicht lesbar oder formatwidrig), „Data from a newer Ramifold version“, „Inconsistent data“ (Verweise passen nicht zusammen, z. B. fehlender Elternknoten). Genau eine Ursache je Vorhaben. Konfliktmarker nur in `PLAN.md` machen ein Vorhaben **nicht** unlesbar (`PLAN.md` ist abgeleitet). Ein unlesbarer oder zu neuer Ramifold-Bereich selbst (`area.json`) führt zu einem Abbruch beim Start im Terminal (TERM-010, TERM-011), nicht zu diesem Dialog.
