import { t } from "elysia";

export const IdParam = t.Object({
	id: t.String({ description: "Entity ID (e.g. BACK-123)" }),
});

export const CleanupPreviewQuery = t.Object({
	age: t.Optional(t.String({ description: "Minimum age in days (e.g. '30')" })),
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

export const FileContentQuery = t.Object({
	path: t.String({ description: "File path relative to project root" }),
});
