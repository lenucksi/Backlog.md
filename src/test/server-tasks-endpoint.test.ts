import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Core } from "../core/backlog.ts";
import { BacklogServer } from "../server/index.ts";
import { createUniqueTestDir, retry, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;
let server: BacklogServer | null = null;
let serverPort = 0;

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`http://127.0.0.1:${serverPort}${path}`, init);
	const body = await response.text();
	try {
		return JSON.parse(body) as T;
	} catch {
		throw new Error(`${response.status}: ${body}`);
	}
}

describe("BacklogServer task endpoints", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("server-tasks");
		const core = new Core(TEST_DIR);
		await core.filesystem.ensureBacklogStructure();
		await core.filesystem.saveConfig({
			projectName: "Server Tasks",
			statuses: ["To Do", "In Progress", "Done"],
			labels: ["urgent", "backend", "frontend"],
			milestones: [],
			remoteOperations: false,
		});

		server = new BacklogServer(TEST_DIR);
		await server.start(0, false);
		const port = server.getPort();
		expect(port).not.toBeNull();
		serverPort = port ?? 0;

		await retry(
			async () => {
				const res = await fetch(`http://127.0.0.1:${serverPort}/api/status`, { signal: AbortSignal.timeout(500) });
				if (!res.ok) throw new Error("server not ready");
			},
			10,
			50,
		);
	});

	afterEach(async () => {
		if (server) {
			await server.stop();
			server = null;
		}
		await safeCleanup(TEST_DIR);
	});

	it("lists tasks with various filters", async () => {
		await fetchJson("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Filter test task", priority: "high", labels: ["urgent"] }),
		});

		const list = await fetchJson<Array<{ id: string; title: string }>>("/api/tasks");
		expect(Array.isArray(list)).toBe(true);
		expect(list.length).toBeGreaterThanOrEqual(1);
	});

	it("filters tasks by valid priority", async () => {
		await fetchJson("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "High priority", priority: "high" }),
		});
		await fetchJson("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Low priority", priority: "low" }),
		});

		const highList = await fetchJson<Array<{ id: string }>>("/api/tasks?priority=high");
		const lowList = await fetchJson<Array<{ id: string }>>("/api/tasks?priority=low");
		expect(highList.length).toBeGreaterThanOrEqual(1);
		expect(lowList.length).toBeGreaterThanOrEqual(1);
	});

	it("returns 400 for invalid priority filter", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks?priority=invalid`);
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("Invalid priority filter");
	});

	it("filters by parent task with not-found error", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks?parent=nonexistent`);
		expect(res.status).toBe(404);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain("not found");
	});

	it("filters by labels", async () => {
		await fetchJson("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Label test", labels: ["urgent"] }),
		});

		const result = await fetchJson<Array<{ id: string }>>("/api/tasks?label=urgent");
		expect(result.length).toBeGreaterThanOrEqual(1);
	});

	it("supports crossBranch filter", async () => {
		// crossBranch=true should not change the result shape
		const result = await fetchJson<Array<{ id: string }>>("/api/tasks?crossBranch=true");
		expect(Array.isArray(result)).toBe(true);
	});

	it("handles search with query parameter", async () => {
		await fetchJson("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Searchable task" }),
		});

		const results = await fetchJson<Array<{ id: string; title: string }>>("/api/search?query=Searchable");
		expect(Array.isArray(results)).toBe(true);
	});

	it("returns 400 for search with invalid limit", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?query=test&limit=-1`);
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain("limit");
	});

	it("returns 400 for search with invalid type parameter", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?query=test&type=invalid`);
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain("type");
	});

	it("searches with multiple types", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?query=test&type=task&type=document`);
		expect(res.ok).toBe(true);
		expect(Array.isArray(await res.json())).toBe(true);
	});

	it("returns 400 for search with invalid priority in filters", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/search?query=test&priority=invalid`);
		expect(res.status).toBe(400);
	});

	it("creates a task via POST", async () => {
		const task = await fetchJson<{ id: string; title: string }>("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "New task via API" }),
		});
		expect(task.title).toBe("New task via API");
	});

	it("returns 400 when creating a task without a title", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain("Title is required");
	});

	it("creates a task with acceptance criteria and definitionOfDone", async () => {
		const task = await fetchJson<{ id: string }>("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				title: "Full task",
				description: "Desc",
				acceptanceCriteriaItems: [{ text: "AC1", checked: false }],
				definitionOfDoneAdd: ["DoD1"],
				disableDefinitionOfDoneDefaults: true,
			}),
		});
		expect(task.id).toBeDefined();
	});

	it("gets a task by ID", async () => {
		const created = await fetchJson<{ id: string }>("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Gettable task" }),
		});

		const task = await fetchJson<{ id: string; title: string }>(`/api/tasks/${created.id}`);
		expect(task.title).toBe("Gettable task");
	});

	it("returns 404 for non-existent task", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks/nonexistent`);
		expect(res.status).toBe(404);
	});

	it("updates a task via PUT", async () => {
		const created = await fetchJson<{ id: string }>("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Updatable task" }),
		});

		const updated = await fetchJson<{ id: string; title: string }>(`/api/tasks/${created.id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Updated title" }),
		});
		expect(updated.title).toBe("Updated title");
	});

	it("returns 404 when updating non-existent task", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks/nonexistent`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Nope" }),
		});
		expect(res.status).toBe(404);
	});

	it("deletes a task via DELETE", async () => {
		const created = await fetchJson<{ id: string }>("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Deletable task" }),
		});

		const result = await fetchJson<{ success: boolean }>(`/api/tasks/${created.id}`, { method: "DELETE" });
		expect(result.success).toBe(true);
	});

	it("returns 404 when deleting non-existent task", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks/nonexistent`, { method: "DELETE" });
		expect(res.status).toBe(404);
	});

	it("completes a task via POST to /complete endpoint", async () => {
		const created = await fetchJson<{ id: string }>("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Completable task", status: "Done" }),
		});

		await fetchJson<{ success: boolean }>(`/api/tasks/${created.id}/complete`, { method: "POST" });
		const completed = await fetchJson<{ id: string }>(`/api/tasks/${created.id}`);
		expect(completed).toBeDefined();
	});

	it("returns 404 when completing non-existent task", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks/nonexistent/complete`, { method: "POST" });
		expect(res.status).toBe(404);
	});

	it("returns 400 for reorder with missing fields", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks/reorder`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
	});

	it("returns 400 for cleanup preview missing age", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks/cleanup`);
		expect(res.status).toBe(400);
	});

	it("returns 400 for cleanup preview with invalid age", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks/cleanup?age=abc`);
		expect(res.status).toBe(400);
	});

	it("returns 400 for cleanup preview with negative age", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks/cleanup?age=-5`);
		expect(res.status).toBe(400);
	});

	it("returns 400 for cleanup execute missing age", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks/cleanup/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
	});

	it("returns 400 for cleanup execute with non-numeric age", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks/cleanup/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ age: "abc" }),
		});
		expect(res.status).toBe(400);
	});

	it("returns 400 for cleanup execute with negative age", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/tasks/cleanup/execute`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ age: -5 }),
		});
		expect(res.status).toBe(400);
	});

	it("returns success for cleanup execute when no tasks match", async () => {
		const result = await fetchJson<{ success: boolean; movedCount: number }>("/api/tasks/cleanup/execute", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ age: 1 }),
		});
		expect(result.success).toBe(true);
		expect(result.movedCount).toBe(0);
	});

	it("lists sequences", async () => {
		const data = await fetchJson<unknown>("/api/sequences");
		expect(data).toBeDefined();
	});

	it("returns 400 for move sequence without taskId", async () => {
		const res = await fetch(`http://127.0.0.1:${serverPort}/api/sequences/move`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
	});

	it("creates task with milestone via server handlers", async () => {
		await fetchJson<unknown>("/api/milestones", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Sprint Alpha" }),
		});
		await fetchJson<unknown>("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Milestone task", milestone: "Sprint Alpha" }),
		});

		const tasks = await fetchJson<Array<{ milestone?: string }>>("/api/tasks?milestone=Sprint+Alpha");
		expect(tasks.length).toBeGreaterThanOrEqual(1);
	});
});
