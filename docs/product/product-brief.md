# Product Brief – Ramifold

Version: v0.1 | Status: Approved | Verantwortlich: Product Discovery | Datum: 2026-11-24
Recherche: product-research v0.2
Grundlage: Projektbeschreibung `planungsbaum-projektbeschreibung` (MAR-1344), Owner-Antworten aus Runde 1 und 2 (MAR-1347)

Kennzeichnung: **[Owner]** = vom Owner entschieden; **[Vorschlag]** = Vorschlag von Product Discovery, wird mit der Freigabe des Briefs bestätigt; **[offen]** = noch zu klären.

## 1. Produktvision und Wertversprechen

Ramifold ist ein Open-Source-Werkzeug, mit dem Entwickler größere Software-Vorhaben **Ebene für Ebene mit einer KI planen**. Jeder Punkt im Plan ist ein eigener Chat. Zwischen den Punkten fließen nur **Ergebnisse** (Auftrag, Konzept, festgelegter Plan), nie die Gespräche. Am Ende liegt ein konsistenter Plan als Dateien im Repo und dient Coding-Agenten oder Tickets als Vorgabe.

**Wertversprechen:** Wer heute ein mehrstufiges Vorhaben mit einer KI plant, muss zwischen einem langen, verwässerten Chat und dem ständigen Neu-Erklären in neuen Chats wählen und am Ende alles von Hand zusammenführen. Ramifold nimmt beides ab: Jeder Chat bleibt bei seinem Thema, kennt automatisch die Entscheidungen darüber, und festgelegte Pläne fließen von selbst zurück nach oben. Die KI im Knoten arbeitet dabei über den Coding-Agenten des Nutzers und behält dessen Tools und Skills (z. B. Web-Recherche, Codebasis lesen).

Langfristig: allgemeiner Planungskern mit austauschbaren Profilen; Software ist das erste und vorerst einzige Profil.

## 2. Problem und Zielgruppe

**Problem:** Planung verzweigt sich wie ein Baum, KI-Chats sind linear. Folgen: Context Rot in langen Chats, wiederholtes Erklären, manuelles Zusammenführen, und Pläne, die nach Änderungen inkonsistent werden.

**Primäre Zielgruppe [Owner]:** einzelne Entwickler, die mit Coding-Agenten (z. B. Claude Code) arbeiten und Vorhaben planen, die über ein einzelnes Feature hinausgehen. Erster Nutzer ist der Owner selbst; konkretes erstes Vorhaben: **„Ich möchte mir ein eigenes produktives RAG bauen“** [Owner].

**Sekundär (später):** die Open-Source-Community dieser Entwickler; kleine Teams, die über Git gemeinsam an einem Plan arbeiten.

**Heutige Alternativen:** Plan-Modus des Coding-Agenten (ein flacher Plan pro Session), verzweigbare Chats (z. B. ChatGPT „Branch in new chat“), Spec-Tools (Spec Kit, OpenSpec, Kiro), Hamster, sowie manuell gepflegte Markdown-Dokumente und mehrere Chatfenster.

## 3. Marktumfeld und Wettbewerb

Kurzfassung der Recherche (Details und Quellen: Dokument `product-research` v0.2):

- **Am nächsten: Hamster** (Nachfolger von Task Master): Hierarchie Goals → Initiatives → Briefs → Plans, Thread-Branches, Versionierung, Übergabe an Coding-Agents. Aber SaaS, feste Ebenen, keine bekannten Kontextregeln pro Knoten.
- **Spec Kit** (rund 151.000 ★), OpenSpec, BMAD, Kiro: Spec-driven Development ist Mainstream, aber flach; Hierarchie und Drift-Abgleich kommen bei Spec Kit gerade über Extensions dazu.
- **Native Plan-Modi** aller großen Coding-Agenten: kostenlos im Abo, aber ein Plan pro Session.
- **Verzweigbare Chats und Canvas-Tools:** Nachrichtenbäume ohne Ergebnis-Artefakte, ohne Rückfluss nach oben, ohne Weg ins Repo.

