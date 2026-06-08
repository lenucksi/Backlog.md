---
id: doc-17
title: E2E Playwright Setup — Architecture, Learnings & Patterns
type: guide
created_date: 2026-06-08 10:13
tags:
  - e2e
  - playwright
  - testing
  - webui
---
# E2E Playwright Setup — Architecture, Learnings & Patterns

Notes from adding Playwright E2E tests to the WebUI modality.

---

## 1. Architecture Overview

```
npm run test:e2e
  │
  ├─ lsof -ti:6420 | xargs kill -9      # Port freigeben
  ├─ bun run build:css                    # Tailwind bauen
  └─ npx playwright test
       │
       ├─ webServer:                      # Playwright startet vorgeschalteten Server
       │    └─ bun run scripts/e2e-test-server.ts
       │         ├─ tmp/e2e-test-project/ anlegen
       │         ├─ git init + Core init
       │         ├─ 9 seed tasks (task-* IDs)
       │         └─ BacklogServer auf :6420
       │
       └─ chromium workers (5 parallel)
            └─ page.goto("http://localhost:6420/")
```

### Dateien

| Datei | Rolle |
|---|---|
| `playwright.config.ts` | Playwright-Konfiguration (Chromium, viewport, webServer) |
| `scripts/e2e-test-server.ts` | Testserver mit Seed-Daten und Cleanup |
| `src/test/e2e/critical-journeys.test.ts` | 5 User-Journey-Tests |

### npm Scripts

```bash
bun run test:e2e          # Headless (CI-Stil)
bun run test:e2e:ui       # Playwright UI Mode (interaktiv)
bun run test:e2e:debug    # Playwright Debug Mode (Inspector + headed)
```

---

## 2. Critical Learnings / Gotchas

### 2.1 Task-ID-Prefix muss zum Glob-Pattern passen

`Core.createTask()` legt Dateien mit einem konfigurierbaren Prefix an (default: `task`). `listTasks()` globt dann nach `task-*.md`. Wenn Seed-Daten einen anderen Prefix verwenden (z.B. `BACK-*`), erzeugt `createTask` zwar Dateien auf Disk, aber `listTasks` findet sie nicht — das Board bleibt leer.

**Fundstelle**: `src/file-system/operations.ts:507`:
```
const taskPrefix = (config?.prefixes?.task ?? "task").toLowerCase();
```

**Lösung**: Seed-IDs müssen `task-*` heißen.

### 2.2 Port-Konflikt: Kill muss vor Playwright passieren

Playwrights `webServer`-Config führt mit `reuseExistingServer: false` einen Preflight-Check durch — ist Port 6420 bereits belegt, bricht PW sofort ab, **bevor** `scripts/e2e-test-server.ts` überhaupt startet.

Ein Kill innerhalb des `webServer.command` reicht nicht. Der Kill muss **vor** dem Playwright-Aufruf erfolgen:

```bash
lsof -ti:6420 | xargs kill -9 2>/dev/null; bunx playwright test
```

**Zwei Schichten Kill**:
1. `package.json` Script: Kill vor Playwright-Start
2. `scripts/e2e-test-server.ts`: Kill vor Server-Start (Fallback für manuelle Aufrufe)

### 2.3 Test Server Architecture

`scripts/e2e-test-server.ts` ist ein eigenständiges Script, das:

1. Via `lsof` + SIGTERM einen existierenden Prozess auf `:6420` beendet
2. `tmp/e2e-test-project/` komplett löscht und neu anlegt
3. `git init -b main` + `$ git config user.*` ausführt
4. `new Core(TEST_DIR)` + `initializeTestProject(core, "E2E Test Project")` aufruft
5. 9 Aufgaben mit verschiedenen Status/Prioritäten/Assignees per `core.createTask()` anlegt
6. `new BacklogServer(TEST_DIR)` startet
7. SIGTERM/SIGINT-Handler für sauberes Shutdown registriert

