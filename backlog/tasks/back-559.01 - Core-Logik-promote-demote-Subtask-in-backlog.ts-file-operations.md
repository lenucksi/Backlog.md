---
id: BACK-559.01
title: "Core-Logik: promote/demote Subtask in backlog.ts + file operations"
status: To Do
assignee:
  - "@jo"
created_date: 2026-06-20 17:30
labels: []
milestone: m-10
dependencies:
  - BACK-560
modified_files:
  - src/core/backlog.ts
  - src/file-system/operations.ts
  - src/utils/task-path.ts
parent_task_id: BACK-559
priority: high
ordinal: 321000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementiert die zentrale Core-Logik für Subtask Promotion/Demotion in `src/core/backlog.ts` und die dazugehörigen File-Operationen.

**Demotion (Task → Subtask):**
- Neue Methode `async demoteTaskToSubtask(taskId: string, parentTaskId: string): Promise<Task>`
- Setzt `parentTaskId` auf dem Task
- Vergibt ggf. eine neue dotted ID (z.B. `TASK-5.3`)
- Benennt die Datei um (alter Dateiname → neuer Dateiname mit neuer ID)
- Aktualisiert Subtask-Baum rekursiv wenn der Task eigene Subtasks hat

**Promotion (Subtask → Task):**
- Neue Methode `async promoteSubtaskToTask(taskId: string): Promise<Task>`
- Löscht `parentTaskId`
- Vergibt neue Top-Level-ID (z.B. `TASK-42`)
- Benennt die Datei um
- Aktualisiert Subtask-Baum rekursiv wenn der Subtask eigene Subtasks hat

**Cascading:**
- Wenn ein Task mit Subtasks promoted/demoted wird, müssen alle Subtasks ebenfalls aktualisiert werden
- Für Demotion: Alle Subtasks des demoted Tasks behalten ihn als Parent (keine Änderung nötig, da der Task nur tiefer wandert)
- Für Promotion: Alle Subtasks des promoted Tasks müssen dessen neue ID als `parentTaskId` bekommen

**File Operations:**
- `normalizeTaskIdentity()` in `src/utils/task-path.ts` — prüfen ob Anpassungen für ID-Änderung nötig
- Neue Helper in `src/file-system/operations.ts` für rename-Operation mit ID-Update
- Alte Datei löschen, neue Datei schreiben

**Validierung:**
- Parent-Task muss existieren (bei Demotion)
- Task darf nicht bereits Subtask des Ziel-Parents sein
- Keine zirkulären Hierarchien (Parent wird nicht Subtask seines eigenen Subtasks)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `backlog.demoteTaskToSubtask(taskId, parentTaskId)` setzt parentTaskId + dotted ID + benennt Datei um
- [ ] #2 `backlog.promoteSubtaskToTask(taskId)` löscht parentTaskId + vergibt neue Top-Level-ID + benennt Datei um
- [ ] #3 Cascading: Subtask-Baum wird korrekt rekursiv mitgezogen
- [ ] #4 Validierung: Parent-Task existiert, keine zirkulären Hierarchien
- [ ] #5 `generateNextSubtaskId()` wird für neue dotted IDs verwendet
- [ ] #6 `generateNextId()` wird für neue Top-Level-IDs bei Promotion verwendet
- [ ] #7 Auto-Commit + Git-Commit-Nachricht bei Erfolg
- [ ] #8 `bunx tsc --noEmit` passes
- [ ] #9 `bun test` passes (neue Unit-Tests für promote/demote)
- [ ] #10 `bun run check .` passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
- [ ] #5 Core-Methoden in backlog.ts implementiert und getestet
- [ ] #6 File-rename + ID-Update in file operations implementiert
- [ ] #7 Cascading-Logik für Subtask-Bäume implementiert
<!-- DOD:END -->