import type { Task } from "../types/index.ts";
import { detectDeadlocks } from "../utils/deadlock-detection.ts";
import { isTerminalStatus } from "../utils/terminal-status.ts";

export interface TaskStatistics {
	statusCounts: Map<string, number>;
	priorityCounts: Map<string, number>;
	totalTasks: number;
	completedTasks: number;
	completionPercentage: number;
	draftCount: number;
	archivedCount: number;
	archivedTasks: Task[];
	recentActivity: {
		created: Task[];
		updated: Task[];
	};
	projectHealth: {
		averageTaskAge: number;
		staleTasks: Task[];
		blockedTasks: Task[];
		blockedByStatus: Task[];
		deadlockedTaskGroups: string[][];
	};
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * MS_PER_DAY;
const ONE_MONTH_MS = 30 * MS_PER_DAY;

function toDate(value: string | undefined | null, fallback = 0): Date {
	return new Date(value ?? fallback);
}

function sortByDateDesc(tasks: Task[], field: "createdDate" | "updatedDate"): Task[] {
	return tasks.sort((a, b) => toDate(b[field]).getTime() - toDate(a[field]).getTime());
}

function getAgeInDays(createdDate: string, now: Date, isTerminal: boolean, updatedDate?: string): number {
	const start = new Date(createdDate).getTime();
	const end = isTerminal && updatedDate ? new Date(updatedDate).getTime() : now.getTime();
	return Math.floor((end - start) / MS_PER_DAY);
}

function isStaleTask(task: Task, oneMonthAgo: Date, isTerminal: boolean): boolean {
	if (isTerminal) return false;
	const lastDate = task.updatedDate || task.createdDate;
	if (!lastDate) return false;
	return new Date(lastDate) < oneMonthAgo;
}

export function getTaskStatistics(
	tasks: Task[],
	drafts: Task[],
	statuses: string[],
	terminalStatuses?: string[],
	archivedTasks?: Task[],
	blockedStatuses?: string[],
): TaskStatistics {
	const statusCounts = new Map<string, number>();
	for (const status of statuses) {
		statusCounts.set(status, 0);
	}

	const priorityCounts = new Map<string, number>([
		["high", 0],
		["medium", 0],
		["low", 0],
		["none", 0],
	]);

	let completedTasks = 0;
	const now = new Date();
	const oneWeekAgo = new Date(now.getTime() - ONE_WEEK_MS);
	const oneMonthAgo = new Date(now.getTime() - ONE_MONTH_MS);

	const recentlyCreated: Task[] = [];
	const recentlyUpdated: Task[] = [];
	const staleTasks: Task[] = [];
	const blockedTasks: Task[] = [];
	const blockedByStatus: Task[] = [];
	let totalAge = 0;
	let taskCount = 0;

	for (const task of tasks) {
		if (!task.status || task.status === "") continue;

		statusCounts.set(task.status, (statusCounts.get(task.status) || 0) + 1);

		const terminal = isTerminalStatus(task.status, statuses, terminalStatuses);
		if (terminal) completedTasks++;

		const priority = task.priority || "none";
		priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1);

		if (task.createdDate) {
			if (new Date(task.createdDate) >= oneWeekAgo) {
				recentlyCreated.push(task);
			}
			totalAge += getAgeInDays(task.createdDate, now, terminal, task.updatedDate);
			taskCount++;
		}

		if (task.updatedDate && new Date(task.updatedDate) >= oneWeekAgo) {
			recentlyUpdated.push(task);
		}

		if (isStaleTask(task, oneMonthAgo, terminal)) {
			staleTasks.push(task);
		}

		if (task.dependencies && task.dependencies.length > 0 && !terminal) {
			const hasBlocking = task.dependencies.some((depId) => {
				const dep = tasks.find((t) => t.id === depId);
				return dep && !isTerminalStatus(dep.status, statuses, terminalStatuses);
			});
			if (hasBlocking) blockedTasks.push(task);
		}

		if (task.status && blockedStatuses && blockedStatuses.length > 0) {
			const s = task.status;
			if (blockedStatuses.some((bs) => bs.toLowerCase() === s.toLowerCase())) {
				blockedByStatus.push(task);
			}
		}
	}

	sortByDateDesc(recentlyCreated, "createdDate");
	sortByDateDesc(recentlyUpdated, "updatedDate");

	const deadlockedTaskGroups = detectDeadlocks(tasks);

	const averageTaskAge = taskCount > 0 ? Math.round(totalAge / taskCount) : 0;
	const totalTasks = Array.from(statusCounts.values()).reduce((sum, count) => sum + count, 0);
	const combinedCompleted = completedTasks + (archivedTasks?.length ?? 0);
	const completionPercentage = totalTasks > 0 ? Math.round((combinedCompleted / totalTasks) * 100) : 0;

	return {
		statusCounts,
		priorityCounts,
		totalTasks,
		completedTasks: combinedCompleted,
		completionPercentage,
		draftCount: drafts.length,
		archivedCount: archivedTasks?.length ?? 0,
		archivedTasks: archivedTasks ?? [],
		recentActivity: {
			created: recentlyCreated.slice(0, 5),
			updated: recentlyUpdated.slice(0, 5),
		},
		projectHealth: {
			averageTaskAge,
			staleTasks: staleTasks.slice(0, 5),
			blockedTasks: blockedTasks.slice(0, 5),
			blockedByStatus: blockedByStatus.slice(0, 5),
			deadlockedTaskGroups,
		},
	};
}
