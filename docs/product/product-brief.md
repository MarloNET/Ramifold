# Product Brief – Ramifold

Version: v0.2 | Status: Approved | Verantwortlich: Product Discovery | Datum: 2026-11-24
Recherche: product-research v0.2 (unverändert, `docs/product/product-research.md`)
Grundlage: freigegebener Brief v0.1 (`docs/product/product-brief.md`, Commit 5f86a91), Prototyp-Ergebnis MAR-1349 (Branch `prototype/ramifold-planungsbaum`, Commit `673649c`), Owner-Auswertung MAR-1352 (Fragekarten fc7f16bb und f60985d1)

Kennzeichnung: **[Owner]** = vom Owner entschieden; **[Vorschlag]** = Vorschlag von Product Discovery, wird mit der Freigabe des Briefs bestätigt; **[offen]** = noch zu klären.

**Änderungen gegenüber v0.1:** Validierungsauftrag (Abschnitt 9) ersetzt durch den Vorschlag für Slice 0.1. Produktbild erweitert um Verweise auf andere Knoten, Material am Knoten, mehrere Chats pro Knoten und Änderungsvorschläge der KI (Abschnitte 5 und 6). Neue Leitplanke „KI ändert nichts ohne Bestätigung“; offene Fragen aus dem Prototyp entschieden oder zugeordnet (Abschnitte 7 und 13). Empfehlung jetzt „Bauen“.

**Änderung in Revision 2 (Owner-Wunsch: Slice 0.1 so klein wie möglich, so umfangreich wie nötig):** Aus Slice 0.1 gestrichen sind Material am Knoten, mehrere Chats pro Knoten, Verweise auf andere Knoten, Änderungsvorschläge der KI, Verschieben und Dazwischen-Einfügen sowie die Ordnerwahl in der Oberfläche [Owner, Fragekarte f60985d1]. Verweise und Verschieben/Einfügen gehen in 0.2, der Rest später (Abschnitte 8, 9 und 13). Das Produktbild bleibt vollständig; bei den betroffenen Objekten steht jetzt, ab wann sie kommen.

## 1. Produktvision und Wertversprechen

Ramifold ist ein Open-Source-Werkzeug, mit dem Entwickler größere Software-Vorhaben **Ebene für Ebene mit einer KI planen**. Jeder Punkt im Plan hat eigene Chats. Zwischen den Punkten fließen nur **Ergebnisse** (Auftrag, Konzept, festgelegter Plan), nie die Gespräche. Am Ende liegt ein konsistenter Plan als Dateien im Repo und dient Coding-Agenten oder Tickets als Vorgabe.

**Wertversprechen:** Wer heute ein mehrstufiges Vorhaben mit einer KI plant, muss zwischen einem langen, verwässerten Chat und dem ständigen Neu-Erklären in neuen Chats wählen und am Ende alles von Hand zusammenführen. Ramifold nimmt beides ab: Jeder Chat bleibt bei seinem Thema, kennt automatisch die Entscheidungen darüber, kann gezielt auf Ergebnisse anderer Punkte verweisen, und festgelegte Pläne fließen von selbst zurück nach oben. Die KI im Knoten arbeitet über den Coding-Agenten des Nutzers und behält dessen Tools und Skills (z. B. Web-Recherche, Codebasis lesen).

Langfristig: allgemeiner Planungskern mit austauschbaren Profilen; Software ist das erste und vorerst einzige Profil.

## 2. Problem und Zielgruppe

Unverändert gegenüber v0.1.

**Problem:** Planung verzweigt sich wie ein Baum, KI-Chats sind linear. Folgen: Context Rot in langen Chats, wiederholtes Erklären, manuelles Zusammenführen, und Pläne, die nach Änderungen inkonsistent werden.

**Primäre Zielgruppe [Owner]:** einzelne Entwickler, die mit Coding-Agenten (z. B. Claude Code) arbeiten und Vorhaben planen, die über ein einzelnes Feature hinausgehen. Erster Nutzer ist der Owner; erstes Vorhaben: „Eigenes produktives RAG“.

**Sekundär (später):** die Open-Source-Community dieser Entwickler; kleine Teams, die über Git gemeinsam an einem Plan arbeiten.

**Heutige Alternativen:** Plan-Modus des Coding-Agenten, verzweigbare Chats, Spec-Tools (Spec Kit, OpenSpec, Kiro), Hamster, manuell gepflegte Markdown-Dokumente und mehrere Chatfenster.

