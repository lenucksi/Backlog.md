import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Core } from "../core/backlog.ts";
import { BacklogServer } from "../server/index.ts";
import { type DuplicateGroup, scanForDuplicateIds, formatDuplicateWarning } from "../utils/duplicate-detection.ts";
import type { Task } from "../types/index.ts";
import { createUniqueTestDir, retry, safeCleanup } from "./test-utils.ts";

function makeTask(id: string, title: string, overrides: Partial<Task> = {}): Task {
	return {
		id,
		title,
		status: "To Do",
		assignee: [],
		labels: [],
		dependencies: [],
		rawContent: "",
		createdDate: "2026-01-01 00:00",
		...overrides,
	} as Task;
}

describe("scanForDuplicateIds", () => {
	it("returns empty array when no duplicates", () => {
		const tasks = [makeTask("BACK-1", "Task 1"), makeTask("BACK-2", "Task 2"), makeTask("BACK-3", "Task 3")];
		const result = scanForDuplicateIds(tasks);
		expect(result).toEqual([]);
	});

	it("detects duplicate IDs", () => {
		const tasks = [
			makeTask("BACK-1", "Task 1"),
			makeTask("BACK-1", "Task 1 dup"),
			makeTask("BACK-2", "Task 2"),
		];
		const result = scanForDuplicateIds(tasks);
		expect(result).toHaveLength(1);
		expect(result[0]!.id).toBe("BACK-1");
		expect(result[0]!.tasks).toHaveLength(2);
	});

	it("detects multiple duplicate groups", () => {
		const tasks = [
			makeTask("BACK-1", "Task 1"),
			makeTask("BACK-1", "Task 1 dup"),
			makeTask("BACK-2", "Task 2"),
			makeTask("BACK-2", "Task 2 dup"),
			makeTask("BACK-2", "Task 2 dup2"),
		];
		const result = scanForDuplicateIds(tasks);
		expect(result).toHaveLength(2);
		expect(result[0]!.id).toBe("BACK-1");
		expect(result[1]!.id).toBe("BACK-2");
		expect(result[0]!.tasks).toHaveLength(2);
		expect(result[1]!.tasks).toHaveLength(3);
	});

	it("skips tasks without an id", () => {
		const tasks = [makeTask("BACK-1", "Task 1"), makeTask("", "No ID") as Task];
		const result = scanForDuplicateIds(tasks);
		expect(result).toEqual([]);
	});

	it("returns results sorted by id", () => {
		const tasks = [
			makeTask("C-1", "C"),
			makeTask("A-1", "A"),
			makeTask("A-1", "A dup"),
			makeTask("C-1", "C dup"),
			makeTask("B-1", "B"),
			makeTask("B-1", "B dup"),
		];
		const result = scanForDuplicateIds(tasks);
		expect(result).toHaveLength(3);
		expect(result[0]!.id).toBe("A-1");
		expect(result[1]!.id).toBe("B-1");
		expect(result[2]!.id).toBe("C-1");
	});
});

describe("formatDuplicateWarning", () => {
	it("returns empty string for no duplicates", () => {
		expect(formatDuplicateWarning([])).toBe("");
	});

	it("formats warning message with duplicate details", () => {
		const duplicates: DuplicateGroup[] = [
			{
				id: "BACK-1",
				tasks: [
					makeTask("BACK-1", "Original"),
					makeTask("BACK-1", "Duplicate"),
				],
			},
		];
		const result = formatDuplicateWarning(duplicates);
		expect(result).toContain("Duplicate task IDs detected");
		expect(result).toContain("BACK-1");
		expect(result).toContain("Original");
		expect(result).toContain("Duplicate");
		expect(result).toContain("Review and deduplicate");
	});
});

describe("BacklogServer duplicates endpoint", () => {
	let TEST_DIR: string;
	let server: BacklogServer | null = null;
	let serverPort = 0;

	async function fetchJson<T>(path: string): Promise<T> {
		const response = await fetch(`http://127.0.0.1:${serverPort}${path}`);
		const body = await response.text();
		try {
			return JSON.parse(body) as T;
		} catch {
			throw new Error(`${response.status}: ${body}`);
		}
	}

	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("dup-endpoint");
		const core = new Core(TEST_DIR);
		await core.filesystem.ensureBacklogStructure();
		await core.filesystem.saveConfig({
			projectName: "Dup Test",
			statuses: ["To Do", "In Progress", "Done"],
			labels: [],
			remoteOperations: false,
			checkActiveBranches: false,
		});

		server = new BacklogServer(TEST_DIR);
		await server.start(0, false);
		const port = server.getPort();
		expect(port).not.toBeNull();
		serverPort = port ?? 0;

		await retry(async () => {
			const res = await fetch(`http://127.0.0.1:${serverPort}/api/status`, { signal: AbortSignal.timeout(500) });
			if (!res.ok) throw new Error("server not ready");
		}, 10, 50);
	});

	afterEach(async () => {
		if (server) {
			await server.stop();
			server = null;
		}
		await safeCleanup(TEST_DIR);
	});

	it("returns empty array when no duplicates exist", async () => {
		const result = await fetchJson<unknown[]>("/api/duplicates");
		expect(Array.isArray(result)).toBe(true);
		expect(result).toHaveLength(0);
	});

	it("returns 200 with JSON array", async () => {
		const response = await fetch(`http://127.0.0.1:${serverPort}/api/duplicates`);
		expect(response.status).toBe(200);
		const contentType = response.headers.get("content-type");
		expect(contentType).toContain("application/json");
	});
});
