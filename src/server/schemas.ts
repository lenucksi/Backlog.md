import { t } from "elysia";

export const ErrorResponse = t.Object({
	error: t.String({ description: "Error message" }),
});

export const Priority = t.Optional(t.Union([t.Literal("high"), t.Literal("medium"), t.Literal("low")]));

export const AcceptanceCriterionSchema = t.Object({
	index: t.Number({ description: "1-based index" }),
	text: t.String({ description: "Criterion description" }),
	checked: t.Boolean({ description: "Fulfilled?" }),
});

export const AcceptanceCriterionInputSchema = t.Object({
	text: t.String({ description: "Criterion description" }),
	checked: t.Optional(t.Boolean({ description: "Already fulfilled?" })),
});

export const TaskSchema = t.Object({
	id: t.String({ description: "Task ID (e.g. BACK-123)" }),
	title: t.String({ description: "Task title" }),
	status: t.String({ description: "Current status" }),
	assignee: t.Array(t.String(), { description: "Assignees" }),
	reporter: t.Optional(t.String({ description: "Reporter" })),
	createdDate: t.String({ description: "Creation date" }),
	updatedDate: t.Optional(t.String({ description: "Last modified" })),
	labels: t.Array(t.String(), { description: "Labels" }),
	milestone: t.Optional(t.String({ description: "Milestone" })),
	dependencies: t.Array(t.String(), { description: "Dependencies" }),
	references: t.Optional(t.Array(t.String(), { description: "References" })),
	modifiedFiles: t.Optional(t.Array(t.String(), { description: "Modified files" })),
	description: t.Optional(t.String({ description: "Description" })),
	implementationPlan: t.Optional(t.String({ description: "Implementation plan" })),
	implementationNotes: t.Optional(t.String({ description: "Implementation notes" })),
	finalSummary: t.Optional(t.String({ description: "Final summary" })),
	acceptanceCriteriaItems: t.Optional(t.Array(AcceptanceCriterionSchema)),
	definitionOfDoneItems: t.Optional(t.Array(AcceptanceCriterionSchema)),
	parentTaskId: t.Optional(t.String({ description: "Parent task" })),
	priority: Priority,
	ordinal: t.Optional(t.Number({ description: "Sort order" })),
	dueDate: t.Optional(t.String({ description: "Due date" })),
	deferDate: t.Optional(t.String({ description: "Defer until" })),
	completedDate: t.Optional(t.String({ description: "Completed on" })),
});

export const TaskCreateInputSchema = t.Object({
	title: t.String({ description: "Task title" }),
	description: t.Optional(t.String({ description: "Description" })),
	status: t.Optional(t.String({ description: "Initial status (default: first status from config)" })),
	priority: t.Optional(t.Union([t.Literal("high"), t.Literal("medium"), t.Literal("low")])),
	milestone: t.Optional(t.String({ description: "Milestone ID" })),
	labels: t.Optional(t.Array(t.String(), { description: "Labels" })),
	assignee: t.Optional(t.Array(t.String(), { description: "Assignees" })),
	dependencies: t.Optional(t.Array(t.String(), { description: "Dependencies (task IDs)" })),
	references: t.Optional(t.Array(t.String(), { description: "References" })),
	modifiedFiles: t.Optional(t.Array(t.String(), { description: "Modified files" })),
	parentTaskId: t.Optional(t.String({ description: "Parent task" })),
	implementationPlan: t.Optional(t.String({ description: "Implementation plan" })),
	implementationNotes: t.Optional(t.String({ description: "Implementation notes" })),
	finalSummary: t.Optional(t.String({ description: "Final summary" })),
	acceptanceCriteria: t.Optional(t.Array(AcceptanceCriterionInputSchema)),
	definitionOfDoneAdd: t.Optional(t.Array(t.String(), { description: "Definition of Done items" })),
	disableDefinitionOfDoneDefaults: t.Optional(t.Boolean()),
	dueDate: t.Optional(t.Union([t.String(), t.Null()])),
	deferDate: t.Optional(t.Union([t.String(), t.Null()])),
});

