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

const canRunInteractive = process.platform !== "win32" && RUN_INTERACTIVE_TUI_TESTS;

interface InteractiveEditRunOptions {
	scenario: string;
	cliArgs: string[];
	taskTitle: string;
	readyPattern: RegExp;
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
			`if (taskFile) appendFileSync(taskFile, "\\nEdited in interactive TUI test\\n");`,
			`process.stdout.write("__EDITOR_READY__\\n");`,
			"setTimeout(() => process.exit(0), 800);",
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

	interface IPty {
		write(data: string): void;
		on(event: "data", cb: (data: string) => void): void;
		on(event: "exit", cb: (code: number) => void): void;
		kill(signal?: string): void;
	}

	const { spawn } = (await import("node-pty")) as {
		spawn: (
			file: string,
			args: string[],
			opts: {
				name: string;
				cols: number;
				rows: number;
				cwd: string;
				env?: Record<string, string | undefined>;
			},
		) => IPty;
	};

	const args = CLI_RUNTIME.length > 0 ? [CLI_PATH, ...options.cliArgs] : options.cliArgs;
	const cmd = CLI_RUNTIME.length > 0 ? CLI_RUNTIME : CLI_PATH;

	const pty: IPty = spawn(cmd, args, {
		name: "xterm-256color",
		cols: 120,
		rows: 40,
		cwd: testDir,
		env: {
			...(process.env as Record<string, string>),
			TERM: "xterm-256color",
			NO_COLOR: "1",
			EDITOR: `node ${editorScriptPath}`,
			TUI_EDITOR_MARKER_FILE: editorMarkerPath,
			TUI_EDITOR_KEY_LOG_FILE: editorInputPath,
		},
	});

	let output = "";
	const outputPromise = new Promise<string>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error("Timeout waiting for pattern")), 20000);
		pty.on("data", (data: string) => {
			output += data;
			if (options.readyPattern.test(output)) {
				clearTimeout(timer);
				resolve(output);
			}
		});
		pty.on("exit", () => {
			clearTimeout(timer);
			reject(new Error("CLI exited before pattern matched"));
		});
	});

	try {
		await outputPromise;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		await writeFile(transcriptPath, output);
		throw new Error(`Interactive CLI run failed for ${options.scenario}: ${msg}\nTranscript: ${transcriptPath}`);
	}

	pty.write("E");
	await new Promise<void>((resolve) => {
		const timer = setTimeout(() => resolve(), 10000);
		pty.on("data", (data: string) => {
			output += data;
			if (data.includes("__EDITOR_READY__")) {
				clearTimeout(timer);
				resolve();
			}
		});
	});

	pty.write("\x1b[A");
	await new Promise((r) => setTimeout(r, 300));
	pty.write("q");
	await new Promise((r) => setTimeout(r, 1000));
	pty.write("q");
	await new Promise((r) => setTimeout(r, 2000));
	pty.kill("SIGTERM");

	await writeFile(transcriptPath, output);

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

if (!canRunInteractive) {
	console.warn("[tui-interactive] Skipping interactive editor handoff tests. Set RUN_INTERACTIVE_TUI_TESTS=1 on Unix.");
}

(canRunInteractive ? describe : describe.skip)("interactive TUI editor handoff", () => {
	it("launches terminal editor from board view and marks task updated", async () => {
		const result = await runInteractiveEditScenario({
			scenario: "board",
			cliArgs: ["board"],
			taskTitle: "Board interactive editor task",
			readyPattern: /Backlog Board/,
		});

		expect(result.editorMarker).toContain("started");
		expect(result.editorInputLog).toContain("DATA:27,91,65");
		expect(result.taskContent).toContain("Edited in interactive TUI test");
		expect(result.transcriptPath).toContain("tui-interactive-transcripts");
	});

	it("launches terminal editor from task list view and marks task updated", async () => {
		const result = await runInteractiveEditScenario({
			scenario: "task-list",
			cliArgs: ["task", "list"],
			taskTitle: "Task list interactive editor task",
			readyPattern: /Tasks/,
		});

		expect(result.editorMarker).toContain("started");
		expect(result.editorInputLog).toContain("DATA:27,91,65");
		expect(result.taskContent).toContain("Edited in interactive TUI test");
		expect(result.transcriptPath).toContain("tui-interactive-transcripts");
	});
});
