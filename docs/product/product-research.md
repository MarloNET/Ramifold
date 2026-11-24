# Markt- und Wettbewerbsrecherche – Ramifold

Version: v0.2 | Status: Approved | Verantwortlich: Product Discovery | Datum: 2026-11-24
Recherchegrundlage: Websuche verfügbar (WebSearch/WebFetch und GitHub-REST-API). Alle Quellen wurden am 2026-11-24 abgerufen. Die Sternzahlen stammen direkt aus `api.github.com/repos/<repo>`.

## 1. Recherchefragen

| # | Frage | Status |
|---|---|---|
| F1 | Welche Produkte verbinden eine hierarchische Zerlegung mit je einem KI-Chat pro Knoten und Ergebnis-Propagation? | **teilweise.** 10 relevante Einträge gefunden. Kein geprüftes Produkt deckt die ganze Kombination ab. Hamster (das Unternehmen hinter Task Master) kommt am nächsten. |
| F2 | Worüber klagen Entwickler beim Planen mit KI-Chats? | **beantwortet.** Es gibt Signale zu Context Rot, verlorenem Kontext, Spec-Drift und Review-Last. Echte Reddit- und HN-Beschwerdethreads wurden nur indirekt gefunden. |
| F3 | Wie schnell bewegt sich der Markt, und bauen große Anbieter eigene Planungsschichten? | **beantwortet.** Ja, das Tempo ist hoch. Alle großen Anbieter haben inzwischen einen Plan-Modus. |
| F4 | Wie beliebt sind vergleichbare OSS-Tools, und was kosten die kommerziellen? | **teilweise.** Sterne sind live geprüft. Einige Preise stammen nur aus Drittquellen oder fehlen ganz (Flowith). |
| F5 | Was gilt regulatorisch (DSGVO, EU AI Act)? | **teilweise.** Das Folgende ist eine kurze Einordnung auf Produktebene, keine Rechtsprüfung. Die OpenAI-API-Bedingungen wurden nicht geprüft. |

## 2. Wettbewerber und Alternativen

