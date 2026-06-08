## Kontext
Repo: /home/jo/kit/claude-code-llm-kram/Backlog.md
Branch: main
Goal: BACK-486/487/488 Colored Labels Feature aktivieren und tsc-clean machen

## Hintergrund
Das Projekt hat vor einiger Zeit einen großen Merge-Unfall (worktree-merge-contamination)
hinter sich. Der aktuelle main hat durch BACK-486-488 (colored labels) 51 tsc-Fehler in src/.
Diese waren nie vollständig aktiviert – die Implementation steckt halbfertig im main.

Detaillierte Analysen:
- Fork-Vergleich (upstream vs uns): docs/subagent-research-reports/fork-comparison-full.md
- Label-Feature-Breakdown (alle broken Stellen): docs/subagent-research-reports/label-analysis-full.md
  (diese vor dem Start lesen)

## Aktueller Zustand
51 TypeScript-Fehler in src/ (exkl. Tests), ~12 Test-Fehler.
LabelConfig (`{ name: string; color?: string }`) Union-Typ nicht durchgereicht.
Fehlende Core-Methoden (editDecision, editDoc/updateDocumentFromInput fehlt).
Route-Handler-Typen unvollständig.
Tests mit veralteten Typ-Annahmen.

## Plan (7 Phasen)

### Phase 1 – Low Hanging Fruit (~10 Errors)
1. src/server/router.ts – RouteHandlers.config um handleAddLabel, handleRenameLabel, handleRemoveLabel ergänzen
2. src/mcp/tools/labels/schemas.ts:1 – Import ../../types.ts → ../../validation/validators.ts
3. src/mcp/tools/labels/index.ts:30,41,52 – Casts as unknown as LabelAddArgs etc.
4. src/server/index.ts:287,302 – import type { BunFile } from "bun" ergänzen
5. src/utils/task-edit-builder.ts:26 – Return-Type checked: false → checked: boolean

### Phase 2 – Type Narrowing string | LabelConfig (~17 Errors)
Alle .toLowerCase()/.localeCompare() auf Array<string | LabelConfig> mit typeof guard versehen.
Betroffen:
- src/server/handlers/config.ts (6 Stellen: `.toLowerCase`, `.localeCompare`)
- src/mcp/tools/labels/handlers.ts (6 Stellen)
- src/commands/label.ts:34 – Set<string> hat totes ternary
- src/ui/task-viewer-with-search.ts:215,224 – labels-Typ
- src/web/App.tsx:282 – useState<string[]> → (string | LabelConfig)[]
- src/web/components/Settings.tsx:278+ – label rendern: typeof === "string" ? l : l.name

Pattern für jede Stelle:
```typescript
// VORHER (broken):
labels.some(l => l.toLowerCase() === name)

// NACHHER (fixed):
typeof l === "string" ? l.toLowerCase() === name : l.name.toLowerCase() === name
```

### Phase 3 – Missing Methods (~5 Errors)
1. src/core/backlog.ts – editDecision(id, updates) hinzufügen:
   Entscheidung laden → updates.label merge Mode implementieren (ersetzen oder hinzufügen) → updateDecisionFromContent()
   Es gibt createDecision, resolveDecision, updateDecisionFromContent, createDecisionWithTitle.
   editDecision sollte: read decision, merge labels, serialize, updateDecisionFromContent.
2. listDocs() → listDocuments() in allen Callern (2 Stellen: mcp/labels/handlers.ts:90, server/handlers/config.ts:129)
3. editDoc() → updateDocumentFromInput() + content mitgeben (2 Stellen: mcp/labels/handlers.ts:94, server/handlers/config.ts:133)
4. commands/label.ts:148 – DocumentUpdateInput.content ist required. Entweder optional machen in types/index.ts ODER Content laden
5. commands/label.ts:156 – editDecision verwenden (oder Core.editDecision implementieren und aufrufen)

### Phase 4 – Init/Utils (~6 Errors)
1. src/core/init.ts:150-151 – Duplikate entfernen (Defaults werden vom spread überschrieben)
2. src/core/init.ts:257 – configOption-Typ fixen: resolveConfigLocation return "folder" | "root"
3. src/core/backlog.ts:2484 – computed spread title: {} → title: existingDecision.title
4. src/server/utils.ts:201,210 – Array.isArray guards für string | string[]

### Phase 5 – Web UI (~4 Errors)
1. src/web/components/TaskDetailsModal.tsx:685,704 – onNavigateToTask-Prop prüfen (existiert in Interface, wird von App.tsx übergeben? Fehler scheint false positive/capturing-issue)
2. src/web/App.tsx:647 – DocumentationDetailProps & DecisionDetailProps Props Union fixen

### Phase 6 – Tests (~12 Errors)
- commands-config-cov: Array-Typ `{key:string}[]` → `string[]` fixen
- assignee: toEqual-Typen fixen (null und undefined)
- backlog-coverage: newIndex existiert nicht in reorderTask params
- unused → _prefix oder entfernen
- possibly undefined → ?. optional chaining
- task-watcher: WatchListener/instanceof Typen

### Phase 7 – Verification
```bash
bunx tsc --noEmit          # → 0 errors expected
bun test *label*           # labels tests pass
bun run build              # binary builds
bun run cli label list     # smoke test
```

## Wichtige Constraints
- Nur main branch bearbeiten
- `worktrees/` ignorieren (sind separate checkouts, haben 333 eigene Errors)
- tsconfig exclude ist `[]` – worktrees werden mitsamt tsc-geparst, das ist OK, ignorieren
- Bun runtime ist tolerant – `bun run`/`bun build` läuft auch mit tsc-Errors
- Vor Phase 3 ist die Runtime-Funktionalität eingeschränkt (editDoc/Decision crasht)
- Nach Phase 3 ist das Feature grundsätzlich lauffähig
- Mach pro Phase einen Commit (oder pro Error-Kategorie)

## Abschlusskriterien
- `bunx tsc --noEmit` → exit 0
- `bun run build` → success
- `bun run cli label list` → funktioniert
- Alle label-bezogenen Tests pass