export const TaskUpdateInputSchema = t.Object({
	title: t.Optional(t.String({ description: "New title" })),
	description: t.Optional(t.String({ description: "New description" })),
	status: t.Optional(t.String({ description: "New status" })),
	force: t.Optional(t.Boolean({ description: "Force status transition" })),
	priority: t.Optional(t.Union([t.Literal("high"), t.Literal("medium"), t.Literal("low")])),
	milestone: t.Optional(t.Union([t.String(), t.Null()], { description: "Set/remove milestone" })),
	labels: t.Optional(t.Array(t.String())),
	addLabels: t.Optional(t.Array(t.String())),
	removeLabels: t.Optional(t.Array(t.String())),
	clearLabels: t.Optional(t.Boolean()),
	assignee: t.Optional(t.Array(t.String())),
	dependencies: t.Optional(t.Array(t.String())),
	addDependencies: t.Optional(t.Array(t.String())),
	removeDependencies: t.Optional(t.Array(t.String())),
	references: t.Optional(t.Array(t.String())),
	addReferences: t.Optional(t.Array(t.String())),
	removeReferences: t.Optional(t.Array(t.String())),
	modifiedFiles: t.Optional(t.Array(t.String())),
	implementationPlan: t.Optional(t.String()),
	implementationNotes: t.Optional(t.String()),
	finalSummary: t.Optional(t.String()),
	acceptanceCriteria: t.Optional(t.Array(AcceptanceCriterionInputSchema)),
	dueDate: t.Optional(t.Union([t.String(), t.Null()])),
	deferDate: t.Optional(t.Union([t.String(), t.Null()])),
});

export const IdParam = t.Object({
	id: t.String({ description: "Entity ID (e.g. BACK-123)" }),
});

export const NameParam = t.Object({
	param: t.String({ description: "URL-encoded name" }),
});

export const SlugParam = t.Object({
	slug: t.String({ description: "URL slug" }),
});

export const BulkActionBody = t.Object({
	ids: t.Array(t.String(), { description: "List of task IDs" }),
	value: t.Optional(t.Any()),
});

export const ReorderBody = t.Object({
	taskId: t.String({ description: "ID of the task to move" }),
	targetStatus: t.String({ description: "Target status column" }),
	orderedTaskIds: t.Array(t.String(), { description: "Ordered task IDs in target status" }),
	targetMilestone: t.Optional(t.Union([t.String(), t.Null()], { description: "Target milestone" })),
});

export const CleanupPreviewQuery = t.Object({
	age: t.Optional(t.String({ description: "Minimum age in days (e.g. '30')" })),
});

export const CleanupExecuteBody = t.Object({
	age: t.Number({ description: "Minimum age in days" }),
});

export const SuccessResponse = t.Object({
	success: t.Boolean(),
});

export const BulkOperationResultSchema = t.Object({
	succeeded: t.Array(t.String()),
	failed: t.Array(
		t.Object({
			id: t.String(),
			error: t.String(),
		}),
	),
});

export const DocumentSchema = t.Object({
	id: t.String({ description: "Document ID" }),
	title: t.String({ description: "Title" }),
	type: t.Union([t.Literal("readme"), t.Literal("guide"), t.Literal("specification"), t.Literal("other")]),
	createdDate: t.String({ description: "Creation date" }),
	updatedDate: t.Optional(t.String({ description: "Last modified" })),
	rawContent: t.String({ description: "Markdown content" }),
	labels: t.Optional(t.Array(t.String())),
	tags: t.Optional(t.Array(t.String())),
	name: t.Optional(t.String()),
	path: t.Optional(t.String()),
	lastModified: t.Optional(t.String()),
});

export const DocumentCreateInputSchema = t.Object({
	title: t.String({ description: "Document title" }),
	content: t.Optional(t.String({ description: "Markdown content" })),
	type: t.Optional(t.Union([t.Literal("readme"), t.Literal("guide"), t.Literal("specification"), t.Literal("other")])),
	path: t.Optional(t.String({ description: "File path relative to docs/ directory" })),
	labels: t.Optional(t.Array(t.String())),
	tags: t.Optional(t.Array(t.String())),
});

export const DocumentUpdateInputSchema = t.Object({
	content: t.Optional(t.String({ description: "New markdown content" })),
	title: t.Optional(t.String({ description: "New title" })),
	type: t.Optional(t.Union([t.Literal("readme"), t.Literal("guide"), t.Literal("specification"), t.Literal("other")])),
	path: t.Optional(t.Union([t.String(), t.Null()], { description: "File path" })),
	labels: t.Optional(t.Array(t.String())),
	tags: t.Optional(t.Array(t.String())),
});

export const DecisionSchema = t.Object({
	id: t.String({ description: "Decision ID" }),
	title: t.String({ description: "Title" }),
	date: t.String({ description: "Creation date" }),
	status: t.Union([t.Literal("proposed"), t.Literal("accepted"), t.Literal("rejected"), t.Literal("superseded")]),
	context: t.String({ description: "Context" }),
	decision: t.String({ description: "Decision" }),
	consequences: t.String({ description: "Consequences" }),
	alternatives: t.Optional(t.String({ description: "Alternatives" })),
	supersedes: t.Optional(t.String({ description: "Supersedes decision" })),
	supersededBy: t.Optional(t.String({ description: "Superseded by decision" })),
	labels: t.Optional(t.Array(t.String())),
});

export const MilestoneSchema = t.Object({
	id: t.String({ description: "Milestone ID" }),
	title: t.String({ description: "Title" }),
	description: t.String({ description: "Description" }),
});

