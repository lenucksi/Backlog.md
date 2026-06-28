---
id: BACK-572
title: Add image attachment preview and clickable file references in Web UI
status: To Do
assignee: []
created_date: 2026-06-18 15:17
updated_date: 2026-06-21 13:35
labels:
  - upstream
  - webui
  - enhancement
milestone: m-14
dependencies: []
references:
  - https://github.com/MrLesk/Backlog.md/issues/691
  - BACK-477
priority: high
ordinal: 2500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Source
- https://github.com/MrLesk/Backlog.md/issues/691 — [Feature] show image attachment in browser mode

## What this is
Image/file references (`references`, `documentation`, and inline Markdown) in the Web UI should be interactive:
- **Images** (png/jpg/gif/svg/webp/avif) → clickable thumbnail or preview via `<img>` in FilePreviewModal (lightbox-style)
- **Files** → clickable to download or preview (existing FilePreviewModal, but needs binary support)
- **Docs/Decisions markdown** → `onFileClick` prop not wired, so file links inside doc/decision content are dead clicks
- **URLs in references/documentation** → already work as clickable links (no change needed)

## Existing infrastructure (~70% done)
- `GET /assets/*` in `src/server/handlers/system.ts:135-177` — already serves images with correct MIME type, path-traversal protection. Supports: png/jpg/gif/svg/webp/avif/pdf/txt/css/js
- `FilePreviewModal` in `src/web/components/FilePreviewModal.tsx` — exists but only renders text (`<pre><code>`), no `<img>` for binaries
- `MermaidMarkdown` in `src/web/components/MermaidMarkdown.tsx:7` — already has `onFileClick` prop
- TaskDetailsModal already wires `onFileClick={setPreviewFilePath}` to MermaidMarkdown (lines 784, 991, 1015, 1039)
- TaskDetailsModal references section already opens FilePreviewModal for file paths via `setPreviewFilePath(ref)` (line 822)
- DocumentationDetail and DecisionDetail use MermaidMarkdown but **without** `onFileClick` and **without** FilePreviewModal

## What needs to change

### 1. FilePreviewModal binary support (30min)
Current: only `apiClient.fetchFileContent(path)` → `file.text()` → breaks on images
Fix:
- Detect image file extensions: `path.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/i)`
- For images: render `<img src="/assets/{relPath}" className="max-w-full max-h-[70vh] object-contain" />` instead of `<pre><code>`
- For text files: keep existing text preview with syntax highlighting
- The `apiClient.fetchFileContent` endpoint (`GET /api/file-content`) uses `file.text()` which fails on binaries — need to either:
  - a) Use the `/assets/` URL directly for images (no API call needed for binary preview)
  - b) Add a binary-capable endpoint

**Recommendation**: Use approach (a) — render `<img>` with `/assets/` URL directly for images, skip the API call entirely.

### 2. Wire onFileClick in Docs/Decisions (20min)
Current: `src/web/components/DocumentationDetail.tsx:34` and `src/web/components/DecisionDetail.tsx:35` use `<MermaidMarkdown source={value} />` without `onFileClick`
Fix:
- Add `FilePreviewModal` import + `previewFilePath` state
- Pass `onFileClick={setPreviewFilePath}` to MermaidMarkdown
- Render `<FilePreviewModal path={previewFilePath} onClose={() => setPreviewFilePath(null)} />`
- **Also**: relative file links in docs/decisions markdown need resolution — they reference paths relative to the backlog root, which MermaidMarkdown's `onFileClick` handler already handles (it extracts `href` from `<a>` tags in parsed markdown)

### 3. References/Documentation linkify file paths (already done)
Current references section (TaskDetailsModal.tsx:821-829) already opens FilePreviewModal for file paths. Documentation section (line 889+) also opens FilePreviewModal. No change needed.

### 4. Thumbnail preview in references list (optional, phase 2)
The issue mentions "small thumbnail as a preview" — this would show images inline in the references list rather than requiring a click. Consider as extension.

## Implementation notes
- The MermaidMarkdown component already parses markdown links and routes file-path clicks through `onFileClick` (lines 144-159). It detects relative/local paths vs external URLs via regex.
- For references/documentation file paths, the `handleFileClick` in TaskDetailsModal currently sets `previewFilePath` which triggers FilePreviewModal.
- The assets server path is: `{backlogRoot}/assets/{relPath}` — FilePreviewModal needs to derive the correct `/assets/` URL from the file path.

## Dependencies
- BACK-519.7 (Done) — existing FilePreviewModal + MermaidMarkdown onFileClick infrastructure

## Test plan
- Create a task with an image reference (e.g. `assets/screenshot.png`)
- Open task in Web UI → click file reference → should show image in modal
- Create a task with a text file reference → click → should show text preview
- Create a doc with markdown image link → click → should show preview
- Decision with markdown file link → click → should show preview
- Image file reference renders as `<img>` not `<pre>`
- Binary files don't crash the API endpoint

## Modalities
- **WebUI**: Primary — this is a browser-only feature
- **CLI/TUI/MCP/REST**: N/A — file preview is inherently visual
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Image file references (png/jpg/gif/svg/webp/avif) in TaskDetailsModal open a preview showing the image in FilePreviewModal, not broken text
- [ ] #2 Non-image file references continue to show text preview with syntax highlighting in FilePreviewModal
- [ ] #3 Markdown file links in DocumentationDetail.tsx open FilePreviewModal (onFileClick wired)
- [ ] #4 Markdown file links in DecisionDetail.tsx open FilePreviewModal (onFileClick wired)
- [ ] #5 References/documentation file paths in TaskDetailsModal already work (existing, no regression)
- [ ] #6 FilePreviewModal detects image vs text by file extension and renders appropriate view
- [ ] #7 Relative image URLs in rendered markdown resolve to /assets/ path correctly
- [ ] #8 No TypeScript or lint errors
- [ ] #9 bun test passes, bunx tsc --noEmit passes, bun run check . passes
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 Feature implemented (or explicitly N/A with justification) in all 5 access modalities: CLI, TUI, WebUI, MCP, and REST
<!-- DOD:END -->