## 3. Marktumfeld und Wettbewerb

Unverändert gegenüber v0.1 (Details und Quellen: `product-research` v0.2). Am nächsten ist Hamster (SaaS, feste Ebenen); Spec Kit und andere Spec-Tools sind flach; native Plan-Modi liefern einen Plan pro Session; verzweigbare Chats haben keine Ergebnis-Artefakte und keinen Rückfluss.

**Differenzierung:** (1) Vererbt werden Ergebnisse statt Chats, (2) festgelegte Pläne fließen nach oben zurück, (3) die KI prüft Änderungen über Zweige hinweg. **Positionierung [Vorschlag, bestätigt mit v0.1]:** vorgelagerter Planer vor Coding-Agent und Spec-Tools, kein weiteres Spec-Framework.

**Marktrisiken:** Wettbewerber ergänzen Chat pro Knoten und Rückfluss; Plan-Modi werden „gut genug“; Overhead-Vorwurf bei tiefen Bäumen; Nutzungsbedingungen der Agent-Anbieter ändern sich häufig.

## 4. Ziele und Nicht-Ziele

| ID | Ziel |
|---|---|
| GOAL-01 | Ein Entwickler plant ein mehrstufiges Vorhaben, ohne Kontext neu erklären oder Ergebnisse von Hand zusammenführen zu müssen. |
| GOAL-02 | Jeder Planungspunkt trennt Brainstorming (Chat) von Entscheidung (festgelegter Plan); der Gesamtplan ist nachvollziehbar. |
| GOAL-03 | Der Plan bleibt bei Änderungen konsistent: Betroffene Punkte werden erkannt und abgeglichen. |
| GOAL-04 | Der fertige Plan fließt ohne Medienbruch in die Umsetzung (Dateien im Repo, Coding-Agent, Tickets). |
| GOAL-05 | Die KI im Knoten kann die Tools und Skills nutzen, die der Nutzer aus seinem Coding-Agenten kennt (z. B. Web-Recherche). |
| GOAL-06 | Der Nutzer behält die Kontrolle über seine Daten und seinen Plan: Open Source, lokal, keine Ramifold-Cloud, keine Änderung ohne seine Bestätigung. |

**Nicht-Ziele** (unverändert): Ramifold setzt nicht selbst um (kein Agent-Framework, keine Orchestrierung); kein Projektmanagement-Tool; kein eigenes Spec-Framework; kein SaaS, keine Benutzerkonten; keine Echtzeit-Zusammenarbeit (Teilen höchstens über Git); weitere Profile erst, wenn sich das Software-Profil bewährt hat.

## 5. Produktbild

**Rollen:**
- **Planer** (der Nutzer): legt Vorhaben an, baut den Baum, führt die Chats, legt Pläne fest, entscheidet über jede Änderung.
- **KI im Knoten:** führt die Chats eines Knotens, schlägt Unterpunkte, Zusammenfassungen und Änderungen am Ergebnis vor, prüft Auswirkungen von Änderungen. Läuft zuerst über den Coding-Agenten des Nutzers [Owner], später auch über einen eigenen API-Key.
- **Coding-Agent als Leser** (später): liest den festgelegten Plan beim Umsetzen.

