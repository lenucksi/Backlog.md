import type { BranchTaskStateEntry } from "../core/task-loader.ts";
import type { DocumentType, Task, TaskListFilter, TaskUpdateInput } from "../types/index.ts";
import { DOCUMENT_TYPE_VALUES } from "../types/index.ts";
import { validateDependencyChange } from "../utils/dependency-validation.ts";
import {
	normalizeDependencies,
	normalizeStringList,
	stringArraysEqual,
	validateDependencies,
} from "../utils/task-builders.ts";
import { resolveTaskConflict } from "./task-loader.ts";

interface TaskQueryOptions {
	filters?: TaskListFilter;
	query?: string;
	limit?: number;
	includeCrossBranch?: boolean;
}

export function buildLatestStateMap(
	stateEntries: BranchTaskStateEntry[] = [],
	localTasks: Array<Task & { lastModified?: Date; updatedDate?: string }> = [],
): Map<string, BranchTaskStateEntry> {
	const latest = new Map<string, BranchTaskStateEntry>();
	const update = (entry: BranchTaskStateEntry) => {
		const existing = latest.get(entry.id);
		if (!existing || entry.lastModified > existing.lastModified) {
			latest.set(entry.id, entry);
		}
	};

	for (const entry of stateEntries) {
		update(entry);
	}

	for (const task of localTasks) {
		if (!task.id) continue;
		const lastModified = task.lastModified ?? (task.updatedDate ? new Date(task.updatedDate) : new Date(0));

		update({
			id: task.id,
			type: "task",
			branch: "local",
			path: "",
			lastModified,
		});
	}

	return latest;
}

export function filterTasksByStateSnapshots(tasks: Task[], latestState: Map<string, BranchTaskStateEntry>): Task[] {
	return tasks.filter((task) => {
		const latest = latestState.get(task.id);
		if (!latest) return true;
		return latest.type === "task";
	});
}

export function normalizeDocumentTypeInput(type: unknown): DocumentType | undefined {
	if (type === undefined) {
		return undefined;
	}
	if (typeof type === "string" && (DOCUMENT_TYPE_VALUES as readonly string[]).includes(type)) {
		return type as DocumentType;
	}
	throw new Error(`Document type must be one of: ${DOCUMENT_TYPE_VALUES.join(", ")}.`);
}

export function applyStringField(
	value: string | undefined,
	current: string | undefined,
	assign: (next: string) => void,
): boolean {
	if (typeof value === "string") {
		const next = value;
		if ((current ?? "") !== next) {
			assign(next);
			return true;
		}
	}
	return false;
}

export function resolveStringListField(
	task: Task,
	input: { set?: string[]; add?: string[]; remove?: string[] },
	fieldName: "labels" | "references" | "documentation",
): boolean {
	const caseInsensitive = fieldName === "labels";
	let mutated = false;
	const currentArr = task[fieldName] ?? [];
	let current = [...currentArr];

	if (input.set !== undefined) {
		if (input.add || input.remove) {
			throw new Error(
				`Cannot combine --${fieldName} (replace) with --add-${fieldName} or --remove-${fieldName} (incremental). Use only one mode.`,
			);
		}
		const sanitized = normalizeStringList(input.set) ?? [];
		if (!stringArraysEqual(sanitized, current)) {
			current = sanitized;
			mutated = true;
		}
	}

	const toAdd = normalizeStringList(input.add) ?? [];
	if (toAdd.length > 0) {
		const set = caseInsensitive ? new Set(current.map((v) => v.toLowerCase())) : new Set(current);
		for (const item of toAdd) {
			const key = caseInsensitive ? item.toLowerCase() : item;
			if (!set.has(key)) {
				current.push(item);
				set.add(key);
				mutated = true;
			}
		}
	}

	const toRemove = normalizeStringList(input.remove) ?? [];
	if (toRemove.length > 0) {
		const removalSet = caseInsensitive ? new Set(toRemove.map((v) => v.toLowerCase())) : new Set(toRemove);
		const filtered = current.filter((v) => !removalSet.has(caseInsensitive ? v.toLowerCase() : v));
		if (!stringArraysEqual(filtered, current)) {
			current = filtered;
			mutated = true;
		}
	}

	if (mutated) {
		task[fieldName] = current;
	}
	return mutated;
}

