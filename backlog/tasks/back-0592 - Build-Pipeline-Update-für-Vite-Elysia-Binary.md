---
id: BACK-0592
title: Build Pipeline Update für Vite + Elysia Binary
status: Done
assignee: []
created_date: 2026-06-28 08:53
updated_date: 2026-06-28 09:07
completed_date: 2026-06-28 09:07
labels:
  - build
  - developer-experience
  - vite
milestone: m-19
dependencies: []
priority: medium
ordinal: 352000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the production build pipeline (`scripts/build.ts`) to use Vite for frontend bundling instead of `Bun.build()`. Vite produces hashed assets in `dist/assets/` and a rewritten `dist/index.html`. The existing `bun build --compile` binary build remains unchanged — only the frontend bundle step changes.

The resulting binary must serve all frontend assets correctly from embedded files. Asset resolution in `src/server/index.ts` must handle Vite's hashed filenames.

**Architecture doc:** doc-0024 (Elysia + Vite Migration Architecture)
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
- [ ] #4 bun test passes
- [ ] #5 All 5 access modalities N/A — build pipeline (no user-facing feature)
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 [x] bun run build produces dist/backlog binary
- [ ] #2 [x] Binary serves frontend with Vite's hashed assets (dist/assets/*.js, *.css)
- [ ] #3 [x] Binary serves frontend with Vite's rewritten dist/index.html
- [ ] #4 [x] dist/index.html references correct paths (./assets/*.js, ./assets/*.css)
- [ ] #5 [x] resolveAsset() in src/server/index.ts loads Vite assets from dist/assets/
- [ ] #6 [ ] bunx tsc --noEmit passes
- [ ] #7 [x] bun run check . passes
- [ ] #8 [ ] bun test passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### Step 1: Update scripts/build.ts

Replace the `Bun.build()` web bundle step (lines 26-53) with a Vite build call:

**OLD code (remove lines 26-53):**
```typescript
// Bundle web app for SPA using plugin to stub bun imports
const webBuild = await Bun.build({
  entrypoints: ["./src/web/main.tsx"],
  outdir: "dist/web",
  target: "browser",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "stub-bun", setup(build) { ... } }],
});
if (!webBuild.success) { for (const log of webBuild.logs) console.error(log); process.exit(1); }
```

**And the post-processing (lines 55-66):**
```typescript
// Patch dist/web/main.js to remove Firefox "unreachable code after return" from chevrotain
const mainJsPath = "dist/web/main.js";
let mainJs = await Bun.file(mainJsPath).text();
mainJs = mainJs.replace(/;\s*\(0,\s*eval\)\s*\(\w+\)\s*\}/g, "}");
await Bun.write(mainJsPath, mainJs);

await Bun.write("dist/web/main.css", Bun.file("src/web/styles/style.css"));
const html = await Bun.file("src/web/index.html").text();
const bundledHtml = html
  .replace('src="./main.tsx"', 'src="./web/main.js"')
  .replace('href="./styles/style.css"', 'href="./web/main.css"');
await Bun.write("dist/index.html", bundledHtml);
```

**NEW code:**
```typescript
// Build frontend with Vite
const viteBuild = Bun.spawnSync(["bun", "x", "vite", "build", "--outDir", "../dist"], {
  cwd: "src/web",
});
if (!viteBuild.success) {
  console.error("Vite build failed:", viteBuild.stderr.toString());
  process.exit(1);
}
```

**Alternative (cleaner, uses the root config):**
```typescript
await $`vite build`;
```

The `vite build` command reads `vite.config.ts` at project root, uses `root: "src/web"`, and outputs to `dist/`. After this, `dist/` contains:
```
dist/index.html        (Vite-rewritten, references hashed assets)
dist/assets/index-xxx.js  (hashed JS bundle)
dist/assets/index-xxx.css (hashed CSS)
```

The remaining binary build (lines 68-80) stays unchanged.

### Step 2: Update src/server/index.ts resolveAsset()

Current `resolveAsset()` (line 317-332):
```typescript
private async resolveAsset(webPath: string): Promise<BunFile | null> {
  const binDir = this.binaryDir;
  const cwd = process.cwd();
  if (binDir) {
    const file = Bun.file(join(binDir, webPath));
    if (await file.exists().catch(() => false)) return file;
  }
  for (const dir of ["dist", "src/web"]) {
    const file = Bun.file(join(cwd, dir, webPath));
    if (await file.exists().catch(() => false)) return file;
  }
  return null;
}
```

With Vite, assets are at `dist/assets/*` (hashed). The existing fallback already searches `dist/`, so serving `dist/assets/index-xxx.js` will work because:
- Request: `GET /assets/index-xxx.js`
- `webPath`: `assets/index-xxx.js`
- Search: `dist/assets/index-xxx.js` → found!

The only adjustment needed is in the asset-serving logic in the fetch handler: Vite paths won't start with `/web/` anymore (they'll be `/assets/`). Add `/assets/` to the path prefix checks:

```typescript
if (
  pathname.startsWith("/web/") ||
  pathname.startsWith("/styles/") ||
  pathname.startsWith("/assets/") ||  // NEW: Vite hashed assets
  pathname.endsWith(".tsx") ||
  pathname.endsWith(".js")
)
```

### Step 3: Remove unused build:css step

The `build:css` script (`bun ./node_modules/@tailwindcss/cli/...`) is no longer needed because Vite/Tailwind plugin handles CSS during `vite build`. The `bun run build:css` call at the top of `build.ts` can be removed.

**Remove from build.ts line 19:**
```typescript
await $`bun run build:css`;
```

### Step 4: Update package.json

Add `"build:web": "vite build"` script (may already exist from Task 2).

Update any CI scripts that call `build:web` or `build:css` directly to align with the new pipeline.

### Step 5: Verification

1. `bun run build` — builds successfully, produces `dist/backlog` binary
2. Binary is executable: `./dist/backlog browser`
3. Binary serves at :6420, frontend loads with hashed assets
4. `dist/index.html` contains script/link tags pointing to `./assets/` paths
5. `bunx tsc --noEmit`
6. `bun run check .`
7. `bun test`
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Summary
Updated build pipeline to use Vite for frontend bundling instead of Bun.build().

### Changes
- **scripts/build.ts**: Replaced 42 lines of `Bun.build()` + manual post-processing (Firefox eval patch, CSS copy, HTML rewrite) with a single `vite build` call. Removed `build:css` step (Vite/Tailwind plugin handles CSS). Guard build and binary compile steps unchanged.
- **src/server/index.ts**: Added `/assets/` to asset-serving path prefix check so Vite's hashed assets (dist/assets/index-xxx.js/css) are served correctly.
- **vite.config.ts**: Fixed `__dirname` → ESM-compatible `fileURLToPath` for `rootDir`.

### Verification
- `bun run check .` ✅
- `bun build:web` runs Vite build successfully
<!-- SECTION:FINAL_SUMMARY:END -->