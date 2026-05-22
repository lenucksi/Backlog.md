import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Core } from "../core/backlog.ts";
import { BacklogServer } from "../server/index.ts";
import { AppError } from "../utils/app-error.ts";
import { createUniqueTestDir, retry, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;
let server: BacklogServer | null = null;

describe("BacklogServer index (start/stop/error handling)", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("server-index-cov");
		const core = new Core(TEST_DIR);
		await core.filesystem.ensureBacklogStructure();
		await core.filesystem.saveConfig({
			projectName: "Server Index Cov",
			statuses: ["To Do", "In Progress", "Done"],
			labels: [],
			milestones: [],
			remoteOperations: false,
		});
	});

	afterEach(async () => {
		if (server) {
			await server.stop();
			server = null;
		}
		await safeCleanup(TEST_DIR);
	});

	it("starts on a random port (port 0) and getPort returns the assigned port", async () => {
		server = new BacklogServer(TEST_DIR);
		await server.start(0, false);
		const port = server.getPort();
		expect(port).toBeGreaterThan(0);
	});

	it("start can be called multiple times without error (already running)", async () => {
		server = new BacklogServer(TEST_DIR);
		await server.start(0, false);
		const port1 = server.getPort();
		await server.start(0, false);
		const port2 = server.getPort();
		expect(port1).toBe(port2);
	});

	it("stop can be called multiple times without error", async () => {
		server = new BacklogServer(TEST_DIR);
		await server.start(0, false);
		await server.stop();
		await server.stop();
	});

	it("returns 404 for unknown paths", async () => {
		server = new BacklogServer(TEST_DIR);
		await server.start(0, false);
		const port = server.getPort()!;

		const res = await fetch(`http://127.0.0.1:${port}/unknown-path`);
		expect(res.status).toBe(404);
	});

	it("serves favicon request", async () => {
		server = new BacklogServer(TEST_DIR);
		await server.start(0, false);
		const port = server.getPort()!;

		const res = await fetch(`http://127.0.0.1:${port}/favicon.ico`);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("image/png");
	});

	it("handles error with AppError formatting", async () => {
		const appError = AppError.notFound("Task not found");
		const response = appError.formatForServer();
		expect(response.status).toBe(404);
		const body = await response.json() as { error: string };
		expect(body.error).toBe("Task not found");
	});

	it("handles lifecycle: start, verify port, stop", async () => {
		server = new BacklogServer(TEST_DIR);
		expect(server.getPort()).toBeNull();
		await server.start(0, false);
		expect(server.getPort()).toBeGreaterThan(0);
		const port = server.getPort()!;

		const res = await fetch(`http://127.0.0.1:${port}/api/status`);
		expect(res.ok).toBe(true);

		await server.stop();
		expect(server.getPort()).toBeNull();
	});

	it("handles websocket upgrade via handleRequest for non-routed paths", async () => {
		server = new BacklogServer(TEST_DIR);
		await server.start(0, false);
		const port = server.getPort()!;

		// Bun fetch sends Upgrade header but server.upgrade() returns false
		// (fetch cannot do full WebSocket upgrades), falling through to 400
		const res = await fetch(`http://127.0.0.1:${port}/ws`, {
			headers: { Upgrade: "websocket" },
		});
		// Server detects "upgrade: websocket" header and tries to upgrade,
		// which fails from a standard fetch request
		expect([101, 400]).toContain(res.status);
	});

	it("handles milestone resolution for create", async () => {
		server = new BacklogServer(TEST_DIR);
		await server.start(0, false);
		const port = server.getPort()!;

		await fetch(`http://127.0.0.1:${port}/api/milestones`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Sprint 1" }),
		});

		const res = await fetch(`http://127.0.0.1:${port}/api/tasks`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Milestone task", milestone: "Sprint 1" }),
		});
		const task = await res.json() as { milestone?: string };
		expect(task.milestone).toBeDefined();
	});
});
