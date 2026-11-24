# UI-009 – Datenabfluss-Hinweis (Dialog „Data notice“)

- Zweck: Vor der ersten KI-Anfrage in einem Projektordner klar sagen, dass Inhalte an den KI-Anbieter gehen, und die Bestätigung einholen; jederzeit wieder aufrufbar.
- Flows: FLOW-008, FLOW-003 (Schritt 2)
- Anforderungen: REQ-030, LP-06; AC-REQ-030-01 bis AC-REQ-030-07
- Rollen: Planer
- Gerät(e): Desktop ab 1280 px
- Artefakte: default.png (Modus Bestätigung; Viewport 1366 px, gerendert 2026-11-24; Stand: aktuell; Quelle `default.html`)

## Screen-Konzept
- Hauptaufgabe: Vor der ersten KI-Anfrage verstehen, wohin Inhalte gehen, und das bestätigen.
- Nutzung: einmal je Projektordner; danach nur lesend über „Data notice“.
- Primär: der Hinweistext; Aktion „Continue“ (erst nach Haken aktiv).
- Sekundär: Checkbox, „Cancel“.
- Bei Bedarf: Ansichtsmodus ohne Checkbox.
- Muster: modaler Dialog mit Bestätigungs-Checkbox.
- Akzent: keiner.

## Angezeigte Daten
Titel „Your content is sent to the AI provider“; Text „To answer, Ramifold passes your content to Claude Code, which sends it to its AI provider (Anthropic). This includes:“; Liste „Objectives“, „Results“, „Chat messages“, „Context built from your plan“, „Files from your project folder that the AI reads“; **danach zwei Zeilen (CC-06, Entscheidung Product Owner zu REQ-030):** (1) „Claude Code keeps session logs of your conversations in your home folder (~/.claude/) on this computer.“ (2) „The AI can search the web and open web pages while it answers.“; Text „Ramifold itself sends nothing anywhere else and has no cloud.“ (Wortlaut in Anlehnung an AC-REQ-030-05). Die Anmeldeart von Claude Code wird nicht genannt (OQ-01 offen).

## Eingaben und Validierung
| Feld | Typ | Pflicht | Regel | Fehlermeldung (Wortlaut) |
|---|---|---|---|---|
| I understand and want to continue | Checkbox | ja (Modus Bestätigung) | muss angehakt sein, damit „Continue“ aktiv wird | keine; „Continue“ bleibt deaktiviert (`aria-disabled`), solange nicht angehakt |

## Aktionen
| Aktion | Auslöser | Voraussetzung / Rolle | Ergebnis bei Erfolg | Ergebnis bei Fehler | Navigation danach |
|---|---|---|---|---|---|
| Continue (Modus Bestätigung) | Primärbutton | Checkbox angehakt | Bestätigung für diesen Projektordner gespeichert (bleibt über Neustarts, nie über Git); die auslösende KI-Anfrage wird jetzt gesendet | Speichern der Bestätigung scheitert: MSG-002, Anfrage wird nicht gesendet | UI-003; die Nachricht wird gesendet |
| Cancel / ESC (Modus Bestätigung) | Button, Taste | – | keine KI-Anfrage gesendet; Nachricht bleibt im Eingabefeld | – | UI-003 |
| Close (Ansichtsmodus) | Primärbutton | Hinweis bereits bestätigt | Dialog schließt | – | zurück zur aufrufenden Seite |

Ansichtsmodus (Aufruf über „Data notice“): gleicher Text, **ohne** Checkbox und ohne „Cancel“, mit Hinweis „You confirmed this notice for this project folder.“ und einem Button „Close“. Ruft der Planer „Data notice“ vor der Bestätigung auf, erscheint der Bestätigungsmodus ohne auslösende Anfrage (nach „Continue“ wird nichts gesendet).

## Zustände
| Zustand | Darstellung | Artefakt | Text / Microcopy |
|---|---|---|---|
| default (Bestätigung) | Checkbox leer, „Continue“ deaktiviert | default.png | siehe oben |
| Ansichtsmodus | nur Text/Layout wie default ohne Checkbox | nur Text | „You confirmed this notice for this project folder.“ |
| loading | „Continue“ zeigt „Saving…“ | nur Text | – |
| error | Banner im Dialog | nur Text | MSG-002 |
| empty / validation / permission / success | nicht anwendbar | – | – |

## Responsive und Barrierefreiheit
Modal, Fokus-Falle, Initialfokus auf Titel; ESC = Cancel (bestätigt nie). Checkbox mit sichtbarem Label. Deaktivierter Button bleibt fokussierbar und wird über `aria-describedby` mit der Checkbox verknüpft. Kein Schließen-Icon im Bestätigungsmodus.

## Bekannte Abweichungen im Mockup
keine. Der Ansichtsmodus (ohne Checkbox, mit „Close“) ist nicht als Mockup gestaltet, aber oben beschrieben.

## Annahmen und offene Fragen
- Die Checkbox ist eine Designentscheidung (REQ-030 verlangt nur „bestätigt“).
- OQ-08 (Lesebeschränkung) ist durch die Baseline v0.3 erledigt; der Verweis entfällt. Die zwei neuen Zeilen sind Textergänzungen, kein neuer Bestandteil des Dialogs.