**Fachbegriffe und Objekte:**
- **Vorhaben:** Wurzel eines Baums; gehört zu genau einem **Projektordner** (Repo) und nutzt ein Profil. In 0.1 wird der Ordner beim Start angegeben; Auswahl in der Oberfläche später.
- **Knoten:** Punkt im Baum mit Titel und **Auftrag**. Hat genau einen Elternknoten (außer der Wurzel) und beliebig viele Kinder. Die **Nummer** (2, 2.1, 2.1.3) zeigt die aktuelle Position und ändert sich beim Verschieben oder Einfügen (ab 0.2); Verweise und Abhängigkeiten zeigen auf den Knoten selbst, nicht auf die Nummer. [Vorschlag]
- **Chat:** gehört zu genau einem Knoten; ein Knoten hat **einen oder mehrere Chats** [Owner-Idee, Vorschlag; in 0.1 genau einen Chat, mehrere später]. Jeder Chat bekommt den aktuellen Kontext des Knotens (siehe Kontextregeln). Chats werden nie an andere Knoten oder andere Chats weitergegeben.
- **Ergebnis:** gehört zu einem Knoten; ist **Konzept** (grob) oder **festgelegter Plan**. Jede Änderung erzeugt eine neue **Version**; alte Versionen bleiben erhalten.
- **Material** [Owner-Idee, Vorschlag; später]: Datei (Dokument, Bild), die an einen Knoten gehängt ist, z. B. eine Skizze oder ein eigenes Zusatzdokument. Liegt im Projektordner (verknüpft oder beim Anhängen dorthin kopiert) und gehört zum Kontext des Knotens.
- **Verweis** [Owner-Idee, Vorschlag; ab 0.2]: Der Planer nennt im Chat einen anderen Knoten (z. B. `#2.3.1`); die KI bekommt dann dessen Auftrag und aktuelles Ergebnis. Einmalig und ausdrücklich; keine Abhängigkeit, keine Benachrichtigung.
- **Änderungsvorschlag** [Owner-Idee, Vorschlag; später]: Die KI schlägt auf Wunsch aus dem Chat eine Änderung am Ergebnis vor; sie wird erst übernommen, wenn der Planer bestätigt.
- **Abhängigkeit:** „Knoten A braucht das Ergebnis von Knoten X“, quer im Baum; keine Kreise; solange X nicht festgelegt ist, zeigt A „wartet auf X“. Deckt auch den Fall der Owner-Idee „Knoten geben Infos an andere Knoten“ ab (z. B. „Budget“ braucht das Ergebnis von „Transport“). [Vorschlag]
- **Benachrichtigung:** entsteht, wenn sich ein Ergebnis ändert; geht an alle Nachkommen und an die direkten Abnehmer über Abhängigkeiten. Zeigt Vorher und Nachher; Bewertung „betroffen / teilweise / nicht betroffen“.
- **Profil:** System-Prompts, Planformat, Bezeichnungen der Ebenen und Exportziele (Software: Epic, Feature, Task).
- **Export:** der Plan als Markdown bzw. Ordnerstruktur im Repo, später als Tickets und für Coding-Agenten lesbar.

**Kontextregeln (Kern des Produkts):**
- **Nach unten:** Ein Knoten bekommt Auftrag und Ergebnis aller Vorfahren sowie Titel und Auftrag seiner Geschwister; Material der Vorfahren nur als Verweis (Name, Ort), den die KI bei Bedarf liest. [Vorschlag für Material]
- **Im Knoten:** Jeder Chat bekommt Auftrag, aktuelles Ergebnis und Material des eigenen Knotens. [Vorschlag]
- **Nach oben:** Festgelegte Pläne der Kinder fließen in Chats und nächste Zusammenfassung des Elternknotens.
- **Quer:** Über einen Verweis nur auf ausdrücklichen Wunsch, über eine Abhängigkeit nur das Ergebnis von X; nie Chats.

**Kernablauf:** Projektordner wählen, Vorhaben anlegen und grob besprechen → KI schlägt Unterpunkte mit Auftrag vor → Baum nach Bedarf umbauen (einfügen, verschieben, einklappen) → Unterpunkt öffnen; seine Chats kennen den Kontext von oben, Material und Verweise ergänzen ihn → Plan zusammenfassen lassen oder Änderung vorschlagen lassen, prüfen, festlegen → Plan fließt nach oben → bei Änderungen werden Betroffene benachrichtigt und abgeglichen → Export in die Umsetzung.

**Beispiel:** Vorhaben „Eigenes produktives RAG“. Kinder: 1 Datenquellen und Ingestion, 2 Retrieval (2.1 Chunking, 2.2 Embedding-Modell, 2.3 Reranking), 3 Evaluation, 4 Betrieb und Kosten. An 1 hängt eine Skizze der Datenquellen. Im Chat von 2.2 recherchiert die KI Embedding-Modelle im Web und kennt dabei Auftrag und Ergebnis von 2 und der Wurzel. Der Planer schreibt „passt das zu `#1`?“, und die KI bezieht den Plan von 1 ein. Ein zweiter Chat in 2.2 vergleicht nur die Kosten. Auf Wunsch schlägt die KI eine Änderung am Konzept von 2.2 vor; der Planer bestätigt sie. Später schiebt er zwischen 2 und 2.3 einen Knoten „Hybrid Search“ ein. 4 hängt von 2 ab (ab 0.2) und zeigt „wartet auf 2“.

## 6. Zentrale Use Cases

