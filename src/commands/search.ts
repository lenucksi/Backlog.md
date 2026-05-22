import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import type {
	DecisionSearchResult,
	DocumentSearchResult,
	SearchPriorityFilter,
	SearchResult,
	SearchResultType,
	TaskSearchResult,
} from "../types/index.ts";
import { isLocalEditableTask } from "../types/index.ts";
import {
	createMultiValueAccumulator,
	isPlainRequested,
	requireProjectRoot,
	shouldAutoPlain,
} from "../utils/cli-context.ts";
import { hasAnyPrefix } from "../utils/prefix-config.ts";
import { parseDelimitedStringList } from "../utils/task-builders.ts";

function buildSearchFilterDescription(filters: {
	status?: string;
	priority?: SearchPriorityFilter;
	query?: string;
	modifiedFiles?: string[];
}): string {
	const parts: string[] = [];
	if (filters.query) {
		parts.push(`Query: ${filters.query}`);
	}
	if (filters.status) {
		parts.push(`Status: ${filters.status}`);
	}
	if (filters.priority) {
		parts.push(`Priority: ${filters.priority}`);
	}
	if (filters.modifiedFiles?.length) {
		parts.push(`Modified files: ${filters.modifiedFiles.join(", ")}`);
	}
	return parts.join(" • ");
}

function formatScore(score: number | null): string {
	if (score === null || score === undefined) {
		return "";
	}
	const invertedScore = 1 - score;
	return ` [score ${invertedScore.toFixed(3)}]`;
}

function isTaskSearchResult(result: SearchResult): result is TaskSearchResult {
	return result.type === "task";
}

function printSearchResults(results: SearchResult[]): void {
	if (results.length === 0) {
		console.log("No results found.");
		return;
	}

	const tasks: TaskSearchResult[] = [];
	const documents: DocumentSearchResult[] = [];
	const decisions: DecisionSearchResult[] = [];

	for (const result of results) {
		if (result.type === "task") {
			tasks.push(result);
			continue;
		}
		if (result.type === "document") {
			documents.push(result);
			continue;
		}
		decisions.push(result);
	}

	const localTasks = tasks.filter((t) => isLocalEditableTask(t.task));

	let printed = false;

	if (localTasks.length > 0) {
		console.log("Tasks:");
		for (const taskResult of localTasks) {
			const { task } = taskResult;
			const scoreText = formatScore(taskResult.score);
			const statusText = task.status ? ` (${task.status})` : "";
			const priorityText = task.priority ? ` [${task.priority.toUpperCase()}]` : "";
			console.log(`  ${task.id} - ${task.title}${statusText}${priorityText}${scoreText}`);
		}
		printed = true;
	}

	if (documents.length > 0) {
		if (printed) {
			console.log("");
		}
		console.log("Documents:");
		for (const documentResult of documents) {
			const { document } = documentResult;
			const scoreText = formatScore(documentResult.score);
			console.log(`  ${document.id} - ${document.title}${scoreText}`);
		}
		printed = true;
	}

	if (decisions.length > 0) {
		if (printed) {
			console.log("");
		}
		console.log("Decisions:");
		for (const decisionResult of decisions) {
			const { decision } = decisionResult;
			const scoreText = formatScore(decisionResult.score);
			console.log(`  ${decision.id} - ${decision.title}${scoreText}`);
		}
		printed = true;
	}

	if (!printed) {
		console.log("No results found.");
	}
}

