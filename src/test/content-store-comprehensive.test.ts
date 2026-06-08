import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ContentStore } from "../core/content-store.ts";
import { FileSystem } from "../file-system/operations.ts";
import type { Decision, Document, Task } from "../types/index.ts";
import { createUniqueTestDir, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("ContentStore - comprehensive coverage", () => {
	let filesystem: FileSystem;
	let store: ContentStore;

	const sampleTask: Task = {
		id: "task-1",
		title: "Sample Task",
		status: "To Do",
		assignee: [],
		createdDate: "2025-09-19 10:00",
		labels: [],
		dependencies: [],
		rawContent: "## Description\nSeed content",
	};

	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("content-store-cov");
		filesystem = new FileSystem(TEST_DIR);
		await filesystem.ensureBacklogStructure();
		store = new ContentStore(filesystem);
	});

	afterEach(async () => {
		store?.dispose();
		try {
			await safeCleanup(TEST_DIR);
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("getTasks with filters", () => {
		beforeEach(async () => {
			await filesystem.saveTask(sampleTask);
			await store.ensureInitialized();
		});

		it("filters by status", async () => {
			const result = store.getTasks({ status: "To Do" });
			expect(result).toHaveLength(1);
			expect(result[0]?.id).toBe("TASK-1");

			const noMatch = store.getTasks({ status: "Done" });
			expect(noMatch).toHaveLength(0);
		});

		it("filters by assignee", async () => {
			const assigned: Task = {
				...sampleTask,
				id: "task-2",
				title: "Assigned",
				assignee: ["@alice"],
			};
			await filesystem.saveTask(assigned);
			// Reinitialize to pick up new task
			store.dispose();
			store = new ContentStore(filesystem);
			await store.ensureInitialized();

			const result = store.getTasks({ assignee: "@alice" });
			expect(result).toHaveLength(1);
			expect(result[0]?.title).toBe("Assigned");
		});

		it("filters by priority", async () => {
			const high: Task = {
				...sampleTask,
				id: "task-2",
				title: "High Priority",
				priority: "high",
			};
			await filesystem.saveTask(high);
			store.dispose();
			store = new ContentStore(filesystem);
			await store.ensureInitialized();

			const result = store.getTasks({ priority: "high" });
			expect(result).toHaveLength(1);
			expect(result[0]?.title).toBe("High Priority");
		});

		it("filters by parentTaskId", async () => {
			const child: Task = {
				...sampleTask,
				id: "task-1.1",
				title: "Child Task",
				parentTaskId: "TASK-1",
			};
			await filesystem.saveTask(child);
			store.dispose();
			store = new ContentStore(filesystem);
			await store.ensureInitialized();

			const result = store.getTasks({ parentTaskId: "TASK-1" });
			expect(result).toHaveLength(1);
			expect(result[0]?.title).toBe("Child Task");
		});
	});

	describe("upsertTask", () => {
		it("replaces existing task in the cache", async () => {
			await filesystem.saveTask(sampleTask);
			await store.ensureInitialized();

			const updated: Task = {
				...sampleTask,
				id: "TASK-1",
				title: "Updated via upsert",
				status: "In Progress",
			};
			store.upsertTask(updated);
			const tasks = store.getTasks();
			const found = tasks.find((t) => t.id === "TASK-1");
			expect(found?.title).toBe("Updated via upsert");
			expect(found?.status).toBe("In Progress");
		});

		it("adds a new task to the cache", async () => {
			await store.ensureInitialized();
			const newTask: Task = {
				id: "TASK-99",
				title: "New Task",
				status: "To Do",
				assignee: [],
				createdDate: "2025-09-19",
				labels: [],
				dependencies: [],
			};
			store.upsertTask(newTask);
			const tasks = store.getTasks();
			const found = tasks.find((t) => t.id === "TASK-99");
			expect(found?.title).toBe("New Task");
		});

		it("no-ops if not initialized", () => {
			const uninit = new ContentStore(filesystem);
			const task: Task = {
				id: "TASK-X",
				title: "Before Init",
				status: "To Do",
				assignee: [],
				createdDate: "2025-09-19",
				labels: [],
				dependencies: [],
			};
			// Should not throw even though uninitialized
			uninit.upsertTask(task);
			uninit.dispose();
		});
	});

	describe("ensureConfigWatcher", () => {
		it("activates config watcher when not already active", () => {
			// After normal init with enableWatchers=false, configWatcherActive is false
			store.ensureConfigWatcher();
			// Second call should no-op since it's now active
			store.ensureConfigWatcher();
		});

		it("handles config watcher creation failure gracefully", () => {
			// Mock configFilePath to an invalid path to trigger error
			const mockFS = new FileSystem(TEST_DIR);
			Object.defineProperty(mockFS, "configFilePath", {
				get: () => "/nonexistent/path/config.yml",
			});
			const errorStore = new ContentStore(mockFS);
			// ensureConfigWatcher should not throw
			errorStore.ensureConfigWatcher();
			errorStore.dispose();
		});
	});

	describe("error handling - uninitialized access", () => {
		it("throws on getTasks when not initialized", () => {
			const uninit = new ContentStore(filesystem);
			expect(() => uninit.getTasks()).toThrow("ContentStore not initialized");
			uninit.dispose();
		});

		it("throws on getDocuments when not initialized", () => {
			const uninit = new ContentStore(filesystem);
			expect(() => uninit.getDocuments()).toThrow("ContentStore not initialized");
			uninit.dispose();
		});

		it("throws on getDecisions when not initialized", () => {
			const uninit = new ContentStore(filesystem);
			expect(() => uninit.getDecisions()).toThrow("ContentStore not initialized");
			uninit.dispose();
		});
	});

	describe("isRecursiveUnsupported", () => {
		it("returns true for ERR_FEATURE_UNAVAILABLE_ON_PLATFORM", () => {
			const error = { code: "ERR_FEATURE_UNAVAILABLE_ON_PLATFORM" };
			// Access private method via bracket notation
			expect((store as unknown as { isRecursiveUnsupported(e: unknown): boolean }).isRecursiveUnsupported(error)).toBe(
				true,
			);
		});

		it("returns true for recursive not supported message", () => {
			const error = new Error("recursive watching is not supported on this platform");
			expect((store as unknown as { isRecursiveUnsupported(e: unknown): boolean }).isRecursiveUnsupported(error)).toBe(
				true,
			);
		});

		it("returns false for non-object error", () => {
			expect((store as unknown as { isRecursiveUnsupported(e: unknown): boolean }).isRecursiveUnsupported(null)).toBe(
				false,
			);
			expect(
				(store as unknown as { isRecursiveUnsupported(e: unknown): boolean }).isRecursiveUnsupported("string"),
			).toBe(false);
		});
	});

	describe("subscription edge cases", () => {
		it("subscribing after initialization emits ready event", async () => {
			await filesystem.saveTask(sampleTask);
			await store.ensureInitialized();

			const events: string[] = [];
			store.subscribe((event) => events.push(event.type));
			expect(events).toContain("ready");
		});

		it("unsubscribe removes the listener", async () => {
			await store.ensureInitialized();
			let callCount = 0;
			const unsub = store.subscribe(() => {
				callCount++;
			});
			// The subscribe call triggers a "ready" event -> callCount = 1
			unsub();
			// Trigger a change
			store.upsertTask({
				id: "TASK-X",
				title: "Test",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			// After unsub, no more calls. callCount should still be 1 (from the ready event)
			expect(callCount).toBe(1);
		});
	});

	describe("snapshot", () => {
		it("returns current state as read-only copies", async () => {
			await filesystem.saveTask(sampleTask);
			await store.ensureInitialized();
			const snapshot = store.getSnapshot();
			expect(snapshot.tasks).toHaveLength(1);
			expect(snapshot.documents).toHaveLength(0);
			expect(snapshot.decisions).toHaveLength(0);
		});
	});

	describe("dispose", () => {
		it("can be disposed multiple times without error", () => {
			store.dispose();
			store.dispose();
		});
	});

	describe("registering before init triggers auto-init", () => {
		it("subscribing before init triggers initialization", async () => {
			const freshStore = new ContentStore(filesystem);
			const events: string[] = [];
			freshStore.subscribe((event) => events.push(event.type));
			// Wait for the async init triggered by subscribe
			await new Promise((r) => setTimeout(r, 200));
			expect(events).toContain("ready");
			freshStore.dispose();
		});
	});

	describe("retryRead exhaust edge", () => {
		it("handles retryRead returning null when loader fails", async () => {
			const emptyFS = new FileSystem(TEST_DIR);
			await emptyFS.ensureBacklogStructure();
			const emptyStore = new ContentStore(emptyFS);
			await emptyStore.ensureInitialized();
			expect(emptyStore.getTasks()).toHaveLength(0);
			emptyStore.dispose();
		});
	});

	describe("watcher with enableWatchers flag", () => {
		it("sets up watchers when enableWatchers=true", async () => {
			const watchDir = createUniqueTestDir("content-watch");
			const wfs = new FileSystem(watchDir);
			await wfs.ensureBacklogStructure();
			const wstore = new ContentStore(wfs, undefined, true);
			await wstore.ensureInitialized();
			wstore.dispose();
			await safeCleanup(watchDir);
		});

		it("ensureConfigWatcher after init", async () => {
			const watchDir = createUniqueTestDir("content-watch2");
			const wfs = new FileSystem(watchDir);
			await wfs.ensureBacklogStructure();
			const wstore = new ContentStore(wfs, undefined, true);
			await wstore.ensureInitialized();
			wstore.ensureConfigWatcher();
			wstore.dispose();
			await safeCleanup(watchDir);
		});
	});

	describe("content store with watchers handles file operations", () => {
		it("initializes and tasks patched save works with enableWatchers", async () => {
			const watchDir = createUniqueTestDir("content-watch3");
			const wfs = new FileSystem(watchDir);
			await wfs.ensureBacklogStructure();
			const wstore = new ContentStore(wfs, undefined, true);
			await wstore.ensureInitialized();

			// Save a task via patched filesystem - triggers watcher path
			await wfs.saveTask({
				id: "task-watch-1",
				title: "Watch Task",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			// Wait briefly for watcher to process
			await new Promise((r) => setTimeout(r, 200));
			const tasks = wstore.getTasks();
			expect(tasks.some((t) => t.id === "TASK-WATCH-1")).toBe(true);
			wstore.dispose();
			await safeCleanup(watchDir);
		});

		it("initializes and decisions patched save works with enableWatchers", async () => {
			const watchDir = createUniqueTestDir("content-watch4");
			const wfs = new FileSystem(watchDir);
			await wfs.ensureBacklogStructure();
			const wstore = new ContentStore(wfs, undefined, true);
			await wstore.ensureInitialized();

			await wfs.saveDecision({
				id: "decision-w-1",
				title: "Watch Decision",
				date: "2025-01-01",
				status: "accepted",
				context: "C",
				decision: "D",
				consequences: "Cq",
				rawContent: "## Context\nC\n\n## Decision\nD\n\n## Consequences\nCq",
			});
			await new Promise((r) => setTimeout(r, 200));
			const decisions = wstore.getDecisions();
			expect(decisions.some((d) => d.id === "decision-w-1")).toBe(true);
			wstore.dispose();
			await safeCleanup(watchDir);
		});

		it("initializes and document patched save works with enableWatchers", async () => {
			const watchDir = createUniqueTestDir("content-watch5");
			const wfs = new FileSystem(watchDir);
			await wfs.ensureBacklogStructure();
			const wstore = new ContentStore(wfs, undefined, true);
			await wstore.ensureInitialized();

			await wfs.saveDocument({
				id: "doc-w-1",
				title: "Watch Doc",
				type: "guide",
				createdDate: "2025-01-01",
				rawContent: "# Watch",
			});
			await new Promise((r) => setTimeout(r, 200));
			const docs = wstore.getDocuments();
			expect(docs.some((d) => d.id === "doc-w-1")).toBe(true);
			wstore.dispose();
			await safeCleanup(watchDir);
		});
	});

	describe("hasDocumentChanged and hasDecisionChanged", () => {
		it("detects changes via internal change detection methods", async () => {
			await filesystem.saveTask(sampleTask);
			await store.ensureInitialized();
			const storeAny = store as unknown as {
				hasDocumentChanged(prev: Document, next: Document): boolean;
				hasDecisionChanged(prev: Decision, next: Decision): boolean;
			};

			const doc1: Document = { id: "doc-x", title: "A", type: "guide", createdDate: "2025-01-01", rawContent: "# A" };
			const doc2: Document = { id: "doc-x", title: "B", type: "guide", createdDate: "2025-01-01", rawContent: "# B" };
			expect(storeAny.hasDocumentChanged(doc1, doc1)).toBe(false);
			expect(storeAny.hasDocumentChanged(doc1, doc2)).toBe(true);

			const dec1: Decision = {
				id: "dec-x",
				title: "A",
				date: "2025-01-01",
				status: "accepted",
				context: "",
				decision: "",
				consequences: "",
				rawContent: "",
			};
			const dec2: Decision = {
				id: "dec-x",
				title: "B",
				date: "2025-01-01",
				status: "accepted",
				context: "",
				decision: "",
				consequences: "",
				rawContent: "",
			};
			expect(storeAny.hasDecisionChanged(dec1, dec1)).toBe(false);
			expect(storeAny.hasDecisionChanged(dec1, dec2)).toBe(true);
		});
	});

	describe("documents and decisions full lifecycle", () => {
		it("handles documents saved after init via patched filesystem", async () => {
			const docFS = new FileSystem(TEST_DIR);
			await docFS.ensureBacklogStructure();
			const docStore = new ContentStore(docFS);
			await docStore.ensureInitialized();
			// Save a document via the patched filesystem (ContentStore patches saveDocument)
			await docFS.saveDocument({
				id: "doc-lifecycle",
				title: "Lifecycle Doc",
				type: "guide",
				createdDate: "2025-01-01",
				rawContent: "# Lifecycle",
			});
			// The save goes through the patch -> auto-updates the store
			const docs = docStore.getDocuments();
			expect(docs.some((d) => d.id === "doc-lifecycle")).toBe(true);
			docStore.dispose();
		});

		it("handles decisions saved after init via patched filesystem", async () => {
			const decFS = new FileSystem(TEST_DIR);
			await decFS.ensureBacklogStructure();
			const decStore = new ContentStore(decFS);
			await decStore.ensureInitialized();
			// Save a decision via patched filesystem
			await decFS.saveDecision({
				id: "decision-lifecycle",
				title: "Lifecycle Decision",
				date: "2025-01-01",
				status: "accepted",
				context: "Context",
				decision: "Decision",
				consequences: "Consequences",
				rawContent: "## Context\nC\n\n## Decision\nD\n\n## Consequences\nCq",
			});
			const decisions = decStore.getDecisions();
			expect(decisions.some((d) => d.id === "decision-lifecycle")).toBe(true);
			decStore.dispose();
		});
	});
});
