import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { $ } from "bun";
import { McpServer } from "../mcp/server.ts";
import { registerMilestoneTools } from "../mcp/tools/milestones/index.ts";
import { registerTaskTools } from "../mcp/tools/tasks/index.ts";
import { createUniqueTestDir, initializeTestProject, safeCleanup } from "./test-utils.ts";

const getText = (content: unknown[] | undefined, index = 0): string => {
	const item = content?.[index] as { text?: string } | undefined;
	return item?.text ?? "";
};

let TEST_DIR: string;
let mcpServer: McpServer;

async function loadConfig() {
	const config = await mcpServer.filesystem.loadConfig();
	if (!config) throw new Error("Failed to load config");
	return config;
}

describe("MCP task tools coverage", () => {
	beforeEach(async () => {
		TEST_DIR = createUniqueTestDir("mcp-tasks-cov");
		mcpServer = new McpServer(TEST_DIR, "Test instructions");
		await mcpServer.filesystem.ensureBacklogStructure();

		await $`git init -b main`.cwd(TEST_DIR).quiet();
		await $`git config user.name "Test User"`.cwd(TEST_DIR).quiet();
		await $`git config user.email test@example.com`.cwd(TEST_DIR).quiet();

		await initializeTestProject(mcpServer, "Cov Project");

		const config = await loadConfig();
		registerTaskTools(mcpServer, config);
		registerMilestoneTools(mcpServer);
	});

	afterEach(async () => {
		try {
			await mcpServer.stop();
		} catch {
			/* ignore */
		}
		await safeCleanup(TEST_DIR);
	});

	it("creates a task with all optional fields", async () => {
		await mcpServer.testInterface.callTool({
			params: {
				name: "milestone_add",
				arguments: { name: "v1.0" },
			},
		});

		const result = await mcpServer.testInterface.callTool({
			params: {
				name: "task_create",
				arguments: {
					title: "Full feature task",
					description: "Description text",
					status: "In Progress",
					priority: "high",
					labels: ["backend", "api"],
					assignee: ["@dev"],
					ordinal: 5000,
					milestone: "v1.0",
					acceptanceCriteria: ["AC1", "AC2"],
					definitionOfDoneAdd: ["Code reviewed", "Tests pass"],
					dependencies: [],
					references: ["https://example.com"],
					documentation: ["https://docs.example.com"],
					modifiedFiles: ["src/index.ts"],
					finalSummary: "Implemented the feature",
					disableDefinitionOfDoneDefaults: true,
				},
			},
		});
		const text = getText(result.content);
		expect(text).toContain("TASK-1 - Full feature task");
		expect(text).toContain("Ordinal: 5000");
		expect(text).toContain("Priority: High");
		expect(text).toContain("In Progress");
	});

	it("returns validation error for task create with null ordinal", async () => {
		const result = await mcpServer.testInterface.callTool({
			params: {
				name: "task_create",
				arguments: {
					title: "Null ordinal",
					ordinal: null,
				},
			},
		});
		expect(result.isError).toBe(true);
		const text = getText(result.content);
		expect(text).toContain("Ordinal");
	});

	it("returns error when searching without query or modifiedFiles", async () => {
		const result = await mcpServer.testInterface.callTool({
			params: {
				name: "task_search",
				arguments: {},
			},
		});
		expect(result.isError).toBe(true);
		const text = getText(result.content);
		expect(text).toContain("query");
	});

	it("returns error for editTask on nonexistent task", async () => {
		const result = await mcpServer.testInterface.callTool({
			params: {
				name: "task_edit",
				arguments: { id: "nonexistent", title: "Edited" },
			},
		});
		expect(result.isError).toBe(true);
	});

	it("returns error for archiveTask on nonexistent task", async () => {
		const result = await mcpServer.testInterface.callTool({
			params: {
				name: "task_archive",
				arguments: { id: "nonexistent" },
			},
		});
		expect(result.isError).toBe(true);
	});

	it("returns error for completeTask on nonexistent task", async () => {
		const result = await mcpServer.testInterface.callTool({
			params: {
				name: "task_complete",
				arguments: { id: "nonexistent" },
			},
		});
		expect(result.isError).toBe(true);
	});

	it("returns not-found for viewTask on nonexistent id", async () => {
		const result = await mcpServer.testInterface.callTool({
			params: {
				name: "task_view",
				arguments: { id: "nonexistent" },
			},
		});
		expect(result.isError).toBe(true);
	});

	it("lists drafts via task_list with status=Draft", async () => {
		await mcpServer.testInterface.callTool({
			params: {
				name: "task_create",
				arguments: { title: "Draft task", status: "Draft" },
			},
		});

		const result = await mcpServer.testInterface.callTool({
			params: {
				name: "task_list",
				arguments: { status: "Draft" },
			},
		});
		const text = getText(result.content);
		expect(text).toContain("Draft");
		expect(text).toContain("DRAFT-1 - Draft task");
	});

	it("lists drafts filtered by assignee", async () => {
		await mcpServer.testInterface.callTool({
			params: {
				name: "task_create",
				arguments: { title: "Draft assignee test", status: "Draft", assignee: ["@me"] },
			},
		});

		const result = await mcpServer.testInterface.callTool({
			params: {
				name: "task_list",
				arguments: { status: "Draft", assignee: "@me" },
			},
		});
		const text = getText(result.content);
		expect(text).toContain("DRAFT-1");
	});

	it("searches drafts", async () => {
		await mcpServer.testInterface.callTool({
			params: {
				name: "task_create",
				arguments: { title: "Draft with file", status: "Draft", modifiedFiles: ["src/feature.ts"] },
			},
		});

		const result = await mcpServer.testInterface.callTool({
			params: {
				name: "task_search",
				arguments: { query: "file", status: "Draft" },
			},
		});
		const text = getText(result.content);
		expect(text).toContain("DRAFT-1");
	});

	it("returns no tasks found message for empty list", async () => {
		const result = await mcpServer.testInterface.callTool({
			params: {
				name: "task_list",
				arguments: { status: "Draft" },
			},
		});
		const text = getText(result.content);
		expect(text).toBe("No tasks found.");
	});

	it("handles editTask with null ordinal validation", async () => {
		await mcpServer.testInterface.callTool({
			params: {
				name: "task_create",
				arguments: { title: "Edit me" },
			},
		});

		const result = await mcpServer.testInterface.callTool({
			params: {
				name: "task_edit",
				arguments: { id: "task-1", ordinal: null },
			},
		});
		expect(result.isError).toBe(true);
	});

	it("handles milestone filtering via resolveMilestoneInput", async () => {
		await mcpServer.testInterface.callTool({
			params: { name: "milestone_add", arguments: { name: "Sprint Alpha" } },
		});
		await mcpServer.testInterface.callTool({
			params: { name: "milestone_add", arguments: { name: "Sprint Beta" } },
		});

		await mcpServer.testInterface.callTool({
			params: {
				name: "task_create",
				arguments: { title: "Alpha task", milestone: "Sprint Alpha" },
			},
		});

		const list = await mcpServer.testInterface.callTool({
			params: { name: "task_list", arguments: { milestone: "Sprint Alpha" } },
		});
		const text = (list.content ?? []).map((e) => ("text" in e ? e.text : "")).join("\n\n");
		expect(text).toContain("TASK-1");
	});

	it("completes a task that is in terminal status", async () => {
		await mcpServer.testInterface.callTool({
			params: {
				name: "task_create",
				arguments: { title: "Completable", status: "Done" },
			},
		});

		const completeResult = await mcpServer.testInterface.callTool({
			params: { name: "task_complete", arguments: { id: "task-1" } },
		});
		expect(getText(completeResult.content)).toContain("Completed task");
	});
});
