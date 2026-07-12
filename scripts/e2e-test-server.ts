/**
 * E2E test server — creates a temp backlog project with seed data
 * and starts the BacklogServer on port 6420.
 *
 * Intended to be started by Playwright's webServer config.
 * Handles SIGTERM/SIGINT for cleanup.
 */

import { $ } from "bun";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { Task } from "../src/types/index.ts";
import { Core } from "../src/core/backlog.ts";
import { BacklogServer } from "../src/server/index.ts";
import { initializeTestProject } from "../src/test/test-utils.ts";

const TEST_DIR = join(import.meta.dir, "..", "tmp", "e2e-test-project");
const PORT = 6420;

function createSeedTask(
	core: Core,
	partial: {
		id: string;
		title: string;
		status: string;
		priority: string;
		assignee?: string[];
		labels?: string[];
		createdDate?: string;
		description?: string;
	},
) {
	return core.createTask(partial as unknown as Task, false);
}

async function setup() {
	// Clean and recreate test project
	await rm(TEST_DIR, { recursive: true, force: true });

	await $`git init -b main ${TEST_DIR}`.quiet();
	await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();
	await $`git config user.name Test`.cwd(TEST_DIR).quiet();

	const _core = new Core(TEST_DIR);
	await initializeTestProject(_core, "E2E Test Project");

	// Use the default task prefix ("task") so listTasks glob finds them
	await createSeedTask(_core, { id: "task-1", title: "Implement login page", status: "To Do", priority: "high", assignee: ["alice"], labels: ["frontend", "auth"], createdDate: "2026-05-01", description: "Build a login page with email and password fields." });
	await createSeedTask(_core, { id: "task-2", title: "Set up CI pipeline", status: "In Progress", priority: "high", assignee: ["bob"], labels: ["devops"], createdDate: "2026-05-05" });
	await createSeedTask(_core, { id: "task-3", title: "Write API documentation", status: "To Do", priority: "medium", assignee: ["alice", "charlie"], labels: ["docs"], createdDate: "2026-05-10" });
	await createSeedTask(_core, { id: "task-4", title: "Fix navigation bug on mobile", status: "Done", priority: "high", assignee: ["charlie"], labels: ["bug", "frontend"], createdDate: "2026-05-03" });
	await createSeedTask(_core, { id: "task-5", title: "Add dark mode support", status: "To Do", priority: "low", assignee: [], labels: ["frontend", "ux"], createdDate: "2026-05-15" });
	await createSeedTask(_core, { id: "task-6", title: "Database migration script", status: "In Progress", priority: "medium", assignee: ["bob"], labels: ["backend"], createdDate: "2026-05-08" });
	await createSeedTask(_core, { id: "task-7", title: "User acceptance testing", status: "Done", priority: "high", assignee: ["alice"], labels: [], createdDate: "2026-05-02" });
	await createSeedTask(_core, { id: "task-8", title: "Performance benchmark report", status: "Done", priority: "low", assignee: ["charlie"], labels: ["docs", "backend"], createdDate: "2026-04-28" });
	await createSeedTask(_core, { id: "task-9", title: "Set up staging environment", status: "To Do", priority: "medium", assignee: [], labels: ["devops"], createdDate: "2026-05-20" });

	return _core;
}

async function killExistingServer() {
	try {
		const result = await $`lsof -ti:${PORT} 2>/dev/null`.quiet().nothrow();
		const pid = result.text().trim();
		if (pid) {
			process.kill(Number(pid), "SIGTERM");
			await new Promise((r) => setTimeout(r, 1000));
		}
	} catch {}
}

async function main() {
	await killExistingServer();
	const core = await setup();

	const server = new BacklogServer(TEST_DIR);
	await server.start(PORT, false);

	// Graceful shutdown
	const shutdown = async () => {
		await server.stop();
		process.exit(0);
	};
	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);

	// Keep alive — notify parent process we're ready
	console.log(`E2E test server running on :${PORT} (project: ${TEST_DIR})`);
}

main().catch((err) => {
	console.error("Failed to start E2E test server:", err);
	process.exit(1);
});