export async function resolveDependenciesFromInput(
	task: Task,
	input: { set?: string[]; add?: string[]; remove?: string[]; force?: boolean },
	core: {
		queryTasks: (options?: TaskQueryOptions) => Promise<Task[]>;
		filesystem: { listDrafts: () => Promise<Array<{ id: string }>> };
	},
): Promise<boolean> {
	let mutated = false;
	let currentDependencies = [...(task.dependencies ?? [])];

	if (input.set !== undefined) {
		const normalized = normalizeDependencies(input.set);
		const { valid, invalid } = await validateDependencies(normalized, core as never);
		if (invalid.length > 0) {
			throw new Error(
				`The following dependencies do not exist: ${invalid.join(", ")}. Please create these tasks first or verify the IDs.`,
			);
		}
		if (!stringArraysEqual(valid, currentDependencies)) {
			currentDependencies = valid;
			mutated = true;
		}
	}

	if (input.add && input.add.length > 0) {
		const additions = normalizeDependencies(input.add);
		const { valid, invalid } = await validateDependencies(additions, core as never);
		if (invalid.length > 0) {
			throw new Error(
				`The following dependencies do not exist: ${invalid.join(", ")}. Please create these tasks first or verify the IDs.`,
			);
		}
		const depSet = new Set(currentDependencies);
		for (const dep of valid) {
			if (!depSet.has(dep)) {
				currentDependencies.push(dep);
				depSet.add(dep);
				mutated = true;
			}
		}
	}

	if (input.remove && input.remove.length > 0) {
		const removals = new Set(normalizeDependencies(input.remove));
		const filtered = currentDependencies.filter((dep) => !removals.has(dep));
		if (!stringArraysEqual(filtered, currentDependencies)) {
			currentDependencies = filtered;
			mutated = true;
		}
	}

	if (mutated && !input.force) {
		const allTasks = await core.queryTasks();
		const validation = validateDependencyChange(task.id, currentDependencies, allTasks);
		if (!validation.valid) {
			throw new Error(`Circular dependency detected: ${validation.cycle.join(" → ")}`);
		}
	}

	task.dependencies = currentDependencies;
	return mutated;
}

export function resolveModifiedFilesFromInput(task: Task, input: TaskUpdateInput): boolean {
	if (input.modifiedFiles === undefined) {
		return false;
	}
	const sanitizedModifiedFiles = normalizeStringList(input.modifiedFiles) ?? [];
	if (!stringArraysEqual(sanitizedModifiedFiles, task.modifiedFiles ?? [])) {
		task.modifiedFiles = sanitizedModifiedFiles;
		return true;
	}
	return false;
}

export function sanitizeAppendInput(values: string[] | undefined): string[] {
	if (!values) return [];
	return values.map((value) => String(value).trim()).filter((value) => value.length > 0);
}

type TaskStringField = "implementationPlan" | "implementationNotes" | "finalSummary";

export function applyClearSetAppendBlock(
	task: Task,
	field: TaskStringField,
	clear: boolean | undefined,
	set: string | undefined,
	append: string[] | undefined,
): boolean {
	let mutated = false;
	if (clear && task[field] !== undefined) {
		if (field === "finalSummary") {
			task[field] = "";
		} else {
			delete task[field];
		}
		mutated = true;
	}
	mutated =
		applyStringField(set, task[field], (next) => {
			task[field] = next;
		}) || mutated;
	const appends = sanitizeAppendInput(append);
	if (appends.length > 0) {
		const { value, changed } = appendBlock(task[field], appends);
		if (changed) {
			task[field] = value;
			mutated = true;
		}
	}
	return mutated;
}

