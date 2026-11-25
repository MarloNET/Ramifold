<!-- Quelle: Paperclip-Dokument `adrs` v0.7, Revision e24de893-855d-43a5-8c04-2c0257b1fd7d (MAR-1416); freigegeben mit Gate „Wie“ Slice 0.1 (MAR-1369) -->

## ADR-001 – Technologie-Stack: TypeScript, Node.js, Fastify, React

- **Slug:** `technology-stack`
- **Status:** **approved (Gate „Wie“ Slice 0.1, MAR-1369; Owner-Freigabe 2026-11-25 mit „Stimmt“ bei allen 13 kritischen Annahmen; freigegebene Revision `e24de893-855d-43a5-8c04-2c0257b1fd7d`)**. Stand bei der Prüfung: **Entschieden vom Owner** am 2026-11-24, Kommentar `61590c00-58c2-43bf-9c37-63e7f2bbde61` an MAR-1370: „bitte wähle option 1“. Die Antwort bezieht sich auf die Abwägung im Kommentar `679e1e5d` und damit auf Frage 1 der Karte `e4597c5b`. Bindend als früher Stack-Entscheid; die Textfassung wird mit Gate „Wie“ freigegeben.
- **Kontext:** Ramifold ist eine lokale Webanwendung (Requirements 10.1), die Claude Code als Kindprozess startet, Dateien im Projektordner verwaltet und auf Linux und macOS mit je einem Befehl installiert und gestartet wird (REQ-066). Die Oberfläche braucht Tastaturbedienung und Barrierefreiheit (REQ-062), Markdown-Darstellung (REQ-048) und Streaming (REQ-020). Ein Mensch, kleine Datenmengen (A-06). Die Zeit des Owners ist knapp (LP-12).
- **Betroffene Anforderungen:** REQ-048, REQ-053, REQ-054, REQ-060, REQ-062, REQ-066, REQ-067; LP-08.
- **Optionen:**
  1. **TypeScript durchgehend:** Node.js ab 24 (LTS) mit Fastify; React 19 mit Vite und React Aria Components; gemeinsame Typen. Installation per npm.
  2. **Go-Server als Einzeldatei** + React-Oberfläche (TypeScript) eingebettet.
  3. **Python (FastAPI)** + React-Oberfläche, Installation über pipx oder uv.
  4. Desktop-App (Electron, Tauri) – verworfen, weil Requirements 10.1 eine Bedienung im Browser vorsieht.
- **Vergleich (aus der Abwägung für den Owner):**

  | Kriterium | 1 TypeScript/Node | 2 Go + React | 3 Python + React |
  |---|---|---|---|
  | Voraussetzung beim Nutzer | Node.js ab 24 | keine | Python + pipx/uv |
  | Sprachen im Projekt | 1 | 2 (Typen doppelt, OpenAPI oder Handpflege) | 2 (Typen doppelt) |
  | Entwicklungstempo bei dieser App | hoch | mittel | mittel |
  | Release-Aufwand | gering (Tag; Paket baut ein Workflow, ADR-002) | Builds je System und Prozessor; macOS-Gatekeeper blockiert unsignierte Downloads, Notarisierung braucht ein Apple-Developer-Konto (99 USD/Jahr) | mittel; Python-Installationen auf macOS uneinheitlich |
  | Lieferketten-Risiko | höher (npm) | gering (Standardbibliothek) | mittel |
  | Späterer Ramifold-MCP-Server | dieselbe Sprache, Referenz-SDK | offizielles SDK | offizielles SDK |
  | Laufende Kosten | keine | ggf. Apple-Konto | keine |

- **Entscheidung:** Option 1. Die Gründe:
  1. **Ramifold besteht vor allem aus Oberfläche.** Baum, Chat, Vorschläge, Tastaturbedienung und Barrierefreiheit machen den größten Aufwand aus. Diese Oberfläche ist in jeder Option React und TypeScript. Mit TypeScript auch im Server gibt es nur eine Sprache, und die Typen für Server und Oberfläche passen sicher zusammen.
  2. **Die Zielgruppe von 0.1 sind Entwickler mit Coding-Agent.** Für sie ist Node.js eine kleine Hürde. Die Einzeldatei ohne Voraussetzung, der größte Vorteil von Go, nützt dieser Zielgruppe heute am wenigsten.
  3. **Das Hauptrisiko sind Tempo und Fehlerfreiheit bei knapper Zeit (LP-12), nicht die Leistung.** Bei einem Nutzer und kleinen Datenmengen (A-06) bringt Go keinen spürbaren Vorteil.
  4. **Technik:** Node.js hat Kindprozesse und Streams eingebaut, das hält die Anbindung von Claude Code über `stream-json` schlank. Fastify ist klein und validiert Schemata. React Aria Components liefert geprüfte barrierefreie Bausteine (Baum, Dialoge, Listen). Developer und Coding-Agenten kennen TypeScript und React am besten.
- **Folgen:** Beim Nutzer muss Node.js ab 24 installiert sein. Die Entscheidungskarte nannte „ab 22“; das ist korrigiert, weil Node.js 22 im April 2027 aus der Pflege fällt. Das Paket enthält den fertigen Oberflächen-Build, der Start braucht keinen Build-Schritt. Keine macOS-Signatur und kein Apple-Konto nötig, weil Ramifold als npm-Paket läuft. **Absicherung der Lieferkette:** wenige Laufzeit-Abhängigkeiten, Lockfile im Repo, `npm audit` in CI, Updates nur bewusst per Pull Request.
- **Risiken:** Die Voraussetzung Node.js schreckt einzelne Nutzer ab (R-06). Gegenmittel ohne Codeänderung: später ein Einzeldatei-Build mit eingebautem Node.js (Node SEA o. ä.); das betrifft nur den Build. Kompromittierte npm-Pakete (R-07) dämmt die Absicherung der Lieferkette ein.
- **Umkehrbarkeit:** schwer. Ein Wechsel zu Go oder Python hieße den Server neu schreiben; die Oberfläche bliebe.
- **Revision / Freigabe:** Owner-Entscheidung 2026-11-24; Text in Baseline v0.2; Freigabe mit Gate „Wie“.