- **UC-01** Projektordner angeben, Vorhaben anlegen und grob mit der KI besprechen.
- **UC-02** Unterpunkte von der KI ableiten lassen, jeweils mit Auftrag; Unterpunkte anpassen.
- **UC-03** Einen Unterpunkt öffnen und vertiefen (später auch in mehreren Chats); jeder Chat kennt Auftrag und Ergebnisse von oben.
- **UC-04** Im Knoten-Chat Tools und Skills nutzen (z. B. Web-Recherche, Codebasis lesen).
- **UC-05** Plan zusammenfassen lassen, prüfen, festlegen; der Plan fließt in den Elternknoten zurück.
- **UC-06** Abhängigkeit zwischen Knoten setzen; sehen, worauf ein Punkt wartet.
- **UC-07** Auf eine Änderung reagieren: Vorher/Nachher sehen, KI-Einschätzung, klären oder als erledigt markieren.
- **UC-08** Den Plan exportieren bzw. im Repo ablegen und einem Coding-Agenten oder Tickets als Vorgabe geben.
- **UC-09 (neu)** Den Baum umbauen: Knoten ein- und ausklappen (0.1), dazwischen einfügen und verschieben (0.2).
- **UC-10 (neu, später)** Material (Dokument, Bild) an einen Knoten hängen, damit die KI es kennt.
- **UC-11 (neu, 0.2)** Im Chat auf einen anderen Knoten verweisen (z. B. `#2.3.1`), damit die KI dessen Ergebnis einbezieht.
- **UC-12 (neu, später)** Die KI aus dem Chat heraus eine Änderung am Ergebnis vorschlagen lassen und sie bestätigen oder verwerfen.

## 7. Produktweite Leitplanken

- **Mandanten:** Einzelnutzer-Werkzeug, keine Mandanten, keine Benutzerkonten. [bestätigt mit v0.1]
- **Betrieb und Daten:** läuft lokal; Plan, Ergebnisse, Chats und Material liegen im Projektordner des Nutzers; Ramifold betreibt keinen Server und speichert nichts zentral. [Owner]
- **KI ändert nichts ohne Bestätigung (neu):** Die KI im Knoten liest (Projektordner, Web), verändert aber weder Plan noch Dateien des Projekts ohne ausdrückliche Bestätigung des Planers. [Owner: „sollte vorher immer abgefragt werden“] Wie die KI Änderungen technisch vorschlägt (z. B. MCP oder Dateizugriff), entscheidet der Software Architect.
- **KI-Anbindung:** zuerst über den Coding-Agenten des Nutzers, damit Tools und Skills erhalten bleiben [Owner]; in Slice 0.1 nur Claude Code, weitere Coding-Agenten später [Vorschlag]; eigener API-Key später [Owner].
- **Nutzungsbedingungen:** Die Anbindung muss den aktuellen Bedingungen der Anbieter entsprechen; keine Abhängigkeit von einer Grauzone. Der Prototyp nutzt `claude -p` mit dem Abo-Login des Owners; ob das für ein veröffentlichtes Werkzeug zulässig ist, prüft der Software Architect in Gate „Wie“ von Slice 0.1 anhand von Primärquellen. Ist es nicht zulässig, braucht 0.1 den API-Key-Weg als Anbindung.
- **Personenbezogene Daten:** Ramifold verarbeitet bewusst keine; Inhalte gehen an den KI-Anbieter des Nutzers. Nötig: klarer Hinweis darauf, keine Zugangsdaten im Repo.
- **Chats im Git-Repo [Vorschlag, entscheidet offene Frage 1 aus v0.1]:** Plan, Ergebnisse und Export werden mit dem Repo versioniert; Chats standardmäßig nicht (Ramifold schließt sie per Voreinstellung aus), der Nutzer kann sie bewusst einschließen. Grund: Chats können Unfertiges oder Vertrauliches enthalten und wären im Repo dauerhaft, ggf. öffentlich.
- **Plattformen [Vorschlag]:** Desktop-Rechner, Bedienung im Browser am PC, kein Smartphone. Slice 0.1 unterstützt Linux und macOS; Windows ist Ziel für ein späteres Release (der Prototyp ist dort ungetestet).
- **Sprachen [Vorschlag, entscheidet offene Frage 2 aus v0.1]:** Oberfläche Englisch (Open-Source-Community); die KI antwortet in der Sprache des Nutzers. Weitere Oberflächensprachen später.
- **Lizenz:** Open Source [Owner]; **[offen]** welche Lizenz, Entscheidung des Owners vor der ersten Veröffentlichung.
- **Recht:** voraussichtlich kein Hochrisiko-System nach EU AI Act (keine Rechtsprüfung).
- **Budget und Zeit:** **[offen]**; die Zeit des Owners ist knapp [Owner].