**Differenzierung (wirklich neu):** (1) Vererbt werden Ergebnisse statt Chats, (2) festgelegte Pläne fließen nach oben zurück, (3) die KI prüft Änderungen über Zweige hinweg. Markdown im Repo, MCP, BYOK, Open Source und Abhängigkeiten sind Standard, aber Grundvoraussetzung.

**Positionierung [Vorschlag]:** Ramifold ist ein **vorgelagerter Planer** vor dem Coding-Agenten und vor Spec-Tools, kein weiteres Spec-Framework. Er exportiert in Formate, die Coding-Agenten und Spec-Tools verstehen.

**Marktrisiken:** Spec Kit oder Hamster ergänzen Chat pro Knoten und Rückfluss; Plan-Modi werden „gut genug“; der Overhead-Vorwurf („Waterfall strikes back“) trifft tiefe Bäume besonders; Nutzungsbedingungen der Agent-Anbieter für Drittanwendungen ändern sich häufig.

## 4. Ziele und Nicht-Ziele

| ID | Ziel |
|---|---|
| GOAL-01 | Ein Entwickler plant ein mehrstufiges Vorhaben, ohne Kontext neu erklären oder Ergebnisse von Hand zusammenführen zu müssen. |
| GOAL-02 | Jeder Planungspunkt trennt Brainstorming (Chat) von Entscheidung (festgelegter Plan); der Gesamtplan ist nachvollziehbar. |
| GOAL-03 | Der Plan bleibt bei Änderungen konsistent: Betroffene Punkte werden erkannt und abgeglichen. |
| GOAL-04 | Der fertige Plan fließt ohne Medienbruch in die Umsetzung (Dateien im Repo, Coding-Agent, Tickets). |
| GOAL-05 | Die KI im Knoten kann die Tools und Skills nutzen, die der Nutzer aus seinem Coding-Agenten kennt (z. B. Web-Recherche). |
| GOAL-06 | Der Nutzer behält die Kontrolle über seine Daten: Open Source, lokal, keine Ramifold-Cloud. |

**Nicht-Ziele:**
- Ramifold setzt nicht selbst um: kein Agent-Framework, keine Orchestrierung von Coding-Agenten.
- Kein Projektmanagement-Tool: kein Status-Tracking, keine Sprints, keine Zeiterfassung; Tickets entstehen per Export.
- Kein eigenes Spec-Framework als Konkurrenz zu Spec Kit oder OpenSpec.
- Kein gehosteter Dienst (SaaS) und keine Benutzerkonten bei Ramifold.
- Keine Echtzeit-Zusammenarbeit mehrerer Nutzer; Teilen höchstens über Git.
- Weitere Profile (Forschung, Events, Businesspläne) erst, wenn das Software-Profil sich bewährt hat.

## 5. Produktbild

**Rollen:**
- **Planer** (der Nutzer, Entwickler): legt Vorhaben an, führt die Chats, legt Pläne fest, entscheidet bei Änderungen.
- **KI im Knoten:** führt den Chat eines Knotens, schlägt Unterpunkte und Zusammenfassungen vor, prüft Auswirkungen von Änderungen. Läuft zuerst über den Coding-Agenten des Nutzers [Owner], später auch direkt über einen eigenen API-Key.
- **Coding-Agent als Leser** (später): liest den festgelegten Plan beim Umsetzen.

