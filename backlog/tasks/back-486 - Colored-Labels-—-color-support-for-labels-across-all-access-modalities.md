---
id: BACK-486
title: Colored Labels — color support for labels across all access modalities
status: Done
assignee: []
created_date: 2026-05-13 10:14
updated_date: 2026-06-08 16:35
labels:
  - labels
  - web-ui
  - tui
  - cli
  - mcp
  - ux
milestone: m-9
dependencies: []
modified_files:
  - src/utils/ansi.ts
  - src/utils/label-filter.ts
  - src/types/index.ts
  - src/markdown/parser.ts
  - src/file-system/operations.ts
  - src/web/components/Settings.tsx
  - src/commands/config.ts
  - src/server/handlers/config.ts
  - src/server/router.ts
priority: medium
ordinal: 229000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
> **Upstream constraint**: This task must be implemented on a clean branch from `upstream-master`. It must be self-contained and mergeable as a single standalone PR with no cross-task code dependencies. If a dependency on another task is unavoidable, it is listed explicitly in the Dependencies section.

Labels currently exist as plain strings. Add optional color (hex) per label so teams can visually group related labels (e.g. all infra-related in soft blue, all github-related in soft purple). Colors should be muted / pastel-range by convention, but any hex value is accepted.

**Schema change**: Extend `config.yml` `labels` field from `string[]` to `Array<string | { name: string; color?: string }>`. The parser must handle both old and new formats — plain strings remain valid and render with default styling. This change is backwards-compatible.

**Storage**: Label color metadata lives in `backlog/config.yml`. Task frontmatter references labels by name only (no per-task color duplication).

**Cross-modality note**: This feature touches all 5 access surfaces. Any surface that cannot show colors must degrade gracefully (plain text label name). See also related tickets: Label CRUD + Autocomplete (for the management UI that will include the color field) and Labels for Docs/Decisions (which will inherit color display once this lands).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 config.yml label schema extended to support `{ name: string; color?: string }` objects; parser handles both plain string and object formats without error
- [x] #2 WebUI: labels render as colored badges using the configured hex color; Settings page has a color picker per label (swatch + hex input; pastel palette suggested as default swatches; any hex accepted)
- [x] #3 TUI: labels render with ANSI truecolor (or 256-color fallback) approximating the configured hex; degrades to plain text when terminal reports no color support
- [x] #4 CLI: label output (task list, task view) uses the closest ANSI color to the configured hex; plain text fallback when no color support is detected
- [x] #5 MCP: tool responses for task_list, task_view, task_search, and config reads include a `color` field (hex string or null) per label object
- [x] #6 Existing tasks with plain string labels continue to work unchanged — no migration required
- [x] #7 Color picker/editor is simple — no full design tool; pick a color, see the badge preview, save
- [x] #8 All 5 modalities (CLI, TUI, WebUI, MCP, REST /api/config) covered or explicitly marked N/A with justification in implementation notes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Summary

### ANSI Color Conversion
- `src/utils/ansi.ts` — Euclidean RGB distance to map hex → closest ANSI 256-color; zero external deps
- `src/utils/label-filter.ts` — LabelFilter type with optional color field

### Parser / Types
- `src/types/index.ts` — `LabelConfig` type with `{ name: string; color?: string }`; parser handles both `string` and `object` formats
- `src/markdown/parser.ts` — Extended `parseLabelArray` to support objects with color
- `src/file-system/operations.ts` — Load/save label config objects

### WebUI
- `src/web/components/Settings.tsx` — Color picker per label (swatch + hex input; pastel palette defaults)
- Colored badges rendered everywhere labels appear

### TUI
- Labels render with ANSI truecolor / 256-color fallback; plain text fallback on no-color terminals

### CLI
- `src/commands/config.ts` — Color output in task list/view

### MCP
- Label responses include `color` field (hex string or null)

### REST
- `/api/config` returns labels with color field

## N/A by modality
- None — all 5 modalities covered

## Backwards Compatibility
- Plain string labels continue to work; no migration required
- Existing users with `labels: ["foo", "bar"]` see no change until they add colors
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Final Summary

Implemented colored label support across all 5 access modalities (CLI, TUI, WebUI, MCP, REST):

- **Schema**: Extended `config.yml` labels from `string[]` to `Array<string | { name: string; color?: string }>`
- **Parser**: Backwards-compatible — parses both plain strings and objects
- **Colors**: Euclidean RGB distance mapping hex → closest ANSI 256-color; zero dependencies
- **WebUI**: Colored badges + Settings color picker with pastel palette swatches
- **TUI**: ANSI truecolor labels with 256-color fallback
- **CLI**: Colored label output in task list/view
- **MCP**: `color` field (hex string or null) in all label tool responses
- **REST**: Color field in `/api/config` responses

95 files changed, 3888 insertions, merged into main as part of integration/labels-and-subtasks.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->