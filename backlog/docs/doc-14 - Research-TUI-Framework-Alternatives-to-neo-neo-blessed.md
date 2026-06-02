---
id: doc-14
title: "Research: TUI Framework Alternatives to neo-neo-blessed"
type: other
created_date: 2026-06-02 18:38
---
# Research: TUI Framework Alternatives to neo-neo-blessed

Date: 2026-06-02

## Context

Backlog.md uses `neo-neo-bblessed` v1.0.9 (MrLesk fork of blessed) for its TUI layer.
5 CI tests fail because blessed Screen/widget creation requires a real TTY, which GitHub Actions runners don't provide.
This research evaluates modern alternatives.

## Current Situation

| Package | Version | Source | Notes |
|---------|---------|--------|-------|
| `neo-neo-bblessed` | 1.0.9 | https://github.com/MrLesk/neo-neo-blessed | MrLesk fork, 6 commits ahead of upstream eirikb |
| `@termless/core` | ^0.6.0 | https://github.com/beorn/termless | Already used for PTY testing |
| `vterm.js` | ^0.4.0 | — | Terminal emulator for tests |

### MrLesk fork vs upstream eirikb

6 extra commits (all additive, no core widget changes):
1. 992a869 — Update readme
2. 83ce640 — Allow delete and backspace in textbox
3. 74c8669 — Add ignoreKeys filter to textBox
4. 2084f09 — export textbox and textarea
5. 7bb60a0 — Re-export core factories as named ESM exports
6. a1a7aa0 — CI: manual publish + skip upstream CI

## Candidate: Silvery

**Author**: Bjorn Stabell (same as `@termless/core`)
**Website**: https://silvery.dev
**GitHub**: https://github.com/beorn/silvery
**npm**: `silvery`

### Status

- Latest version: v0.19.2 (2026-04-20)
- Weekly downloads: ~340
- GitHub stars: ~10
- Active development: Yes (36 releases in 3 months)
- License: MIT

### Architecture

| Aspect | blessed | Silvery |
|--------|---------|---------|
| Paradigm | Imperative (widgets, events, screen.render()) | Declarative (React/JSX, flexbox, incremental rendering) |
| Layout | Absolute coordinates | CSS Flexbox (Flexily engine, W3C spec) |
| Rendering | Full re-render | Per-node dirty tracking, cell-level buffer diff |
| Terminal | Basic terminfo | Modern: Kitty keyboard protocol, truecolor, OSC 8, Sixel, synchronized output |
| Testing | Manual | Native Termless integration, `@silvery/test` locators |
| Components | ~40 built-in | 45+ (SelectList, CommandPalette, ModalDialog, Toast, SplitView, etc.) |
| Theme | Manual styling | 84 color schemes, semantic tokens |
| TypeScript | Partial | First-class, strict |
| Focus system | Manual | Tree-based focus scopes, spatial nav, modal trapping |
| Plugin system | None | `withCommands()`, `withKeybindings()`, `withDomEvents()` |

### Ecosystem packages

| Package | Purpose |
|---------|---------|
| `silvery` | Main framework (components, hooks, renderer) |
| `@silvery/ink` | Ink compatibility layer (98.6% test pass rate) |
| `@silvery/chalk` | Chalk compatibility layer (100%) |
| `@silvery/test` | Testing utilities (locators, virtual renderer) |
| `@silvery/create` | App composition via `pipe()` providers |
| `@silvery/theme` | 84 color schemes, semantic tokens |
| `@silvery/commander` | CLI help rendering through Silvery |
| `@silvery/headless` | Pure state machines (no React) |
| `@silvery/ansi` | Terminal primitives |
| `@silvery/ag-react` | React reconciler internals |
| `@silvery/ag-term` | Terminal rendering pipeline |

### Migration effort: 4-8 weeks

1. Inventory all blessed widgets/screen methods/keybindings/events — 1-2d
2. Architecture design (React component tree, state management) — 3-5d
3. Screen wrapper replacement — 2-3d
4. Widget-by-widget conversion — 2-4w
5. Event system migration — 3-5d
6. Layout recalculation (blessed coordinates → flexbox) — 3-5d
7. Test migration — 3-5d
8. Theme migration — 1-2d
9. Integration testing — 3-5d
10. Polish — 3-5d

Blessed and Silvery cannot coexist (both take over terminal). Migration is all-or-nothing for the TUI layer.

### Pros

- Modern declarative architecture (React components, flexbox layout)
- Incremental rendering (cell-level dirty tracking) — better performance
- 45+ ready-made components
- Native Termless integration (already using @termless/core for testing)
- Same author as Termless — deep compatibility
- Fully typed TypeScript
- Modern terminal support (Kitty keyboard protocol, truecolor, hyperlinks)
- Theme system with 84 color schemes
- Active development (36 releases in 3 months)
- First-class Bun support
- Ink compatible (98.6% of Ink tests pass)

### Cons

- pre-1.0 (v0.19.x), solo developer, ~10 stars, 340 weekly downloads
- Risk of breaking changes or abandonment
- Minimal community, limited Stack Overflow/tutorials
- Terminal coverage focused on modern terminals (Kitty, Ghostty, WezTerm, iTerm2)
- Massive migration effort (4-8 weeks) with no immediate user-facing value
- Some blessed features missing (Terminal widget, Video, ANSIImage, OverlayImage, BigText)
- Learning curve for team (React TUI patterns, flexbox, Silvery plugin architecture)

## Other alternatives considered

| Library | Status | Verdict |
|---------|--------|---------|
| **Ink** (Vercel, 35.6k stars) | Mature but limited (~4 primitives, no mouse, full re-render) | Silvery is 98.6% Ink-compatible anyway |
| **Glyph** (Semos Labs, 46 stars) | v0.2.10, very early | Too early, no Termless integration |
| **TermUI** (Arindam200) | Brand new, not on npm | Extremely early, built on Ink |
| **OpenTUI** (9.4k stars) | TypeScript+Zig, React reconcilers | Requires Zig build step, overkill |

## Assessment for Backlog.md

- A migration to Silvery does NOT solve the immediate CI problem (5 tests failing without TTY) — the same TTY issue exists in Silvery.
- The practical path is: skip the 5 blessed-dependent tests in CI, and evaluate Silvery as a long-term TUI modernization.
- If migrating, Silvery is the clear winner because: same ecosystem as @termless/core (already used), same author, Ink compatibility for fallback, React-based (already used in WebUI).