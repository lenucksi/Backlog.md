---
id: doc-12
title: 'ADR: Bun 1.3.x `--target` Regression & Dependency Modernisierung'
type: specification
created_date: '2026-05-24 16:02'
tags:
  - bun
  - build
  - dependencies
  - adr
  - ci
---
# ADR: Bun 1.3.x `--target` Regression & Dependency Modernisierung

## Status

Accepted (2026-05-24)

## Context

### Das Problem

`bun build --compile --target=bun ...` funktionierte in bun 1.2.x einwandfrei. In bun 1.3.x (getestet 1.3.11 und 1.3.14) wird das `--target` Flag **komplett ignoriert** — egal ob `--target=bun`, `--target=bun-linux-x64-baseline`, `--target=node` oder via API `Bun.build({ target: "bun" })`. 

Das führt zu "Browser build cannot require() Node.js builtin" Fehlern für:
- `import { $ } from "bun"` im eigenen Source-Code
- `require('fs')`, `require('path')`, `require('assert')` in CJS npm-Packages

### Warum die grüne CI damals lief

Der letzte grüne CI-Run (Commit `6a4efac`) hatte `BUN_VERSION: 1.3.11` im Env. Allerdings installed `oven-sh/setup-bun@v2.2.0` vermutlich eine andere Version als `1.3.11` (Fallback auf latest stable = 1.2.x), da die Action von Juni 2024 die bun 1.3.x Releases von Mai 2026 nicht kannte. Die CI hat also **de facto mit bun 1.2.x gebaut**.

Beweis: Nach dem Fix auf `BUN_VERSION: 1.2.4` explodiert nix.

### Dependency-Verschlimmbesserung

Zwischen dem grünen CI und HEAD wurde `bun.lock` durch `bun install` mit bun 1.3.x neu generiert. Dabei wurden transitive CJS-Dependencies (`graceful-fs`, `proper-lockfile`, `gray-matter`) von nested in eine flat Struktur gelegt. Bun 1.3.x kann CJS `require()` für Node builtins in flachen node_modules nicht mehr auflösen.

## Entscheidung

### 1. Alte CJS-Packages durch Inline-Utilities ersetzen

| Package | Version | Problem | Ersatz |
|---------|---------|---------|--------|
| `gray-matter` | 4.0.3 (2019) | CJS `require('fs')` | `src/utils/frontmatter.ts` + `yaml` (bereits dep) |
| `proper-lockfile` | 4.1.2 (2020) | CJS `require('path')`, dep: `graceful-fs` | `src/utils/file-lock.ts` via `mkdir()` atomic lock |
| `graceful-fs` | 4.2.11 (2022) | CJS `require('assert')` | Entfernt (transitiv) |

### 2. `--external bun` für Build

Da `import { $ } from "bun"` in 1.3.x nicht mehr als Builtin erkannt wird, wird `bun` als extern deklariert. Im compiled Binary ist bun als Runtime ohnehin verfügbar.

### 3. Platform-spezifische Targets

Statt `--target=bun` (generisch) werden platform-spezifische Targets verwendet: `bun-linux-x64-baseline`, `bun-darwin-x64`, `bun-windows-x64-baseline`. Diese werden via `scripts/build.ts` automatisch erkannt.

## Konsequenzen

### Positiv

- Build funktioniert mit bun 1.2.x UND 1.3.x
- Zwei veraltete CJS-Dependencies eliminiert (Weniger Angriffsfläche, schnellere Installationen)
- Eigenes File-Locking ohne externe Abhängigkeit
- Eigenes Frontmatter-Parsing ohne gray-matter (nutzt nur `yaml`, das ohnehin dep ist)

### Zu beachten

- **`Bun.build({ compile: true, outfile })` API ist broken** — der `outfile` Parameter wird ignoriert. Das Binary landet stattdessen unter `<entrypoint-name>` (ohne Extension). Deshalb nutzt `scripts/build.ts` die CLI (`bun build --outfile=...`) statt der API.
- **`bun install` mit bun 1.3.x generiert `bun.lock` in flat Struktur** — das kann alte CJS-Packages anders auflösen als 1.2.x. Bei Dep-Wechseln besser mit bun 1.2.4 `bun install` laufen lassen.
- **Bun's CJS-require Unterstützung ist fragil** — Packages die `require('fs')` / `require('path')` etc. verwenden können beim Compile-Schritt Probleme machen. Bei neuen Dependencies auf ESM achten.
- **Platform-spezifische Targets sind mandatory** — `--target=bun` wird in 1.3.x nicht mehr richtig unterstützt. CI und Build-Script nutzen `bun-linux-x64-baseline` etc.