export function registerSearchCommand(program: Command): void {
	program
		.command("search [query]")
		.description("search tasks, documents, and decisions using the shared index")
		.option("--type <type>", "limit results to type (task, document, decision)", createMultiValueAccumulator())
		.option("--status <status>", "filter task results by status")
		.option("--priority <priority>", "filter task results by priority (high, medium, low)")
		.option(
			"--modified-file <path>",
			"filter task results by modified file path substring",
			createMultiValueAccumulator(),
		)
		.option("--limit <number>", "limit total results returned")
		.option("--plain", "print plain text output instead of interactive UI")
		.action(async (query: string | undefined, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const searchService = await core.getSearchService();
			const contentStore = await core.getContentStore();
			const cleanup = () => {
				searchService.dispose();
				contentStore.dispose();
			};

			const modifiedFileFilters = parseDelimitedStringList(options.modifiedFile);
			const rawTypes = options.type ? (Array.isArray(options.type) ? options.type : [options.type]) : undefined;
			const allowedTypes: SearchResultType[] = ["task", "document", "decision"];
			const types = rawTypes
				? rawTypes
						.map((value: string) => value.toLowerCase())
						.filter((value: string): value is SearchResultType => {
							if (!allowedTypes.includes(value as SearchResultType)) {
								console.warn(`Ignoring unsupported type '${value}'. Supported: task, document, decision`);
								return false;
							}
							return true;
						})
				: modifiedFileFilters?.length
					? ["task"]
					: allowedTypes;

			const filters: { status?: string; priority?: SearchPriorityFilter; modifiedFiles?: string[] } = {};
			if (options.status) {
				filters.status = String(options.status);
			}
			if (options.priority) {
				const priorityLower = String(options.priority).toLowerCase();
				const validPriorities: SearchPriorityFilter[] = ["high", "medium", "low"];
				if (!validPriorities.includes(priorityLower as SearchPriorityFilter)) {
					console.error("Invalid priority. Valid values: high, medium, low");
					cleanup();
					process.exitCode = 1;
					return;
				}
				filters.priority = priorityLower as SearchPriorityFilter;
			}
			if (modifiedFileFilters?.length) {
				filters.modifiedFiles = modifiedFileFilters;
			}

			let limit: number | undefined;
			if (options.limit !== undefined) {
				const parsed = Number.parseInt(String(options.limit), 10);
				if (Number.isNaN(parsed) || parsed <= 0) {
					console.error("--limit must be a positive integer");
					cleanup();
					process.exitCode = 1;
					return;
				}
				limit = parsed;
			}

			const searchResults = searchService.search({
				query: query ?? "",
				limit,
				types: types as SearchResultType[],
				filters,
			});

			const usePlainOutput = isPlainRequested(options) || shouldAutoPlain;
			if (usePlainOutput) {
				printSearchResults(searchResults);
				cleanup();
				return;
			}

			const taskResults = searchResults.filter(isTaskSearchResult);
			const searchResultTasks = taskResults.map((result) => result.task);

			const allTasks = (await core.queryTasks()).filter(
				(task) => task.id && task.id.trim() !== "" && hasAnyPrefix(task.id),
			);

			if (allTasks.length === 0) {
				printSearchResults(searchResults);
				cleanup();
				return;
			}

			const hasModifiedFileFilter = Boolean(modifiedFileFilters?.length);
			const interactiveTasks = hasModifiedFileFilter ? searchResultTasks : allTasks;
			if (interactiveTasks.length === 0) {
				printSearchResults(searchResults);
				cleanup();
				return;
			}

			const firstTask = searchResultTasks[0] || interactiveTasks[0];
			const priorityFilter = filters.priority ? filters.priority : undefined;
			const statusFilter = filters.status;
			const { runUnifiedView } = await import("../ui/unified-view.ts");

			await runUnifiedView({
				core,
				initialView: "task-list",
				selectedTask: firstTask,
				tasks: interactiveTasks,
				filter: {
					title: query ? `Search: ${query}` : "Search",
					filterDescription: buildSearchFilterDescription({
						status: statusFilter,
						priority: priorityFilter,
						query: query ?? "",
						modifiedFiles: modifiedFileFilters ?? [],
					}),
					status: statusFilter,
					priority: priorityFilter,
					searchQuery: query ?? "",
				},
			});
			cleanup();
		});
}