| Anbieter / Alternative | Typ (direkt / indirekt) | Zielgruppe | Kernfunktionen | Preis | Stärken | Schwächen | Quelle (URL, Abrufdatum) |
|---|---|---|---|---|---|---|---|
| **Hamster** (kommerzieller Nachfolger von Task Master) | **direkt (am nächsten)** | Produktteams, Entwickler | Hierarchie aus Goals, Initiatives und Briefs. Erzeugt aus einem Brief einen Plan, daraus Tasks mit Akzeptanzkriterien. Bietet „Thread branches“, Dokument-Versionierung, einen „Context Graph“ und die Übergabe an Coding-Agents (CLI-Sync ins Repo, MCP). | Free: 10 Briefs pro Monat. Team: 40 $ pro Creator und Monat (Herstellerangabe) | Ganzer Weg von der Strategie bis zur Auslieferung. Teamfunktionen. Große Community von Task Master. | SaaS, nicht lokal. Feste Ebenen statt beliebiger Tiefe. Keine Angaben zu Kontextregeln pro Knoten. | https://tryhamster.com (Selbstdarstellung). Die Herkunft aus Task Master belegt https://www.everydev.ai/tools/taskmaster, 2026-11-24 |
| **Task Master** (eyaltoledano/claude-task-master) | indirekt | Entwickler mit Cursor oder Claude Code | Zerlegt ein PRD in Tasks mit Abhängigkeiten. CLI und MCP. | OSS (Lizenz laut GitHub-API „NOASSERTION“, laut Drittquelle MIT mit Commons Clause) | 28.536 ★ | Letzter Push am 2026-04-28. Der Fokus ist offenbar zu Hamster gewandert. | https://github.com/eyaltoledano/claude-task-master, GitHub-API, 2026-11-24 |
| **GitHub Spec Kit** | indirekt (Methodik und Artefakte) | Entwickler, Teams | Phasen Specify, Plan, Tasks, Implement. Markdown-Artefakte im Repo. Viele Agent-Integrationen und Community-Extensions, darunter „Epic“ (zerlegt große Vorhaben in geordnete Features), „Spec Sync“ und „Reconcile“ (gegen Drift) sowie Sync mit GitHub Issues, Jira und Linear. | kostenlos, MIT | **151.222 ★**. Industriestandard mit großem Ökosystem. | Viel Markdown, hohe Review-Last (siehe §3). Hierarchie und Abhängigkeiten nur über Extensions. | https://github.github.com/spec-kit/ und https://github.github.com/spec-kit/community/extensions.html, GitHub-API, 2026-11-24 |
| **OpenSpec** (Fission-AI) | indirekt | Entwickler | Ablauf Explore, Propose (Proposal, Specs, Design, Tasks), Apply, Archive. Change-Ordner im Repo. Mehr als 30 Assistenten. | kostenlos, MIT | 75.601 ★. Leichtgewichtig, iterativ. | Flache Change-Struktur, kein Baum, kein Chat pro Ebene. | https://github.com/Fission-AI/OpenSpec, 2026-11-24 |
| **BMAD-METHOD** | indirekt | Entwickler, Solo-Gründer | Agile KI-Methode mit spezialisierten Perspektiven (Produkt, Architektur, UX, Dev, Test). Planungstiefe je nach Umfang. | kostenlos, MIT (Marke geschützt) | 55.675 ★. Sehr aktiv. | Methode und Prompts, keine eigene UI. Kein Baum mit Kontextregeln. | https://github.com/bmad-code-org/BMAD-METHOD, 2026-11-24 |
| **Kiro** (AWS) | indirekt | Entwickler, Unternehmen | Spec-IDE mit requirements.md, design.md und tasks.md. Abhängigkeitsgraph der Tasks mit parallelen „Waves“. | Free (50 Credits), Pro 20 $, Pro+ 40 $, Pro Max 100 $, Power 200 $ pro Monat | Rückhalt durch AWS. Spec-Workflow eingebaut. | Laut Doku keine verschachtelten oder verknüpften Specs. Proprietär, nur als IDE. | https://kiro.dev/pricing/ und https://kiro.dev/docs/specs/, 2026-11-24 |
| **Traycer** | indirekt | Entwickler mit mehreren Agents | Desktop-„Nerve Center“: KI-Planung und Task-Tracking, gemeinsame Specs und Tickets, viele Agents und Provider | Free; Sync 16 $ bis 20 $ pro User und Monat | Agnostisch gegenüber Agents. Der Hersteller nennt die Desktop-App Open Source (Repo traycerai/traycer: 1.780 ★, Lizenz nicht geprüft). | Schwerpunkt Ausführung und Orchestrierung, kein Brainstorming über mehrere Ebenen | https://traycer.ai/pricing und https://github.com/traycerai/traycer, 2026-11-24 |
| **Native Plan-Modi**: Claude Code, Cursor, OpenAI Codex, GitHub Copilot | indirekt (**strategisches Risiko**) | alle Nutzer von Coding-Agents | Agent untersucht die Codebasis, stellt Rückfragen und legt einen Markdown-Plan zur Freigabe vor. Copilot reicht den Plan an den Cloud-Agent weiter. | in den Abos enthalten | Ohne Zusatzaufwand verfügbar, direkt im Code-Kontext | Ein Plan pro Session, kein Baum. Bei Cursor melden Nutzer, dass manuelle Plan-Änderungen ignoriert werden. | https://code.claude.com/docs/en/ultraplan.md; https://cursor.com/blog/plan-mode; https://forum.cursor.com/t/models-ignore-manual-plan-edits/139129; https://github.blog/news-insights/company-news/welcome-home-agents/, 2026-11-24 |
| **Verzweigende Chats und Canvas**: ChatGPT „Branch in new chat“, Flowith, Slashspace (ehemals RabbitHoles AI), OSS-Projekte wie ContextTree, Bushchat, Prompt-Tree | **direkt beim UI-Muster** | Wissensarbeiter, Power-User | Gabeln an jeder Nachricht. Canvas mit Knoten, Modellwahl pro Knoten. ContextTree: Kindknoten erben nur entlang der Abstammungslinie bis zum Gabelpunkt. | ChatGPT: im Abo. Flowith: nicht verifiziert. Slashspace: laut Drittquelle 89 $ pro Jahr oder 249 $ einmalig, mit eigenem API-Key | Branching ist bei ChatGPT Mainstream | Nur Nachrichtenbäume, keine Ergebnis-Artefakte (Auftrag, Konzept, Plan), keine Rückführung nach oben, kein Export in Repo oder Tickets. OSS-Projekte sind winzig (Prompt-Tree 91 ★). | https://tech.yahoo.com/ai/articles/openai-chatgpt-branching-feature-lets-043000163.html; https://flowith.io/; https://www.gappsy.com/tools/slashspace/; https://dev.to/contexttree/i-built-a-visual-llm-canvas-where-every-branch-has-its-own-model-prompt-and-context-settings-468g; https://news.ycombinator.com/item?id=46433404, 2026-11-24 |
| **Linear Agent**; **Miro AI** (Mind Maps, Sidekicks) | indirekt | Produktteams | Linear: Agent mit Kontext aus Roadmap, Issues und Code, MCP, BYOK seit 12.11.2026. Miro: Mind Maps aus einem Prompt, Agents auf dem Board | Linear: AI-Credits. Miro: Starter 8 $, Business 20 $ pro Member (laut Drittquelle) | Planung liegt dort, wo die Tickets ohnehin sind | Kein Chat pro Knoten mit Kontextvererbung. Proprietäres SaaS. | https://linear.app/changelog/2026-03-24-introducing-linear-agent; https://linear.app/changelog; https://miro.com/ai/mind-map-ai/, 2026-11-24 |