export function appendBlock(
	existing: string | undefined,
	additions: string[] | undefined,
): { value?: string; changed: boolean } {
	const sanitizedAdditions = (additions ?? []).map((value) => String(value).trim()).filter((value) => value.length > 0);
	if (sanitizedAdditions.length === 0) {
		return { value: existing, changed: false };
	}
	const current = (existing ?? "").trim();
	const additionBlock = sanitizedAdditions.join("\n\n");
	if (current.length === 0) {
		return { value: additionBlock, changed: true };
	}
	return { value: `${current}\n\n${additionBlock}`, changed: true };
}

export function resolveAcceptanceCriteriaFromInput(task: Task, input: TaskUpdateInput): boolean {
	let mutated = false;
	let acceptanceCriteria = Array.isArray(task.acceptanceCriteriaItems)
		? task.acceptanceCriteriaItems.map((criterion) => ({ ...criterion }))
		: [];

	const rebuildIndices = () => {
		acceptanceCriteria = acceptanceCriteria.map((criterion, index) => ({
			...criterion,
			index: index + 1,
		}));
	};

	if (input.acceptanceCriteria !== undefined) {
		const sanitized = input.acceptanceCriteria
			.map((criterion) => ({
				text: String(criterion.text ?? "").trim(),
				checked: Boolean(criterion.checked),
			}))
			.filter((criterion) => criterion.text.length > 0)
			.map((criterion, index) => ({
				index: index + 1,
				text: criterion.text,
				checked: criterion.checked,
			}));
		acceptanceCriteria = sanitized;
		mutated = true;
	}

	if (input.addAcceptanceCriteria && input.addAcceptanceCriteria.length > 0) {
		const additions = input.addAcceptanceCriteria
			.map((criterion) => (typeof criterion === "string" ? criterion.trim() : String(criterion.text ?? "").trim()))
			.filter((text) => text.length > 0);
		let index =
			acceptanceCriteria.length > 0 ? Math.max(...acceptanceCriteria.map((criterion) => criterion.index)) + 1 : 1;
		for (const text of additions) {
			acceptanceCriteria.push({ index: index++, text, checked: false });
			mutated = true;
		}
	}

	if (input.removeAcceptanceCriteria && input.removeAcceptanceCriteria.length > 0) {
		const removalSet = new Set(input.removeAcceptanceCriteria);
		const beforeLength = acceptanceCriteria.length;
		acceptanceCriteria = acceptanceCriteria.filter((criterion) => !removalSet.has(criterion.index));
		if (acceptanceCriteria.length === beforeLength) {
			throw new Error(
				`Acceptance criterion ${Array.from(removalSet)
					.map((index) => `#${index}`)
					.join(", ")} not found`,
			);
		}
		mutated = true;
		rebuildIndices();
	}

	const toggleCriteria = (indices: number[] | undefined, checked: boolean) => {
		if (!indices || indices.length === 0) return;
		const missing: number[] = [];
		for (const index of indices) {
			const criterion = acceptanceCriteria.find((item) => item.index === index);
			if (!criterion) {
				missing.push(index);
				continue;
			}
			if (criterion.checked !== checked) {
				criterion.checked = checked;
				mutated = true;
			}
		}
		if (missing.length > 0) {
			const label = missing.map((index) => `#${index}`).join(", ");
			throw new Error(`Acceptance criterion ${label} not found`);
		}
	};

	toggleCriteria(input.checkAcceptanceCriteria, true);
	toggleCriteria(input.uncheckAcceptanceCriteria, false);

	task.acceptanceCriteriaItems = acceptanceCriteria;
	return mutated;
}

