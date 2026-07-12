---
name: aislop-usage
description: Use when running aislop scan, interpreting results, or applying suppress directives during implementation or before task finalization. Covers how to scan, suppress inline findings, and what common rules mean.
---

# Aislop Usage & Suppress Directives

## Quick start

```bash
# Full project scan
npx aislop@latest scan

# Scoped scan (faster)
npx aislop@latest scan src/core/

# Changed files only (PR context)
npx aislop@latest scan --changes

# JSON output for machine processing
npx aislop@latest scan --json

# Detailed output with file/rule detail
npx aislop@latest scan -d
```

## Understanding results

Each finding is a `Diagnostic` with: engine, rule, severity (`error`/`warning`/`info`), message, file path, line/column, and a fixable flag.

Six engines run in parallel:

| Engine | What it checks |
|--------|---------------|
| `format` | Code style (Biome, ruff, gofmt, etc.) |
| `lint` | Language issues (oxlint, ruff, clippy, etc.) |
| `code-quality` | Complexity, dead code, duplicate blocks, function/file size limits, nesting |
| `ai-slop` | AI-authored patterns: narrative comments, trivial comments, as any, console.log, TODO stubs, swallowed exceptions, generic names |
| `security` | eval, innerHTML, SQL/shell injection, dep audits |
| `architecture` | Custom import bans, layering rules (opt-in) |

The final score (0–100) weighs sloppy patterns harder than style noise.

## Suppress directives

Silence findings inline where you know better. Directives are only honored in actual comment segments (not inside strings).

### Syntax

```
// aislop-ignore-next-line <rule-name(s)> -- optional reason
// aislop-ignore-line <rule-name(s)>      -- optional reason
// aislop-ignore-file <rule-name(s)>      -- optional reason
```

### Scopes

| Directive | Effect |
|-----------|--------|
| `aislop-ignore-next-line` | Suppresses the diagnostic on the **next** line |
| `aislop-ignore-line` | Suppresses the diagnostic on the **same** line (inline comment) |
| `aislop-ignore-file` | Suppresses the rule for the **entire** file (place anywhere) |

### Rule scoping

- **Full name**: `ai-slop/hidden-fallback`
- **Short name**: `hidden-fallback` (matches any rule ending with `/<short-name>`)
- **Omit rule name**: suppresses **all** rules on that line
- **Multiple rules**: space-separated

### Examples

```typescript
// aislop-ignore-next-line code-quality/duplicate-block -- both files need independent copies
const createServer = () => { ... };

// aislop-ignore-line
export type { DeepPartial, Nullable }; // re-export needed for public API

// aislop-ignore-file code-quality/function-loc
// (place at top of a generated file)
```

### Comment syntax support

Works with all common comment styles:

- `// comment` (JS/TS, Go, Rust, PHP)
- `/* comment */` (JS/TS, CSS, Rust, Go)
- `# comment` (Python, Ruby, YAML, shell)
- `<!-- comment -->` (HTML, JSX)

### How it works under the hood

Aislop scans each line outside string literal delimiters. When it finds a directive comment, it parses the scope (`next-line`, `line`, `file`) and rule names. These are cached per file during a scan run. Suppressed diagnostics are removed before scoring, and the run reports how many were silenced (`suppressedCount`).

Directive regex: `^\s*(?:\/\/|\/\*+|#|<!--|\*)\s*aislop-ignore-(next-line|line|file)\b([^\n]*)`

## When to suppress vs fix

**Fix** (preferred):
- False positives are rare; most findings point to real issues
- Duplicate blocks → extract to shared helper
- Trivial comments → remove the comment
- console.log → use proper logging or remove
- as any → use proper types
- Unused imports/exports → remove them

**Suppress** (acceptable reasons):
- Generated code that you don't control
- Intentional duplication where extraction would harm clarity
- Re-exports for public API surface
- Test fixtures that mirror production types
- Third-party type workarounds with no better option
- When a rule is genuinely wrong for your context (rare — file an issue upstream)

Always add a `-- reason` when suppressing so future readers know *why*.

## Common rules in this project

| Rule | What it catches |
|------|----------------|
| `code-quality/duplicate-block` | Near-identical code blocks (our top priority — part of DoD) |
| `code-quality/function-loc` | Functions exceeding the configured line limit |
| `code-quality/file-loc` | Files exceeding the configured line limit |
| `code-quality/deep-nesting` | Excessively nested control flow |
| `code-quality/unused-file` | Files with no imports (via knip) |
| `ai-slop/narrative-comment` | Comments that restate what the code already says |
| `ai-slop/trivial-comment` | Comments like `// Load config` above `loadConfig()` |
| `ai-slop/console-log` | Console.log left in production code |
| `ai-slop/hidden-fallback` | Silent fallback that hides upstream failures |
| `ai-slop/swallowed-error` | Empty catch blocks or `.catch(() => {})` |
| `ai-slop/as-any` | `as any` type assertions |
| `ai-slop/todo-stub` | TODO/FIXME without a ticket reference |
| `ai-slop/generic-name` | Vague names like `data`, `temp`, `result` |
| `ai-slop/hallucinated-import` | Import that doesn't resolve to a real module |
| `format/*` | Biome/ruff/gofmt style violations |
| `lint/*` | Language-level issues from oxlint/ruff/clippy |
| `security/eval` | `eval()` or equivalent dynamic execution |
| `security/hardcoded-secret` | Potential secrets in source code |

## DoD integration

The project's Definition of Done requires:

- [ ] `npx aislop scan` shows no new `code-quality/duplicate-block` warnings for changed files

Run this before marking any task Done.

## Config reference

Per-rule severity overrides in `.aislop/config.yml`:

```yaml
rules:
  ai-slop/narrative-comment: warning   # demote from error
  ai-slop/trivial-comment: "off"       # drop entirely
  security/hardcoded-secret: error     # promote
```

Path exclusions (same glob semantics as `.gitignore`):

```yaml
exclude:
  - "**/*.test.ts"
  - src/generated
```

CI quality gate:

```yaml
ci:
  failBelow: 80
```