**Fachbegriffe und Objekte:**
- **Vorhaben:** Wurzel eines Baums; gehört zu genau einem Projektordner bzw. Repo und nutzt ein Profil.
- **Knoten:** Punkt im Baum mit Nummer (2, 2.1, 2.1.3), Titel und **Auftrag** (was hier zu klären ist). Hat genau einen Elternknoten (außer der Wurzel) und beliebig viele Kinder.
- **Chat:** gehört zu genau einem Knoten; wird nie an andere Knoten weitergegeben.
- **Ergebnis:** gehört zu einem Knoten; ist entweder **Konzept** (grob, „noch nicht final“) oder **festgelegter Plan**. Jede Änderung erzeugt eine neue **Version**; alte Versionen bleiben erhalten.
- **Abhängigkeit:** „Knoten A braucht das Ergebnis von Knoten X“, quer im Baum; keine Kreise; solange X nicht festgelegt ist, zeigt A „wartet auf X“.
- **Benachrichtigung:** entsteht, wenn sich ein Ergebnis ändert; geht an alle Nachkommen und an die direkten Abnehmer über Abhängigkeiten, nicht an deren Kinder. Zeigt Vorher und Nachher; Bewertung „betroffen / teilweise / nicht betroffen“.
- **Profil:** System-Prompts, Planformat, Bezeichnungen der Ebenen und Exportziele (Software: Epic, Feature, Task; Plan mit Datenmodell, Schnittstellen, Akzeptanzkriterien, offenen Fragen).
- **Export:** der Plan als Markdown bzw. Ordnerstruktur im Repo, später als Tickets und für Coding-Agenten lesbar.

**Kontextregeln (Kern des Produkts):** Nach unten bekommt ein Knoten Auftrag und Ergebnis aller Vorfahren sowie Titel und Auftrag seiner Geschwister. Nach oben fließen festgelegte Pläne der Kinder in Chat und nächste Zusammenfassung des Elternknotens. Über Abhängigkeiten fließt nur das Ergebnis von X, ohne Rückmeldung nach oben.

**Kernablauf:** Vorhaben anlegen und grob besprechen → KI schlägt Unterpunkte mit Auftrag vor → Unterpunkt öffnen, neuer Chat kennt den Kontext von oben → beliebig weiter verzweigen → Plan zusammenfassen lassen, prüfen, festlegen → Plan fließt nach oben → bei Änderungen werden Betroffene benachrichtigt und abgeglichen → Export in die Umsetzung.

**Beispiel:** Vorhaben „Eigenes produktives RAG“. Kinder: 1 Datenquellen und Ingestion, 2 Retrieval (2.1 Chunking, 2.2 Embedding-Modell, 2.3 Reranking), 3 Evaluation, 4 Betrieb und Kosten. Im Chat von 2.2 recherchiert die KI aktuelle Embedding-Modelle im Web und kennt dabei den festgelegten Plan von 1 (welche Datenquellen) sowie Titel und Auftrag von 2.1 und 2.3. Knoten 3 hängt von 2 ab und zeigt „wartet auf 2“. Wird 2.2 festgelegt, fließt der Plan in Knoten 2 zurück. Ändert sich später die Wahl des Embedding-Modells, werden 3 und 4 (sofern abhängig) benachrichtigt.

## 6. Zentrale Use Cases

- **UC-01** Vorhaben anlegen und grob mit der KI besprechen.
- **UC-02** Unterpunkte von der KI ableiten lassen, jeweils mit fertigem Auftrag; Unterpunkte anpassen.
- **UC-03** Einen Unterpunkt öffnen und vertiefen; der Chat kennt Auftrag und Ergebnisse von oben, ohne Neu-Erklären.
- **UC-04** Im Knoten-Chat Tools und Skills nutzen (z. B. Web-Recherche, Codebasis lesen).
- **UC-05** Plan zusammenfassen lassen, prüfen, festlegen; der Plan fließt in den Elternknoten zurück.
- **UC-06** Abhängigkeit zwischen Knoten setzen; sehen, worauf ein Punkt wartet und in welcher Reihenfolge sinnvoll geplant wird.
- **UC-07** Auf eine Änderung reagieren: Vorher/Nachher sehen, KI-Einschätzung der Betroffenheit, im Chat klären oder als erledigt markieren.
- **UC-08** Den Plan exportieren bzw. im Repo ablegen und einem Coding-Agenten oder Tickets als Vorgabe geben.

## 7. Produktweite Leitplanken

