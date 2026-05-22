import { describe, expect, it } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import type { BacklogConfig, Task } from "../types/index.ts";
import { term } from "./termless-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

const CLI_PATH = process.env.TUI_TEST_CLI_PATH?.trim() || join(process.cwd(), "src", "cli.ts");
const CLI_RUNTIME = process.env.TUI_TEST_CLI_RUNTIME?.trim() ?? "bun";
const RUN_INTERACTIVE_TUI_TESTS = process.env.RUN_INTERACTIVE_TUI_TESTS === "1";

const canRunShell = process.platform !== "win32" && RUN_INTERACTIVE_TUI_TESTS;

interface InteractiveEditRunOptions {
	scenario: string;
	cliArgs: string[];
	taskTitle: string;
}

interface InteractiveEditRunResult {
	taskContent: string;
	editorMarker: string;
	editorInputLog: string;
}

async function runInteractiveEditScenario(options: InteractiveEditRunOptions): Promise<InteractiveEditRunResult> {
	const testDir = createUniqueTestDir(`test-tui-interactive-${options.scenario}`);
	await mkdir(testDir, { recursive: true });

	const editorMarkerPath = join(testDir, `${options.scenario}-editor-marker.txt`);
	const editorInputPath = join(testDir, `${options.scenario}-editor-input.log`);
	const editorScriptPath = join(testDir, `${options.scenario}-editor.cjs`);

	await writeFile(
		editorScriptPath,
		[
			`const { appendFileSync } = require("node:fs");`,
			"const taskFile = process.argv[2];",
			"const markerFile = process.env.TUI_EDITOR_MARKER_FILE;",
			"const keyLogFile = process.env.TUI_EDITOR_KEY_LOG_FILE;",
			"",
			`if (markerFile) appendFileSync(markerFile, "started\\n");`,
			`if (taskFile) appendFileSync(taskFile, "\\nEdited by external editor\\n");`,
			'process.stdout.write("__EDITOR_READY__\\n");',
			"setTimeout(() => process.exit(0), 200);",
		].join("\n"),
	);

	await $`git init -b main`.cwd(testDir).quiet();
	await $`git config user.email test@example.com`.cwd(testDir).quiet();
	await $`git config user.name "Test User"`.cwd(testDir).quiet();

	const core = new Core(testDir);
	await initializeTestProject(core, `Interactive ${options.scenario}`);

	const config = await core.filesystem.loadConfig();
	if (!config) throw new Error(`Failed to load config for ${options.scenario}`);

	const updatedConfig: BacklogConfig = {
		...config,
		remoteOperations: false,
		checkActiveBranches: false,
		defaultEditor: `node ${editorScriptPath}`,
	};
	await core.filesystem.saveConfig(updatedConfig);

	const task: Task = {
		id: "task-1",
		title: options.taskTitle,
		status: "To Do",
		assignee: [],
		createdDate: "2026-02-11 00:00",
		labels: [],
		dependencies: [],
		description: "TUI interactive editor test",
	};
	await core.createTask(task, false);

	const cliCmd = CLI_RUNTIME.length > 0 ? ["bun", CLI_PATH, ...options.cliArgs] : [CLI_PATH, ...options.cliArgs];

	const t = term(120, 40);
	try {
		await t.spawn(cliCmd, {
			cwd: testDir,
			env: {
				NO_COLOR: "1",
				EDITOR: `node ${editorScriptPath}`,
				TUI_EDITOR_MARKER_FILE: editorMarkerPath,
				TUI_EDITOR_KEY_LOG_FILE: editorInputPath,
			},
		});

		// Board zeigt Spalten-Header "To Do" als sichtbaren Text
		await t.waitFor("To Do", 20000);
		t.press("E");
		await new Promise((r) => setTimeout(r, 500));

		// Editor-Output geht auf main screen (blessed verlässt alt-screen).
		// Vterm.js speichert main-screen output in scrollback, aber getText()
		// zeigt nur visible screen. Warte stattdessen auf editor marker file.
		await new Promise((r) => setTimeout(r, 2000));
		t.press("\u001b[A");
		await new Promise((r) => setTimeout(r, 500));
		t.press("q");
		await new Promise((r) => setTimeout(r, 500));
		t.press("q");
		await new Promise((r) => setTimeout(r, 1000));
	} finally {
		await t.close();
	}

	const markerContent = await readFile(editorMarkerPath, "utf8").catch(() => "");
	const editorInputLog = await readFile(editorInputPath, "utf8").catch(() => "");
	const taskContent = await core.getTaskContent("task-1");

	await safeCleanup(testDir);
	return {
		taskContent: taskContent || "",
		editorMarker: markerContent,
		editorInputLog,
	};
}

if (!canRunShell) {
	console.warn("[tui-interactive] Skipping interactive editor handoff tests. Set RUN_INTERACTIVE_TUI_TESTS=1 on Unix.");
}

(canRunShell ? describe : describe.skip)("interactive TUI editor handoff", () => {
	it("launches terminal editor from board view and marks task updated", async () => {
		const result = await runInteractiveEditScenario({
			scenario: "board",
			cliArgs: ["board"],
			taskTitle: "Board interactive editor task",
		});

		expect(result.editorMarker).toContain("started");
		expect(result.taskContent).toContain("Edited by external editor");
	});

	it("launches terminal editor from task list view and marks task updated", async () => {
		const result = await runInteractiveEditScenario({
			scenario: "task-list",
			cliArgs: ["task", "list"],
			taskTitle: "Task list interactive editor task",
		});

		expect(result.editorMarker).toContain("started");
		expect(result.taskContent).toContain("Edited by external editor");
	});
});
