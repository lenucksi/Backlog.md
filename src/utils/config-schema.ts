import type { BacklogConfig } from "../types/index.ts";

function validateInteger(opts: { min?: number; max?: number; message: string }): (value: unknown) => string | null {
	return (value) => {
		if (typeof value !== "number" || !Number.isInteger(value)) {
			return opts.message;
		}
		if (opts.min !== undefined && value < opts.min) return opts.message;
		if (opts.max !== undefined && value > opts.max) return opts.message;
		return null;
	};
}

export interface ConfigSchemaEntry {
	key: string;
	type: "string" | "number" | "boolean" | "string[]" | "label[]" | "author[]";
	description: string;
	configKey: string;
	default?: unknown;
	readOnly?: boolean;
	rejectMessage?: string;
	validate?: (value: unknown) => string | null | Promise<string | null>;
}

export const CONFIG_SCHEMA_ENTRIES: ConfigSchemaEntry[] = [
	{
		key: "project_name",
		type: "string",
		description: "Project name",
		configKey: "projectName",
	},
	{
		key: "default_assignee",
		type: "string",
		description: "Default task assignee",
		configKey: "defaultAssignee",
	},
	{
		key: "default_reporter",
		type: "string",
		description: "Default task reporter",
		configKey: "defaultReporter",
	},
	{
		key: "default_status",
		type: "string",
		description: "Default status for new tasks",
		configKey: "defaultStatus",
	},
	{
		key: "statuses",
		type: "string[]",
		description: "All task statuses (replaces entire list)",
		configKey: "statuses",
		validate: (value) => {
			if (!Array.isArray(value) || !value.every((s) => typeof s === "string")) {
				return 'must be a JSON array of strings, e.g. \'[\\"Todo\\", \\"Doing\\", \\"Done\\"]\'';
			}
			return null;
		},
	},
	{
		key: "terminal_statuses",
		type: "string[]",
		description: "Statuses that mark a task as terminal",
		configKey: "terminalStatuses",
		default: ["Done"],
	},
	{
		key: "new_statuses",
		type: "string[]",
		description: "Statuses that mark a task as new/not started",
		configKey: "newStatuses",
		default: [],
	},
	{
		key: "running_statuses",
		type: "string[]",
		description: "Statuses that mark a task as in progress",
		configKey: "runningStatuses",
		default: [],
	},
	{
		key: "blocked_statuses",
		type: "string[]",
		description: "Statuses that mark a task as blocked",
		configKey: "blockedStatuses",
		default: ["Blocked"],
	},
	{
		key: "labels",
		type: "label[]",
		description: "Labels (replaces entire list; use 'backlog label' for incremental changes)",
		configKey: "labels",
		validate: (value) => {
			if (!Array.isArray(value)) {
				return 'must be a JSON array of labels, e.g. \'[\\"bug\\", {\\"name\\": \\"feature\\", \\"color\\": \\"#00ff00\\"}]\'';
			}
			for (const item of value) {
				if (typeof item === "string") continue;
				if (typeof item === "object" && item !== null && typeof (item as Record<string, unknown>).name === "string")
					continue;
				return "each label must be a string or {name: string, color?: string}";
			}
			return null;
		},
	},
	{
		key: "authors",
		type: "author[]",
		description: "Authors",
		configKey: "authors",
		validate: (value) => {
			if (!Array.isArray(value)) {
				return "must be a JSON array of authors";
			}
			for (const item of value) {
				if (typeof item === "string") continue;
				if (typeof item === "object" && item !== null && typeof (item as Record<string, unknown>).name === "string")
					continue;
				return "each author must be a string or {name: string, color?: string}";
			}
			return null;
		},
	},
	{
		key: "definition_of_done",
		type: "string[]",
		description: "Definition of Done checklist items",
		configKey: "definitionOfDone",
		default: [],
		validate: (value) => {
			if (value !== undefined && !(Array.isArray(value) && value.every((s) => typeof s === "string"))) {
				return "must be a JSON array of strings";
			}
			return null;
		},
	},
	{
		key: "max_column_width",
		type: "number",
		description: "Maximum column width in TUI",
		configKey: "maxColumnWidth",
		default: 20,
	},
	{
		key: "default_editor",
		type: "string",
		description: "Default editor binary (must be in PATH)",
		configKey: "defaultEditor",
		validate: async (value) => {
			if (typeof value !== "string" || !value.trim()) return "must be a non-empty string";
			const { isEditorAvailable: checkEditor } = await import("../utils/editor.ts");
			const available = await checkEditor(value);
			if (!available) return `editor command not found: ${value}`;
			return null;
		},
	},
	{
		key: "default_port",
		type: "number",
		description: "Web UI port",
		configKey: "defaultPort",
		default: 6420,
		validate: validateInteger({ min: 1, max: 65535, message: "must be an integer between 1 and 65535" }),
	},
	{
		key: "auto_open_browser",
		type: "boolean",
		description: "Auto-open browser when starting web UI",
		configKey: "autoOpenBrowser",
		default: true,
	},
	{
		key: "remote_operations",
		type: "boolean",
		description: "Enable remote Git operations",
		configKey: "remoteOperations",
		default: true,
	},
	{
		key: "auto_commit",
		type: "boolean",
		description: "Auto-commit on task changes",
		configKey: "autoCommit",
		default: false,
	},
	{
		key: "filesystem_only",
		type: "boolean",
		description: "Disable all Git integration",
		configKey: "filesystemOnly",
		validate: (value) => {
			if (typeof value !== "boolean") return "must be true or false";
			return null;
		},
	},
	{
		key: "zero_padded_ids",
		type: "number",
		description: "Zero-padded ID digits (0 = disabled)",
		configKey: "zeroPaddedIds",
		default: 0,
		validate: validateInteger({ min: 0, message: "must be a non-negative integer (0 = disabled)" }),
	},
	{
		key: "bypass_git_hooks",
		type: "boolean",
		description: "Bypass Git hooks",
		configKey: "bypassGitHooks",
		default: false,
	},
	{
		key: "check_active_branches",
		type: "boolean",
		description: "Check task states across active branches",
		configKey: "checkActiveBranches",
		default: true,
	},
	{
		key: "active_branch_days",
		type: "number",
		description: "How many days a branch is considered active",
		configKey: "activeBranchDays",
		default: 30,
		validate: validateInteger({ min: 0, message: "must be a non-negative integer" }),
	},
	{
		key: "auto_collapse_milestones",
		type: "boolean",
		description: "Auto-collapse milestone swimlanes when all tasks are done",
		configKey: "autoCollapseMilestones",
		default: true,
	},
	{
		key: "on_status_change",
		type: "string",
		description: "Callback command on task status change (supports $TASK_ID, $OLD_STATUS, $NEW_STATUS, $TASK_TITLE)",
		configKey: "onStatusChange",
	},
	{
		key: "backlog_directory",
		type: "string",
		description: "Project-relative backlog directory",
		configKey: "backlogDirectory",
		readOnly: true,
	},
	{
		key: "task_prefix",
		type: "string",
		description: "Task ID prefix (set during init, cannot be changed)",
		configKey: "prefixes",
		readOnly: true,
	},
];

export function getSchemaDefaults(): Partial<BacklogConfig> {
	const result: Record<string, unknown> = {};
	for (const entry of CONFIG_SCHEMA_ENTRIES) {
		if (entry.readOnly) continue;
		if (entry.default !== undefined) {
			result[entry.configKey] = entry.default;
		}
	}
	return result as Partial<BacklogConfig>;
}

export const CONFIG_SCHEMA_MAP = new Map<string, ConfigSchemaEntry>(CONFIG_SCHEMA_ENTRIES.map((e) => [e.key, e]));

export const KNOWN_CONFIG_KEYS = CONFIG_SCHEMA_ENTRIES.map((e) => e.key);