export function resolveDefinitionOfDoneFromInput(task: Task, input: TaskUpdateInput): boolean {
	let mutated = false;
	let definitionOfDone = Array.isArray(task.definitionOfDoneItems)
		? task.definitionOfDoneItems.map((criterion) => ({ ...criterion }))
		: [];

	const rebuildDefinitionIndices = () => {
		definitionOfDone = definitionOfDone.map((criterion, index) => ({
			...criterion,
			index: index + 1,
		}));
	};

	if (input.addDefinitionOfDone && input.addDefinitionOfDone.length > 0) {
		const additions = input.addDefinitionOfDone
			.map((criterion) => (typeof criterion === "string" ? criterion.trim() : String(criterion.text ?? "").trim()))
			.filter((text) => text.length > 0);
		let index = definitionOfDone.length > 0 ? Math.max(...definitionOfDone.map((criterion) => criterion.index)) + 1 : 1;
		for (const text of additions) {
			definitionOfDone.push({ index: index++, text, checked: false });
			mutated = true;
		}
	}

	const toggleDefinitionItems = (indices: number[] | undefined, checked: boolean) => {
		if (!indices || indices.length === 0) return;
		const missing: number[] = [];
		for (const index of indices) {
			const criterion = definitionOfDone.find((item) => item.index === index);
			if (!criterion) {
				missing.push(index);
				continue;
			}
			if (criterion.checked !== checked) {
				criterion.checked = checked;
				mutated = true;
			}
		}
		if (missing.length > 0) {
			const label = missing.map((index) => `#${index}`).join(", ");
			throw new Error(`Definition of Done item ${label} not found`);
		}
	};

	toggleDefinitionItems(input.checkDefinitionOfDone, true);
	toggleDefinitionItems(input.uncheckDefinitionOfDone, false);

	if (input.removeDefinitionOfDone && input.removeDefinitionOfDone.length > 0) {
		const removalSet = new Set(input.removeDefinitionOfDone);
		const beforeLength = definitionOfDone.length;
		definitionOfDone = definitionOfDone.filter((criterion) => !removalSet.has(criterion.index));
		if (definitionOfDone.length === beforeLength) {
			throw new Error(
				`Definition of Done item ${Array.from(removalSet)
					.map((index) => `#${index}`)
					.join(", ")} not found`,
			);
		}
		mutated = true;
		rebuildDefinitionIndices();
	}

	task.definitionOfDoneItems = definitionOfDone;
	return mutated;
}

export function mergeTaskArray(
	tasksById: Map<string, Task>,
	incomingTasks: Task[],
	abortSignal: AbortSignal | undefined,
	statuses: string[],
	resolutionStrategy: "most_recent" | "most_progressed",
): void {
	for (const incoming of incomingTasks) {
		if (abortSignal?.aborted) {
			throw new Error("Loading cancelled");
		}

		const existing = tasksById.get(incoming.id);
		if (!existing) {
			tasksById.set(incoming.id, incoming);
		} else {
			const resolved = resolveTaskConflict(existing, incoming, statuses, resolutionStrategy);
			tasksById.set(incoming.id, resolved);
		}
	}
}

export function getFilterValue(value: string | string[] | undefined): string | undefined {
	if (!value) return undefined;
	return Array.isArray(value) ? value[0] : value;
}

export function filterTasksWithCompleted(
	tasks: Task[],
	branchStateEntries: BranchTaskStateEntry[] | undefined,
	localTasks: Array<Task & { lastModified?: Date; updatedDate?: string }>,
	completedTasks: Task[],
	abortSignal: AbortSignal | undefined,
	includeCompleted: boolean,
): Task[] {
	if (abortSignal?.aborted) {
		throw new Error("Loading cancelled");
	}

	if (!includeCompleted) {
		return filterTasksByStateSnapshots(tasks, buildLatestStateMap(branchStateEntries || [], localTasks));
	}

	const stateEntries = branchStateEntries || [];
	for (const completedTask of completedTasks) {
		if (!completedTask.id) continue;
		const lastModified = completedTask.updatedDate ? new Date(completedTask.updatedDate) : new Date(0);
		stateEntries.push({
			id: completedTask.id,
			type: "completed",
			branch: "local",
			path: "",
			lastModified,
		});
	}

	const latestState = buildLatestStateMap(stateEntries, localTasks);
	const completedIds = new Set<string>();
	for (const [id, entry] of latestState) {
		if (entry.type === "completed") {
			completedIds.add(id);
		}
	}

	return tasks
		.filter((task) => {
			const latest = latestState.get(task.id);
			if (!latest) return true;
			return latest.type === "task" || latest.type === "completed";
		})
		.map((task) => {
			if (!completedIds.has(task.id)) {
				return task;
			}
			return { ...task, source: "completed" };
		});
}
