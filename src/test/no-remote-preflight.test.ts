import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { loadRemoteTasks } from "../core/task-loader.ts";
import { GitOperations } from "../git/operations.ts";
import type { BacklogConfig } from "../types/index.ts";

describe("Missing git remote preflight", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "backlog-noremote-"));
		// INFRA: git setup
		await $`git init`.cwd(tempDir).quiet();
		await $`git config user.email test@example.com`.cwd(tempDir).quiet();
		await $`git config user.name "Test User"`.cwd(tempDir).quiet();
		await writeFile(join(tempDir, "README.md"), "# Test");
		await $`git add README.md`.cwd(tempDir).quiet();
		await $`git commit -m "init"`.cwd(tempDir).quiet();
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	it("GitOperations.fetch() silently skips when no remotes exist", async () => {
		const gitOps = new GitOperations(tempDir, {
			projectName: "Test",
			statuses: ["To Do", "Done"],
			labels: [],
			milestones: [],
			remoteOperations: true,
		} as BacklogConfig);

		// Capture console.warn to ensure no warning is printed during fetch
		const originalWarn = console.warn;
		const warns: string[] = [];
		console.warn = (msg: string) => {
			warns.push(msg);
		};

		await expect(async () => {
			await gitOps.fetch();
		}).not.toThrow();

		// Should not warn during fetch when no remotes
		expect(warns.length).toBe(0);

		console.warn = originalWarn;
	});

	it("loadRemoteTasks() handles no-remote repos without throwing", async () => {
		const config: BacklogConfig = {
			projectName: "Test",
			statuses: ["To Do", "Done"],
			labels: [],
			milestones: [],
			remoteOperations: true,
		};

		const gitOps = new GitOperations(tempDir, config);
		const progress: string[] = [];
		const remoteTasks = await loadRemoteTasks(gitOps as unknown as typeof gitOps, config, (m) => progress.push(m));
		expect(Array.isArray(remoteTasks)).toBe(true);
		expect(remoteTasks.length).toBe(0);
	});

	it("creates project with remoteOperations enabled in config and no remotes", async () => {
		const core = new Core(tempDir);
		await core.filesystem.ensureBacklogStructure();
		await core.filesystem.saveConfig({
			projectName: "NoRemoteProj",
			statuses: ["To Do", "In Progress", "Done"],
			labels: [],
			milestones: [],
			remoteOperations: true,
		});

		const config = await core.filesystem.loadConfig();
		expect(config?.remoteOperations).toBe(true);

		// INFRA: verify no git remotes are configured
		const { stdout } = await $`git remote -v`.cwd(tempDir).quiet().nothrow();
		expect(stdout.toString().trim()).toBe("");
	});
});
