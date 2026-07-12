import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { formatTaskPlainText } from "../formatters/task-plain-text.ts";
import type { Task } from "../types/index.ts";
import { viewTaskEnhanced } from "../ui/task-viewer-with-search.ts";
import { AppError } from "../utils/app-error.ts";
import { isPlainRequested, requireProjectRoot, shouldAutoPlain } from "../utils/cli-context.ts";
import { applyOutputOptions, getOutputMode, stdout } from "../utils/output.ts";
import { getDraftPath } from "../utils/task-path.ts";
import { sortTasks } from "../utils/task-sorting.ts";

function registerDraftListCommand(draftCmd: Command): void {
	draftCmd
		.command("list")
		.description("list all drafts")
		.option("--sort <field>", "sort drafts by field (priority, id, ordinal)")
		.option("--plain", "use plain text output")
		.action(async (options: { plain?: boolean; sort?: string }) => {
			applyOutputOptions(options);
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			await core.ensureConfigLoaded();
			const drafts = await core.filesystem.listDrafts();

			if (!drafts || drafts.length === 0) {
				stdout("No drafts found.");
				return;
			}

			let sortedDrafts = drafts;

			if (options.sort) {
				const validSortFields = ["priority", "id", "ordinal", "created", "due"];
				const sortField = options.sort.toLowerCase();
				if (!validSortFields.includes(sortField)) {
					console.error(`Invalid sort field: ${options.sort}. Valid values are: priority, id, ordinal, created, due`);
					process.exitCode = 1;
					return;
				}
				sortedDrafts = sortTasks(drafts, sortField);
			} else {
				sortedDrafts = sortTasks(drafts, "priority");
			}

			const usePlainOutput =
				getOutputMode() === "plain" || (getOutputMode() === "auto" && (isPlainRequested(options) || shouldAutoPlain()));
			if (usePlainOutput) {
				stdout("Drafts:");
				for (const draft of sortedDrafts) {
					const priorityIndicator = draft.priority ? `[${draft.priority.toUpperCase()}] ` : "";
					stdout(`  ${priorityIndicator}${draft.id} - ${draft.title}`);
				}
			} else {
				const firstDraft = sortedDrafts[0];
				if (!firstDraft) return;

				const { runUnifiedView } = await import("../ui/unified-view.ts");
				await runUnifiedView({
					core,
					initialView: "task-list",
					selectedTask: firstDraft,
					tasks: sortedDrafts,
					filter: {
						filterDescription: "All Drafts",
					},
					title: "Drafts",
				});
			}
		});
}

function registerDraftCreateCommand(draftCmd: Command): void {
	draftCmd
		.command("create <title>")
		.option("-d, --description <text>", "task description (multi-line: include real newlines inside the quoted string)")
		.option("--desc <text>", "alias for --description")
		.option("-a, --assignee <assignee>", "set draft assignee (comma-separated)")
		.option("-s, --status <status>", "set draft status")
		.option("-l, --labels <labels>", "set draft labels (comma-separated)")
		.action(async (title: string, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			await core.ensureConfigLoaded();
			try {
				const { task, filePath } = await core.createTaskFromInput({
					title,
					description: options.description || options.desc ? String(options.description || options.desc) : undefined,
					status: "Draft",
					assignee: options.assignee ? [String(options.assignee)] : undefined,
					labels: options.labels
						? String(options.labels)
								.split(",")
								.map((label: string) => label.trim())
								.filter(Boolean)
						: undefined,
				});
				stdout(`Created draft ${task.id}`);
				stdout(`File: ${filePath}`);
			} catch (error) {
				console.error(AppError.formatCLIError(error));
				process.exitCode = 1;
			}
		});
}

function registerDraftArchiveCommand(draftCmd: Command): void {
	draftCmd
		.command("archive <taskId>")
		.description("archive a draft")
		.action(async (taskId: string) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const success = await core.archiveDraft(taskId);
			if (success) {
				stdout(`Archived draft ${taskId}`);
			} else {
				console.error(`Draft ${taskId} not found.`);
			}
		});
}

function registerDraftPromoteCommand(draftCmd: Command): void {
	draftCmd
		.command("promote <taskId>")
		.description("promote draft to task")
		.action(async (taskId: string) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			try {
				const success = await core.promoteDraft(taskId);
				if (success) {
					stdout(`Promoted draft ${taskId}`);
				} else {
					console.error(`Draft ${taskId} not found.`);
				}
			} catch (error) {
				console.error(AppError.formatCLIError(error));
				process.exitCode = 1;
			}
		});
}

function registerDraftViewCommand(draftCmd: Command): void {
	draftCmd
		.command("view <taskId>")
		.description("display draft details")
		.option("--plain", "use plain text output instead of interactive UI")
		.action(async (taskId: string, options) => {
			applyOutputOptions(options);
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const filePath = await getDraftPath(taskId, core);

			if (!filePath) {
				console.error(`Draft ${taskId} not found.`);
				return;
			}
			const draft = await core.filesystem.loadDraft(taskId);

			if (!draft) {
				console.error(`Draft ${taskId} not found.`);
				return;
			}

			const usePlainOutput =
				getOutputMode() === "plain" || (getOutputMode() === "auto" && (isPlainRequested(options) || shouldAutoPlain()));
			if (usePlainOutput) {
				stdout(draft, (d) => formatTaskPlainText(d as Task));
				return;
			}

			await viewTaskEnhanced(draft, { startWithDetailFocus: true, core });
		});
}

function registerDraftDefaultCommand(draftCmd: Command): void {
	draftCmd
		.argument("[taskId]")
		.option("--plain", "use plain text output")
		.action(async (taskId: string | undefined, options: { plain?: boolean }) => {
			applyOutputOptions(options);
			if (!taskId) {
				draftCmd.help();
				return;
			}

			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const filePath = await getDraftPath(taskId, core);

			if (!filePath) {
				console.error(`Draft ${taskId} not found.`);
				return;
			}
			const draft = await core.filesystem.loadDraft(taskId);

			if (!draft) {
				console.error(`Draft ${taskId} not found.`);
				return;
			}

			const usePlainOutput =
				getOutputMode() === "plain" || (getOutputMode() === "auto" && (isPlainRequested(options) || shouldAutoPlain()));
			if (usePlainOutput) {
				stdout(draft, (d) => formatTaskPlainText(d as Task, { filePathOverride: filePath }));
				return;
			}

			await viewTaskEnhanced(draft, { startWithDetailFocus: true, core });
		});
}

export function registerDraftCommand(program: Command): void {
	const draftCmd = program.command("draft");

	registerDraftListCommand(draftCmd);
	registerDraftCreateCommand(draftCmd);
	registerDraftArchiveCommand(draftCmd);
	registerDraftPromoteCommand(draftCmd);
	registerDraftViewCommand(draftCmd);
	registerDraftDefaultCommand(draftCmd);
}