- **Mandanten:** Einzelnutzer-Werkzeug, keine Mandanten, keine Benutzerkonten. [Vorschlag]
- **Betrieb und Daten:** läuft lokal beim Nutzer; Plan, Ergebnisse und Chats liegen im Projektordner bzw. Repo des Nutzers; Ramifold betreibt keinen Server und speichert nichts zentral. [Owner, aus Projektbeschreibung]
- **KI-Anbindung:** zuerst über den Coding-Agenten des Nutzers (z. B. Claude Code), damit Tools und Skills erhalten bleiben; direkte Anbindung mit eigenem API-Key (Claude, OpenAI, lokal z. B. Ollama) folgt später. [Owner] Wie die Anbindung technisch erfolgt, entscheidet der Software Architect.
- **Nutzungsbedingungen:** Die Anbindung muss den jeweils aktuellen Bedingungen der Agent- und KI-Anbieter entsprechen; Ramifold darf nicht von einer geduldeten Grauzone abhängen. Der API-Key-Weg ist die Rückfallebene.
- **Personenbezogene Daten:** Ramifold verarbeitet bewusst keine; Inhalte der Chats stammen vom Nutzer und gehen an dessen KI-Anbieter. Nötig: klarer Hinweis darauf, sichere Ablage von Zugangsdaten, keine Zugangsdaten im Repo. **[offen]** Werden Chatverläufe standardmäßig mit ins Git-Repo versioniert (Risiko: dauerhaft und ggf. öffentlich)?
- **Plattformen:** Desktop-Rechner (Linux, macOS, Windows), Bedienung am PC; kein Smartphone. [Vorschlag]
- **Sprachen:** **[offen]** Oberfläche zunächst Englisch (Open-Source-Community) [Vorschlag]; die KI antwortet in der Sprache des Nutzers.
- **Lizenz:** Open Source [Owner]; **[offen]** welche Lizenz.
- **Recht:** Ein Planungswerkzeug ist voraussichtlich kein Hochrisiko-System nach EU AI Act (keine Rechtsprüfung).
- **Budget und Zeit:** **[offen]** kein Budget oder Termin genannt; die Zeit des Owners ist knapp [Owner, Runde 2].

## 8. Release-Roadmap

Vorgeschlagene Produktschritte, keine Termine. Der genaue Zuschnitt von 0.1 folgt nach der Auswertung des Prototyps.

| Release | Nutzerziel |
|---|---|
| Prototyp | Owner prüft an seinem RAG-Vorhaben, ob Planen im Baum spürbar besser ist als der Plan-Modus (Abschnitt 9). |
| 0.1 | Ein Entwickler plant ein Vorhaben als Baum mit Chat pro Knoten über seinen Coding-Agenten, legt Pläne fest und gibt den Gesamtplan als Dateien an seinen Coding-Agenten weiter. |
| 0.2 | Er bildet Abhängigkeiten quer im Baum ab und sieht, worauf ein Punkt wartet und in welcher Reihenfolge er planen und umsetzen sollte. |
| 0.3 | Er ändert einen Plan und wird bei allen betroffenen Punkten mit Vorher/Nachher und KI-Einschätzung zum Abgleich geführt. |
| 0.4 | Sein Coding-Agent liest den Plan beim Umsetzen direkt, und er erzeugt daraus Tickets oder Spec-Tool-Formate. |
| 0.5 | Ein Entwickler ohne Coding-Agent plant mit eigenem API-Key, auch vollständig lokal. |
| später | Weitere Profile (z. B. Forschungsprojekt, Event), auch aus der Community. |

## 9. Validierungsauftrag

**Annahme:** Planen im Baum mit Ergebnis-Vererbung liefert für ein mehrstufiges Vorhaben einen spürbar besseren Plan als der Plan-Modus des Coding-Agenten oder ein linearer Chat, bei vertretbarem Aufwand pro Knoten, sodass der Owner es trotz knapper Zeit tatsächlich benutzt.