## 8. Release-Roadmap

Vorgeschlagene Produktschritte, keine Termine. Zuschnitt späterer Slices schlägt der Product Owner jeweils vor.

| Release | Nutzerziel |
|---|---|
| 0.1 | Ein Entwickler plant ein Vorhaben als Baum mit einem Chat pro Knoten über Claude Code, legt Pläne fest und gibt den Gesamtplan als Dateien an seinen Coding-Agenten weiter. |
| 0.2 | Er bildet Abhängigkeiten quer im Baum ab (z. B. „Budget“ braucht „Transport“), sieht, worauf ein Punkt wartet, und das Ergebnis fließt dem abhängigen Punkt zu; er verweist im Chat auf andere Knoten und baut den Baum um (verschieben, dazwischen einfügen), ohne Chats zu verlieren. |
| 0.3 | Er ändert einen Plan und wird bei allen betroffenen Punkten mit Vorher/Nachher und KI-Einschätzung zum Abgleich geführt. |
| 0.4 | Sein Coding-Agent liest den Plan beim Umsetzen direkt, und er erzeugt daraus Tickets oder Spec-Tool-Formate. |
| später (Zuschnitt durch den Product Owner) | Er vertieft einen Knoten komfortabler: mehrere Chats pro Knoten, Material (Dokumente, Bilder) am Knoten, Änderungsvorschläge der KI am Ergebnis mit Bestätigung, Projektordner in der Oberfläche wählen. |
| 0.5 | Ein Entwickler ohne Coding-Agent plant mit eigenem API-Key, auch vollständig lokal; weitere Coding-Agenten und Windows. |
| später | Weitere Profile (z. B. Forschungsprojekt, Event), auch aus der Community. |

## 9. Vorschlag erster Slice

**Ergebnis des Prototyps:** Der Owner hat den Prototyp abgeschlossen getestet und bewertet die fünf Erfolgskriterien insgesamt als erfüllt („hat ganz gut alles gepasst“) [Owner]. Aus dem echten Gebrauch kamen elf Ideen; sie sind unten 0.1 oder einem späteren Release zugeordnet. Auf Wunsch des Owners ist 0.1 auf den Kern geschnitten: so klein wie möglich, so umfangreich wie nötig [Owner]. Der Prototyp-Code wird nicht übernommen.

**Slice 0.1 – Nutzerziel:** Der Owner plant sein Vorhaben „Eigenes produktives RAG“ und ein zweites echtes Vorhaben vollständig in Ramifold und gibt den exportierten Plan an Claude Code weiter, ohne Kontext neu zu erklären oder von Hand zusammenzuführen.

**Enthaltene Abläufe:**
- Projektordner beim Start angeben (wie im Prototyp); Vorhaben anlegen; Baum anzeigen, navigieren, Knoten ein- und ausklappen.
- Baum bearbeiten: Knoten anlegen, umbenennen, Auftrag ändern, auf derselben Ebene sortieren, löschen (mit Warnung, dass Chat und Ergebnis des Knotens und seiner Kinder mitgelöscht werden).
- Ein Chat pro Knoten über Claude Code mit dessen Tools (mindestens Web-Recherche, Projektordner lesen).
- KI schlägt Unterpunkte mit Auftrag vor; übernehmen, ändern, verwerfen.
- Kontextregeln nach unten, im Knoten und nach oben (Abschnitt 5, ohne Material und Verweise); Anzeige, was die KI bekommt.
- Konzept und festgelegter Plan: KI fasst zusammen, der Planer prüft, bearbeitet und legt fest; Rückfluss in den Elternknoten mit Hinweis, wenn ein Kind neu festgelegt wurde.
- **Markdown** in Chats und Ergebnissen sauber dargestellt.
- Export des ganzen Baums als Markdown-Dokument bzw. Dateien im Projektordner.

Ein- und Ausklappen und die Markdown-Darstellung bleiben in 0.1, weil sie wenig Aufwand machen und ein größerer Baum ohne sie schwer lesbar ist.

