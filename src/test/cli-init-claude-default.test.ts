import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { runBacklogCli } from "./commands-cov-helper.ts";

let TEST_DIR: string;

describe("init Claude agent default", () => {
	beforeEach(async () => {
		TEST_DIR = join(process.cwd(), `.tmp-test-init-claude-${Math.random().toString(36).slice(2)}`);
		await rm(TEST_DIR, { recursive: true, force: true });
		await mkdir(TEST_DIR, { recursive: true });
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();
	});

	afterEach(async () => {
		await rm(TEST_DIR, { recursive: true, force: true });
	});

	it("does not install Claude agent by default in non-interactive mode", async () => {
		const result = await runBacklogCli(["init", "MyProj", "--defaults"], TEST_DIR);
		expect(result.exitCode).toBe(0);

		const agentExists = await Bun.file(join(TEST_DIR, ".claude", "agents", "project-manager-backlog.md")).exists();
		expect(agentExists).toBe(false);
	});

	it("installs Claude agent when flag is true", async () => {
		const result = await runBacklogCli(["init", "MyProj", "--defaults", "--install-claude-agent", "true"], TEST_DIR);
		expect(result.exitCode).toBe(0);

		const agentExists = await Bun.file(join(TEST_DIR, ".claude", "agents", "project-manager-backlog.md")).exists();
		expect(agentExists).toBe(true);
	});
});