**Prototyp (Wegwerfcode, lokal):**
- Vorhaben anlegen; Baum anzeigen und navigieren.
- Chat pro Knoten, der über Claude Code läuft und dessen Tools nutzt (mindestens Web-Recherche).
- KI schlägt Unterpunkte mit Auftrag vor; Nutzer kann sie übernehmen oder ändern; beliebige Tiefe.
- Kontextregel nach unten (Auftrag und Ergebnis aller Vorfahren, Titel und Auftrag der Geschwister, nie Chats).
- Konzept und festgelegter Plan; KI fasst zusammen, Nutzer prüft und legt fest; Rückfluss in den Elternknoten.
- Ablage als Dateien im Projektordner; Export des ganzen Baums als ein Markdown-Dokument.
- **Bewusst nicht enthalten:** Abhängigkeiten, Versionen und Benachrichtigungen, Profile, API-Key-Anbindung, MCP-Server, GitHub-Issue-Export, Desktop-App, Design-Feinschliff.

**Erfolgskriterium** (alles muss erfüllt sein):
1. Der Owner plant im Testzeitraum das Vorhaben „Eigenes produktives RAG“ mit mindestens 3 Ebenen und mindestens 8 festgelegten Knoten.
2. In mindestens einem Knoten-Chat funktioniert ein Tool (Web-Recherche) wie gewohnt.
3. Der Owner musste in keinem Knoten Kontext von oben neu erklären und nichts von Hand zusammenführen.
4. Direktvergleich: Derselbe Auftrag wird einmal im Plan-Modus von Claude Code geplant. Der Owner beurteilt den exportierten Ramifold-Plan als spürbar besser (z. B. vollständiger, fundierter, weniger Lücken) und nennt Gründe.
5. Der Owner beurteilt den Aufwand pro Knoten als vertretbar und will mit Ramifold weiterplanen.

**Warnsignal (gilt als nicht erfüllt):** Der Prototyp wird im Testzeitraum kaum genutzt, oder der Plan-Modus liefert einen gleichwertigen Plan.

**Limit:** höchstens 2 Arbeitstage Entwicklung; Testzeitraum für den Owner 2 Wochen mit insgesamt etwa 3 Stunden Planungszeit. [Vorschlag]

**Rahmen:** Nur intern, nur durch den Owner. Inhalte sind die eigene Planung des Owners, keine personenbezogenen Daten Dritter. Die Anbindung an Claude Code erfolgt über den eigenen Zugang des Owners im Rahmen der aktuellen Nutzungsbedingungen. Der Prototyp-Code wird nicht ins Produkt übernommen.

## 10. Prozessstufe

**Vorschlag: Voll.** Ramifold wird als Open Source für externe Nutzer veröffentlicht, bindet Coding-Agenten und KI-Anbieter mit wechselnden Nutzungsbedingungen an und verwaltet Zugangsdaten; das sind Kriterien für „Voll“. (Für den Prototyp gilt ohnehin der leichtere Prototyp-Pfad.)

## 11. Erfolgskriterien

- **Validierung:** Erfolgskriterium aus Abschnitt 9 erfüllt (GOAL-01, GOAL-02, GOAL-05).
- **Nach Release 0.1:** Der Owner plant mindestens zwei echte Vorhaben mit Ramifold und gibt den Plan direkt an seinen Coding-Agenten weiter, ohne manuelles Zusammenführen (GOAL-01, GOAL-04).
- **Nach Release 0.3:** Bei einer Änderung erkennt die KI-Einschätzung die betroffenen Punkte so, dass der Owner keinen betroffenen Punkt selbst suchen muss (GOAL-03).
- **Nach Veröffentlichung:** Rückmeldungen externer Entwickler (z. B. Issues, Erfahrungsberichte) bestätigen den Nutzen über den Owner hinaus. [Zielwerte offen]

## 12. Riskanteste Annahmen und Validierung

