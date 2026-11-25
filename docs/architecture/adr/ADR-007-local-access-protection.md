<!-- Quelle: Paperclip-Dokument `adrs` v0.7, Revision e24de893-855d-43a5-8c04-2c0257b1fd7d (MAR-1416); freigegeben mit Gate „Wie“ Slice 0.1 (MAR-1369) -->

## ADR-007 – Lokaler Zugriffsschutz: nur `127.0.0.1`, Host- und Herkunftsprüfung, keine Zugangstokens

- **Slug:** `local-access-protection`
- **Status:** **approved (Gate „Wie“ Slice 0.1, MAR-1369; Owner-Freigabe 2026-11-25 mit „Stimmt“ bei allen 13 kritischen Annahmen; freigegebene Revision `e24de893-855d-43a5-8c04-2c0257b1fd7d`)**. Stand bei der Prüfung: Vorgeschlagen
- **Kontext:** LP-01 (keine Konten), REQ-057 (nur lokal), REQ-058 (Schutz vor fremden Webseiten), REQ-060, REQ-061, A-05 (Rechner gehört dem Planer).
- **Optionen:**
  1. **Bindung an `127.0.0.1`, Prüfung von `Host`, `Origin` und `Sec-Fetch-Site`, ändernde Anfragen nur als JSON mit eigenem Header, keine CORS-Freigaben, strenge Content-Security-Policy.**
  2. Zusätzlich ein Zugangstoken in der Adresse (wie Jupyter), schützt auch gegen andere Konten desselben Rechners.
  3. Bindung an alle Schnittstellen mit Passwort – widerspricht LP-01 und REQ-057.
- **Entscheidung (Vorschlag):** Option 1. Erfüllt REQ-057 und REQ-058 ohne zusätzlichen Schritt für den Planer; Schutz gegen andere Konten ist durch A-05 nicht gefordert.
  - **Zulässige Hosts (v0.3, CC-09):** `127.0.0.1:<port>` und `localhost:<port>`, jeweils mit dem eigenen Port; zulässige Herkunft entsprechend `http://127.0.0.1:<port>` und `http://localhost:<port>`. `localhost` ist sicher gegen DNS-Rebinding, weil der Name nicht von einem Angreifer kontrolliert wird; Browser lösen ihn lokal auf. Der Server bindet weiter nur an `127.0.0.1` (kein `::1`); Browser, die `localhost` zuerst als `::1` versuchen, weichen auf `127.0.0.1` aus. Das Terminal nennt `127.0.0.1`.
  - **Abweisung:** Ein anderer `Host` erhält eine schlichte Textseite (kurzer englischer Text vom UI/UX Design, ohne Ramifold-Layout, ohne Skripte, ohne Daten der Instanz). Anfragen mit fremder Herkunft (fremde Webseite) erhalten eine Fehlerantwort ohne Daten; diese sieht niemand als Seite. Statuscodes in der Technical Specification.
- **Folgen:** Adresse ist ohne Token nutzbar; mehrere Fenster einfach. Bilder und Ressourcen nur aus eigener Herkunft.
- **Risiken:** Auf gemeinsam genutzten Rechnern kann ein anderes Konto Ramifold bedienen (A-05, akzeptiert). Option 2 lässt sich später ergänzen.
- **Umkehrbarkeit:** leicht.
