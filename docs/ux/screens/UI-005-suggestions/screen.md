# UI-005 – Unterpunkt-Vorschläge prüfen (Sub-item suggestions)

- Zweck: Von der KI vorgeschlagene Unterpunkte prüfen, ändern, übernehmen oder verwerfen.
- Flows: FLOW-004
- Anforderungen: REQ-037, REQ-038, REQ-039, REQ-040, REQ-005 (Regeln), REQ-069; AC-REQ-037-* bis AC-REQ-040-*
- Rollen: Planer. Nur der Planer macht Vorschläge zu Knoten (LP-03).
- Gerät(e): Desktop ab 1280 px
- Artefakte: `default.png` (Stitch eab93c6de6ac40b7920ba87d7ffdbc4e); Export 2026-11-24

## Angezeigte Daten
| Element | Inhalt | Quelle | Hinweise |
|---|---|---|---|
| Knotenkopf | „<Nr> <Titel>“ | Knoten | – |
| Abschnitt „Suggested sub-items“ | „<n> suggestions from the AI. Nothing is added to the plan until you accept.“ | Vorschlagsliste der Instanz | n aktualisiert sich |
| Karte je Vorschlag | Felder „Title (required)“, „Objective“ (vorbelegt mit KI-Vorschlag), Buttons „Discard“, „Accept“ | Vorschlag | Reihenfolge der KI; zeigt Vorschläge in jedem Fenster der Instanz (REQ-071) |

## Eingaben und Validierung
| Feld | Typ | Pflicht | Regel | Fehlermeldung (Wortlaut) |
|---|---|---|---|---|
| Title (je Karte) | einzeiliger Text | ja | nach Trim 1–200 Zeichen | „A title is required.“ / „The title can be at most 200 characters.“ |
| Objective (je Karte) | mehrzeiliger Text | nein | keine Begrenzung | – |

Änderungen an Karten bleiben Eingaben dieses Fensters, bis die Karte übernommen oder verworfen wird. **„Suggest sub-items“ (UI-003) bei bereits offenen Vorschlägen ersetzt alle offenen Vorschläge sofort, auch geänderte Karten, ohne Rückfrage und ohne Dialog (KL-05, REQ-037).**

## Aktionen
| Aktion | Auslöser | Voraussetzung / Rolle | Ergebnis bei Erfolg | Ergebnis bei Fehler | Navigation danach |
|---|---|---|---|---|---|
| Accept | Sekundärbutton je Karte | Titel gültig | Knoten wird als letztes Kind angelegt (Status „No result yet“, leerer Chat); Karte verschwindet; Statusmeldung „Added <Nr> <Titel>“; Fokus auf nächste Karte | Titel ungültig: Fehlertext, Karte bleibt; Speichern scheitert: MSG-002; von außen geändert: MSG-005 | bleibt; nach letzter Karte siehe empty |
| Accept all | Primärbutton | alle Titel gültig | alle Knoten in Reihenfolge der Vorschläge angelegt, Liste leer | mindestens ein Titel ungültig: nichts wird übernommen, Fokus auf das erste ungültige Feld, Meldung „Fix the titles marked above to accept all.“ | empty |
| Discard | Textbutton je Karte | – | Karte entfernt; Baum unverändert | – | – |
| Discard all | Sekundärbutton | – | alle Karten entfernt, nach Rückfrage-Dialog nur wenn Karten geändert wurden („Discard all suggestions? / Discard / Keep“) | – | empty |
| Back to node / Show suggestions (n) | Textbutton neben Knotentitel (nicht im Mockup) | – | blendet Panel aus bzw. wieder ein, ohne Vorschläge zu verwerfen | – | UI-003 |

## Zustände
| Zustand | Darstellung | Artefakt | Text / Microcopy |
|---|---|---|---|
| default | Liste mit Karten | default.png | siehe oben |
| loading | Nach „Suggest sub-items“: im Knoten Status „AI request running in <Nr> <Titel>“ + „Stop“ (Should); Panel erscheint erst, wenn Vorschläge da sind | nur Text | – |
| empty | Alle Karten übernommen/verworfen: Panel schließt, Knoten zeigt UI-003 | – | Toast „No suggestions left“ |
| error | Keine verwertbare Liste: Banner MSG-009; Fehler: Banner MSG-015 („The AI request failed. Cause: <cause>. The plan is unchanged. Try again.“, kein „Send again“), nach „Stop“ kein Banner; Claude Code: MSG-001; läuft anderswo: MSG-003 | nur Text | siehe Meldungen |
| validation | Fehlertext unter Titel | Muster UI-006 | siehe oben |
| permission / disabled | „Accept all“ bleibt aktiv; während Speichern „Accepting…“ und Buttons deaktiviert | nur Text | – |
| success | Statusmeldung „Added …“ | nur Text | – |

## Responsive und Barrierefreiheit
Karten sind `role="group"` mit Beschriftung „Suggestion <n>“; Tab-Reihenfolge Titel → Objective → Discard → Accept je Karte, danach Discard all / Accept all? Reihenfolge: Kopfaktionen stehen im DOM vor den Karten. Bei 200 % Zoom einspaltig, Buttons umbrechen.

## Bekannte Abweichungen im Mockup
Baumzeilen nur mit Symbol (siehe UI-003); „Back to node“ nicht dargestellt; Kopfzeilen „Plan“ ohne Zähler nach Bereinigung.

## Annahmen und offene Fragen
- „Accept all“ blockiert bei ungültigem Titel (Auslegung; REQ-038 sagt: Übernahme dieses Vorschlags nicht zulässig).

## Ergänzung Runde 2
Zustand „read-only“ (MSG-005): Karten lesbar, Accept/Accept all/Discard/Discard all deaktiviert; „server-down“ (MSG-013): Eingaben bleiben, Aktionen deaktiviert. Siehe UI-003.
