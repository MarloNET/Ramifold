# UI-008 – Kontext anzeigen (Seitenpanel)

- Zweck: Dem Planer den vollständigen Text zeigen, den Ramifold der nächsten KI-Anfrage dieses Knotens mitgibt.
- Flows: FLOW-003
- Anforderungen: REQ-036, REQ-031 bis REQ-035, REQ-029; AC-REQ-036-01 bis AC-REQ-036-03
- Rollen: Planer
- Gerät(e): Desktop ab 1280 px
- Artefakte: default.png (Viewport 1366 px, gerendert 2026-11-24; Stand: aktuell; Quelle `default.html`)

## Screen-Konzept
- Hauptaufgabe: Den Text lesen, den die nächste KI-Anfrage dieses Knotens mitbekommt.
- Nutzung: gelegentlich, zum Prüfen; Lesen und Scrollen.
- Primär: der Kontexttext (Monospace, schreibgeschützt).
- Sekundär: Erklärtext, „Close“.
- Bei Bedarf: Ladezustand und Fehlertext.
- Muster: Seitenpanel (Drawer), der Arbeitsbereich bleibt dahinter sichtbar.
- Akzent: keiner.

## Angezeigte Daten
| Element | Inhalt | Quelle | Hinweise |
|---|---|---|---|
| Titel | „Context for <Nr> <Titel>“ | Knoten | – |
| Hinweis | „This is the text Ramifold sends with the next AI request of this node. Claude Code may add its own instructions, which are not shown here.“ | REQ-036 | – |
| Kontexttext | vollständiger Text: feste Regeln für die KI, Kontext nach oben/unten/im Knoten; nach Sitzungsneuaufbau mit mitgegebenem Chatverlauf | Baum zum Zeitpunkt des Öffnens | schreibgeschützt, Monospace, scrollbar; wird bei jedem Öffnen neu gebildet (zeigt Änderungen von Auftrag/Ergebnis) |

## Eingaben und Validierung
Keine Eingaben (schreibgeschützt, aber per Tastatur fokussierbar und scrollbar).

## Aktionen
| Aktion | Auslöser | Voraussetzung / Rolle | Ergebnis bei Erfolg | Ergebnis bei Fehler | Navigation danach |
|---|---|---|---|---|---|
| Close | Button, „x“, ESC | – | Panel schließt | – | UI-003, Fokus auf „Show context“ |

## Zustände
| Zustand | Darstellung | Artefakt | Text / Microcopy |
|---|---|---|---|
| default | Panel rechts, 640 px | default.png | siehe oben |
| loading | „Loading context…“ im Textbereich | nur Text | „Loading context…“ |
| error | „The context could not be loaded. Close this panel and try again.“ | nur Text | – |
| empty / validation / permission / success / disabled | nicht anwendbar (der Kontext ist nie leer: feste Regeln immer vorhanden) | – | – |

## Responsive und Barrierefreiheit
Panel als modaler Dialog (`role="dialog"`), Fokus beim Öffnen auf den Titel/Textbereich; Textbereich `tabindex="0"` mit Label. Unter 1024 px füllt das Panel die Breite. Kein Kopieren-Button (nicht in den Requirements).

## Bekannte Abweichungen im Mockup
keine. Der Aufbau des Kontexttextes („RULES / ANCESTORS / SIBLINGS / THIS NODE“) ist beispielhaft; der genaue Aufbau ist Sache des Software Architects.

## Annahmen und offene Fragen
Der Kontexttext ist englisch/technisch und wird nicht lokalisiert; Inhalte des Planers erscheinen unverändert.
