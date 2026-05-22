/**
 * termless helper for bun:test.
 *
 * Uses vterm.js as the terminal backend (100% terminfo.dev coverage, pure TS, zero deps)
 * with @termless/core for the Terminal API, PTY spawn, region views, and matchers.
 *
 * vterm.js correctly handles DA1/DA2/DSR queries — essential for blessed TUI support
 * (unlike @termless/xtermjs which has incomplete DA1 responses and monorepo packaging issues).
 *
 * termlessMatchers are registered once via expect.extend on first import.
 *
 * Usage:
 *   import { term } from "./termless-helper"
 *
 *   test("cell styles", () => {
 *     const t = term(80, 24);
 *     t.feed("Hello \x1b[1mWorld\x1b[0m");
 *     expect(t.screen).toContainText("Hello World");
 *     expect(t.cell(0, 6).bold).toBe(true);
 *     t.close();
 *   });
 *
 *   test("blessed TUI", async () => {
 *     const t = term(120, 40);
 *     await t.spawn(["bun", "src/cli.ts", "board"]);
 *     await t.waitFor("To Do", 10000);
 *     expect(t.getMode("altScreen")).toBe(true);
 *     t.press("q");
 *     await t.close();
 *   });
 */

import { createTerminal, termlessMatchers } from "@termless/core";
import { createVtermBackend } from "./vterm-backend.ts";

try {
	expect.extend(termlessMatchers);
} catch {
	// not in a test context
}

export { createTerminal, createVtermBackend };

export function term(cols = 80, rows = 24) {
	return createTerminal({ backend: createVtermBackend({ cols, rows }), cols, rows });
}
