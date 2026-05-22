import { describe, it, expect } from "bun:test";
import { createTerminal } from "@termless/core";
import { createVtermBackend } from "./vterm-backend.ts";
import { mkdirSync } from "node:fs";
import { $ } from "bun";
import { join } from "node:path";
import { Core } from "../core/backlog.ts";
import { initializeTestProject, createUniqueTestDir } from "./test-utils.ts";

describe("vterm.js backend for termless", () => {
	it("processes text and exposes cells", () => {
		const backend = createVtermBackend({ cols: 80, rows: 24 });
		const term = createTerminal({ backend, cols: 80, rows: 24 });

		term.feed("Hello \x1b[1mWorld\x1b[0m");

		expect(term.screen.getText()).toContain("Hello World");
		expect(term.cell(0, 6).bold).toBe(true);
		expect(term.cell(0, 0).char).toBe("H");

		term.close();
	});

	it("detects alt screen mode", () => {
		const backend = createVtermBackend({ cols: 80, rows: 24 });
		const term = createTerminal({ backend, cols: 80, rows: 24 });

		expect(term.getMode("altScreen")).toBe(false);

		// Enter alternate screen
		term.feed("\x1b[?1049h");
		expect(term.getMode("altScreen")).toBe(true);

		// Exit alternate screen
		term.feed("\x1b[?1049l");
		expect(term.getMode("altScreen")).toBe(false);

		term.close();
	});

	it("spawns CLI --plain and reads output", async () => {
		const backend = createVtermBackend({ cols: 120, rows: 40 });
		const term = createTerminal({ backend, cols: 120, rows: 40 });

		await term.spawn(["bun", "src/cli.ts", "--plain"]);

		let found = false;
		for (let i = 0; i < 50; i++) {
			if (term.screen.getText().includes("Backlog")) {
				found = true;
				break;
			}
			await new Promise((r) => setTimeout(r, 200));
		}
		expect(found).toBe(true);

		await term.close();
	});

	it("spawns blessed TUI board and renders content", async () => {
		const testDir = createUniqueTestDir("vterm-board");
		mkdirSync(testDir, { recursive: true });

		// Initialize a backlog project
		await $`git init -b main`.cwd(testDir).quiet();
		await $`git config user.email test@example.com`.cwd(testDir).quiet();
		await $`git config user.name Test`.cwd(testDir).quiet();
		const core = new Core(testDir);
		await initializeTestProject(core, "Vterm board test");
		await core.createTask({ id: "task-1", title: "Test task", status: "To Do", assignee: [], createdDate: "2026-05-22", labels: [], dependencies: [], description: "" }, false);

		const backend = createVtermBackend({ cols: 120, rows: 40 });
		const term = createTerminal({ backend, cols: 120, rows: 40 });

		await term.spawn(["bun", join(process.cwd(), "src", "cli.ts"), "board"], {
			cwd: testDir,
			env: { NO_COLOR: "1" },
		});

		// Wait for blessed to render the board
		let found = false;
		for (let i = 0; i < 50; i++) {
			const text = term.screen.getText();
			if (text.includes("To Do")) {
				found = true;
				break;
			}
			await new Promise((r) => setTimeout(r, 200));
		}

		console.log("Board output:", JSON.stringify(term.screen.getText().substring(0, 500)));
		console.log("Alt screen:", term.getMode("altScreen"));
		console.log("Alive:", term.alive);
		expect(found).toBe(true);

		term.press("q");
		await new Promise((r) => setTimeout(r, 500));
		await term.close();
	});
});
