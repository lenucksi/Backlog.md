---
id: BACK-556
title: Auto-collapse milestone swimlanes when all tasks are done
status: Done
assignee: []
created_date: 2026-06-09 13:16
updated_date: 2026-06-09 13:32
labels:
  - enhancement
  - web-ui
dependencies: []
modified_files:
  - src/types/index.ts
  - src/web/components/Settings.tsx
  - src/web/components/Board.tsx
  - src/web/components/BoardPage.tsx
  - src/web/App.tsx
  - src/board.ts
  - src/file-system/operations.ts
  - src/server/handlers/config.ts
  - scripts/build.ts
  - scripts/postinstall.sh
  - patches/chevrotain-to-fast-properties.patch
priority: medium
ordinal: 308000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Analyse

### Problem
Im Web-Kanban-Board nehmen vollständig erledigte Milestone-Swimlanes unnötig Platz ein. Der Benutzer muss sie manuell einklappen.

### Gewünschtes Verhalten
- Wenn alle Tasks in einem Milestone den Status "done" (bzw. terminal) haben, soll die Swimlane automatisch eingeklappt werden.
- Auf der Swimlane-Header-Zeile soll ein Hinweis erscheinen (z.B. "✓ All done").
- Das Feature soll über ein Setting (BacklogConfig) an-/abschaltbar sein.

### Bestehende Architektur (Web-Kanban)

| Komponente | Datei | Rolle |
|---|---|---|
| Board | `src/web/components/Board.tsx` | Hauptkomponente: rendert Milestone-Swimlanes, `collapsedLanes` State, `isLaneCollapsed()`-Logik, `toggleLaneCollapse()` |
| BoardPage | `src/web/components/BoardPage.tsx` | Hüllkomponente: übergibt Props an Board |
| App | `src/web/App.tsx` | Übergibt config-Werte als Props an BoardPage |
| Settings | `src/web/components/Settings.tsx` | Einstellungsseite: hat Toggle-Pattern für booleans (autoCommit, remoteOperations, autoOpenBrowser) |
| BacklogConfig | `src/types/index.ts` | Config-Typ: booleans wie `autoCommit`, `autoOpenBrowser`, `remoteOperations` |
| Milestone Done-Erkennung | `src/core/milestones.ts` → `isDoneStatus()` | Nutzt `terminalStatuses`-Config oder substring-Matching |
| Progress-Berechnung | `Board.tsx` → `getLaneProgress()`, `countDoneTasksInLane()` | **Derzeit kein** `isDoneStatus()` – substring-Matching nur auf `'done'`/`'complete'` |

### Bestehendes Collapse-Verhalten
- `collapsedLanes: Record<string, boolean>` State in Board (in-memory, nicht persistiert)
- `isLaneCollapsed()`: respektiert manuelles Toggling und `milestoneFilter`
- Swimlane-Header: Chevron, Task-Count, Progress-Bar + Prozent

### Offene Punkte zur Entscheidung
1. **Soll `countDoneTasksInLane()` auf `isDoneStatus()` umgestellt werden?** (Statt hartkodiertem `includes('done')`) – Notwendig für korrektes Verhalten bei custom Status-Workflows.
2. **Nur Web-UI oder auch plaintext CLI (`src/board.ts`)?** CLI-Kanban hat kein Collapse, könnte aber einen `[ALL DONE]`-Marker zeigen.
3. **Notiz-Text auf der Swimlane**: Welcher Text? Vorschlag: grüner "✓ All done"-Badge.

### Umsetzungsplan

1. **Config-Typ erweitern** (`src/types/index.ts`):
   - Neues Feld `autoCollapseMilestones?: boolean` in `BacklogConfig`
   
2. **Setting-Toggle in der UI** (`src/web/components/Settings.tsx`):
   - Neuen Toggle-Eintrag unter "Workflow Settings" (analog zu autoCommit/remoteOperations)
   - Label: "Auto-Collapse Milestones"
   - Beschreibung: "Automatically collapse milestone lanes when all tasks are complete"

3. **Prop durchreichen**:
   - `App.tsx`: `autoCollapseMilestones={config?.autoCollapseMilestones}` an BoardPage
   - `BoardPage.tsx`: Neues Prop `autoCollapseMilestones` an Board weitergeben
   - `Board.tsx`: Neues Prop `autoCollapseMilestones?: boolean`

4. **Auto-Collapse-Logik** (`Board.tsx` - `isLaneCollapsed()`):
   - Wenn `autoCollapseMilestones === true` UND `getLaneProgress(laneKey) === 100` UND keine manuelle Überschreibung in `collapsedLanes`:
     → automatisch collapsed

5. **Manuelle Überschreibung respektieren**:
   - Sobald der User manuell toggled (toggleLaneCollapse), überschreibt das das Auto-Collapse für diese Lane
   - Wenn ein vorher fertiger Milestone wieder Tasks in nicht-done bekommt: Auto-Collapse wird aufgehoben (weil progress < 100)

6. **Visuelles Feedback**:
   - Im Swimlane-Header, wenn auto-collapsed wegen "all done": grünen "✓ All done"-Badge anzeigen (z.B. neben dem Progress-Bar)