Die `e`-Option von `$ {cmd}` (alias `.quiet()`) unterdrückt die Ausgabe. Wichtig: `await $`lsof -ti:6420`...` muss `.nothrow()` haben, da `lsof` mit exit code 1 endet wenn kein Prozess läuft.

### 2.4 Playwright Worker Parallelism

`fullyParallel: true` startet 5 Workers für 5 Tests. Jeder Test navigiert `page.goto("/")` frisch. Alle Tests teilen sich denselben Server-Prozess (lesend, keine Mutationen) — das ist sicher da die Seed-Daten schreibgeschützt behandelt werden.

Problematisch wird es wenn:
- Ein Test Daten mutiert und ein anderer liest (dirty read)
- Der Server pro Test neugestartet werden müsste (dann `workers: 1`)

### 2.5 Locator-Strategie: Modal-Heading-Mehrdeutigkeit

`getByRole("heading", { name: "Implement login page" })` matcht **2 Elemente**:
1. Die Task-Card-Überschrift (`h4`) im Board
2. Der Modal-Titel (`h2#modal-title`) — "TASK-1 — Implement login page"

**Lösung**: Spezifischerer Regex:
```ts
getByRole("heading", { name: /TASK-1.*Implement login page/i })
```

### 2.6 Seed-Daten-Design

Die 9 Tasks sind so gewählt, dass jede Filterkombination testbar ist:

| ID | Title | Status | Priority | Assignee |
|---|---|---|---|---|
| task-1 | Implement login page | To Do | high | alice |
| task-2 | Set up CI pipeline | In Progress | high | bob |
| task-3 | Write API documentation | To Do | medium | alice, charlie |
| task-4 | Fix navigation bug on mobile | Done | high | charlie |
| task-5 | Add dark mode support | To Do | low | (none) |
| task-6 | Database migration script | In Progress | medium | bob |
| task-7 | User acceptance testing | Done | high | alice |
| task-8 | Performance benchmark report | Done | low | charlie |
| task-9 | Set up staging environment | To Do | medium | (none) |

### 2.7 Biome-Kompatibilität

Playwright-Testdateien durchlaufen `biome check`. Wichtig:
- Import-Reihenfolge: `{ expect, test }` statt `{ test, expect }` (Biome sortiert alphabetisch)
- `.or()`-Chains formatieren automatisch um

---

## 3. Test Patterns

### 3.1 Board Rendering

```ts
test("board loads and renders task columns", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Kanban Board" })).toBeVisible();
    await expect(page.locator('[draggable="true"]').first()).toBeVisible({ timeout: 5000 });
});
```

### 3.2 Filter

```ts
test("filters board by assignee and clears filter", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[draggable="true"]').first()).toBeVisible({ timeout: 5000 });
    await page.getByRole("combobox", { name: "Filter board by assignee" }).selectOption("bob");
    await expect(page.getByText("Set up CI pipeline")).toBeVisible();
    await expect(page.getByText("Implement login page")).not.toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByText("Implement login page")).toBeVisible();
});
```

### 3.3 Modal Open/Close

```ts
test("opens task detail modal and closes it", async ({ page }) => {
    await page.goto("/");
    const firstCard = page.locator('[draggable="true"]').first();
    await expect(firstCard).toBeVisible({ timeout: 5000 });
    await firstCard.click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: "Close modal" }).click();
    await expect(modal).not.toBeVisible();
});
```

---

## 4. Commands

```bash
bun run test:e2e           # headless, 5 tests in ~5s
bun run test:e2e -- --headed  # mit sichtbarem Browser
bun run test:e2e:debug     # Inspector + headed, pausiert bei page.pause()
bun run test:e2e:ui        # Playwright UI Mode (Browser + Test-Tree)
```

---

> **Created**: 2026-06-08
> **Tags**: e2e, playwright, testing, webui