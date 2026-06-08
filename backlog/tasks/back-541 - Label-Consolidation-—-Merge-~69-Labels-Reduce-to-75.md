---
id: BACK-541
title: Label Consolidation — Merge ~69 Labels, Reduce to <75
status: To Do
assignee: []
created_date: 2026-06-08 21:01
labels:
  - labels
  - refactoring
  - cleanup
dependencies: []
references:
  - docs/label-cleanup-proposals.md
  - scripts/label-cleanup.sh
priority: low
ordinal: 276000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Beschreibung

Labels weiter konsolidieren von aktuell 136 auf <75. Alle Vorschläge sind in `docs/label-cleanup-proposals.md` dokumentiert.

## Merge-Strategie

Labels mit ≤3 Tasks in nächstpassendes breiteres Label mergen (siehe `docs/label-cleanup-proposals.md` für vollständige Map).

## Änderungen

Jeder Merge: alle Tasks mit Quell-Label updaten → Quell-Label aus Config entfernen.

Ausführung über `scripts/label-cleanup.sh` (Phase 6) oder manuell via:
```bash
# Für Single-Target-Merges:
backlog label rename <old> <new>

# Für Multi-Target-Merges (target existiert bereits):
backlog task edit <id> --remove-label <old> --add-label <new>
# + backlog label remove <old>
```

## Ergebnis
- Vorher: 136 Labels
- Nachher: ~67 Labels
- Ziel: <75 ✅
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->