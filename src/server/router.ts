import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
// aislop-ignore-file narrative-comment — all narrative comments here are section separators
// @ts-expect-error — Bun-specific with { type: "file" } import, no TS types
import favicon from "../web/favicon.png" with { type: "file" };
import { applyNoStoreHeaders } from "./middleware.ts";
import { createBulkRoutes, createEntityRoutes } from "./route-factories.ts";
import { CleanupPreviewQuery, FileContentQuery, IdParam, SearchQuery, TaskListFilterQuery } from "./schemas";

// --- Types ---

export type RouteHandlers = {
	tasks: {
		handleListTasks: (req: Request) => Promise<Response>;
		handleSearch: (req: Request) => Promise<Response>;
		handleCreateTask: (req: Request) => Promise<Response>;
		handleGetTask: (taskId: string) => Promise<Response>;
		handleUpdateTask: (req: Request, taskId: string) => Promise<Response>;
		handleDeleteTask: (taskId: string) => Promise<Response>;
		handleDemoteTask: (taskId: string) => Promise<Response>;
		handleReorderTask: (req: Request) => Promise<Response>;
		handleCleanupPreview: (req: Request) => Promise<Response>;
		handleCleanupExecute: (req: Request) => Promise<Response>;
		handleGetSequences: () => Promise<Response>;
		handleMoveSequence: (req: Request) => Promise<Response>;
		handleListCompletedTasks: () => Promise<Response>;
		handleReopenTask: (taskId: string) => Promise<Response>;
		handleBulkArchive: (req: Request) => Promise<Response>;
		handleBulkStatus: (req: Request) => Promise<Response>;
		handleBulkPriority: (req: Request) => Promise<Response>;
		handleBulkAssignee: (req: Request) => Promise<Response>;
		handleBulkLabels: (req: Request) => Promise<Response>;
		handleBulkMilestone: (req: Request) => Promise<Response>;
		handleBulkDueDate: (req: Request) => Promise<Response>;
	};
	documents: {
		handleListDocs: () => Promise<Response>;
		handleGetDoc: (docId: string) => Promise<Response>;
		handleCreateDoc: (req: Request) => Promise<Response>;
		handleUpdateDoc: (req: Request, docId: string) => Promise<Response>;
		handleListArchivedDocs: () => Promise<Response>;
		handleRestoreDocument: (docId: string) => Promise<Response>;
		handleDocumentArchive: (docId: string) => Promise<Response>;
		handleDocumentDelete: (docId: string) => Promise<Response>;
	};
	decisions: {
		handleListDecisions: () => Promise<Response>;
		handleGetDecision: (decisionId: string) => Promise<Response>;
		handleCreateDecision: (req: Request) => Promise<Response>;
		handleUpdateDecision: (req: Request, decisionId: string) => Promise<Response>;
		handleResolveDecision: (decisionId: string) => Promise<Response>;
	};
	drafts: {
		handleListDrafts: () => Promise<Response>;
		handlePromoteDraft: (draftId: string) => Promise<Response>;
	};
	milestones: {
		handleListMilestones: () => Promise<Response>;
		handleListArchivedMilestones: () => Promise<Response>;
		handleGetMilestone: (milestoneId: string) => Promise<Response>;
		handleCreateMilestone: (req: Request) => Promise<Response>;
		handleUpdateMilestone: (req: Request, milestoneId: string) => Promise<Response>;
		handleRemoveMilestone: (req: Request, milestoneId: string) => Promise<Response>;
		handleArchiveMilestone: (milestoneId: string) => Promise<Response>;
	};
	config: {
		handleGetStatuses: () => Promise<Response>;
		handleGetConfig: () => Promise<Response>;
		handleUpdateConfig: (req: Request) => Promise<Response>;
		handleListLabels: () => Promise<Response>;
		handleAddLabel: (req: Request) => Promise<Response>;
		handleRenameLabel: (req: Request & { params: { name: string } }) => Promise<Response>;
		handleRemoveLabel: (req: Request & { params: { name: string } }) => Promise<Response>;
		handleListAuthors: () => Promise<Response>;
		handleAddAuthor: (req: Request) => Promise<Response>;
		handleRenameAuthor: (req: Request & { params: { name: string } }) => Promise<Response>;
		handleRemoveAuthor: (req: Request & { params: { name: string } }) => Promise<Response>;
	};
	system: {
		handleGetVersion: () => Promise<Response>;
		handleGetStatistics: () => Promise<Response>;
		handleGetStatus: () => Promise<Response>;
		handleGetDuplicates: () => Promise<Response>;
		handleInit: (req: Request) => Promise<Response>;
		handleAssetRequest: (req: Request) => Promise<Response>;
	};
	files: {
		handleGetFileContent: (req: Request) => Promise<Response>;
	};
	backlinks: {
		handleGetBacklinks: (entityId: string) => Promise<Response>;
	};
};

