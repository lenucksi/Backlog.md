import { describe, expect, it } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import type { BacklogConfig, Task } from "../types/index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

const CLI_PATH = process.env.TUI_TEST_CLI_PATH?.trim() || join(process.cwd(), "src", "cli.ts");
const CLI_RUNTIME = process.env.TUI_TEST_CLI_RUNTIME?.trim() ?? "bun";
const TRANSCRIPT_DIR = join(process.cwd(), "tmp", "tui-interactive-transcripts");
const RUN_INTERACTIVE_TUI_TESTS = process.env.RUN_INTERACTIVE_TUI_TESTS === "1";

const canRunShell = process.platform !== "win32" && RUN_INTERACTIVE_TUI_TESTS;

interface InteractiveEditRunOptions {
	scenario: string;
	cliArgs: string[];
	taskTitle: string;
}

interface InteractiveEditRunResult {
	taskContent: string;
	transcriptPath: string;
	editorMarker: string;
	editorInputLog: string;
}

async function runInteractiveEditScenario(options: InteractiveEditRunOptions): Promise<InteractiveEditRunResult> {
	const testDir = createUniqueTestDir(`test-tui-interactive-${options.scenario}`);
	await mkdir(testDir, { recursive: true });
	await mkdir(TRANSCRIPT_DIR, { recursive: true });

	const transcriptPath = join(TRANSCRIPT_DIR, `${options.scenario}-${Date.now()}.log`);
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

	// Use expect to drive the TUI via a real PTY (node-pty is incompatible with Bun)
	// expect creates a proper pseudo-terminal that the TUI can render into
	const editorScript = join(testDir, "test-editor.cjs");
	await writeFile(
		editorScript,
		[
			`const { appendFileSync } = require("node:fs");`,
			"const mf = process.env.TUI_EDITOR_MARKER_FILE;",
			`if (mf) appendFileSync(mf, "started\\n");`,
			"setTimeout(() => process.exit(0), 200);",
		].join("\n"),
	);

	const expectScriptPath = join(testDir, `${options.scenario}.expect`);
	const cliCmd = CLI_RUNTIME.length > 0 ? `${CLI_RUNTIME} ${CLI_PATH}` : CLI_PATH;
	await writeFile(
		expectScriptPath,
		[
			"#!/usr/bin/expect -f",
			"set timeout 20",
			"log_user 0",
			`log_file -a {${transcriptPath}}`,
			"set env(TERM) {xterm-256color}",
			"set env(COLUMNS) {120}",
			"set env(LINES) {40}",
			"set env(NO_COLOR) {1}",
			`set env(EDITOR) {node ${editorScriptPath}}`,
			`set env(TUI_EDITOR_MARKER_FILE) {${editorMarkerPath}}`,
			`set env(TUI_EDITOR_KEY_LOG_FILE) {${editorInputPath}}`,
			`spawn {${cliCmd}} {*}{${options.cliArgs.join("} {")}}`,
			"expect {",
			"	-re {Backlog Board|Tasks} {}",
			"	timeout { exit 91 }",
			"}",
			"sleep 0.5",
			`send -- "E"`,
			"expect {",
			"	-re {__EDITOR_READY__} {}",
			"	timeout { exit 92 }",
			"}",
			`send -- "\\033\\[A"`,
			"sleep 0.2",
			`send -- "q"`,
			"sleep 1.0",
			`send -- "q"`,
			"sleep 2.0",
			`send -- "\\003"`,
			"expect eof",
			"set wait_status [wait]",
			"set exit_code [lindex $wait_status 3]",
			"exit $exit_code",
		].join("\n"),
	);

	const child = Bun.spawn(["expect", "-f", expectScriptPath], {
		cwd: testDir,
		stdout: "pipe",
		stderr: "pipe",
	});
	const stdoutPromise = child.stdout ? new Response(child.stdout).text() : Promise.resolve("");
	const stderrPromise = child.stderr ? new Response(child.stderr).text() : Promise.resolve("");
	const exitCode = await child.exited;
	const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);
	const transcript = await Bun.file(transcriptPath)
		.text()
		.catch(() => "(no transcript captured)");

	try {
		expect([0, 130]).toContain(exitCode);
	} catch (_error) {
		throw new Error(
			`Interactive CLI run failed for ${options.scenario}.\n` +
				`Exit code: ${exitCode}\n` +
				`STDOUT:\n${stdout}\n` +
				`STDERR:\n${stderr}\n` +
				`Transcript: ${transcriptPath}\n` +
				`Transcript contents:\n${transcript}\n`,
		);
	}

	const markerContent = await readFile(editorMarkerPath, "utf8").catch(() => "");
	const editorInputLog = await readFile(editorInputPath, "utf8").catch(() => "");
	const taskContent = await core.getTaskContent("task-1");

	await safeCleanup(testDir);
	return {
		taskContent: taskContent || "",
		transcriptPath,
		editorMarker: markerContent,
		editorInputLog,
	};
}

// Use describe(name, fn) directly — SonarQube recognizes describe + it
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
		expect(result.transcriptPath).toContain("tui-interactive-transcripts");
	});

	it("launches terminal editor from task list view and marks task updated", async () => {
		const result = await runInteractiveEditScenario({
			scenario: "task-list",
			cliArgs: ["task", "list"],
			taskTitle: "Task list interactive editor task",
		});

		expect(result.editorMarker).toContain("started");
		expect(result.taskContent).toContain("Edited by external editor");
		expect(result.transcriptPath).toContain("tui-interactive-transcripts");
	});
});
