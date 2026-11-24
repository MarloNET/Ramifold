# UI-002 – Vorhaben anlegen (Dialog)

- Zweck: Titel und Auftrag eines neuen Vorhabens erfassen.
- Flows: FLOW-001 (Schritt 5)
- Anforderungen: REQ-005, AC-REQ-005-01 bis AC-REQ-005-04
- Rollen: Planer
- Gerät(e): Desktop ab 1280 px
- Artefakte: default.png (Viewport 1366 px, gerendert 2026-11-24; Stand: aktuell; Quelle `default.html`)

## Screen-Konzept
- Hauptaufgabe: Ein neues Vorhaben mit Titel (und optional Auftrag) anlegen.
- Nutzung: selten, Tastatur, Fokus beginnt im Feld „Title“.
- Primär: Feld „Title (required)“ und Aktion „Create project“.
- Sekundär: Feld „Objective“, „Cancel“, Schließen-Icon.
- Bei Bedarf: Fehlertexte (erst bei Validierung).
- Muster: modaler Dialog über der Liste, einspaltiges Formular.
- Akzent: keiner.

## Angezeigte Daten
Dialogtitel „New project“; zwei Felder (leer beim Öffnen).

## Eingaben und Validierung
| Feld | Typ | Pflicht | Regel | Fehlermeldung (Wortlaut) |
|---|---|---|---|---|
| Title | einzeiliger Text | ja | nach Entfernen führender/folgender Leerzeichen 1–200 Zeichen; gleiche Titel mehrerer Vorhaben erlaubt | leer: „A title is required.“ · zu lang: „The title can be at most 200 characters.“ |
| Objective | mehrzeiliger Text | nein | keine Längenbegrenzung | – |

Validierung beim Klick auf „Create project“ (nicht beim Tippen); danach Fehlertext unter dem Feld (role=alert, mit Symbol), Fokus auf das erste fehlerhafte Feld. Eingaben bleiben erhalten.

## Aktionen
| Aktion | Auslöser | Voraussetzung / Rolle | Ergebnis bei Erfolg | Ergebnis bei Fehler | Navigation danach |
|---|---|---|---|---|---|
| Create project | Primärbutton, Strg/Cmd+Enter im Dialog | Planer | Vorhaben mit Wurzelknoten (Status „No result yet“) angelegt; Toast „Project created“ | Validierung: siehe oben. Speichern scheitert: Fehlermeldung MSG-002 im Dialog, Eingaben bleiben | UI-003 des neuen Vorhabens, Wurzelknoten ausgewählt |
| Cancel / „x“ / ESC | Button, Icon, Taste | – | Dialog schließt, nichts angelegt | – | zurück zu UI-001, Fokus auf „New project“ |

## Zustände
| Zustand | Darstellung | Artefakt | Text / Microcopy |
|---|---|---|---|
| default | Dialog, Fokus im Feld „Title“ | default.png | siehe oben |
| loading | Primärbutton zeigt „Creating…“ und ist deaktiviert (aria-busy), Felder gesperrt | nur Text | „Creating…“ |
| error | Banner im Dialog, MSG-002 | nur Text | siehe MSG-002 |
| validation | Fehlertext unter Feld, roter Rand + Symbol | Muster siehe UI-006 `validation.png` | siehe Tabelle |
| permission / empty / success | nicht anwendbar (success = Dialog schließt, Toast) | – | – |

## Responsive und Barrierefreiheit
Modal mit Fokus-Falle (`role="dialog"`, `aria-modal`, Titel als `aria-labelledby`); Tab-Reihenfolge Title → Objective → Cancel → Create project; ESC schließt; Pflichtfeld im Label „(required)“. Unter 1024 px Breite: Dialog füllt die Breite abzüglich 16 px.

## Bekannte Abweichungen im Mockup
keine.

## Annahmen und offene Fragen
Keine.

## Ergänzung Runde 2
Das Anlegen eines neuen Vorhabens ist vom Zustand „read-only“ eines anderen Vorhabens nicht betroffen (AC-REQ-074-06). Bei „server-down“: Bestätigung deaktiviert, Eingaben bleiben, siehe UI-003.