export interface AssetHelpers {
	resolveHtml: () => Promise<BunFile>;
	resolveAsset: (path: string) => Promise<BunFile | null>;
	getContentType: (path: string) => string;
}

// ===== Action Route Plugin =====

function actionRoute(
	path: string,
	handler: (id: string) => Promise<Response>,
	meta: {
		summary: string;
		description: string;
		tags: string[];
		responses: Record<string, { description: string }>;
	},
) {
	return new Elysia({ name: "action-route" }).post(path, ({ params: { id } }) => handler(id), {
		params: IdParam,
		detail: { summary: meta.summary, description: meta.description, tags: meta.tags, responses: meta.responses },
	});
}

// ===== App Builder =====

export function buildElysiaApp(
	handlers: RouteHandlers,
	spaHandler: () => Promise<Response>,
	assetHelpers?: AssetHelpers,
) {
	const { tasks, documents, decisions, drafts, milestones, config, system, files, backlinks } = handlers;

	const app = new Elysia()
		.use(cors())
		.use(
			swagger({
				path: "/swagger",
				documentation: {
					info: {
						title: "Backlog.md API",
						version: "1.5.0",
						description:
							"REST API for Backlog.md task management — OpenAPI 3.0 spec auto-generated by @elysiajs/swagger",
						contact: {
							name: "Backlog.md Team",
							url: "https://github.com/backlog-md/backlog.md",
						},
						license: {
							name: "MIT",
							url: "https://opensource.org/licenses/MIT",
						},
					},
					externalDocs: {
						description: "Backlog.md Documentation",
						url: "https://github.com/backlog-md/backlog.md",
					},
					tags: [
						{ name: "Tasks", description: "Task CRUD, bulk operations, cleanup, sequences, and search" },
						{ name: "Documents", description: "Document CRUD and archival" },
						{ name: "Decisions", description: "Decision CRUD and resolution" },
						{ name: "Drafts", description: "Draft listing and promotion to task" },
						{ name: "Milestones", description: "Milestone CRUD and archival" },
						{ name: "Config", description: "Application configuration, labels, and authors" },
						{ name: "System", description: "Version, statistics, server status, and initialization" },
						{ name: "Search", description: "Full-text search across tasks, documents, and decisions" },
						{ name: "Sequences", description: "Task sequence ordering for parallel execution" },
						{ name: "Files", description: "File content access" },
						{ name: "Backlinks", description: "Backlink resolution between entities" },
					],
				},
			}),
		)
		.get("/", async () => {
			const result = await (assetHelpers?.resolveHtml?.() ?? spaHandler());
			if (result instanceof Response) return result;
			return new Response(result as BodyInit, {
				headers: { "Content-Type": "text/html" },
			});
		})
		.get("/favicon*", () => {
			return new Response(Bun.file(favicon), {
				headers: { "Content-Type": "image/png" },
			});
		})
		// --- Tasks ---
		.use(
			createEntityRoutes(
				"tasks",
				{
					list: (req: Request) => tasks.handleListTasks(req),
					create: (req: Request) => tasks.handleCreateTask(req),
					get: (id: string) => tasks.handleGetTask(id),
					update: (req: Request, id: string) => tasks.handleUpdateTask(req, id),
					delete: (id: string) => tasks.handleDeleteTask(id),
				},
				{
					tag: "Tasks",
					entity: "task",
					listQuery: TaskListFilterQuery,
					descriptions: {
						list: {
							summary: "List all tasks",
							description: "Returns all tasks, optionally filtered by status, assignee, priority, milestone, or label",
						},
						create: {
							summary: "Create a task",
							description:
								"Creates a new task with title, status, priority, labels, assignees, and optional fields. The task ID is auto-generated.",
							responseDesc: "Created Task object",
						},
						get: {
							summary: "Get task by ID",
							description: "Returns a single task by its ID (e.g. BACK-123). Includes subtask summaries.",
							responseDesc: "Task object with subtaskSummaries",
							notFoundDesc: "Task not found",
						},
						update: {
							summary: "Update a task",
							description:
								"Updates title, status, description, priority, labels, assignee, milestone, dependencies, implementation plan, acceptance criteria, due date, and other fields of an existing task",
							responseDesc: "Updated Task object",
							notFoundDesc: "Task not found",
						},
						delete: {
							summary: "Delete a task",
							description: "Permanently deletes a task. The task file is removed from disk.",
							responseDesc: "Confirmation { success: true }",
							notFoundDesc: "Task not found",
						},
					},
				},
			),
		)
		.get("/api/tasks/completed", () => tasks.handleListCompletedTasks(), {
			detail: {
				summary: "List completed tasks",
				description: "Returns all tasks from the completed/ directory",
				tags: ["Tasks"],
				responses: { 200: { description: "Array of Task objects" } },
			},
		})
		.post("/api/tasks/:id/demote", ({ params: { id } }) => tasks.handleDemoteTask(id), {
			params: IdParam,
			detail: {
				summary: "Demote task to draft",
				description: "Converts a task into a draft. The task file is deleted and a draft file is created.",
				tags: ["Tasks"],
				responses: { 200: { description: "Confirmation { success: true }" } },
			},
		})
		.post("/api/tasks/:id/reopen", ({ params: { id } }) => tasks.handleReopenTask(id), {
			params: IdParam,
			detail: {
				summary: "Reopen a task",
				description: "Moves a completed or archived task back to an active status",
				tags: ["Tasks"],
				responses: { 200: { description: "Confirmation { success: true }" } },
			},
		})
		.use(
			createBulkRoutes([
				{
					path: "/api/tasks/bulk/archive",
					handler: tasks.handleBulkArchive,
					summary: "Bulk archive tasks",
					description: "Archives multiple tasks at once by their IDs",
				},
				{
					path: "/api/tasks/bulk/status",
					handler: tasks.handleBulkStatus,
					summary: "Bulk update status",
					description: "Updates the status for multiple tasks at once",
				},
				{
					path: "/api/tasks/bulk/priority",
					handler: tasks.handleBulkPriority,
					summary: "Bulk update priority",
					description: "Updates the priority (high/medium/low) for multiple tasks at once",
				},
				{
					path: "/api/tasks/bulk/assignee",
					handler: tasks.handleBulkAssignee,
					summary: "Bulk update assignee",
					description: "Updates the assignees for multiple tasks at once",
				},
				{
					path: "/api/tasks/bulk/labels",
					handler: tasks.handleBulkLabels,
					summary: "Bulk update labels",
					description: "Updates the labels for multiple tasks at once",
				},
				{
					path: "/api/tasks/bulk/milestone",
					handler: tasks.handleBulkMilestone,
					summary: "Bulk update milestone",
					description: "Sets or removes the milestone for multiple tasks at once",
				},
				{
					path: "/api/tasks/bulk/due-date",
					handler: tasks.handleBulkDueDate,
					summary: "Bulk update due date",
					description: "Sets or removes the due date for multiple tasks at once",
				},
			]),
		)
		.post("/api/tasks/reorder", ({ request }) => tasks.handleReorderTask(request), {
			detail: {
				summary: "Reorder tasks",
				description:
					"Moves a task to a different status column and/or a different position within the column. Optionally changes the milestone as well.",
				tags: ["Tasks"],
				responses: {
					200: { description: "Object with success and updated task" },
				},
			},
		})
		.get("/api/tasks/cleanup", ({ request }) => tasks.handleCleanupPreview(request), {
			query: CleanupPreviewQuery,
			detail: {
				summary: "Preview cleanup",
				description: "Previews which tasks would be cleaned up (archived) based on the minimum age",
				tags: ["Tasks"],
				responses: { 200: { description: "Object with count and tasks array" } },
			},
		})
		.post("/api/tasks/cleanup/execute", ({ request }) => tasks.handleCleanupExecute(request), {
			detail: {
				summary: "Execute cleanup",
				description: "Archives all tasks older than the specified number of days to the completed/ directory",
				tags: ["Tasks"],
				responses: { 200: { description: "Object with success, movedCount, totalCount" } },
			},
		})
		// --- Documents ---
		.use(
			createEntityRoutes(
				"docs",
				{
					list: () => documents.handleListDocs(),
					create: (req: Request) => documents.handleCreateDoc(req),
					get: (id: string) => documents.handleGetDoc(id),
					update: (req: Request, id: string) => documents.handleUpdateDoc(req, id),
					delete: (id: string) => documents.handleDocumentDelete(id),
				},
				{
					tag: "Documents",
					entity: "document",
					descriptions: {
						list: {
							summary: "List documents",
							description: "Returns all documents from the docs/ directory",
						},
						create: {
							summary: "Create a document",
							description:
								"Creates a new document in the docs/ directory. Type: readme, guide, specification, or other.",
							responseDesc: "Created Document object",
						},
						get: {
							summary: "Get document by ID",
							description: "Returns a single document with its full markdown content",
							responseDesc: "Document object with rawContent",
							notFoundDesc: "Document not found",
						},
						update: {
							summary: "Update a document",
							description: "Updates content, title, type, path, labels, or tags of a document",
							responseDesc: "Updated Document object",
							notFoundDesc: "Document not found",
						},
						delete: {
							summary: "Delete a document",
							description: "Permanently deletes a document. Non-archived documents are archived first, then deleted.",
							responseDesc: "Confirmation { success: true }",
							notFoundDesc: "Document not found",
						},
					},
				},
			),
		)
		.get("/api/docs/archived", () => documents.handleListArchivedDocs(), {
			detail: {
				summary: "List archived documents",
				description: "Returns all archived documents from the docs/archive/ directory",
				tags: ["Documents"],
				responses: { 200: { description: "Array of Document objects" } },
			},
		})
		.use(
			actionRoute("/api/docs/:id/restore", (id) => documents.handleRestoreDocument(id), {
				summary: "Restore archived document",
				description: "Restores an archived document from docs/archive/ back to docs/",
				tags: ["Documents"],
				responses: {
					200: { description: "Confirmation { success: true }" },
					404: { description: "Archived document not found" },
				},
			}),
		)
		.use(
			actionRoute("/api/docs/:id/archive", (id) => documents.handleDocumentArchive(id), {
				summary: "Archive a document",
				description: "Moves a document to the docs/archive/ directory",
				tags: ["Documents"],
				responses: {
					200: { description: "Confirmation { success: true }" },
					404: { description: "Document not found" },
				},
			}),
		)
		// --- Decisions ---
		.use(
			createEntityRoutes(
				"decisions",
				{
					list: () => decisions.handleListDecisions(),
					create: (req: Request) => decisions.handleCreateDecision(req),
					get: (id: string) => decisions.handleGetDecision(id),
					update: (req: Request, id: string) => decisions.handleUpdateDecision(req, id),
				},
				{
					tag: "Decisions",
					entity: "decision",
					descriptions: {
						list: {
							summary: "List decisions",
							description: "Returns all Architectural Decision Records (ADRs)",
						},
						create: {
							summary: "Create a decision",
							description: "Creates a new Architectural Decision Record in the decisions/ directory",
							responseDesc: "Created Decision object",
						},
						get: {
							summary: "Get decision by ID",
							description: "Returns a single Architectural Decision Record",
							responseDesc: "Decision object",
							notFoundDesc: "Decision not found",
						},
						update: {
							summary: "Update a decision",
							description: "Updates the content (raw text) of an Architectural Decision Record",
							responseDesc: "Confirmation { success: true }",
							notFoundDesc: "Decision not found",
						},
					},
				},
			),
		)
		.use(
			actionRoute("/api/decisions/:id/resolve", (id) => decisions.handleResolveDecision(id), {
				summary: "Resolve a decision",
				description: "Sets a decision to 'accepted' status. Fails if already resolved or superseded.",
				tags: ["Decisions"],
				responses: {
					200: { description: "Confirmation with updated decision" },
					404: { description: "Decision not found" },
					409: { description: "Decision already resolved or superseded" },
				},
			}),
		)
		// --- Drafts ---
		.get("/api/drafts", () => drafts.handleListDrafts(), {
			detail: {
				summary: "List drafts",
				description: "Returns all drafts from the drafts/ directory",
				tags: ["Drafts"],
				responses: { 200: { description: "Array of Draft objects" } },
			},
		})
		.use(
			actionRoute("/api/drafts/:id/promote", (id) => drafts.handlePromoteDraft(id), {
				summary: "Promote draft to task",
				description: "Converts a draft into a task. The draft is deleted and a new task file is created.",
				tags: ["Drafts"],
				responses: {
					200: { description: "Confirmation { success: true }" },
					404: { description: "Draft not found" },
					409: { description: "Conflict: draft cannot be promoted" },
				},
			}),
		)
		// --- Milestones ---
		.use(
			createEntityRoutes(
				"milestones",
				{
					list: () => milestones.handleListMilestones(),
					create: (req: Request) => milestones.handleCreateMilestone(req),
					get: (id: string) => milestones.handleGetMilestone(id),
					update: (req: Request, id: string) => milestones.handleUpdateMilestone(req, id),
				},
				{
					tag: "Milestones",
					entity: "milestone",
					descriptions: {
						list: {
							summary: "List milestones",
							description: "Returns all milestones from the milestones/ directory",
						},
						create: {
							summary: "Create a milestone",
							description: "Creates a new milestone in the milestones/ directory",
							responseDesc: "Created Milestone object",
						},
						get: {
							summary: "Get milestone by ID",
							description: "Returns a single milestone",
							responseDesc: "Milestone object",
							notFoundDesc: "Milestone not found",
						},
						update: {
							summary: "Update a milestone",
							description: "Updates the title and description of a milestone. Optionally renames linked tasks.",
							responseDesc: "Object with success, milestone, and message",
							notFoundDesc: "Milestone not found",
						},
						delete: {
							summary: "Delete a milestone",
							description:
								"Deletes a milestone. Options for handling associated tasks: clear (removes milestone), keep (keeps reference), reassign (moves to another milestone).",
							responseDesc: "Object with success and message",
							notFoundDesc: "Milestone not found",
						},
					},
				},
			),
		)
		.delete("/api/milestones/:id", ({ request, params: { id } }) => milestones.handleRemoveMilestone(request, id), {
			params: IdParam,
			detail: {
				summary: "Delete a milestone",
				description:
					"Deletes a milestone. Options for handling associated tasks: clear (removes milestone), keep (keeps reference), reassign (moves to another milestone).",
				tags: ["Milestones"],
				responses: {
					200: { description: "Object with success and message" },
					404: { description: "Milestone not found" },
				},
			},
		})
		.get("/api/milestones/archived", () => milestones.handleListArchivedMilestones(), {
			detail: {
				summary: "List archived milestones",
				description: "Returns all archived milestones",
				tags: ["Milestones"],
				responses: { 200: { description: "Array of Milestone objects" } },
			},
		})
		.use(
			actionRoute("/api/milestones/:id/archive", (id) => milestones.handleArchiveMilestone(id), {
				summary: "Archive a milestone",
				description: "Archives a milestone (moves it from milestones/ to the archive)",
				tags: ["Milestones"],
				responses: {
					200: { description: "Object with success and milestone" },
					404: { description: "Milestone not found" },
				},
			}),
		)
		// --- Config ---
		.get("/api/statuses", () => config.handleGetStatuses(), {
			detail: {
				summary: "Get status list",
				description: "Returns the configured status values from backlog.config.yml",
				tags: ["Config"],
				responses: { 200: { description: "Array of status strings" } },
			},
		})
		.get("/api/config", () => config.handleGetConfig(), {
			detail: {
				summary: "Get configuration",
				description: "Returns the full backlog.config.yml as a BacklogConfig object",
				tags: ["Config"],
				responses: { 200: { description: "BacklogConfig object" } },
			},
		})
		.put("/api/config", ({ request }) => config.handleUpdateConfig(request), {
			detail: {
				summary: "Update configuration",
				description: "Updates backlog.config.yml with new values. Requires at least projectName.",
				tags: ["Config"],
				responses: { 200: { description: "Updated BacklogConfig object" } },
			},
		})
		.use(
			createEntityRoutes(
				"config/labels",
				{
					list: () => config.handleListLabels(),
					create: (req: Request) => config.handleAddLabel(req),
					update: (req: Request & { params: { name: string } }) => config.handleRenameLabel(req),
					delete: (req: Request & { params: { name: string } }) => config.handleRemoveLabel(req),
				},
				{
					tag: "Config",
					entity: "label",
					useNameParam: true,
					descriptions: {
						list: {
							summary: "List labels",
							description: "Returns all configured labels (name + optional color)",
						},
						create: {
							summary: "Add a label",
							description: "Adds a new label with name and optional color (hex code)",
							responseDesc: "Updated array of LabelConfig objects",
						},
						get: {
							summary: "Get label by name",
							description: "Returns a single label configuration",
							responseDesc: "LabelConfig object",
							notFoundDesc: "Label not found",
						},
						update: {
							summary: "Rename a label",
							description: "Changes the name and/or color of an existing label",
							responseDesc: "Updated array of LabelConfig objects",
							notFoundDesc: "Label not found",
						},
						delete: {
							summary: "Remove a label",
							description: "Removes a label from the configuration",
							responseDesc: "Updated array of LabelConfig objects",
							notFoundDesc: "Label not found",
						},
					},
				},
			),
		)
		.use(
			createEntityRoutes(
				"config/authors",
				{
					list: () => config.handleListAuthors(),
					create: (req: Request) => config.handleAddAuthor(req),
					update: (req: Request & { params: { name: string } }) => config.handleRenameAuthor(req),
					delete: (req: Request & { params: { name: string } }) => config.handleRemoveAuthor(req),
				},
				{
					tag: "Config",
					entity: "author",
					useNameParam: true,
					descriptions: {
						list: {
							summary: "List authors",
							description: "Returns all configured authors (name + optional color)",
						},
						create: {
							summary: "Add an author",
							description: "Adds a new author with name and optional color (hex code)",
							responseDesc: "Updated array of AuthorConfig objects",
						},
						get: {
							summary: "Get author by name",
							description: "Returns a single author configuration",
							responseDesc: "AuthorConfig object",
							notFoundDesc: "Author not found",
						},
						update: {
							summary: "Rename an author",
							description: "Changes the name and/or color of an existing author",
							responseDesc: "Updated array of AuthorConfig objects",
							notFoundDesc: "Author not found",
						},
						delete: {
							summary: "Remove an author",
							description: "Removes an author from the configuration",
							responseDesc: "Updated array of AuthorConfig objects",
							notFoundDesc: "Author not found",
						},
					},
				},
			),
		)
		// --- System ---
		.get("/api/version", () => system.handleGetVersion(), {
			detail: {
				summary: "Get API version",
				description: "Returns the current Backlog.md version number",
				tags: ["System"],
				responses: { 200: { description: "Object with version string" } },
			},
		})
		.get("/api/statistics", () => system.handleGetStatistics(), {
			detail: {
				summary: "Get statistics",
				description: "Returns project statistics: task count, status and priority distributions",
				tags: ["System"],
				responses: { 200: { description: "Statistics object with statusCounts and priorityCounts" } },
			},
		})
		.get("/api/status", () => system.handleGetStatus(), {
			detail: {
				summary: "Get server status",
				description: "Returns the current server status (initialized, project path, config source)",
				tags: ["System"],
				responses: { 200: { description: "Status object with initialized project details" } },
			},
		})
		.get("/api/duplicates", () => system.handleGetDuplicates(), {
			detail: {
				summary: "Find duplicates",
				description: "Searches tasks for potential duplicates (e.g. based on similar titles)",
				tags: ["System"],
				responses: { 200: { description: "Array of DuplicateInfo objects" } },
			},
		})
		.post("/api/init", ({ request }) => system.handleInit(request), {
			detail: {
				summary: "Initialize project",
				description: "Initializes a new Backlog.md project. Creates backlog.config.yml and optional MCP setup.",
				tags: ["System"],
				responses: { 200: { description: "Object with success, projectName, and mcpResults" } },
			},
		})
		// --- Search ---
		.get("/api/search", ({ request }) => tasks.handleSearch(request), {
			query: SearchQuery,
			detail: {
				summary: "Full-text search",
				description:
					"Searches tasks, documents, and decisions for a term. Supports filtering by type, status, assignee, label, priority, milestone, and file path.",
				tags: ["Search"],
				responses: { 200: { description: "Array of SearchResult objects (Task, Document, or Decision)" } },
			},
		})
		// --- Sequences ---
		.get("/api/sequences", () => tasks.handleGetSequences(), {
			detail: {
				summary: "List sequences",
				description: "Returns all task sequences. Each sequence contains tasks that can run in parallel.",
				tags: ["Sequences"],
				responses: { 200: { description: "Array of Sequence objects with indexed tasks" } },
			},
		})
		.post("/api/sequences/move", ({ request }) => tasks.handleMoveSequence(request), {
			detail: {
				summary: "Move task in sequence",
				description: "Moves a task to a different sequence or removes it from sequence ordering",
				tags: ["Sequences"],
				responses: { 200: { description: "Updated array of Sequence objects" } },
			},
		})
		// --- Files ---
		.get("/api/file-content", ({ request }) => files.handleGetFileContent(request), {
			query: FileContentQuery,
			detail: {
				summary: "Get file content",
				description:
					"Reads the content of a file relative to the project root. Used for attachment previews and file inspection.",
				tags: ["Files"],
				responses: {
					200: { description: "File content as text" },
				},
			},
		})
		// --- Backlinks ---
		.get("/api/backlinks", () => backlinks.handleGetBacklinks(""), {
			detail: {
				summary: "List backlinks (global)",
				description: "Returns 400 because entityId is missing. Use /api/backlinks/:id for a specific task.",
				tags: ["Backlinks"],
				responses: { 400: { description: "entityId is required" } },
				deprecated: true,
			},
		})
		.get("/api/backlinks/:id", ({ params: { id } }) => backlinks.handleGetBacklinks(id), {
			params: IdParam,
			detail: {
				summary: "Get backlinks for entity",
				description: "Returns all backlinks (references from other entities to this ID)",
				tags: ["Backlinks"],
				responses: {
					200: { description: "Array of Backlink objects" },
				},
			},
		})
		.onAfterHandle(({ response }) => {
			if (response) {
				applyNoStoreHeaders((response as Response).headers);
			}
		})
		// --- SPA fallback ---
		.get("/tasks", spaHandler)
		.get("/tasks/*", spaHandler)
		.get("/board", spaHandler)
		.get("/board/*", spaHandler)
		.get("/milestones", spaHandler)
		.get("/drafts", spaHandler)
		.get("/documentation", spaHandler)
		.get("/documentation/*", spaHandler)
		.get("/decisions", spaHandler)
		.get("/decisions/*", spaHandler)
		.get("/statistics", spaHandler)
		.get("/settings", spaHandler);

	return app;
}