### Modality-Checkliste
- **WebUI**: ✅ Hauptimplementierung
- **CLI**: Optional – könnte `[ALL DONE]` in der Text-Ansicht zeigen (issue erkannt, nicht Teil dieses Tasks)
- **TUI**: ❌ Keine Milestone-Swimlanes vorhanden
- **MCP**: ❌ Keine visuelle Darstellung
- **REST**: ❌ Keine Änderungen nötig
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When all tasks in a milestone lane are in terminal/done status, the lane auto-collapses if the setting is enabled
- [ ] #2 Manually toggling a collapsed lane overrides auto-collapse for that lane
- [ ] #3 When a task moves out of done status, the auto-collapse for that lane is automatically lifted
- [ ] #4 The swimlane header shows a visual indicator (e.g. green badge) when auto-collapsed due to completion
- [ ] #5 The feature is toggleable in Settings under Workflow Settings
- [ ] #6 Settings toggle is persisted to backlog/config.yml via existing config mechanism
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented auto-collapse milestone swimlanes when all tasks are done, with config toggle in Settings.

## Changes (11 files)

### Feature
- `src/types/index.ts`: `autoCollapseMilestones?: boolean` in `BacklogConfig`
- `src/web/components/Settings.tsx`: Toggle unter Workflow Settings
- `src/web/App.tsx` + `BoardPage.tsx`: Prop durchgereicht
- `src/web/components/Board.tsx`: Auto-Collapse-Logik, `isDoneStatus()` statt substring, "✓ All done"-Badge, Single-Lane-Dead-End-Fix (immer Header in Milestone-Mode)
- `src/board.ts`: `[ALL DONE]`-Marker im CLI-Output
- `src/file-system/operations.ts`: Config-Roundtrip für `autoCollapseMilestones`
- `src/server/handlers/config.ts`: WebSocket-Fix `broadcastConfigUpdated()`

### Cross-Browser / Build-Fixes
- `scripts/build.ts`: Post-Build-Patch entfernt Chevrotain-Dead-Code (`;(0,eval)`) aus `dist/web/main.js`
- `patches/chevrotain-to-fast-properties.patch`: Patch-File (wird aktuell nicht via postinstall angewandt, da Bun node_modules beim Bundling ignoriert)

## Implementation Notes & Lessons Learned

### 1. Config-Roundtrip: `parseConfig`/`serializeConfig` sind Whitelists
Der grösste Fail: `src/file-system/operations.ts` serialisiert Config hartkodiert zeilenweise. `autoCollapseMilestones` war weder in `parseConfig()` noch in `serializeConfig()` noch im Return-Object. Das Setting wurde gespeichert → aber nie auf Disk geschrieben. Nach Server-Neustart: weg.
**Lesson**: Jedes neue Config-Feld muss an 3 Stellen in `operations.ts` eingetragen werden (parse switch, serialize return, return object). Gleiches Problem betrifft `includeDateTimeInDates`, `taskResolutionStrategy`, `mcp`-Block.

### 2. Bun's Bundler hat eigenen Kopf
Bun's `Bun.build()` mit `minify: true` constant-folded `if (1)` → `return`, lässt dead code (`(0,eval)(...)`) als "unreachable after return" stehen. Firefox bricht ab, Chrome nicht.
Patching der node_modules Source-Files (`.ts` + `.js`) hatte KEINEN Effekt. Bun's Bundler cached/ignoriert node_modules-Änderungen beim Kompilieren.
**Fix**: Post-Processing im Build-Script (`scripts/build.ts`) patcht `dist/web/main.js` nach dem Build.
**Lesson**: Node_modules-Patching bringt nix wenn der Bundler die Dateien vor dem Bundling cached. Post-Build-Patch ist der einzig verlässliche Weg.

### 3. Firefox vs Chrome: Unterschiedliche JS-Fehler-Toleranz
- Chrome/V8: Dead Code nach `return` = Warnung, ignoriert → App läuft
- Firefox/SpiderMonkey: Dead Code nach `return` im Strict Mode = harter Syntax-Error → Modul lädt nicht → Swimlanes weg
**Lesson**: Firefox ist strikter. Immer Konsole checken. "Aber Chrome läuft" heisst nicht "alles OK".

### 4. Build-Artefakte shadowen Source-Dateien
`dist/web/main.js` (gebuildetes Bundle) wird vom Server VOR `src/web/`-Source-Dateien bevorzugt. Source-Edits haben NULL Effekt wenn das alte Bundle noch liegt.
**Lesson**: Nach Source-Änderungen: `rm -rf dist/web && bun run build`. Oder Server mit `bun src/cli.ts browser` (dev) starten statt `dist/backlog browser` (production).

### 5. Single-Lane Auto-Collapse = Dead End
`shouldShowLaneHeaders` war `true` nur bei `visibleLanes.length > 1`. Bei nur 1 Milestone + auto-collapsed = keine Header-Buttons = keine Möglichkeit zu expandieren.
**Fix**: `shouldShowLaneHeaders` ist jetzt immer `true` im milestone mode.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->