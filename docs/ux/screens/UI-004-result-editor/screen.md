# UI-004 – Ergebnis bearbeiten (Result editor)

- Zweck: Ein Ergebnis (KI-Entwurf, gespeicherter Text oder leer) als Markdown bearbeiten und als „Concept“ oder „Fixed plan“ speichern oder verwerfen.
- Flows: FLOW-005
- Anforderungen: REQ-041, REQ-042, REQ-043, REQ-044, REQ-045 (Version entsteht beim Speichern), REQ-073, REQ-071, REQ-003, REQ-048; AC-REQ-003-03, AC-REQ-041-*, AC-REQ-042-*, AC-REQ-043-*, AC-REQ-073-*
- Rollen: Planer. Nur der Planer setzt „Fixed plan“ (REQ-043); die KI liefert nur Entwürfe.
- Gerät(e): Desktop ab 1280 px
- Artefakte: `default.png` (Stitch 4af72f6fbfb145738759a175117022cf); Export 2026-11-24

## Angezeigte Daten
| Element | Inhalt | Quelle | Hinweise |
|---|---|---|---|
| Knotenkopf | „<Nr> <Titel>“ | Knoten | Baum links bleibt sichtbar und bedienbar |
| Entwurfshinweis | „AI draft, not saved yet“ (bei KI-Entwurf) bzw. „Unsaved changes“ (bei Ergebnisbearbeitung) bzw. „New result, not saved yet“ (leerer Start) | REQ-073 | role=status |
| Feld „Result (Markdown)“ | Markdown-Quelltext, Monospace | Ergebnisentwurf | wächst mit Fensterhöhe, scrollt intern |
| „Preview“ | gerenderte Markdown-Darstellung des Feldinhalts | – | aktualisiert beim Tippen (verzögert ≤ 300 ms), kein Skript wird ausgeführt (REQ-060). Bilder in Markdown werden **nicht geladen** (REQ-061): ein Bild `![Architektur](https://…/a.png)` erscheint als Text-Link „Architektur“ mit kleinem Bildsymbol davor (Symbol + Text, Tooltip „Images are not loaded. Opens in a new tab.“); Klick öffnet die Adresse in einem neuen Tab; bei leerem Alternativtext lautet der Linktext „Image“ (Adresse im Tooltip); bei unvollständigem Markdown im Stream (z. B. `![Arch](http`) erscheint der Rohtext, bis die Zeile vollständig ist. Die Vorschau stellt Bilder genauso dar wie das gespeicherte Ergebnis in UI-003. |
| Status der Speicherung | Text „Unsaved draft“ in der Fußleiste | – | – |

## Eingaben und Validierung
| Feld | Typ | Pflicht | Regel | Fehlermeldung (Wortlaut) |
|---|---|---|---|---|
| Result (Markdown) | mehrzeiliger Text | ja | nicht leer nach Entfernen von Leerzeichen | „The result cannot be empty.“ |

Status wird nicht als Eingabe gewählt, sondern durch den gewählten Speichern-Button (siehe Abweichungen).

## Aktionen
| Aktion | Auslöser | Voraussetzung / Rolle | Ergebnis bei Erfolg | Ergebnis bei Fehler | Navigation danach |
|---|---|---|---|---|---|
| Save as concept | Sekundärbutton | Planer, Text nicht leer | Neue Version mit Status „Concept“; Rückfluss-Hinweis dieses Knotens verschwindet; Toast „Saved as concept“; Ergebnisentwurf (und KI-Entwurf) erledigt | leer: Validierung; Speichern scheitert: MSG-002, Text bleibt bearbeitbar; von außen geändert: MSG-005; Knoten gelöscht: MSG-004 (Text bleibt zum Kopieren) | Ergebnisansicht des Knotens (UI-003) |
| Save as fixed plan | Primärbutton | wie oben | wie oben mit Status „Fixed plan“; Rückfluss-Hinweis entsteht beim Elternknoten (falls dieser ein gespeichertes Ergebnis hat); Toast „Saved as fixed plan“; kein weiterer Bestätigungsdialog (Annahme A-UX-02) | wie oben | UI-003 |
| Discard draft | Textbutton (rot, mit Text) | – | Ergebnisentwurf verworfen (bei KI-Entwurf: Entwurf in der Instanz gelöscht); nach Rückfrage nur, wenn der Text geändert wurde: Dialog „Discard the draft? / Discard / Keep editing“ | – | UI-003 |