export const MilestoneCreateBody = t.Object({
	title: t.String({ description: "Milestone title" }),
	description: t.Optional(t.String({ description: "Description" })),
});

export const MilestoneUpdateBody = t.Object({
	title: t.Optional(t.String({ description: "New title" })),
	description: t.Optional(t.Union([t.String(), t.Null()], { description: "New description" })),
	updateTasks: t.Optional(t.Boolean({ description: "Also rename task milestones" })),
});

export const MilestoneDeleteBody = t.Object({
	taskHandling: t.Optional(
		t.Union([t.Literal("clear"), t.Literal("keep"), t.Literal("reassign")], {
			description: "How to handle tasks in deleted milestone",
		}),
	),
	reassignTo: t.Optional(t.String({ description: "Target milestone when reassigning" })),
});

export const MilestoneSuccessResponse = t.Object({
	success: t.Boolean(),
	milestone: t.Optional(t.Nullable(MilestoneSchema)),
});

export const LabelConfigSchema = t.Object({
	name: t.String({ description: "Label name" }),
	color: t.Optional(t.String({ description: "Color (hex code)" })),
});

export const AuthorConfigSchema = t.Object({
	name: t.String({ description: "Author name" }),
	color: t.Optional(t.String({ description: "Color (hex code)" })),
});

export const LabelBody = t.Object({
	name: t.String({ description: "Label name" }),
	color: t.Optional(t.String({ description: "Color (hex code)" })),
});

export const AuthorBody = t.Object({
	name: t.String({ description: "Author name" }),
	color: t.Optional(t.String({ description: "Color (hex code)" })),
});

export const RenameLabelBody = t.Object({
	name: t.Optional(t.String({ description: "New name" })),
	color: t.Optional(t.String({ description: "New color (hex code)" })),
});

export const RenameAuthorBody = t.Object({
	name: t.Optional(t.String({ description: "New name" })),
	color: t.Optional(t.String({ description: "New color (hex code)" })),
});

export const SearchQuery = t.Object({
	query: t.Optional(t.String({ description: "Search query" })),
	limit: t.Optional(t.String({ description: "Maximum results" })),
	type: t.Optional(t.String({ description: "Filter: entity type (task, document, decision)" })),
	types: t.Optional(t.String({ description: "Comma-separated types (task,document,decision)" })),
	status: t.Optional(t.String({ description: "Filter: status" })),
	assignee: t.Optional(t.String({ description: "Filter: assignee" })),
	priority: t.Optional(t.String({ description: "Filter: priority (high, medium, low)" })),
	label: t.Optional(t.String({ description: "Filter: single label" })),
	labels: t.Optional(t.String({ description: "Filter: comma-separated labels" })),
	milestone: t.Optional(t.String({ description: "Filter: milestone" })),
	modifiedFile: t.Optional(t.String({ description: "Filter: modified file" })),
});

export const TaskListFilterQuery = t.Object({
	status: t.Optional(t.String({ description: "Filter: status" })),
	assignee: t.Optional(t.String({ description: "Filter: assignee" })),
	priority: t.Optional(t.String({ description: "Filter: priority (high, medium, low)" })),
	milestone: t.Optional(t.String({ description: "Filter: milestone" })),
	parent: t.Optional(t.String({ description: "Filter: parent task ID" })),
	label: t.Optional(t.String({ description: "Filter: label" })),
	labels: t.Optional(t.String({ description: "Filter: comma-separated labels" })),
	crossBranch: t.Optional(t.String({ description: "'true' for cross-branch search" })),
});

export const SequenceSchema = t.Object({
	index: t.Number({ description: "1-based sequence index" }),
	tasks: t.Array(TaskSchema),
});

export const MoveSequenceBody = t.Object({
	taskId: t.String({ description: "Task ID" }),
	unsequenced: t.Optional(t.Boolean({ description: "Remove task from sequence" })),
	targetSequenceIndex: t.Optional(t.Number({ description: "Target sequence index" })),
});

export const FileContentQuery = t.Object({
	path: t.String({ description: "File path relative to project root" }),
});

export const VersionSchema = t.Object({
	version: t.String({ description: "Backlog.md version" }),
});

export const InitBody = t.Object({
	projectName: t.String({ description: "Project name" }),
	backlogDirectory: t.Optional(t.String({ description: "Backlog directory" })),
	backlogDirectorySource: t.Optional(t.Union([t.Literal("backlog"), t.Literal(".backlog"), t.Literal("custom")])),
	configLocation: t.Optional(t.Union([t.Literal("folder"), t.Literal("root")])),
	integrationMode: t.Optional(t.Union([t.Literal("mcp"), t.Literal("cli"), t.Literal("none")])),
});
