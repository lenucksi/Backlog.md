# Test Scenarios — Auto-Linking & Backlinks

## Setup

1. Start the web UI: `bun run cli browse` (oder `bun run dev`)
2. Öffne http://localhost:6420 im Browser

---

## Szenario 1: Task-ID Auto-Linking

**Given** ich bin auf einer beliebigen Markdown-Ansicht (Task-Body, Doc-Body, Decision-Body)
**When** der Text eine Task-ID wie `BACK-123` enthält
**Then** wird sie als blauer Link rendered
**And** beim Klick öffnet sich der Task-Detail-Modal für diese Task

**Testdaten:**
- Öffne einen beliebigen Task im Web UI
- Stelle sicher, dass `description` einen Text mit `BACK-<nummer>` enthält
- Der Link sollte sichtbar sein
- Klick drauf → Task-Modal öffnet sich

---

## Szenario 2: Doc-ID Auto-Linking

**Given** ich bin auf einer Markdown-Ansicht
**When** der Text `doc-1` oder `#doc-1` enthält
**Then** wird sie als Link zu `/documentation/doc-1` gerendert

**Testdaten:**
- In einem Task-Body: `Siehe doc-12 für Details`
- Der Link `doc-12` sollte klickbar sein
- Klick → navigiert zur Dokumentationsseite

---

## Szenario 3: Decision-ID Auto-Linking

**Given** ich bin auf einer Markdown-Ansicht
**When** der Text `decision-3` oder `#decision-3` enthält
**Then** wird sie als Link zu `/decisions/decision-3` gerendert

---

## Szenario 4: Code-Blöcke werden ignoriert

**Given** eine Markdown-Ansicht mit Code-Block
**When** im Code-Block (`` `BACK-123` `` oder `` ```BACK-123``` ``) eine Task-ID steht
**Then** wird sie NICHT als Link gerendert (bleibt plain text)

**Testdaten:**
- Erstelle/editiere einen Task mit:
  ```markdown
  Normaler Text mit BACK-123 (sollte Link sein)

  `BACK-123 in inline code` (sollte KEIN Link sein)

  ```
  BACK-123 in fenced code
  ``` (sollte KEIN Link sein)
  ```
- Der erste `BACK-123` ist ein Link, die anderen nicht

---

## Szenario 5: #-Präfix Unterstützung

**Given** eine Markdown-Ansicht
**When** der Text `#doc-1` oder `#decision-1` enthält
**Then** wird er korrekt als Link gerendert (das `#` ist Teil des Link-Texts)

**Testdaten:**
- `#doc-12` → Link zu `/documentation/doc-12`, angezeigt als `#doc-12`

---

## Szenario 6: Referenced By auf Dokument-Seite

**Given** ich bin auf einer Dokument-Seite (z.B. `/documentation/doc-1`)
**When** es Tasks/Docs/Decisions gibt, die `doc-1` im Body erwähnen
**Then** wird unter dem Content ein "Referenced by"-Abschnitt angezeigt
**And** jeder Eintrag zeigt ID + Titel
**And** Klick auf einen Eintrag navigiert zu dem referenzierenden Entity

**Testdaten:**
- Editiere Task `BACK-123` und schreibe `Siehe doc-12` in description
- Öffne doc-12 im Web UI
- "Referenced by" sollte `BACK-123 — Titel des Tasks` anzeigen

---

## Szenario 7: Referenced By auf Decision-Seite

**Given** ich bin auf einer Decision-Seite (`/decisions/decision-3`)
**When** es Entities gibt, die `decision-3` erwähnen
**Then** wird "Referenced by" mit den entsprechenden Einträgen angezeigt

---

## Szenario 8: Keine File-Mutation

**Given** das Backend läuft
**When** ich die "Referenced by"-Sektion auf einer Seite sehe
**Then** werden die Backlinks dynamisch berechnet (keine `.md`-Datei wurde modifiziert)

**Test:**
- `git status` vorher und nachher → keine unerwarteten Änderungen

---

## Szenario 9: Edge Cases

| Fall | Erwartung |
|------|-----------|
| Leere Backlinks (`doc-9999` existiert nicht) | "Referenced by" wird nicht angezeigt |
| Task ohne description/body | Keine Links im leeren Bereich |
| `BACK-` ohne Nummer | Kein Match, wird nicht gelinkt |
| `doc-` ohne Nummer | Kein Match |
| Sehr langer Text mit vielen IDs | Alle IDs werden korrekt gelinkt |
| IDs in Markdown-Links (`[BACK-123](/tasks/123)`) | Manueller Link bleibt erhalten, kein Double-Link |
