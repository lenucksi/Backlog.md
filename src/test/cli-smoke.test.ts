import { afterEach, describe, expect, it } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Core } from "../core/backlog.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

const CLI_PATH = join(process.cwd(), "src", "cli.ts");

function runCLI(args: string[], cwd: string, timeoutMs = 10000): Promise<string> {
	return new Promise((resolve, reject) => {
		const proc = Bun.spawn(["bun", CLI_PATH, ...args], {
			cwd,
			env: { ...process.env, NO_COLOR: "1" },
		});
		const timer = setTimeout(() => {
			proc.kill();
			reject(new Error(`Timeout after ${timeoutMs}ms`));
		}, timeoutMs);
		Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()])
			.then(([stdout, stderr]) => {
				clearTimeout(timer);
				const output = stdout + stderr;
				resolve(output);
			})
			.catch((e) => {
				clearTimeout(timer);
				reject(e);
			});
	});
}

describe("CLI smoke tests", () => {
	it("--help shows usage", async () => {
		const output = await runCLI(["--help"], process.cwd());
		expect(output).toMatch(/Usage:|Commands:|Options:/);
	});

	it("--version shows version", async () => {
		const output = await runCLI(["--version"], process.cwd());
		expect(output).toMatch(/\d+\.\d+\.\d+/);
	});
});

describe("CLI project commands", () => {
	let testDir: string;

	afterEach(async () => {
		try {
			await safeCleanup(testDir);
		} catch {}
	});

	it("task list shows empty state", async () => {
		testDir = createUniqueTestDir("cli-test-task-list");
		await mkdir(testDir, { recursive: true });
		const core = new Core(testDir);
		await initializeTestProject(core, "CLI Task List Test");

		const output = await runCLI(["task", "list"], testDir);
		expect(output).toBeTruthy();
	});

	it("task create and list", async () => {
		testDir = createUniqueTestDir("cli-test-task-create");
		await mkdir(testDir, { recursive: true });
		const core = new Core(testDir);
		await initializeTestProject(core, "CLI Task Create");

		const createOutput = await runCLI(
			["task", "create", "Smoke test task", "-d", "created during smoke test"],
			testDir,
		);
		expect(createOutput).toBeTruthy();

		const listOutput = await runCLI(["task", "list"], testDir);
		expect(listOutput).toContain("Smoke test task");
	});

	it("doc create and list", async () => {
		testDir = createUniqueTestDir("cli-test-doc");
		await mkdir(testDir, { recursive: true });
		const core = new Core(testDir);
		await initializeTestProject(core, "CLI Doc Test");

		const createOutput = await runCLI(["doc", "create", "Smoke test doc"], testDir);
		expect(createOutput).toBeTruthy();

		const listOutput = await runCLI(["doc", "list"], testDir);
		expect(listOutput).toContain("Smoke test doc");
	});

	it("milestone list runs without error", async () => {
		testDir = createUniqueTestDir("cli-test-milestone");
		await mkdir(testDir, { recursive: true });
		const core = new Core(testDir);
		await initializeTestProject(core, "CLI Milestone Test");

		const output = await runCLI(["milestones", "list"], testDir);
		expect(output).toBeTruthy();
	});

	it("search finds created task", async () => {
		testDir = createUniqueTestDir("cli-test-search");
		await mkdir(testDir, { recursive: true });
		const core = new Core(testDir);
		await initializeTestProject(core, "CLI Search Test");

		await runCLI(["task", "create", "Searchable task", "-d", "find me"], testDir);
		const searchOutput = await runCLI(["search", "Searchable"], testDir);
		expect(searchOutput).toContain("Searchable task");
	});

	it("config list shows configuration", async () => {
		testDir = createUniqueTestDir("cli-test-config");
		await mkdir(testDir, { recursive: true });
		const core = new Core(testDir);
		await initializeTestProject(core, "CLI Config Test");

		const output = await runCLI(["config", "list"], testDir);
		expect(output).toBeTruthy();
		expect(output).toContain("project_name");
	});
});