**Konzeptionelle Referenz aus der Forschung (kein Produkt):** TreeWriter (arXiv 2601.12740) ist ein Chat-Assistent mit begrenztem Kontext auf Baumknoten. Elternknoten fassen ihre Kinder zusammen, Kinder führen ihren Elternknoten aus. Das Konzept kommt Ramifold sehr nahe, zielt aber auf das Schreiben langer Texte. Quelle: https://arxiv.org/html/2601.12740, 2026-11-24.

## 3. Nutzer- und Marktsignale

**Fakten:**
- **Context Rot.** Chroma hat 18 Frontier-Modelle getestet. Ergebnis: Die Leistung wird mit wachsender Eingabelänge zunehmend unzuverlässig. Chroma ist ein Anbieter von Vektordatenbanken und hat daher ein Eigeninteresse. Quelle: https://trychroma.com/research/context-rot, 2026-11-24.
- **Vergessen in langen Chats.** Im OpenAI-Forum gibt es Threads zu Kontextverlust innerhalb eines Gesprächs. Als Gegenmittel empfehlen Nutzer, den Chat manuell zusammenfassen zu lassen. Das sind Einzelberichte. Quellen: https://community.openai.com/t/chatgpt-remembers-the-nouns-but-forgets-the-reasoning/1403357 und https://community.openai.com/t/chatgpt-is-forgetting-information-from-the-same-conversation/1403122, 2026-11-24.
- **Workarounds beim Verzweigen.** Eine Vorstudie zu CanvasConvo zeigt: Nutzer verwalten Gesprächszweige mit externen Dokumenten, mehreren Chatfenstern und selbst gebauten Markern. Quelle: https://arxiv.org/html/2605.15848, 2026-11-24.
- **Viele kleine Branching-Tools.** Auf HN tauchen zahlreiche „Show HN“-Projekte auf (TreeLM, Twigg, Threds.dev, Bushchat, oMyTree, Driftos). Ein Autor fragt selbst, ob Branching ein echtes Problem löst oder „over-engineering“ ist. Quelle: https://news.ycombinator.com/item?id=46181868, 2026-11-24.
- **Spec-Drift.** Wenn Code geändert wird, die Spec aber nicht, arbeiten Agents auf veralteten Specs weiter. Quellen: https://arxiv.org/pdf/2606.27045 und https://dev.to/t3chn/your-ai-spec-is-already-stale-3h0a, 2026-11-24. Dass Spec Kit inzwischen Extensions wie „Spec Sync“ und „Reconcile“ hat, bestätigt das Problem.
- **Review-Last durch Spec-Tools.** Der Thoughtworks Radar führt Spec Kit unter „Assess“. Er verweist auf zu ausführliches Markdown mit hoher kognitiver Last und zitiert ein Experiment: 2.577 Zeilen Markdown für 689 Zeilen Code. Marmelab spricht von „The Waterfall Strikes Back“. Quellen: https://www.thoughtworks.com/radar/languages-and-frameworks/github-spec-kit und https://marmelab.com/blog/2025/11/12/spec-driven-development-waterfall-strikes-back, 2026-11-24.
- **Einordnung der Ansätze.** Böckeler (martinfowler.com) unterscheidet spec-first, spec-anchored und spec-as-source. Quelle: https://www.martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html, 2026-11-24.

**Einschätzung:** Die Signale bestätigen das Kernproblem: lange Chats verschlechtern sich, Kontext muss manuell kuratiert werden, und Specs veralten. Sie zeigen aber auch eine Gegenkraft. Viele Entwickler empfinden schon flache Spec-Workflows als zu schwer. Ein tiefer Baum mit Auftrag, Konzept und Plan pro Knoten kann diesen Einwand gegen „Wasserfall“ verschärfen.

## 4. Trends und Rahmenbedingungen

