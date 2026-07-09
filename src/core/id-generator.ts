import type { GitOperations } from "../git/operations.ts";
import type { BacklogConfig, Decision, Document, Task } from "../types/index.ts";
import { EntityType } from "../types/index.ts";
import { buildIdRegex, getPrefixForType } from "../utils/prefix-config.ts";
import { normalizeTaskId, taskIdsEqual } from "../utils/task-path.ts";
import { buildLatestStateMap } from "./task-input-resolvers.ts";
import type { BranchTaskStateEntry } from "./task-loader.ts";
import { loadLocalBranchTasks, loadRemoteTasks } from "./task-loader.ts";

export interface IdGeneratorDeps {
	filesystem: {
		loadConfig(): Promise<BacklogConfig | null>;
		listTasks(): Promise<Task[]>;
		listCompletedTasks(): Promise<Task[]>;
		listDrafts(): Promise<Task[]>;
		listDocuments(): Promise<Document[]>;
		listDecisions(): Promise<Decision[]>;
	};
	git: GitOperations;
	getBacklogDirectoryName(): Promise<string>;
	listTasksWithMetadata(): Promise<Array<Task & { lastModified?: Date }>>;
}

export function getActiveAndCompletedIdsFromStateMap(latestState: Map<string, BranchTaskStateEntry>): string[] {
	const ids: string[] = [];
	for (const [id, entry] of latestState) {
		if (entry.type === "task" || entry.type === "completed") {
			ids.push(id);
		}
	}
	return ids;
}

async function getActiveAndCompletedTaskIds(deps: IdGeneratorDeps): Promise<string[]> {
	const config = await deps.filesystem.loadConfig();

	const localTasks = await deps.listTasksWithMetadata();
	const localCompletedTasks = await deps.filesystem.listCompletedTasks();

	const stateEntries: BranchTaskStateEntry[] = [];

	for (const task of localTasks) {
		if (!task.id) continue;
		const lastModified = task.lastModified ?? (task.updatedDate ? new Date(task.updatedDate) : new Date(0));
		stateEntries.push({
			id: task.id,
			type: "task",
			branch: "local",
			path: "",
			lastModified,
		});
	}

	for (const task of localCompletedTasks) {
		if (!task.id) continue;
		const lastModified = task.updatedDate ? new Date(task.updatedDate) : new Date(0);
		stateEntries.push({
			id: task.id,
			type: "completed",
			branch: "local",
			path: "",
			lastModified,
		});
	}

	if (config?.checkActiveBranches !== false) {
		const branchStateEntries: BranchTaskStateEntry[] = [];
		const backlogDir = await deps.getBacklogDirectoryName();

		await Promise.all([
			loadRemoteTasks(deps.git, config, undefined, localTasks, branchStateEntries, false, backlogDir),
			loadLocalBranchTasks(deps.git, config, undefined, localTasks, branchStateEntries, false, backlogDir),
		]);

		stateEntries.push(...branchStateEntries);
	}

	const latestState = buildLatestStateMap(stateEntries, []);
	return getActiveAndCompletedIdsFromStateMap(latestState);
}

async function getExistingIdsForType(deps: IdGeneratorDeps, type: EntityType): Promise<string[]> {
	switch (type) {
		case EntityType.Task:
			return getActiveAndCompletedTaskIds(deps);
		case EntityType.Draft: {
			const drafts = await deps.filesystem.listDrafts();
			return drafts.map((d) => d.id);
		}
		case EntityType.Document: {
			const documents = await deps.filesystem.listDocuments();
			return documents.map((d) => d.id);
		}
		case EntityType.Decision: {
			const decisions = await deps.filesystem.listDecisions();
			return decisions.map((d) => d.id);
		}
		default:
			return [];
	}
}

export async function generateNextId(
	deps: IdGeneratorDeps,
	type: EntityType = EntityType.Task,
	parent?: string,
): Promise<string> {
	const config = await deps.filesystem.loadConfig();
	const prefix = getPrefixForType(type, config ?? undefined);

	const allIds = await getExistingIdsForType(deps, type);

	if (parent) {
		const normalizedParent = allIds.find((id) => taskIdsEqual(parent, id)) ?? normalizeTaskId(parent);
		const upperParent = normalizedParent.toUpperCase();
		let max = 0;
		for (const id of allIds) {
			if (id.toUpperCase().startsWith(`${upperParent}.`)) {
				const rest = id.slice(normalizedParent.length + 1);
				const num = Number.parseInt(rest.split(".")[0] || "0", 10);
				if (num > max) max = num;
			}
		}
		const nextSubIdNumber = max + 1;
		const padding = config?.zeroPaddedIds;

		if (padding && padding > 0) {
			const paddedSubId = String(nextSubIdNumber).padStart(2, "0");
			return `${normalizedParent}.${paddedSubId}`;
		}

		return `${normalizedParent}.${nextSubIdNumber}`;
	}

	const regex = buildIdRegex(prefix);
	const upperPrefix = prefix.toUpperCase();
	let max = 0;
	for (const id of allIds) {
		const match = id.match(regex);
		if (match?.[1] && !match[1].includes(".")) {
			const num = Number.parseInt(match[1], 10);
			if (num > max) max = num;
		}
	}
	const nextIdNumber = max + 1;
	const padding = config?.zeroPaddedIds;

	if (padding && padding > 0) {
		const paddedId = String(nextIdNumber).padStart(padding, "0");
		return `${upperPrefix}-${paddedId}`;
	}

	return `${upperPrefix}-${nextIdNumber}`;
}
