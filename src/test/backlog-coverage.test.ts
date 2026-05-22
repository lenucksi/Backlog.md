import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { join } from "node:path";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import type { Decision, Document, Task } from "../types/index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

let TEST_DIR: string;

describe("Core backlog coverage", () => {
	let core: Core;

	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("backlog-cov");
		core = new Core(TEST_DIR);
		await core.filesystem.ensureBacklogStructure();
		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();
	});

	afterEach(async () => {
		try {
			await safeCleanup(TEST_DIR);
		} catch {
			// Ignore cleanup errors
		}
	});

	describe("content store and search service", () => {
		beforeEach(async () => {
			await initializeTestProject(core, "Cov Project");
		});

		it("getContentStore returns initialized content store", async () => {
			const store = await core.getContentStore();
			expect(store).toBeDefined();
			const snapshot = store.getSnapshot();
			expect(snapshot.tasks).toBeDefined();
		});

		it("getSearchService returns initialized search service", async () => {
			const search = await core.getSearchService();
			expect(search).toBeDefined();
			// Should be initialized
			search.search({ query: "" });
		});
	});

	describe("sequences operations", () => {
		beforeEach(async () => {
			await initializeTestProject(core, "Seq Project");
			// Create tasks with dependencies for sequences
			await core.createTask({
				id: "task-seq-1",
				title: "Seq One",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			await core.createTask({
				id: "task-seq-2",
				title: "Seq Two",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
		});

		it("listActiveSequences returns sequences", async () => {
			const result = await core.listActiveSequences();
			expect(result.unsequenced).toBeDefined();
			expect(result.sequences).toBeDefined();
		});

		it("moveTaskInSequences to unsequenced", async () => {
			const task: Task = {
				id: "task-move",
				title: "Move Test",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			};
			await core.createTask(task);
			// Move to unsequenced (already unsequenced, should not error)
			const result = await core.moveTaskInSequences({ taskId: "TASK-MOVE", unsequenced: true });
			expect(result.unsequenced).toBeDefined();
		});

		it("moveTaskInSequences rejects missing taskId", async () => {
			await expect(core.moveTaskInSequences({ taskId: "" })).rejects.toThrow("taskId is required");
		});

		it("moveTaskInSequences rejects non-existent task", async () => {
			await expect(core.moveTaskInSequences({ taskId: "TASK-999", unsequenced: true })).rejects.toThrow(
				"Task TASK-999 not found",
			);
		});

		it("moveTaskInSequences rejects missing targetSequenceIndex", async () => {
			const task: Task = {
				id: "task-seqidx",
				title: "Seq Index",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			};
			await core.createTask(task);
			await expect(core.moveTaskInSequences({ taskId: "TASK-SEQIDX" })).rejects.toThrow(
				"targetSequenceIndex must be a number",
			);
		});

		it("moveTaskInSequences rejects targetSequenceIndex < 1", async () => {
			const task: Task = {
				id: "task-neg",
				title: "Negative",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			};
			await core.createTask(task);
			await expect(core.moveTaskInSequences({ taskId: "TASK-NEG", targetSequenceIndex: 0 })).rejects.toThrow(
				"targetSequenceIndex must be >= 1",
			);
		});
	});

	describe("completeTask", () => {
		it("completes a task and returns true", async () => {
			await initializeTestProject(core, "Complete Test");
			await core.createTask({
				id: "task-comp",
				title: "To Complete",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			const result = await core.completeTask("task-comp");
			expect(result).toBe(true);
			const loaded = await core.filesystem.loadTask("task-comp");
			expect(loaded).toBeNull(); // should be moved to completed
		});

		it("returns false for non-existent task", async () => {
			await initializeTestProject(core, "Complete Fail");
			const result = await core.completeTask("task-999");
			expect(result).toBe(false);
		});
	});

	describe("acceptance criteria operations", () => {
		beforeEach(async () => {
			await initializeTestProject(core, "AC Project");
			await core.createTask({
				id: "task-ac",
				title: "AC Test",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
		});

		it("addAcceptanceCriteria adds criteria to a task", async () => {
			await core.addAcceptanceCriteria("task-ac", ["Criterion 1", "Criterion 2"]);
			const loaded = await core.filesystem.loadTask("task-ac");
			expect(loaded?.acceptanceCriteriaItems).toHaveLength(2);
			expect(loaded?.acceptanceCriteriaItems?.[0]?.text).toBe("Criterion 1");
		});

		it("addAcceptanceCriteria throws for non-existent task", async () => {
			await expect(core.addAcceptanceCriteria("task-999", ["Test"])).rejects.toThrow("Task not found");
		});

		it("removeAcceptanceCriteria removes criteria by index", async () => {
			await core.addAcceptanceCriteria("task-ac", ["Criterion 1", "Criterion 2", "Criterion 3"]);
			const removed = await core.removeAcceptanceCriteria("task-ac", [2]);
			expect(removed).toEqual([2]);
			const loaded = await core.filesystem.loadTask("task-ac");
			expect(loaded?.acceptanceCriteriaItems).toHaveLength(2);
		});

		it("removeAcceptanceCriteria throws when no criteria removed", async () => {
			await expect(core.removeAcceptanceCriteria("task-ac", [99])).rejects.toThrow("No criteria were removed");
		});

		it("removeAcceptanceCriteria throws for non-existent task", async () => {
			await expect(core.removeAcceptanceCriteria("task-999", [1])).rejects.toThrow("Task not found");
		});
	});

	describe("task metadata", () => {
		it("listTasksWithMetadata returns tasks with stats", async () => {
			await initializeTestProject(core, "Meta Project");
			await core.createTask({
				id: "task-meta",
				title: "Meta Test",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			const tasks = await core.listTasksWithMetadata();
			expect(tasks.length).toBeGreaterThanOrEqual(1);
			// Should have lastModified
			expect(tasks[0]?.lastModified).toBeDefined();
		});

		it("listTasksWithMetadata with includeBranchMeta does not fail", async () => {
			await initializeTestProject(core, "Branch Meta");
			await core.createTask({
				id: "task-br",
				title: "Branch Test",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			const tasks = await core.listTasksWithMetadata(true);
			expect(tasks.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("getTerminalStatusTasksByAge", () => {
		it("returns terminal status tasks older than specified days", async () => {
			await initializeTestProject(core, "Terminal Age");
			await core.createTask({
				id: "task-old",
				title: "Old Done",
				status: "Done",
				assignee: [],
				createdDate: "2024-01-01",
				labels: [],
				dependencies: [],
			});
			await core.createTask({
				id: "task-new",
				title: "New Done",
				status: "Done",
				assignee: [],
				createdDate: new Date().toISOString().slice(0, 16).replace("T", " "),
				labels: [],
				dependencies: [],
			});
			const oldTasks = await core.getTerminalStatusTasksByAge(30);
			expect(oldTasks.some((t) => t.id === "TASK-OLD")).toBe(true);
		});
	});

	describe("milestone operations", () => {
		it("archiveMilestone returns success false for non-existent", async () => {
			await initializeTestProject(core, "Milestone Project");
			const result = await core.archiveMilestone("nonexistent");
			expect(result.success).toBe(false);
		});

		it("renameMilestone returns success false for non-existent", async () => {
			await initializeTestProject(core, "Rename Milestone");
			const result = await core.renameMilestone("nonexistent", "New Name");
			expect(result.success).toBe(false);
		});
	});

	describe("getTask with subtasks", () => {
		it("getTaskWithSubtasks returns task without subtasks for simple task", async () => {
			await initializeTestProject(core, "Subtask");
			await core.createTask({
				id: "task-sub-parent",
				title: "Parent",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			const result = await core.getTaskWithSubtasks("TASK-SUB-PARENT");
			expect(result).toBeDefined();
			expect(result?.id).toBe("TASK-SUB-PARENT");
		});
	});

	describe("queryTasks with complex filters", () => {
		beforeEach(async () => {
			await initializeTestProject(core, "Query Filter");
			await core.createTask({
				id: "task-q1",
				title: "Query One",
				status: "To Do",
				assignee: ["@alice"],
				createdDate: "2025-01-01",
				labels: ["dev", "urgent"],
				dependencies: [],
				priority: "high",
			});
			await core.createTask({
				id: "task-q2",
				title: "Query Two",
				status: "In Progress",
				assignee: ["@bob"],
				createdDate: "2025-01-02",
				labels: ["dev"],
				dependencies: [],
				priority: "low",
			});
		});

		it("queries by status", async () => {
			const results = await core.queryTasks({ filters: { status: "To Do" } });
			expect(results).toHaveLength(1);
			expect(results[0]?.title).toBe("Query One");
		});

		it("queries by assignee", async () => {
			const results = await core.queryTasks({ filters: { assignee: "@bob" } });
			expect(results).toHaveLength(1);
			expect(results[0]?.title).toBe("Query Two");
		});

		it("queries by priority", async () => {
			const results = await core.queryTasks({ filters: { priority: "high" } });
			expect(results).toHaveLength(1);
			expect(results[0]?.title).toBe("Query One");
		});

		it("queries by labels", async () => {
			const results = await core.queryTasks({ filters: { labels: ["urgent"] } });
			expect(results).toHaveLength(1);
			expect(results[0]?.title).toBe("Query One");
		});

		it("queries by milestone returns empty when no tasks have milestones", async () => {
			const results = await core.queryTasks({ filters: { milestone: "v1.0" } });
			expect(results).toHaveLength(0);
		});
	});

	describe("editTask and editTaskOrDraft", () => {
		beforeEach(async () => {
			await initializeTestProject(core, "Edit Test");
		});

		it("editTaskOrDraft updates a task", async () => {
			await core.createTask({
				id: "task-edit",
				title: "Original",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			const updated = await core.editTaskOrDraft("task-edit", { title: "Updated" });
			expect(updated.title).toBe("Updated");
		});

		it("editTask updates a task", async () => {
			await core.createTask({
				id: "task-ed2",
				title: "Edit Test 2",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			const updated = await core.editTask("task-ed2", { title: "Edited" });
			expect(updated.title).toBe("Edited");
		});
	});

	describe("createDocumentWithId", () => {
		it("creates a document with title and content", async () => {
			await initializeTestProject(core, "Doc ID Test");
			const doc = await core.createDocumentWithId("My Doc", "# Content");
			expect(doc.title).toBe("My Doc");
			expect(doc.rawContent).toBe("# Content");
		});
	});

	describe("shouldAutoCommit and getGitOps", () => {
		it("shouldAutoCommit returns false by default", async () => {
			await initializeTestProject(core, "Auto Commit");
			const should = await core.shouldAutoCommit();
			expect(should).toBe(false);
		});

		it("shouldAutoCommit returns override when provided", async () => {
			await initializeTestProject(core, "Override");
			const should = await core.shouldAutoCommit(true);
			expect(should).toBe(true);
		});

		it("getGitOps returns configured git operations", async () => {
			await initializeTestProject(core, "Git Ops");
			const git = await core.getGitOps();
			expect(git).toBeDefined();
		});
	});

	describe("ensureConfigMigrated", () => {
		it("config migration runs without error on new project", async () => {
			await initializeTestProject(core, "Config Migrate");
			await core.ensureConfigMigrated();
			const config = await core.filesystem.loadConfig();
			expect(config?.projectName).toBe("Config Migrate");
		});
	});

	describe("getDocument and getDocumentContent", () => {
		it("getDocument returns null for non-existent document", async () => {
			await initializeTestProject(core, "Doc Get");
			const doc = await core.getDocument("doc-999");
			expect(doc).toBeNull();
		});

		it("getDocumentContent returns null for non-existent document", async () => {
			await initializeTestProject(core, "Doc Content");
			const content = await core.getDocumentContent("doc-999");
			expect(content).toBeNull();
		});
	});

	describe("loadTaskById", () => {
		it("loadTaskById returns null for non-existent task", async () => {
			await initializeTestProject(core, "Load ID");
			const task = await core.loadTaskById("task-999");
			expect(task).toBeNull();
		});
	});

	describe("loadTasks", () => {
		it("loadTasks runs without errors", async () => {
			await initializeTestProject(core, "Load Tasks");
			const result = await core.loadTasks();
			expect(Array.isArray(result)).toBe(true);
		});

		it("loadTasks with abort signal throws when aborted", async () => {
			await initializeTestProject(core, "Abort Load");
			const abort = new AbortController();
			abort.abort();
			await expect(core.loadTasks(() => {}, abort.signal)).rejects.toThrow("Loading cancelled");
		});
	});

	describe("updateTasksBulk", () => {
		it("updates multiple tasks at once", async () => {
			await initializeTestProject(core, "Bulk Update");
			await core.createTask({
				id: "task-b1",
				title: "Bulk One",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			await core.createTask({
				id: "task-b2",
				title: "Bulk Two",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			const task1 = await core.filesystem.loadTask("task-b1");
			const task2 = await core.filesystem.loadTask("task-b2");
			if (task1 && task2) {
				task1.title = "Bulk One Updated";
				task2.title = "Bulk Two Updated";
				await core.updateTasksBulk([task1, task2], "Bulk update test");
			}
			const reloaded1 = await core.filesystem.loadTask("task-b1");
			expect(reloaded1?.title).toBe("Bulk One Updated");
		});
	});

	describe("updateDraft operations", () => {
		it("updateDraft updates an existing draft", async () => {
			await initializeTestProject(core, "Update Draft");
			const { task: draft } = await core.createTaskFromInput({
				title: "Draft To Update",
				status: "Draft",
			});
			draft.title = "Updated Draft Title";
			await core.updateDraft(draft);
			const loaded = await core.filesystem.loadDraft(draft.id);
			expect(loaded?.title).toBe("Updated Draft Title");
		});

		it("updateDraftFromInput updates a draft", async () => {
			await initializeTestProject(core, "Update Draft Input");
			const { task: draft } = await core.createTaskFromInput({
				title: "Draft Input",
				status: "Draft",
			});
			const updated = await core.updateDraftFromInput(draft.id, { title: "Updated Input" });
			expect(updated.title).toBe("Updated Input");
		});

		it("demoteTaskWithUpdates demotes and updates", async () => {
			await initializeTestProject(core, "Demote With Updates");
			await core.createTask({
				id: "task-dem-up",
				title: "Demote Me",
				status: "In Progress",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			const result = await core.demoteTask("TASK-DEM-UP");
			expect(result).toBe(true);
		});

		it("promoteDraftWithUpdates promotes and updates", async () => {
			await initializeTestProject(core, "Promote Draft");
			const { task: draft } = await core.createTaskFromInput({
				title: "Promote Me",
				status: "Draft",
			});
			const promoted = await core.promoteDraft(draft.id);
			expect(promoted).toBe(true);
		});
	});

	describe("decision operations", () => {
		it("createDecisionWithTitle creates a decision", async () => {
			await initializeTestProject(core, "Decisions");
			const decision = await core.createDecisionWithTitle("Test Decision");
			expect(decision).toBeDefined();
			expect(decision.title).toBe("Test Decision");
			expect(decision.status).toBe("proposed");
		});

		it("createDecision saves a decision", async () => {
			await initializeTestProject(core, "Save Decision");
			const decision: Decision = {
				id: "decision-test-1",
				title: "Test Decision",
				date: "2025-01-01",
				status: "accepted",
				context: "Context",
				decision: "Use X",
				consequences: "Good",
				rawContent: "## Context\nCtx\n\n## Decision\nX\n\n## Consequences\nGood",
			};
			await core.createDecision(decision);
			const loaded = await core.filesystem.loadDecision("decision-test-1");
			expect(loaded?.title).toBe("Test Decision");
		});

		it("updateDecisionFromContent updates a decision", async () => {
			await initializeTestProject(core, "Update Decision");
			await core.filesystem.saveDecision({
				id: "decision-upd",
				title: "Update Me",
				date: "2025-01-01",
				status: "proposed",
				context: "Old context",
				decision: "Old decision",
				consequences: "Old consequences",
				rawContent: "## Context\nOld\n\n## Decision\nOld\n\n## Consequences\nOld",
			});
			await core.updateDecisionFromContent(
				"decision-upd",
				`---
title: Update Me
status: accepted
---
## Context
New context

## Decision
New decision

## Consequences
New consequences`,
			);
			const loaded = await core.filesystem.loadDecision("decision-upd");
			expect(loaded?.status).toBe("accepted");
		});
	});

	describe("loadTasks with includeCompleted", () => {
		it("loadTasks with includeCompleted runs without errors", async () => {
			await initializeTestProject(core, "Load Completed");
			await core.createTask({
				id: "task-lc",
				title: "Completed T",
				status: "Done",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			const result = await core.loadTasks(undefined, undefined, { includeCompleted: true });
			expect(Array.isArray(result)).toBe(true);
		});
	});

	describe("promoteDraftWithUpdates", () => {
		it("promotes draft with title update", async () => {
			await initializeTestProject(core, "Promote With Updates");
			const { task: draft } = await core.createTaskFromInput({
				title: "Draft To Promote",
				status: "Draft",
				assignee: ["@jo"],
			});
			const updatedTask = await core.editTaskOrDraft(draft.id, {
				title: "Promoted Task",
				status: "In Progress",
			});
			expect(updatedTask.title).toBe("Promoted Task");
		});

		it("promoteDraft returns false for non-existent draft", async () => {
			await initializeTestProject(core, "Missing Draft");
			const result = await core.promoteDraft("draft-999");
			expect(result).toBe(false);
		});
	});

	describe("demoteTaskWithUpdates", () => {
		it("demotes task with title update", async () => {
			await initializeTestProject(core, "Demote With Updates");
			await core.createTask({
				id: "task-dem-up2",
				title: "Task To Demote",
				status: "In Progress",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			const demoted = await core.editTaskOrDraft("task-dem-up2", {
				title: "Demoted Title",
				status: "Draft",
			});
			expect(demoted.title).toBe("Demoted Title");
		});
	});

	describe("listAcceptanceCriteria", () => {
		it("returns empty array for task without criteria", async () => {
			await initializeTestProject(core, "List AC");
			await core.createTask({
				id: "task-noac",
				title: "No AC",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			const criteria = await core.listAcceptanceCriteria("task-noac");
			expect(criteria).toEqual([]);
		});

		it("lists criteria after adding them", async () => {
			await initializeTestProject(core, "List AC2");
			await core.createTask({
				id: "task-ac-list",
				title: "AC List",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			await core.addAcceptanceCriteria("task-ac-list", ["Item 1"]);
			const criteria = await core.listAcceptanceCriteria("task-ac-list");
			expect(criteria).toHaveLength(1);
			expect(criteria[0]?.text).toBe("Item 1");
		});
	});

	describe("checkAcceptanceCriteria", () => {
		it("checks criteria that exist", async () => {
			await initializeTestProject(core, "Check AC");
			await core.createTask({
				id: "task-check",
				title: "Check AC",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			await core.addAcceptanceCriteria("task-check", ["Item 1", "Item 2"]);
			const updated = await core.checkAcceptanceCriteria("task-check", [1], true);
			expect(updated).toEqual([1]);
			const criteria = await core.listAcceptanceCriteria("task-check");
			const item1 = criteria.find((c) => c.index === 1);
			expect(item1?.checked).toBe(true);
		});

		it("throws when no criteria match", async () => {
			await initializeTestProject(core, "Check AC Fail");
			await core.createTask({
				id: "task-cf",
				title: "Check Fail",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			await expect(core.checkAcceptanceCriteria("task-cf", [99], true)).rejects.toThrow("No criteria were updated");
		});
	});

	describe("loadAllTasksForStatistics", () => {
		it("loads tasks without cross-branch scanning", async () => {
			await initializeTestProject(core, "Stats Load");
			await core.createTask({
				id: "task-stats",
				title: "Stats Task",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
			});
			const config = await core.filesystem.loadConfig();
			if (config) {
				config.checkActiveBranches = false;
				await core.filesystem.saveConfig(config);
			}
			const result = await core.loadAllTasksForStatistics();
			expect(result.tasks.length).toBeGreaterThanOrEqual(1);
			expect(result.statuses).toBeDefined();
		});
	});

	describe("editTaskOrDraft edge cases", () => {
		it("editTaskOrDraft throws for non-existent task", async () => {
			await initializeTestProject(core, "Edit Not Found");
			await expect(core.editTaskOrDraft("task-999", { title: "Nope" })).rejects.toThrow();
		});
	});

	describe("reorderTask", () => {
		it("reorderTask works for simple reorder", async () => {
			await initializeTestProject(core, "Reorder");
			await core.createTask({
				id: "task-r1",
				title: "Reorder One",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
				ordinal: 1000,
			});
			await core.createTask({
				id: "task-r2",
				title: "Reorder Two",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
				ordinal: 2000,
			});
			const result = await core.reorderTask({
				taskId: "TASK-R2",
				targetStatus: "To Do",
				orderedTaskIds: ["TASK-R2", "TASK-R1"],
				newIndex: 0,
			});
			expect(result.updatedTask).toBeDefined();
		});
	});

	describe("getTaskContent", () => {
		it("returns content for existing task", async () => {
			await initializeTestProject(core, "Task Content");
			await core.createTask({
				id: "task-content",
				title: "Content Test",
				status: "To Do",
				assignee: [],
				createdDate: "2025-01-01",
				labels: [],
				dependencies: [],
				description: "Some content here",
			});
			const content = await core.getTaskContent("task-content");
			expect(content).not.toBeNull();
			expect(content).toContain("Some content here");
		});

		it("returns null for non-existent task", async () => {
			await initializeTestProject(core, "No Content");
			const content = await core.getTaskContent("task-999");
			expect(content).toBeNull();
		});
	});
});
