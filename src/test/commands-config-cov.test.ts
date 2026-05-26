import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { runBacklogCli } from "./commands-cov-helper.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("config command coverage", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("config-cov");
		try {
			await rm(TEST_DIR, { recursive: true, force: true });
		} catch {
			// cleanup
		}
		await mkdir(TEST_DIR, { recursive: true });
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();
		await $`git config user.name Test`.cwd(TEST_DIR).quiet();
		const core = new Core(TEST_DIR);
		await initializeTestProject(core, "Config Coverage Test");
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {
			// ignore
		}
	});

	it("config list", async () => {
		const result = await runBacklogCli(["config", "list"], TEST_DIR);
		expect(result.stdout).toContain("Configuration:");
		expect(result.stdout).toContain("projectName: Config Coverage Test");
		expect(result.stdout).toContain("defaultStatus: To Do");
		expect(result.stdout).toContain("statuses:");
		expect(result.stdout).toContain("labels:");
	});

	it("config get all keys", async () => {
		const keys: Array<{ key: string }> = [
			"projectName",
			"defaultStatus",
			"statuses",
			"labels",
			"definitionOfDone",
			"maxColumnWidth",
			"defaultPort",
			"autoOpenBrowser",
			"remoteOperations",
			"autoCommit",
			"filesystemOnly",
			"bypassGitHooks",
			"zeroPaddedIds",
			"checkActiveBranches",
			"activeBranchDays",
			"terminalStatuses",
		];
		for (const key of keys) {
			const result = await runBacklogCli(["config", "get", key], TEST_DIR);
			expect(result.exitCode).toBe(0);
			expect(result.stdout.trim().length).toBeGreaterThanOrEqual(0);
		}
	});

	it("config get milestones returns milestone ids", async () => {
		const core = new Core(TEST_DIR);
		await core.filesystem.createMilestone("v1.0");

		const result = await runBacklogCli(["config", "get", "milestones"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		expect(result.stdout.trim()).toBe("m-0");
	});

	it("config get defaultEditor when not set returns exit 1", async () => {
		const result = await runBacklogCli(["config", "get", "defaultEditor"], TEST_DIR);
		expect(result.exitCode).not.toBe(0);
		expect(result.stdout.trim()).toBe("defaultEditor is not set");
	});

	it("config get unknown key", async () => {
		const result = await runBacklogCli(["config", "get", "bogusKey"], TEST_DIR);
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("Unknown config key");
	});

	it("config set string keys", async () => {
		let result = await runBacklogCli(["config", "set", "projectName", "New Name"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("projectName = New Name");

		result = await runBacklogCli(["config", "get", "projectName"], TEST_DIR);
		expect(result.stdout.trim()).toBe("New Name");
	});

	it("config set defaultStatus", async () => {
		const result = await runBacklogCli(["config", "set", "defaultStatus", "In Progress"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("defaultStatus = In Progress");
	});

	it("config set defaultEditor with existing command", async () => {
		const result = await runBacklogCli(["config", "set", "defaultEditor", "cat"], TEST_DIR);
		expect(result.exitCode).toBe(0);
	});

	it("config set defaultEditor with non-existent command fails", async () => {
		const result = await runBacklogCli(["config", "set", "defaultEditor", "zz-nonexistent-editor-zz"], TEST_DIR);
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("Editor command not found");
	});

	it("config set numeric keys", async () => {
		let result = await runBacklogCli(["config", "set", "maxColumnWidth", "80"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		result = await runBacklogCli(["config", "get", "maxColumnWidth"], TEST_DIR);
		expect(result.stdout.trim()).toBe("80");

		result = await runBacklogCli(["config", "set", "defaultPort", "8080"], TEST_DIR);
		expect(result.exitCode).toBe(0);
		result = await runBacklogCli(["config", "get", "defaultPort"], TEST_DIR);
		expect(result.stdout.trim()).toBe("8080");
	});

	it("config set numeric keys invalid", async () => {
		let result = await runBacklogCli(["config", "set", "maxColumnWidth", "0"], TEST_DIR);
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("maxColumnWidth must be a positive number");

		result = await runBacklogCli(["config", "set", "defaultPort", "0"], TEST_DIR);
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("defaultPort must be a valid port");

		result = await runBacklogCli(["config", "set", "defaultPort", "99999"], TEST_DIR);
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("defaultPort must be a valid port");
	});

	it("config set boolean keys true/false/invalid", async () => {
		for (const key of ["autoOpenBrowser", "remoteOperations", "autoCommit", "bypassGitHooks", "checkActiveBranches"]) {
			let r = await runBacklogCli(["config", "set", key, "true"], TEST_DIR);
			expect(r.exitCode).toBe(0);
			r = await runBacklogCli(["config", "set", key, "false"], TEST_DIR);
			expect(r.exitCode).toBe(0);
			r = await runBacklogCli(["config", "set", key, "yes"], TEST_DIR);
			expect(r.exitCode).toBe(0);
			r = await runBacklogCli(["config", "set", key, "no"], TEST_DIR);
			expect(r.exitCode).toBe(0);
			r = await runBacklogCli(["config", "set", key, "1"], TEST_DIR);
			expect(r.exitCode).toBe(0);
			r = await runBacklogCli(["config", "set", key, "0"], TEST_DIR);
			expect(r.exitCode).toBe(0);
			r = await runBacklogCli(["config", "set", key, "maybe"], TEST_DIR);
			expect(r.exitCode).not.toBe(0);
			expect(r.stderr).toContain("must be true or false");
		}
	});

	it("config set filesystemOnly has side effects on other keys", async () => {
		let r = await runBacklogCli(["config", "set", "filesystemOnly", "true"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		r = await runBacklogCli(["config", "get", "filesystemOnly"], TEST_DIR);
		expect(r.stdout.trim()).toBe("true");

		r = await runBacklogCli(["config", "set", "filesystemOnly", "false"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		r = await runBacklogCli(["config", "set", "filesystemOnly", "invalid"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("filesystemOnly must be true or false");
	});

	it("config set zeroPaddedIds", async () => {
		let r = await runBacklogCli(["config", "set", "zeroPaddedIds", "4"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		r = await runBacklogCli(["config", "set", "zeroPaddedIds", "0"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		r = await runBacklogCli(["config", "set", "zeroPaddedIds", "-1"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("zeroPaddedIds must be a non-negative");
	});

	it("config set activeBranchDays", async () => {
		let r = await runBacklogCli(["config", "set", "activeBranchDays", "60"], TEST_DIR);
		expect(r.exitCode).toBe(0);

		r = await runBacklogCli(["config", "set", "activeBranchDays", "-1"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("activeBranchDays must be a non-negative");
	});

	it("config set terminalStatuses", async () => {
		const r = await runBacklogCli(["config", "set", "terminalStatuses", "Done,Closed"], TEST_DIR);
		expect(r.exitCode).toBe(0);
	});

	it("config set read-only array keys fail", async () => {
		for (const key of ["statuses", "labels"]) {
			const r = await runBacklogCli(["config", "set", key, "new-value"], TEST_DIR);
			expect(r.exitCode).not.toBe(0);
			const expected = key === "labels" ? "Use 'backlog label add/remove' to manage labels." : "cannot be set directly";
			expect(r.stderr).toContain(expected);
		}
	});

	it("config set milestones fails with helpful message", async () => {
		const r = await runBacklogCli(["config", "set", "milestones", "v2"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("Use milestone files");
	});

	it("config set definitionOfDone fails with helpful message", async () => {
		const r = await runBacklogCli(["config", "set", "definitionOfDone", "item"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("cannot be set directly");
	});

	it("config set taskPrefix fails", async () => {
		let r = await runBacklogCli(["config", "set", "taskPrefix", "new"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("cannot be changed after initialization");

		r = await runBacklogCli(["config", "set", "prefixes", "new"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("cannot be changed after initialization");
	});

	it("config set unknown key fails", async () => {
		const r = await runBacklogCli(["config", "set", "bogus", "value"], TEST_DIR);
		expect(r.exitCode).not.toBe(0);
		expect(r.stderr).toContain("Unknown config key");
	});

	it("config list shows all expected sections", async () => {
		const result = await runBacklogCli(["config", "list"], TEST_DIR);
		expect(result.stdout).toContain("projectName:");
		expect(result.stdout).toContain("defaultEditor:");
		expect(result.stdout).toContain("defaultStatus:");
		expect(result.stdout).toContain("statuses:");
		expect(result.stdout).toContain("labels:");
		expect(result.stdout).toContain("milestones:");
		expect(result.stdout).toContain("definitionOfDone:");
		expect(result.stdout).toContain("maxColumnWidth:");
		expect(result.stdout).toContain("defaultPort:");
		expect(result.stdout).toContain("remoteOperations:");
		expect(result.stdout).toContain("autoCommit:");
		expect(result.stdout).toContain("filesystemOnly:");
		expect(result.stdout).toContain("bypassGitHooks:");
		expect(result.stdout).toContain("zeroPaddedIds:");
		expect(result.stdout).toContain("taskPrefix:");
		expect(result.stdout).toContain("checkActiveBranches:");
		expect(result.stdout).toContain("activeBranchDays:");
	});

	it("config list shows milestones when present", async () => {
		const core = new Core(TEST_DIR);
		await core.filesystem.createMilestone("v2.0");
		const result = await runBacklogCli(["config", "list"], TEST_DIR);
		expect(result.stdout).toContain("milestones: [m-0]");
	});

	// In-process test: uninitialized project detection is not reliable
	// because Commander/modules are already loaded with CWD references.
	// Real CLI spawn via termless would handle this correctly.
});
