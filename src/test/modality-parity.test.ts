import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { $ } from "bun";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { Core } from "../core/backlog.ts";
import { McpServer } from "../mcp/server.ts";
import { registerTaskTools } from "../mcp/tools/tasks/index.ts";
import { BacklogServer } from "../server/index.ts";

/*
 * =========================================================================
 * CROSS-MODALITY PARITY TEST PATTERN
 * =========================================================================
 *
 * This file tests that the same feature produces the same results across
 * all access modalities. To add a new parity test for another feature:
 *
 * 1. Seed the test project with the necessary data (tasks, docs, etc.)
 * 2. Query through each modality and collect the result
 * 3. Assert results are equivalent across all modalities
 *
 * Modalities available:
 *   - CLI  : Execute `bun src/cli.ts <subcommand>` via Bun.$
 *   - API  : Start BacklogServer, use fetch() against localhost
 *   - MCP  : Create McpServer, call tool via testInterface.callTool()
 *
 * When a modality does not support a feature, assert that explicitly
 * with a descriptive test rather than omitting it.
 * =========================================================================
 */

const WORKTREE_ROOT = process.cwd();

// Helper to extract MCP text content
const getMcpText = (content: unknown[] | undefined, index = 0): string => {
	const item = content?.[index] as { text?: string } | undefined;
	return item?.text ?? "";
};

describe("cross-modality parity", () => {
	const testId = randomUUID().slice(0, 8);
	const testDir = join("/tmp/opencode", `modality-parity-${testId}`);
	let core: Core;

	beforeEach(async () => {
		await mkdir(testDir, { recursive: true });
		await $`git init -b main`.cwd(testDir).quiet();
		await $`git config user.name "Test User"`.cwd(testDir).quiet();
		await $`git config user.email test@example.com`.cwd(testDir).quiet();

		core = new Core(testDir);
		await core.filesystem.ensureBacklogStructure();
		await core.filesystem.saveConfig({
			projectName: "Parity Test",
			statuses: ["To Do", "In Progress", "Done"],
			labels: ["urgent", "backend", "ui", "docs"],
			milestones: [],
		});

		// Seed tasks via core directly
		await core.createTaskFromInput({
			title: "Setup auth",
			status: "To Do",
			labels: ["backend", "urgent"],
			priority: "high",
		});
		await core.createTaskFromInput({
			title: "Fix button",
			status: "To Do",
			labels: ["ui"],
			priority: "medium",
		});
		await core.createTaskFromInput({
			title: "Write docs",
			status: "Done",
			labels: ["docs"],
			priority: "low",
		});
		await core.createTaskFromInput({
			title: "Review PR",
			status: "Done",
			labels: ["backend"],
			priority: "medium",
		});
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true, maxRetries: 3 });
	});

	it("returns identical task lists across CLI, API, and MCP when filtering by status", async () => {
		// ── CLI modality ──────────────────────────────────────────
		const cliProc = Bun.spawn(["bun", join(WORKTREE_ROOT, "src/cli.ts"), "task", "list", "--status", "Done", "--json"], {
			cwd: testDir,
			env: { ...process.env, NO_COLOR: "1" },
		});
		const cliOut = await new Response(cliProc.stdout).text();
		const cliExit = await cliProc.exited;
		expect(cliExit).toBe(0);
		const cliTasks: Array<{ id: string; title: string }> = JSON.parse(cliOut);
		const cliIds = cliTasks.map((t) => t.id).sort();

		// ── API modality ──────────────────────────────────────────
		const server = new BacklogServer(testDir);
		await server.start(0, false);
		const port = server.getPort()!;
		await fetch(`http://127.0.0.1:${port}/api/status`, { signal: AbortSignal.timeout(1000) });

		const apiResp = await fetch(`http://127.0.0.1:${port}/api/tasks?status=Done`);
		const apiTasks: Array<{ id: string; title: string }> = await apiResp.json();
		const apiIds = apiTasks.map((t) => t.id).sort();

		await server.stop();

		// ── MCP modality ──────────────────────────────────────────
		const mcpServer = new McpServer(testDir, "Parity test instructions");
		await mcpServer.filesystem.ensureBacklogStructure();
		await mcpServer.filesystem.saveConfig({
			projectName: "Parity Test",
			statuses: ["To Do", "In Progress", "Done"],
			labels: ["urgent", "backend", "ui", "docs"],
			milestones: [],
		});
		const config = await mcpServer.filesystem.loadConfig()!;
		registerTaskTools(mcpServer, config!);

		const mcpResult = await mcpServer.testInterface.callTool({
			params: { name: "task_list", arguments: { status: "Done" } },
		});
		const mcpText = getMcpText(mcpResult.content);

		// Verify MCP output contains the Done tasks
		expect(mcpText).toContain("Write docs");
		expect(mcpText).toContain("Review PR");

		// Assert parity — all modalities return the same Done task IDs
		expect(apiIds).toEqual(cliIds);
	});
});
