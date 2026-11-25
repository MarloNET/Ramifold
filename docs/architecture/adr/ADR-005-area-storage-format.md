<!-- Quelle: Paperclip-Dokument `adrs` v0.7, Revision e24de893-855d-43a5-8c04-2c0257b1fd7d (MAR-1416); freigegeben mit Gate „Wie“ Slice 0.1 (MAR-1369) -->

## ADR-005 – Ablage im Ramifold-Bereich `.ramifold/`: eine Datei je Objekt, Versionen und Chats nur anhängen

- **Slug:** `area-storage-format`
- **Status:** **approved (Gate „Wie“ Slice 0.1, MAR-1369; Owner-Freigabe 2026-11-25 mit „Stimmt“ bei allen 13 kritischen Annahmen; freigegebene Revision `e24de893-855d-43a5-8c04-2c0257b1fd7d`)**. Stand bei der Prüfung: Vorgeschlagen
- **Kontext:** LP-02, LP-07, REQ-016, REQ-045, REQ-049 bis REQ-052, REQ-055, REQ-065, REQ-072; OQ-07; zwei Rechner mit Git (REQ-072, REQ-074); Owner-Hinweis 2 (Chat ohne Knoten macht Vorhaben nicht unlesbar).
- **Optionen:**
  1. **Eine JSON-Datei je Knoten und je Ergebnis-Version, eine JSONL-Datei je Chat**, Versionen und Chats nur anhängen; versteckter Ordner `.ramifold/`.
  2. Eine Datei je Vorhaben (wie im Prototyp).
  3. SQLite-Datenbank im Projektordner.
  4. Sichtbarer Ordner `ramifold/`.
- **Entscheidung (Vorschlag):** Option 1 mit Aufbau laut Baseline Abschnitt 4. Identitäten als ULID; Positionen als sortierbare Schlüssel; Formatversion in `area.json` und `plan.json`; `.ramifold/.gitignore` (einmal angelegt) schließt `local/`, Temp-Dateien und `plans/*/chats/` aus; `local/` mit eigener `.gitignore`. Export: `.ramifold/plans/<planId>/PLAN.md`; er ist abgeleitet und **keine Plandaten** (v0.3, CC-03): Ramifold liest ihn nie, jeder Export schreibt ihn vollständig neu, er zählt weder für die Lesbarkeit (REQ-072) noch für die Erkennung von Änderungen von außen (REQ-074, ADR-006). Verwaiste Chats und Versionen ohne Knoten werden ignoriert, nicht als Lesefehler gewertet.
- **Begründung:** Parallele Änderungen verschiedener Knoten auf zwei Rechnern führen bei Git zu getrennten Dateien und damit selten zu Konflikten; nur-anhängende Versionen und Chats haben nie Schreibkonflikte innerhalb einer Datei, außer bei eingeschlossenen Chats, die auf beiden Rechnern weitergeschrieben werden (dann REQ-072). Menschenlesbar und mit Git nachvollziehbar. Alle acht Erweiterungen aus REQ-065 docken additiv an (Baseline Abschnitt 4). Versteckter Ordner wie `.github/`: hält das Repo-Wurzelverzeichnis aufgeräumt und wird von Werkzeugen als Metadaten erkannt.
- **Folgen:** Viele kleine Dateien (bei 200 Knoten einige hundert); Laden eines Vorhabens liest sie alle (unkritisch bei A-06). Der Export-Pfad enthält die Vorhaben-ID; Ramifold nennt ihn nach jedem Export (REQ-049).
- **Risiken:** Ein versteckter Ordner wird übersehen; abgemildert durch den genannten Exportpfad. Datei-Anzahl wächst mit Versionen; für A-06 unkritisch.
- **Umkehrbarkeit:** schwer (Datenformat).