Ohne Speichern verlassen: Wechsel zu anderem Knoten oder zur Vorhabenliste ist erlaubt; die Ergebnisbearbeitung bleibt in diesem Fenster erhalten (REQ-073), Baumzeile zeigt „Draft“. Neuladen/Schließen des Fensters: Browser-Rückfrage, Text geht sonst verloren.

## Zustände
| Zustand | Darstellung | Artefakt | Text / Microcopy |
|---|---|---|---|
| default | Zweispaltig: Quelltext links, Vorschau rechts; Fußleiste mit Aktionen | default.png | siehe oben |
| loading | Speichern läuft: Buttons deaktiviert, Primärbutton „Saving…“ | nur Text | „Saving…“ |
| empty | Leerer Start („Edit result“ bei „No result yet“): Feld leer, Vorschau-Text „Nothing to preview.“ | nur Text | „New result, not saved yet“ |
| error | Banner oben im Arbeitsbereich: MSG-002 / MSG-004 / MSG-005; Text bleibt | nur Text | siehe Meldungen |
| read-only | Vorhaben von außen geändert (REQ-074): Editor nur lesbar, Text markierbar zum Kopieren, „Save as concept“, „Save as fixed plan“ und „Discard draft“ deaktiviert, Banner MSG-005 bleibt stehen (siehe UI-003) | nur Text | MSG-005 |
| server-down | Banner MSG-013, Speichern deaktiviert, Text bleibt stehen | nur Text | MSG-013 |
| validation | Fehlertext unter dem Feld, Fokus ins Feld | Muster UI-006 `validation.png` | „The result cannot be empty.“ |
| permission | Wird das Ergebnis in einem anderen Fenster bearbeitet, öffnet dieses Fenster UI-004 nicht, sondern zeigt UI-003 mit gesperrter Aktion (MSG-011) | siehe UI-003 permission | MSG-011 |
| disabled | Während „Summarize“ läuft ist der Editor gesperrt (nur lesbar): Hinweis „A summary is being created. The draft stays untouched until it arrives.“ | nur Text | – |
| success | Dialog schließt, Toast | nur Text | „Saved as concept“ / „Saved as fixed plan“ |

## Responsive und Barrierefreiheit
Unter 1024 px: Quelltext oberhalb, Vorschau darunter (gestapelt). Feld mit sichtbarem Label, Fokus beim Öffnen im Feld; Vorschau ist `aria-live="off"` (kein Dauer-Vorlesen), erreichbar per Tab als Bereich mit Label „Preview“. Strg/Cmd+S speichert als „Concept“ (Entscheidung des Designs, A-UX-12; verworfen: gar keine Tastenkürzel; nicht im Mockup).

## Bekannte Abweichungen im Mockup
| Element | Grund |
|---|---|
| Radiogruppe „Result status“ (Concept / Fixed plan) über der Fußleiste | von Stitch erzeugt, nicht Teil des Designs: der Status ergibt sich aus dem Speichern-Button |
| Texte „Editing in progress“, „Markdown enabled“, „Live HTML preview“, Statuspille „Concept“ neben dem Titel | von Stitch erzeugt, nicht Teil des Designs |
| Baumzeilen nur mit Symbol (ohne Text) | siehe UI-003 |
| Ergebnistitel in Großbuchstaben „EMBEDDING-MODELL“ | Beispieltext; Darstellung folgt Markdown |

## Annahmen und offene Fragen
- Während der Bearbeitung ist der Chat dieses Knotens ausgeblendet (Vereinfachung); Alternative: Editor oberhalb des Chats. Entscheidung für den Owner im Freigabe-Briefing.
- Strg/Cmd+S-Verhalten ist eine Entscheidung des Designs und steht im Freigabe-Briefing (A-UX-12); leicht umkehrbar.