**Fundament, das das Nutzerziel braucht:**
- Fachliche Basis: Vorhaben, Knoten mit stabiler Identität, Chat, Ergebnis (Konzept/Plan); Ablage so, dass Verschieben, Verweise, Abhängigkeiten, Versionen, Benachrichtigungen, mehrere Chats und Material später ohne Umbau folgen können.
- Rollen und Zugang: ein lokaler Nutzer, kein Konto; nur lokal erreichbar.
- Fehlerfälle: Claude Code fehlt oder nicht angemeldet; Projektordner fehlt oder ist nicht beschreibbar; Antwort bricht ab; Session des Coding-Agenten verloren (Chat bleibt erhalten); versehentliches Löschen eines Knotens mit Kindern.
- Querschnitt: Hinweis, dass Inhalte an den KI-Anbieter gehen; Chats per Voreinstellung nicht im Repo; KI ändert nichts ohne Bestätigung; Prüfung der Nutzungsbedingungen (Abschnitt 7); Installation und Start mit einem Befehl, auf Linux und macOS.

**Bewusst noch nicht enthalten:**
- Abhängigkeiten und Infos zwischen Knoten (Owner-Idee „Transport → Budget“), Verweise auf andere Knoten (`#2.3.1`), Knoten verschieben und dazwischen einfügen → 0.2 [Owner]. Folge für 0.1: Wer den Baum grundlegend umbaut, muss Knoten neu anlegen; deren Chats gehen dabei verloren.
- Mehrere Chats pro Knoten, Material am Knoten, Änderungsvorschläge der KI am Ergebnis, Projektordner in der Oberfläche wählen → später, Zuschnitt durch den Product Owner [Owner].
- Versionen anzeigen, Benachrichtigungen, Änderungsabgleich → 0.3 (Versionen werden aber schon gespeichert).
- Strukturierte Rückfragen der KI mit auswählbaren Antworten (Owner-Idee „Question Tool“) → später; der Software Architect prüft in Gate „Wie“, ob das über Claude Code ohne Terminal möglich ist; danach ordnet der Product Owner es einem Slice zu.
- KI ändert Ergebnisse anderer Knoten oder Dateien des Projekts; Coding-Agent liest den Plan per MCP; Tickets und Spec-Formate → 0.3/0.4.
- API-Key-Anbindung, weitere Coding-Agenten, Windows → 0.5; Profile → später; Design-Feinschliff über eine klare, gut lesbare Oberfläche hinaus.

## 10. Prozessstufe

**Vorschlag: Voll** (unverändert). Ramifold wird als Open Source für externe Nutzer veröffentlicht und bindet Coding-Agenten mit wechselnden Nutzungsbedingungen an.

## 11. Erfolgskriterien

- **Validierung (Prototyp):** erfüllt laut Bewertung des Owners (Abschnitt 9).
- **Nach Release 0.1:** Der Owner plant mindestens zwei echte Vorhaben mit Ramifold und gibt den Plan direkt an Claude Code weiter, ohne manuelles Zusammenführen (GOAL-01, GOAL-04); er nutzt dabei mindestens einmal Web-Recherche im Knoten (GOAL-05) und legt jedes Ergebnis selbst fest (GOAL-06).
- **Nach Release 0.3:** Bei einer Änderung erkennt die KI-Einschätzung die betroffenen Punkte so, dass der Owner keinen betroffenen Punkt selbst suchen muss (GOAL-03).
- **Nach Veröffentlichung:** Rückmeldungen externer Entwickler bestätigen den Nutzen über den Owner hinaus. [Zielwerte offen]

## 12. Riskanteste Annahmen und Validierung