**Fakten:**
- **Spec-driven Development ist Mainstream geworden.** Spec Kit hat 151.222 ★, OpenSpec 75.601 ★, BMAD 55.675 ★. Das ebenfalls große get-shit-done (64.112 ★) ist seit Ende Mai 2026 archiviert. Das spricht für ein volatiles Feld. Quellen: GitHub-API, 2026-11-24; https://developer.microsoft.com/blog/spec-driven-development-spec-kit/, 2026-11-24.
- **Plan-Modi werden zum Standard.** Cursor hat seinen Plan-Modus im Oktober 2025 eingeführt. Codex, Claude Code und GitHub Copilot haben ebenfalls Plan-Modi bzw. Plan-Agents. Quellen wie in §2.
- **Standardisierung.** Die Linux Foundation hat am 9.12.2025 die Agentic AI Foundation gegründet. Gründungsprojekte sind MCP (Anthropic), AGENTS.md (OpenAI) und goose (Block). Quellen: https://linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation und https://workos.com/blog/the-linux-foundation-launches-the-aaif, 2026-11-24.
- **Ticket-Tools ziehen Planung an sich.** Linear hat seinen Agent im März 2026 gestartet und im November 2026 BYOK eingeführt. Quelle: https://linear.app/changelog, 2026-11-24.
- **DSGVO und BYOK.** Bei der Anthropic-API werden Daten standardmäßig 30 Tage aufbewahrt. Zero Data Retention gibt es nur auf Vertragsbasis, und gespeicherte Daten werden nicht ohne ausdrückliche Erlaubnis zum Training genutzt. Quelle: https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention, 2026-11-24. Die OpenAI-Bedingungen wurden nicht geprüft.
- **Bedingungen der Agent-Anbieter für Drittanwendungen.** Anthropic hat 2026 die Nutzung von Claude-Abos (OAuth) in Drittanwendungen mehrfach eingeschränkt und wieder geöffnet. Im Februar 2026 stellte Anthropic klar, dass Abo-Zugänge nicht für Drittanwendungen gedacht sind, und verwies Unternehmen auf API-Keys. Später wurde programmatische Nutzung (Agent SDK, `claude -p`) laut Berichten wieder erlaubt, aber über ein eigenes Kontingent. Der aktuelle Stand ist nicht aus einer Primärquelle bestätigt. Quellen: https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access und https://venturebeat.com/ai/anthropic-reinstates-openclaw-and-third-party-agent-usage-on-claude-subscriptions-with-a-catch/, 2026-11-24.
- **EU AI Act.** Am 7.5.2026 gab es eine vorläufige Einigung zum Digital Omnibus, mit der sich die Hochrisiko-Pflichten verschieben. Die Transparenzpflichten gelten weiter ab 2.8.2026. Quellen: https://www.hoganlovells.com/en/publications/eu-legislators-agree-to-delay-for-highrisk-ai-rules und https://www.pinsentmasons.com/out-law/news/rules-high-risk-ai-delayed-under-eu-omnibus-deal, 2026-11-24.

**Einschätzung:**
- **Tempo.** Der Markt bewegt sich sehr schnell, im Monatstakt. Alle großen Anbieter (GitHub, AWS, Anthropic, OpenAI, Cursor, Linear) bauen Planungsschichten nativ, bisher aber flach (ein Plan pro Session oder Spec). Das Spec-Kit-Ökosystem schließt per Extension schon Lücken bei Hierarchie, Drift-Abgleich und Ticket-Sync. **Das ist das Hauptrisiko.**
- **DSGVO.** Ein lokales Tool mit BYOK ist relativ günstig, weil Ramifold selbst kein Auftragsverarbeiter wäre. Trotzdem nötig sind: ein klarer Hinweis, dass Inhalte an den KI-Anbieter gehen; ein vollständig lokaler Betrieb (z. B. Ollama) als Option; sichere Ablage der API-Keys; Vorsicht mit Chatverläufen im Git-Repo, weil personenbezogene Daten so dauerhaft und womöglich öffentlich versioniert werden.
- **AI Act.** Ein Planungswerkzeug ist voraussichtlich kein Hochrisiko-System.
- **Anbindung an Coding-Agenten.** Wenn Ramifold die Knoten-Chats über den Coding-Agenten des Nutzers laufen lässt, bekommt jeder Chat dessen Tools, Skills, MCP-Server und Repo-Zugriff. Damit hängt Ramifold aber von den Nutzungsbedingungen und Schnittstellen dieser Anbieter ab, und die ändern sich gerade häufig. Die technische Machbarkeit prüft später der Software Architect.

## 5. Implikationen für unser Produkt

**Einschätzung.** Die behaupteten Unterscheidungsmerkmale sehen im Abgleich so aus:

