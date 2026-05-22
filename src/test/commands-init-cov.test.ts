import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";
import { runBacklogCli } from "./commands-cov-helper.ts";

let TEST_DIR: string;

describe("init command coverage", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("init-cov");
		await mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		try { await safeCleanup(TEST_DIR); } catch { /* ignore */ }
	});

	it("init with defaults creates project", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(["init", "InitCoverage", "--defaults", "--integration-mode", "none"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		const core = new Core(TEST_DIR);
		const config = await core.filesystem.loadConfig();
		expect(config?.projectName).toBe("InitCoverage");
	});

	it("init with custom backlog directory", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(
			["init", "CustomDir", "--defaults", "--integration-mode", "none", "--backlog-dir", ".backlog"],
			TEST_DIR,
		);
		expect(r.exitCode).toBe(0);

		const core = new Core(TEST_DIR);
		const config = await core.filesystem.loadConfig();
		expect(config?.projectName).toBe("CustomDir");
	});

	it("init with no-git flag", async () => {
		const r = await runBacklogCli(
			["init", "NoGit", "--defaults", "--integration-mode", "none", "--no-git"],
			TEST_DIR,
		);
		expect(r.exitCode).toBe(0);

		const core = new Core(TEST_DIR);
		const config = await core.filesystem.loadConfig();
		expect(config?.projectName).toBe("NoGit");
	});

	it("init with task prefix", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(
			["init", "Prefixed", "--defaults", "--integration-mode", "none", "--task-prefix", "story"],
			TEST_DIR,
		);
		expect(r.exitCode).toBe(0);

		const core = new Core(TEST_DIR);
		const config = await core.filesystem.loadConfig();
		expect(config?.projectName).toBe("Prefixed");
	});

	it("init rejects invalid task prefix", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(
			["init", "BadPrefix", "--defaults", "--integration-mode", "none", "--task-prefix", "bad-prefix"],
			TEST_DIR,
		);
		expect(r.exitCode).not.toBe(0);
	});

	it("init rejects invalid integration mode", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(
			["init", "BadMode", "--defaults", "--integration-mode", "bogus"],
			TEST_DIR,
		);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("Invalid integration mode");
	});

	it("init in already-initialized project re-inits", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();

		const r1 = await runBacklogCli(["init", "FirstInit", "--defaults", "--integration-mode", "none"], TEST_DIR);
		expect(r1.exitCode).toBe(0);

		const r2 = await runBacklogCli(["init", "SecondInit", "--defaults", "--integration-mode", "none"], TEST_DIR);
		expect(r2.exitCode).toBe(0);

		const core = new Core(TEST_DIR);
		const config = await core.filesystem.loadConfig();
		expect(config?.projectName).toBe("SecondInit");
	});

	it("init with web port", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(
			["init", "WebPortTest", "--defaults", "--integration-mode", "none", "--web-port", "8888"],
			TEST_DIR,
		);
		expect(r.exitCode).toBe(0);

		const core = new Core(TEST_DIR);
		const config = await core.filesystem.loadConfig();
		expect(config?.defaultPort).toBe(8888);
	});

	it("init with auto-open-browser and check-branches", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(
			["init", "AdvOpts", "--defaults", "--integration-mode", "none", "--auto-open-browser", "false", "--check-branches", "true"],
			TEST_DIR,
		);
		expect(r.exitCode).toBe(0);
	});

	it("init with integration mode cli and agent instructions none", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(
			["init", "AgentTest", "--defaults", "--integration-mode", "cli", "--agent-instructions", "none"],
			TEST_DIR,
		);
		expect(r.exitCode).toBe(0);
	});

	it("init with config location root", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(
			["init", "ConfigRoot", "--defaults", "--integration-mode", "none", "--config-location", "root"],
			TEST_DIR,
		);
		expect(r.exitCode).toBe(0);
	});

	it("init rejects invalid backlog directory", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(
			["init", "BadDirPath", "--defaults", "--backlog-dir", "/tmp/bad"],
			TEST_DIR,
		);
		expect(r.exitCode).not.toBe(0);
	});

	it("init with bypass-git-hooks and check-branches false", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(
			["init", "BypassTest", "--defaults", "--integration-mode", "none", "--bypass-git-hooks", "true", "--check-branches", "false"],
			TEST_DIR,
		);
		expect(r.exitCode).toBe(0);
	});

	it("init with zero-padded-ids", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(
			["init", "ZeroPad", "--defaults", "--integration-mode", "none", "--zero-padded-ids", "4"],
			TEST_DIR,
		);
		expect(r.exitCode).toBe(0);

		const core = new Core(TEST_DIR);
		const config = await core.filesystem.loadConfig();
		expect(config?.zeroPaddedIds).toBe(4);
	});

	it("init with default-editor", async () => {
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@test.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Tester`.cwd(TEST_DIR).quiet();
		const r = await runBacklogCli(
			["init", "EditorTest", "--defaults", "--integration-mode", "none", "--default-editor", "vim"],
			TEST_DIR,
		);
		expect(r.exitCode).toBe(0);
	});
});
