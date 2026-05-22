---
id: BACK-527.1
title: 'Phase 1: 0%-Utility-Files Coverage ≥80%'
status: Done
assignee: []
created_date: '2026-05-22 12:59'
updated_date: '2026-05-22 15:38'
labels:
  - testing
  - coverage
  - phase-1
  - back-527
milestone: m-13
dependencies: []
parent_task_id: BACK-527
priority: high
ordinal: 235000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Coverage für 7 Utility-Files die aktuell 0% haben auf ≥80% bringen. Alle sind rein funktionale Module ohne TUI-Abhängigkeiten.

## Files
1. src/utils/task-updated-date.ts (0%, 39 lines) — Datums-Updatelogik
2. src/utils/terminal-status.ts (0%, ~23 lines) — Terminal-Status
3. src/utils/input-sanitizer.ts (0%, ~16 lines) — Input-Bereinigung
4. src/utils/task-subtasks.ts (0%, ~36 lines) — Subtask-Helper
5. src/utils/editor.ts (0%, ~96 lines) — Editor-Konfiguration
6. src/core/reorder.ts (0%, 94 lines) — Reorder-Algorithmen
7. src/core/prefix-migration.ts (7%, ~99 lines) — Prefix-Migration

## Methode
- Direkter Import der Funktionen in Testfiles
- Kein `mock.module`, kein termless nötig
- Test-Name-Pattern: `src/test/<file>-coverage.test.ts` oder passend zu existierenden Tests

## Referenz-Pattern
```typescript
import { describe, it, expect } from "bun:test";
import { myFunction } from "../utils/my-file.ts";

describe("myFunction", () => {
    it("handles basic case", () => {
        expect(myFunction("input")).toBe("expected");
    });
});
```

## Bestehende Coverage (Laut core.test.ts):
- reorder.ts: 0%
- prefix-migration.ts: 7.25%
- task-updated-date.ts: 0%
- terminal-status.ts: 4.35%
- input-sanitizer.ts: 16.67%
- task-subtasks.ts: 5.88%
- editor.ts: 6.85%
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