| Annahme | Warum kritisch | Validierungsvorschlag |
|---|---|---|
| Planen im Baum ist spürbar besser als der Plan-Modus und der Aufwand pro Knoten ist vertretbar. | Sonst bleibt jeder bei „Plan-Modus und los“; der Owner selbst hat den ersten Prototyp aus Zeitgründen kaum genutzt. | Wegwerf-Prototyp mit Direktvergleich (Abschnitt 9). |
| Die Anbindung an Coding-Agenten ist dauerhaft erlaubt und stabil. | Ohne sie fehlen Tools und Skills im Knoten (GOAL-05); Anbieter ändern ihre Bedingungen häufig. | Primärquellen der Nutzungsbedingungen vor Slice 0.1 prüfen (Software Architect); API-Key-Weg als Rückfallebene. |
| Die Differenzierung hält gegenüber Hamster und Spec-Kit-Extensions. | Wenn diese Chat pro Knoten und Rückfluss ergänzen, fehlt ein Grund für Ramifold. | Hands-on-Test von Hamster und der Spec-Kit-Extension „Epic“ vor Slice 0.1. |
| Andere Entwickler haben denselben Schmerz und akzeptieren mehrere Planungsebenen. | Ohne sie bleibt Ramifold ein Werkzeug für eine Person. | Nach 0.1: Veröffentlichung, 3–5 Gespräche oder Erfahrungsberichte aus der Community. |

## 13. Entscheidungen, weitere Annahmen, Risiken und offene Fragen

**Entscheidungen des Owners:**
- Produktname Ramifold („Planungsbaum“ war Arbeitstitel). (Runde 1)
- Primär-Nutzer: einzelne Entwickler mit Coding-Agenten, zuerst der Owner. (Runde 1)
- Der claude.ai-Prototyp wird nicht weiter genutzt; ein eigener Prototyp soll hier entstehen. (Runde 1)
- Die KI im Knoten soll Tools und Skills weiter nutzen können. (Runde 1)
- KI-Anbindung zuerst über den Coding-Agenten, direkte API später. (Runde 2)
- Erst validieren mit einem Wegwerf-Prototyp; Testvorhaben „eigenes produktives RAG“. (Runde 2)
- Aus der Projektbeschreibung: Baum mit Chat pro Knoten, Ergebnisse als Schnittstelle, Kontextregeln, Abhängigkeiten, Versionen und Benachrichtigungen, allgemeiner Kern mit Software als erstem Profil, Open Source, lokal.

**Weitere Annahmen:** Der Owner hat im Testzeitraum etwa 3 Stunden Zeit; der Testzugang zu Claude Code reicht für den Prototyp.

**Risiken:** siehe Abschnitte 3 und 12; zusätzlich: Die knappe Zeit des Owners kann die Validierung verzögern oder verfälschen.

**Offene Fragen:**
1. Werden Chatverläufe standardmäßig im Git-Repo versioniert?
2. Sprache der Oberfläche (Vorschlag: zunächst Englisch).
3. Welche Open-Source-Lizenz?
4. Welche Coding-Agenten außer Claude Code sollen in 0.1 unterstützt werden?
5. Gibt es ein Budget oder einen Zeitrahmen über den Prototyp hinaus?

## 14. Empfehlung

**Erst validieren.** Das Problem ist durch die Recherche gut belegt, und die Kombination aus Ergebnis-Vererbung, Rückfluss nach oben und Änderungsabgleich ist am Markt nicht zu finden. Unbelegt ist aber, ob der Baum in der Praxis spürbar besser plant als der Plan-Modus und leicht genug ist, um genutzt zu werden; der erste Prototyp liefert dazu keine Erfahrung. Ein kleiner Wegwerf-Prototyp am echten RAG-Vorhaben klärt das mit wenig Aufwand, bevor ein Slice mit allen Gates gebaut wird. Danach wird der Brief überarbeitet: Vorschlag für Slice 0.1, andere Richtung oder nicht weiterverfolgen.

## 15. Product-Brief-Bestätigung

Status: Approved
Entscheidung: Approved
Bestätigt durch: local-board (Owner)
Datum: 2026-11-24
Referenz: MAR-1347, Freigabekarte 0b7a3054, product-brief Revision 1 (e0bcc41a-a2f0-48c3-9632-b750f21caee0)