| Behauptetes Unterscheidungsmerkmal | Bewertung |
|---|---|
| Baum beliebiger Tiefe mit **eigenem Chat pro Knoten** | **Teilweise abgedeckt.** Canvas- und Branching-Tools haben Knoten-Chats, aber ohne Ergebnis-Artefakte. Hamster hat Hierarchie und Thread-Branches, aber feste Ebenen. |
| **Strukturierte Kontextregeln**: Ergebnisse der Vorfahren und Auftrag der Geschwister, aber nie der Chat | **Weitgehend einzigartig.** Bestehende Tools vererben Chatverläufe; TreeWriter ist Forschung. Hier werden Ergebnisse vererbt statt Gesprächsverläufe, und das adressiert Context Rot direkt. |
| **Rückfluss** festgelegter Kind-Pläne nach oben | **Kein Produkt mit dieser Funktion gefunden.** Nur konzeptionell in TreeWriter. |
| Querabhängigkeiten, „wartet auf X“, Reihenfolge | **Abgedeckt** auf Task-Ebene (Kiro, Task Master, Spec-Kit-Extensions). Neu wäre nur die Anwendung auf Planungsknoten. |
| Versionierung plus **KI-Prüfung der Auswirkungen** auf Nachkommen und Abhängige | **Teilweise.** Versionierung gibt es. Eine KI-Prüfung der Auswirkungen über Zweige hinweg wurde nirgends gefunden. |
| Markdown im Repo, GitHub Issues, MCP | **Kein Unterscheidungsmerkmal mehr**, sondern Standard. |
| BYOK mit mehreren Anbietern, lokal, Open Source | **Kein Unterscheidungsmerkmal mehr**, aber Grundvoraussetzung. |
| Austauschbare Profile (Forschung, Events, Businesspläne) | **Theoretisch einzigartig.** Damit konkurriert man aber mit Notion, Miro und Canvas-Tools. Für den Start sollte das keine Priorität haben. |

**Marktlücke.** Die eigentliche Lücke liegt *vor* den Spec-Tools: Brainstorming und Entscheidungen über mehrere Ebenen, mit sauber begrenztem Kontext, bevor ein Agent die Codebasis anfasst. Die heutigen Plan-Modi und Spec-Tools sind an Code gebunden und flach.

**Positionierungsvorschlag.** Ramifold als *vorgelagerter Planer*, der seine Ergebnisse in Formate exportiert, die Spec Kit, OpenSpec und AGENTS.md verstehen. Kein konkurrierendes Spec-Framework.

**Risiken:**
1. Spec Kit oder Hamster ergänzen Chats pro Knoten und Rückfluss nach oben.
2. Native Plan-Modi werden „gut genug“.
3. Der Vorwurf von Wasserfall und Overhead trifft tiefe Bäume besonders.
4. Branching-Chats sind ein überfüllter Markt mit wenig Zugkraft.

**Bestätigte Annahmen:** Das Problem mit Kontext ist real. Markdown im Repo plus MCP ist das richtige Ausgabeformat. BYOK und lokaler Betrieb werden akzeptiert.

**Geschwächte Annahmen:** „Niemand macht hierarchische KI-Planung mit Übergabe an Agents“ stimmt nicht (Hamster). Die Zielgruppe toleriert Overhead durch Specs nur begrenzt.

## 6. Offene Fragen

1. Wie genau funktionieren Hamsters Thread-Branches und der Context Graph (Kontextvererbung, Rückfluss)? Ein Hands-on-Test ist nötig.
2. Was kann die Spec-Kit-Extension „Epic“ konkret: Baumtiefe, Kontext pro Feature, Weitergabe von Änderungen?
3. Preise von Flowith und Slashspace direkt beim Hersteller prüfen.
4. Lizenz und Funktionsumfang der Traycer-Desktop-App prüfen.
5. Akzeptieren Entwickler mehrere Planungsebenen vor dem Coden, oder bleiben sie bei „Plan-Modus und los“? Welche Zielgruppe hat den meisten Planungsschmerz?
6. Ist es DSGVO-kritisch, Chatverläufe im Repo zu versionieren (personenbezogene Daten in der Git-Historie)?
7. Welche Nutzungsbedingungen gelten aktuell für die Anbindung an Claude Code, Codex und andere Coding-Agenten (Primärquellen prüfen)?
8. Wie schnell schrumpft der Bedarf an Zerlegung, wenn Kontextfenster und Kompaktierung besser werden?

## Änderungshistorie
| Version | Datum | Änderung |
|---|---|---|
| v0.1 | 2026-11-24 | Erste Recherche |
| v0.2 | 2026-11-24 | Nutzungsbedingungen der Agent-Anbieter und Anbindung an Coding-Agenten ergänzt (nach Runde 1) |
