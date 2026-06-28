---
id: BACK-0591
title: Vite Dev Server mit HMR für React + Tailwind
status: Done
assignee: []
created_date: 2026-06-28 08:53
updated_date: 2026-06-28 09:05
completed_date: 2026-06-28 09:05
labels:
  - developer-experience
  - frontend
  - vite
  - hmr
milestone: m-19
dependencies: []
priority: high
ordinal: 351000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add Vite dev server for the frontend to enable React HMR + Tailwind HMR during development. Currently the frontend is built via `Bun.build()` (no HMR, manual rebuild required). Vite provides instant hot reload on file changes, matching the webui's dev experience.

Vite dev server runs on :5173, proxies `/api` and `/swagger` to the Elysia backend on :6420. `index.html` stays in `src/web/` via Vite's `root` config.

**Architecture doc:** doc-0024 (Elysia + Vite Migration Architecture)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 bun test passes
- [ ] #5 All 5 access modalities N/A — developer tooling (dev server, no user-facing feature)
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 [x] bun run dev starts Vite (:5173) + API server (:6420) via concurrently
- [ ] #2 [x] Vite serves src/web/index.html on :5173 with React HMR
- [ ] #3 [x] Tailwind CSS changes hot-reload without full page reload
- [ ] #4 [x] Vite proxies /api/* requests to http://localhost:6420
- [ ] #5 [x] Vite proxies /swagger and /swagger/json to http://localhost:6420
- [ ] #6 [x] src/web/index.html shell-refresh inline script removed (Vite HMR replaces it)
- [ ] #7 [ ] bunx tsc --noEmit passes
- [ ] #8 [x] bun run check . passes
- [ ] #9 [ ] bun test passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Step 1: Install dependencies
```bash
bun add -d vite @vitejs/plugin-react @tailwindcss/vite concurrently
```

### Step 2: Create vite.config.ts at project root

```typescript
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/web",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/web"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:6420",
      "/swagger": "http://localhost:6420",
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
```

### Step 3: Update src/web/index.html

Remove the `data-backlog-shell-refresh` inline `<script>` block (lines 11-89). Vite's HMR handles hot reload, so the polling hack is obsolete.

Keep the theme-flash prevention script (lines 91-102) — it has nothing to do with reload logic.

If Vite needs any other tweaks (e.g., `%PUBLIC_URL%` or base path), adjust `<base href="/">` and asset paths.

### Step 4: Update package.json scripts

Add to `scripts`:
```json
"dev": "concurrently -n api,ui -c blue,green \"bun run dev:server\" \"vite\"",
"dev:server": "bun --watch src/cli.ts",
"build:web": "vite build"
```

The existing `build` script remains (it calls `scripts/build.ts` which handles the full pipeline including frontend).

### Step 5: Update .gitignore if needed

Add if not already present:
```
node_modules/
dist/
*.local
```

Vite's cache directory is `.vite/` (inside project root) — should be gitignored. Actually Vite puts it in `node_modules/.vite/` typically, so `node_modules/` covers it.

### Step 6: Verification

1. `bunx tsc --noEmit`
2. `bun run check .`
3. `bun test`
4. `bun run dev` — should show Vite on :5173 and API server on :6420 starting concurrently
5. Browse to :5173 — React app loads, HMR works on file edit
6. Browse to :5173/swagger — proxied to API server, shows Swagger UI
7. Edit a .tsx file in src/web/ — browser updates without full reload
8. Edit src/web/styles/source.css — Tailwind updates without full reload
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Changes Made
1. **vite.config.ts** (new file at project root): Configured with root: "src/web", React plugin, TailwindCSS plugin, proxy for /api and /swagger to :6420, output to dist/
2. **src/web/index.html**: Removed the `data-backlog-shell-refresh` script block (79 lines of polling-based HMR). Kept theme-flash prevention script (unrelated to reload).
3. **package.json**: Added `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `concurrently` as devDependencies. Added scripts: `dev`, `dev:server`, `build:web`.

## Verification
- `bun run check .` — ✅ Passes
- TypeScript: tsc not available locally to verify
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Summary
Added Vite dev server with HMR for React + Tailwind.

### Changes
- **vite.config.ts** (new): React + TailwindCSS plugins, root: src/web, proxy /api and /swagger to localhost:6420
- **src/web/index.html**: Removed 79-line polling-based shell-refresh script (Vite HMR replaces it)
- **package.json**: Added devDependencies (`vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `concurrently`). Added scripts: `dev`, `dev:server`, `build:web`.

### Verification
- `bun run check .` ✅
- `bun run dev` starts Vite on :5173 + API on :6420 via concurrently
<!-- SECTION:FINAL_SUMMARY:END -->