| Annahme | Warum kritisch | Validierungsvorschlag |
|---|---|---|
| Planen im Baum bleibt im Alltag besser als der Plan-Modus, bei vertretbarem Aufwand. | Der Prototyp ist laut Owner bestanden, der Direktvergleich wurde aber nicht einzeln begründet. | Erfolgskriterium nach 0.1 (zwei echte Vorhaben); bei der Abnahme von 0.1 den Vergleich zum Plan-Modus ausdrücklich abfragen. |
| Die Anbindung über `claude -p` mit Abo-Login ist für ein veröffentlichtes Werkzeug erlaubt und stabil. | Sonst fehlt in 0.1 die Anbindung; die Bedingungen haben sich 2026 mehrfach geändert. | Software Architect prüft Primärquellen in Gate „Wie“ von 0.1; API-Key-Weg als Rückfallebene. |
| Der schlanke Slice 0.1 (ein Chat pro Knoten, kein Verschieben, keine Verweise) reicht, um echte Vorhaben durchzuplanen. | Fehlt zu viel, nutzt der Owner 0.1 nicht im Alltag; ohne Verschieben gehen beim Umbau des Baums Chats verloren. | Abnahme von 0.1 am echten Vorhaben; der Owner nennt, was am meisten fehlte; das bestimmt den Zuschnitt von 0.2. |
| Die Differenzierung hält gegenüber Hamster und Spec-Kit-Extensions. | Ohne sie fehlt ein Grund für Ramifold. | Hands-on-Test von Hamster und der Spec-Kit-Extension „Epic“ vor der Veröffentlichung von 0.1. |
| Andere Entwickler haben denselben Schmerz. | Ohne sie bleibt Ramifold ein Werkzeug für eine Person. | Nach 0.1: Veröffentlichung, 3–5 Gespräche oder Erfahrungsberichte. |

## 13. Entscheidungen, weitere Annahmen, Risiken und offene Fragen

**Entscheidungen des Owners:** alle aus v0.1 (Name Ramifold; Zielgruppe einzelne Entwickler mit Coding-Agenten; Tools und Skills im Knoten; Anbindung zuerst über den Coding-Agenten; Open Source, lokal); neu: Prototyp-Test abgeschlossen, Kriterien insgesamt erfüllt; KI-Änderungen am Konzept nur nach Rückfrage; Slice 0.1 so klein wie möglich, die sechs gestrichenen Punkte kommen später.

**Owner-Ideen aus dem Test und ihre Zuordnung [Vorschlag, gekürzt nach Owner-Entscheidung f60985d1]:** Ein- und Ausklappen → 0.1; Markdown gut dargestellt → 0.1; Verweise auf Knoten → 0.2; Knoten verschieben und dazwischen einfügen → 0.2; Infos zwischen Knoten → 0.2 als Abhängigkeit; mehrere Chats pro Knoten → später; Material/Anhänge am Knoten → später; Projektordner wählen und Dokumente verlinken → später; KI ändert das Konzept nach Bestätigung → später; Question Tool → später nach Machbarkeitsprüfung.

**Weitere Annahmen:** „hat ganz gut alles gepasst“ gilt für alle fünf Kriterien einschließlich Direktvergleich und Aufwand; mit der Freigabe dieses Briefs bestätigt der Owner diese Lesart.

**Offene Fragen und Zuordnung:**
1. Nutzungsbedingungen von `claude -p` mit Abo-Login → Software Architect, Gate „Wie“ Slice 0.1.
2. Technischer Weg für Änderungsvorschläge der KI (MCP, Dateizugriff) und für strukturierte Rückfragen → Software Architect, wenn diese Funktionen einem Slice zugeordnet werden.
3. Windows-Unterstützung (nativ oder über WSL) → Software Architect, spätestens für 0.5.
4. Open-Source-Lizenz → Owner, vor der ersten Veröffentlichung.
5. Budget oder Zeitrahmen → Owner, offen.

## 14. Empfehlung

**Bauen.** Der Owner hat den Prototyp an seinem echten Vorhaben getestet, bewertet die Erfolgskriterien als erfüllt und hat beim Benutzen konkrete Verbesserungen gesammelt; das spricht für echten Gebrauch statt Liegenlassen. Slice 0.1 baut auf dem bestätigten Kern auf (Baum, Chat pro Knoten über Claude Code, Kontextregeln, Festlegen mit Rückfluss, Export) und ergänzt nur Ein- und Ausklappen und eine saubere Markdown-Darstellung. Verweise, Verschieben und Abhängigkeiten folgen in 0.2, Änderungsabgleich und weitere Anbindungen in eigenen Slices, Komfortfunktionen wie mehrere Chats und Material später. Vorbehalt: Ist die Anbindung über den Abo-Login nicht zulässig, braucht 0.1 den API-Key-Weg; das klärt der Software Architect zu Beginn von Gate „Wie“.

## 15. Product-Brief-Bestätigung

Status: Approved
Entscheidung: Approved
Bestätigt durch: local-board (Owner)
Datum: 2026-11-24
Referenz: MAR-1352, Freigabekarte b59fd0e5, product-brief Revision 2 (3d96968f-dc40-49a1-b332-629737f17265)
