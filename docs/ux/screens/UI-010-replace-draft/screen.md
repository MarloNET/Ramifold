# UI-010 – Ergebnisentwurf ersetzen? (Bestätigungsdialog)

- Zweck: Vor einer neuen Zusammenfassung bestätigen lassen, dass ein vorhandener Ergebnisentwurf ersetzt werden darf.
- Flows: FLOW-005
- Anforderungen: REQ-073 (Regel 2), REQ-041; AC-REQ-073-*
- Rollen: Planer
- Gerät(e): Desktop ab 1280 px
- Artefakte: `default.png` (Stitch 89d21363273845e4b2aabe743f2d1cd5); Export 2026-11-24

## Angezeigte Daten
Titel „Replace the unsaved draft?“; Text „<Nr> <Titel> has an unsaved draft. If you summarize again, the new AI draft replaces it as soon as it arrives. Until then your draft stays untouched.“ (im Mockup mit „2 Retrieval“).

## Eingaben und Validierung
Keine.

## Aktionen
| Aktion | Auslöser | Voraussetzung / Rolle | Ergebnis bei Erfolg | Ergebnis bei Fehler | Navigation danach |
|---|---|---|---|---|---|
| Summarize and replace | Primärbutton | KI-Anfrage zulässig (REQ-069, REQ-004, REQ-030) | Zusammenfassung wird angefordert; Entwurf bleibt bis zum Eingang des neuen KI-Entwurfs unverändert, Ergebnis in allen Fenstern nur lesbar | MSG-001 / MSG-003 / MSG-005; Entwurf bleibt | UI-003 (Knoten, Laufanzeige) |
| Keep my draft / ESC | Button (Initialfokus), Taste | – | keine Anfrage, Entwurf unverändert | – | UI-003 / UI-004 |

## Zustände
| Zustand | Darstellung | Artefakt | Text / Microcopy |
|---|---|---|---|
| default | Dialog mit Warnsymbol | default.png | siehe oben |
| loading / error / empty / validation / permission / success / disabled | nicht anwendbar (Dialog schließt sofort, Folgezustände in UI-003/UI-004) | – | – |

## Responsive und Barrierefreiheit
`role="alertdialog"`, Initialfokus auf „Keep my draft“ (sichere Wahl), Fokus-Falle.

## Bekannte Abweichungen im Mockup
Stitch hat einen zweiten, doppelten Screen erzeugt (Stitch 7f7f62b0c3ed4c6ca7d935edb98deb67); er wird nicht verwendet. Hintergrund zeigt Beispielinhalte (abgedunkelt).

## Annahmen und offene Fragen
Keine.
