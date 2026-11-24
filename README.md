# ⚠️ WEGWERF-PROTOTYP – nicht produktiv, nicht Teil des Produkts

> Dieser Branch (`prototype/ramifold-planungsbaum`) enthält **Wegwerfcode**. Er dient nur dazu, **eine** Annahme zu prüfen (Product Brief v0.1, Abschnitt 9):
>
> *Planen im Baum mit Ergebnis-Vererbung liefert für ein mehrstufiges Vorhaben einen spürbar besseren Plan als der Plan-Modus des Coding-Agenten oder ein linearer Chat, bei vertretbarem Aufwand pro Knoten.*
>
> Der Code wird **nicht** ins Produkt übernommen, auch nicht teilweise. Nur für die interne Nutzung durch den Owner, lokal, ohne echte Kunden- oder Personendaten. Nicht öffentlich erreichbar machen.

## Voraussetzungen

- **Node.js ≥ 20** (keine weiteren Pakete, kein `npm install` nötig)
- **Claude Code** installiert (`claude` im PATH) und **mit deinem eigenen Zugang angemeldet**. Einmal im Terminal `claude` starten und den Login abschließen; danach muss `claude -p "hallo"` antworten.
- Ein Browser

## Starten (ein Befehl)

```bash
node server.js ~/pfad/zu/deinem/projektordner
```

Dann im Browser **http://127.0.0.1:4317** öffnen. Ohne Ordnerangabe landet alles in `./demo-project/`.

- Der Projektordner ist das Arbeitsverzeichnis für Claude Code. Die KI kann dort Dateien **lesen**, aber nichts ändern.
- Ablage: `<projektordner>/ramifold/<vorhaben>/plan.json` (Baum, Aufträge, Ergebnisse), `chats/<knoten>.json` (Chat pro Knoten), `PLAN.md` (Export).
- Hinweis: Chats liegen im Projektordner. Wenn du sie nicht im Git-Repo haben willst, trag `ramifold/*/chats/` in die `.gitignore` deines Projekts ein (offene Frage 1 im Brief).
- Optional: `PORT=4400` für einen anderen Port, `RAMIFOLD_MODEL=<modell>` für ein bestimmtes Modell.

## Bedienung in Kürze

1. **+ Neues Vorhaben**: Titel und Auftrag eingeben, z. B. „Eigenes produktives RAG“.
2. Im **Chat** des Vorhabens grob besprechen. Die KI läuft über Claude Code und darf **Web-Recherche** (WebSearch, WebFetch) und **Lesen** im Projektordner (Read, Glob, Grep) nutzen. Benutzte Tools stehen über der Antwort (🔧).
3. **KI schlägt Unterpunkte vor**: Vorschläge prüfen, Titel und Auftrag ändern, abwählen, **übernehmen**. Mit **+ Manuell** legst du selbst einen an. Das geht in beliebiger Tiefe.
4. Einen Unterpunkt im Baum anklicken. Sein neuer Chat kennt automatisch **Auftrag und Ergebnis aller Vorfahren** sowie **Titel und Auftrag der Geschwister**, aber **nie Chats** anderer Knoten. Was genau die KI bekommt, zeigt **„Kontext ansehen, den die KI bekommt“**.
5. **KI fasst zusammen**: Der Entwurf erscheint im Feld „Ergebnis“. Prüfen, bearbeiten, dann **Als Konzept speichern** oder **Plan festlegen**.
6. **Rückfluss**: Festgelegte Pläne der Kinder fließen automatisch in Chat und Zusammenfassung des Elternknotens. Ein Hinweis erscheint, wenn ein Kind nach dem Ergebnis des Elternknotens festgelegt wurde.
7. **Gesamtplan exportieren**: der ganze Baum als ein Markdown-Dokument (auch als `PLAN.md` gespeichert).

Im Baum: ○ offen, gelb = Konzept, grün = festgelegt. Unten links stehen Knotenzahl, festgelegte Knoten und Ebenen (für das Erfolgskriterium ≥ 3 Ebenen, ≥ 8 festgelegte Knoten).

## Bewusst nicht enthalten

Abhängigkeiten, Versionen und Benachrichtigungen, Profile, API-Key-Anbindung, MCP-Server, GitHub-Issue-Export, Desktop-App, Design-Feinschliff.

## Technik (für Neugierige)

- `server.js`: lokaler HTTP-Server, nur an `127.0.0.1` gebunden, ohne Abhängigkeiten
- `lib/context.js`: Kontextregel (das, was hier getestet wird)
- `lib/claude.js`: startet pro Anfrage `claude -p --output-format stream-json`. Der Kontext geht per `--append-system-prompt`, der Chat eines Knotens wird über `--resume <session>` fortgesetzt, Vorschläge und Zusammenfassungen laufen in einem Fork (`--fork-session`) und landen nicht im Chat
- `public/`: Oberfläche (reines HTML/JS)
- Tests: `npm test` (nutzt `test/fake-claude.js` statt des echten Claude Code)
- Ohne Claude-Login durchklicken: `RAMIFOLD_CLAUDE_CMD=test/fake-claude.js node server.js` (Antworten sind erfunden)
