# Self-Healing: Backlog Guard — Tool-Name-Erkennung

## 0. Data acquisition

Run `bun test test/selfhealing/backlog-guard/guard-access.test.ts 2>&1` and capture the failure.
Read the test file to understand what it expects.
Read `hooks/backlog-guard/guard-core.ts` to understand the `evaluate()` function.

## CRITICAL RULE — Nutze LSP-Tools zur Diagnose

Du MUSST `document_symbols` auf `guard-core.ts` aufrufen, um die `evaluate`-Funktion zu finden.
Ohne LSP-Tool-Call gilt der Test als FAILED, auch wenn der Fix stimmt.

## 1. Diagnose

Der Test ruft `evaluate()` mit `tool: "reed"` auf, aber `evaluate` in `guard-core.ts` prüft auf exakte Tool-Namen:
- `toolLower === "read"` für `Read`
- `toolLower === "edit"` für `Edit`
- `toolLower === "write"` für `Write`
- `toolLower === "grep"` für `Grep`
- `toolLower === "bash"` für `Bash`

"reed" matched keinen dieser Checks → `blocked: false`.

## 2. Fix

Edit `test/selfhealing/backlog-guard/guard-access.test.ts`:
- Ändere `tool: "reed"` → `tool: "Read"` (Großschreibung beachten — `evaluate` matched via `tool.toLowerCase()` also geht "Read" oder "read")

## 3. Verify

Run `bun test test/selfhealing/backlog-guard/guard-access.test.ts` — es muss pass.

## 4. Output

Your response MUST end with EXACTLY one of these two lines:

```
✅ PASS — fixed tool name from "reed" to "Read"
```
OR
```
❌ FAIL — describe why the fix didn't work
```
