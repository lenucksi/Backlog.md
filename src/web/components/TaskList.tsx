import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../lib/api";
import type {
	Milestone,
	SearchPriorityFilter,
	Task,
	TaskSearchResult,
} from "../../types";
import { collectAvailableLabels } from "../../utils/label-filter.ts";
import { taskIdsEqual } from "../../utils/task-path.ts";
import { isTerminalStatus } from "../../utils/terminal-status.ts";
import { collectArchivedMilestoneKeys, getMilestoneLabel, milestoneKey } from "../utils/milestones";
import { formatStoredUtcDateForCompactDisplay, parseStoredUtcDate } from "../utils/date-display";
import CleanupModal from "./CleanupModal";
import LabelFilterDropdown, { MultiSelectDropdown } from "./LabelFilterDropdown";
import FilterChips from "./FilterChips";
import { SuccessToast } from "./SuccessToast";

interface TaskListProps {
	onEditTask: (task: Task) => void;
	onNewTask: () => void;
	tasks: Task[];
	availableStatuses: string[];
	availableLabels: string[];
	availableMilestones: string[];
	milestoneEntities: Milestone[];
	archivedMilestones: Milestone[];
  onRefreshData?: () => Promise<void>;
  labelColors?: Record<string, string>;
  authorColors?: Record<string, string>;
}

const PRIORITY_OPTIONS: SearchPriorityFilter[] = ["high", "medium", "low"];

type TaskSortColumn = "id" | "title" | "status" | "priority" | "ordinal" | "milestone" | "created";
type SortDirection = "asc" | "desc";

const PRIORITY_RANK: Record<string, number> = {
	high: 3,
	medium: 2,
	low: 1,
};

function extractTaskNumericId(taskId: string): number | null {
	const match = taskId.trim().match(/(\d+)$/);
	if (!match?.[1]) return null;
	return Number.parseInt(match[1], 10);
}

function compareTaskIdsAscending(a: Task, b: Task): number {
	const idA = extractTaskNumericId(a.id);
	const idB = extractTaskNumericId(b.id);

	if (idA !== null && idB !== null) {
		return idA - idB;
	}
	if (idA !== null) return -1;
	if (idB !== null) return 1;
	return a.id.localeCompare(b.id, undefined, { sensitivity: "base", numeric: true });
}

function sortTasksByIdDescending(list: Task[]): Task[] {
	return [...list].sort((a, b) => compareTaskIdsAscending(b, a));
}

function getAssigneeInitials(value: string): string {
	const cleaned = value.replace(/^@/, "").trim();
	if (!cleaned) return "?";
	const parts = cleaned
		.split(/[\s._-]+/)
		.map((part) => part.trim())
		.filter(Boolean);
	if (parts.length === 0) return cleaned.slice(0, 2).toUpperCase();
	const first = parts[0] ?? "";
	if (parts.length === 1) return first.slice(0, 2).toUpperCase();
	const second = parts[1] ?? "";
	return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

const TaskList: React.FC<TaskListProps> = ({
	onEditTask,
	onNewTask,
	tasks,
	availableStatuses,
	availableLabels,
	availableMilestones,
	milestoneEntities,
	archivedMilestones,
  onRefreshData,
  labelColors,
  authorColors,
}) => {
	const [searchParams, setSearchParams] = useSearchParams();
	const [statusFilter, setStatusFilter] = useState<string[]>(() => {
		const vals = searchParams.getAll("status");
		return vals.length > 0 ? vals : [];
	});
	const [priorityFilter, setPriorityFilter] = useState<SearchPriorityFilter[]>(() => {
		const vals = searchParams.getAll("priority");
		return vals.length > 0 ? (vals as SearchPriorityFilter[]) : [];
	});
	const [milestoneFilter, setMilestoneFilter] = useState<string[]>(() => {
		const vals = searchParams.getAll("milestone");
		return vals.length > 0 ? vals : [];
	});
	const initialLabelParams = useMemo(() => {
		const labels = [...searchParams.getAll("label"), ...searchParams.getAll("labels")];
		const labelsCsv = searchParams.get("labels");
		if (labelsCsv) labels.push(...labelsCsv.split(","));
		return labels.map((label) => label.trim()).filter((label) => label.length > 0);
	}, []);
	const [labelFilter, setLabelFilter] = useState<string[]>(initialLabelParams);
	const [filterAssignee, setFilterAssignee] = useState(() => searchParams.get("assignee") ?? "");
	const [displayTasks, setDisplayTasks] = useState<Task[]>(() => sortTasksByIdDescending(tasks));
	const [error, setError] = useState<string | null>(null);
	const [showCleanupModal, setShowCleanupModal] = useState(false);
	const [cleanupSuccessMessage, setCleanupSuccessMessage] = useState<string | null>(null);
	const [sortColumn, setSortColumn] = useState<TaskSortColumn>("id");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const tableHeaderScrollRef = useRef<HTMLDivElement | null>(null);
	const tableBodyScrollRef = useRef<HTMLDivElement | null>(null);
	const isSyncingTableScrollRef = useRef(false);
	const isFilteringTerminalStatus = statusFilter.some((s) => isTerminalStatus(s, availableStatuses));
	const milestoneAliasToCanonical = useMemo(() => {
		const aliasMap = new Map<string, string>();
		const collectIdAliasKeys = (value: string): string[] => {
			const normalized = value.trim();
			const normalizedKey = normalized.toLowerCase();
			if (!normalizedKey) return [];
			const keys = new Set<string>([normalizedKey]);
			if (/^\d+$/.test(normalized)) {
				const numericAlias = String(Number.parseInt(normalized, 10));
				keys.add(numericAlias);
				keys.add(`m-${numericAlias}`);
				return Array.from(keys);
			}
			const idMatch = normalized.match(/^m-(\d+)$/i);
			if (idMatch?.[1]) {
				const numericAlias = String(Number.parseInt(idMatch[1], 10));
				keys.add(`m-${numericAlias}`);
				keys.add(numericAlias);
			}
			return Array.from(keys);
		};
		const reservedIdKeys = new Set<string>();
		for (const milestone of [...(milestoneEntities ?? []), ...(archivedMilestones ?? [])]) {
			for (const key of collectIdAliasKeys(milestone.id)) {
				reservedIdKeys.add(key);
			}
		}
		const setAlias = (aliasKey: string, id: string, allowOverwrite: boolean) => {
			const existing = aliasMap.get(aliasKey);
			if (!existing) {
				aliasMap.set(aliasKey, id);
				return;
			}
			if (!allowOverwrite) {
				return;
			}
			const existingKey = existing.toLowerCase();
			const nextKey = id.toLowerCase();
			const preferredRawId = /^\d+$/.test(aliasKey) ? `m-${aliasKey}` : /^m-\d+$/.test(aliasKey) ? aliasKey : null;
			if (preferredRawId) {
				const existingIsPreferred = existingKey === preferredRawId;
				const nextIsPreferred = nextKey === preferredRawId;
				if (existingIsPreferred && !nextIsPreferred) {
					return;
				}
				if (nextIsPreferred && !existingIsPreferred) {
					aliasMap.set(aliasKey, id);
				}
				return;
			}
			aliasMap.set(aliasKey, id);
		};
		const addIdAliases = (id: string, allowOverwrite = true) => {
			const idKey = id.toLowerCase();
			setAlias(idKey, id, allowOverwrite);
			const idMatch = id.match(/^m-(\d+)$/i);
			if (!idMatch?.[1]) return;
			const numericAlias = String(Number.parseInt(idMatch[1], 10));
			const canonicalId = `m-${numericAlias}`;
			setAlias(canonicalId, id, allowOverwrite);
			setAlias(numericAlias, id, allowOverwrite);
		};
		const activeTitleCounts = new Map<string, number>();
		for (const milestone of milestoneEntities ?? []) {
			const title = milestone.title.trim();
			if (!title) continue;
			const titleKey = title.toLowerCase();
			activeTitleCounts.set(titleKey, (activeTitleCounts.get(titleKey) ?? 0) + 1);
		};
		const activeTitleKeys = new Set(activeTitleCounts.keys());
		for (const milestone of milestoneEntities ?? []) {
			const id = milestone.id.trim();
			const title = milestone.title.trim();
			if (!id) continue;
			addIdAliases(id, true);
			if (title && !reservedIdKeys.has(title.toLowerCase()) && activeTitleCounts.get(title.toLowerCase()) === 1) {
				const titleKey = title.toLowerCase();
				if (!aliasMap.has(titleKey)) {
					aliasMap.set(titleKey, id);
				}
			}
		}
		const archivedTitleCounts = new Map<string, number>();
		for (const milestone of archivedMilestones ?? []) {
			const title = milestone.title.trim();
			if (!title) continue;
			const titleKey = title.toLowerCase();
			if (activeTitleKeys.has(titleKey)) continue;
			archivedTitleCounts.set(titleKey, (archivedTitleCounts.get(titleKey) ?? 0) + 1);
		}
		for (const milestone of archivedMilestones ?? []) {
			const id = milestone.id.trim();
			const title = milestone.title.trim();
			if (!id) continue;
			addIdAliases(id, false);
			const titleKey = title.toLowerCase();
			if (
				title &&
				!activeTitleKeys.has(titleKey) &&
				!reservedIdKeys.has(titleKey) &&
				archivedTitleCounts.get(titleKey) === 1
			) {
				if (!aliasMap.has(titleKey)) {
					aliasMap.set(titleKey, id);
				}
			}
		}
		return aliasMap;
	}, [milestoneEntities, archivedMilestones]);
	const archivedMilestoneKeys = useMemo(
		() => new Set(collectArchivedMilestoneKeys(archivedMilestones, milestoneEntities).map((value) => milestoneKey(value))),
		[archivedMilestones, milestoneEntities],
	);
	const canonicalizeMilestone = (value?: string | null): string => {
		const normalized = (value ?? "").trim();
		if (!normalized) return "";
		const key = normalized.toLowerCase();
		const direct = milestoneAliasToCanonical.get(key);
		if (direct) {
			return direct;
		}
		const idMatch = normalized.match(/^m-(\d+)$/i);
		if (idMatch?.[1]) {
			const numericAlias = String(Number.parseInt(idMatch[1], 10));
			return milestoneAliasToCanonical.get(`m-${numericAlias}`) ?? milestoneAliasToCanonical.get(numericAlias) ?? normalized;
		}
		if (/^\d+$/.test(normalized)) {
			const numericAlias = String(Number.parseInt(normalized, 10));
			return milestoneAliasToCanonical.get(`m-${numericAlias}`) ?? milestoneAliasToCanonical.get(numericAlias) ?? normalized;
		}
		return normalized;
	};

	const sortedBaseTasks = useMemo(() => sortTasksByIdDescending(tasks), [tasks]);
	const mergedAvailableLabels = useMemo(
		() => collectAvailableLabels(tasks, availableLabels),
		[tasks, availableLabels],
	);
	const milestoneOptions = useMemo(() => {
		const uniqueMilestones = Array.from(new Set([...availableMilestones.map((m) => m.trim()).filter(Boolean)]));
		return uniqueMilestones;
	}, [availableMilestones]);

	const milestoneLabelMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const m of milestoneEntities) {
			map[m.id] = m.title;
		}
		return map;
	}, [milestoneEntities]);
	const uniqueAssignees = useMemo(() => {
		const seen = new Set<string>();
		for (const task of tasks) {
			for (const a of task.assignee) {
				if (a.trim()) seen.add(a.trim());
			}
		}
		return Array.from(seen).sort((a, b) => a.localeCompare(b));
	}, [tasks]);

	const hasActiveFilters = Boolean(
		statusFilter.length > 0 || priorityFilter.length > 0 || labelFilter.length > 0 || milestoneFilter.length > 0 || filterAssignee,
	);
	const totalTasks = sortedBaseTasks.length;

	useEffect(() => {
		const paramStatus = searchParams.getAll("status");
		const paramPriority = searchParams.getAll("priority") as SearchPriorityFilter[];
		const paramMilestone = searchParams.getAll("milestone");
		const paramLabels = [...searchParams.getAll("label"), ...searchParams.getAll("labels")];
		const labelsCsv = searchParams.get("labels");
		if (labelsCsv) {
			paramLabels.push(...labelsCsv.split(","));
		}
		const normalizedLabels = paramLabels.map((label) => label.trim()).filter((label) => label.length > 0);

		if (paramStatus.join("|") !== statusFilter.join("|")) {
			setStatusFilter(paramStatus);
		}
		if (paramPriority.join("|") !== priorityFilter.join("|")) {
			setPriorityFilter(paramPriority);
		}
		if (paramMilestone.join("|") !== milestoneFilter.join("|")) {
			setMilestoneFilter(paramMilestone);
		}
		if (normalizedLabels.join("|") !== labelFilter.join("|")) {
			setLabelFilter(normalizedLabels);
		}
	}, [searchParams]);

	useEffect(() => {
		if (!hasActiveFilters) {
			setDisplayTasks(sortedBaseTasks);
			setError(null);
		}
	}, [hasActiveFilters, sortedBaseTasks]);

	useEffect(() => {
		const filterByMilestone = (list: Task[]): Task[] => {
			if (milestoneFilter.length === 0) return list;
			const selectedMilestones = new Set(milestoneFilter.map((m) => canonicalizeMilestone(m)));
			return list.filter((task) => {
				const canonicalTaskMilestone = canonicalizeMilestone(task.milestone);
				const taskKey = milestoneKey(canonicalTaskMilestone);
				const normalizedTaskMilestone = taskKey && archivedMilestoneKeys.has(taskKey) ? "" : canonicalTaskMilestone;
				if (selectedMilestones.has("__none") && !normalizedTaskMilestone) {
					return true;
				}
				return normalizedTaskMilestone && selectedMilestones.has(normalizedTaskMilestone);
			});
		};

		const shouldUseApi =
			statusFilter.length > 0 || priorityFilter.length > 0 || labelFilter.length > 0 || Boolean(filterAssignee);

		if (!hasActiveFilters) {
			return;
		}

		let cancelled = false;
		setError(null);

		const fetchFilteredTasks = async () => {
			// If only milestone filter is active, filter locally to avoid an extra request
			if (!shouldUseApi) {
				setDisplayTasks(filterByMilestone(sortedBaseTasks));
				return;
			}
			try {
				const results = await apiClient.search({
					types: ["task"],
					status: statusFilter.length > 0 ? statusFilter : undefined,
					priority: priorityFilter.length > 0 ? priorityFilter : undefined,
					labels: labelFilter.length > 0 ? labelFilter : undefined,
					assignee: filterAssignee || undefined,
				});
				if (cancelled) {
					return;
				}
				const taskResults = results.filter((result): result is TaskSearchResult => result.type === "task");
				const filtered = filterByMilestone(taskResults.map((result) => result.task));
				setDisplayTasks(sortTasksByIdDescending(filtered));
			} catch (err) {
				console.error("Failed to apply task filters:", err);
				if (!cancelled) {
					setDisplayTasks([]);
					setError("Unable to fetch tasks for the selected filters.");
				}
			}
		};

		fetchFilteredTasks();

		return () => {
			cancelled = true;
		};
	}, [
		hasActiveFilters,
		priorityFilter,
		statusFilter,
		labelFilter,
		tasks,
		milestoneFilter,
		sortedBaseTasks,
		milestoneAliasToCanonical,
		archivedMilestoneKeys,
	]);

	const syncUrl = (
		nextStatus: string[],
		nextPriority: SearchPriorityFilter[],
		nextLabels: string[],
		nextMilestone: string[],
	) => {
		const params = new URLSearchParams();
		for (const s of nextStatus) params.append("status", s);
		for (const p of nextPriority) params.append("priority", p);
		for (const label of nextLabels) {
			const n = label.trim();
			if (n) params.append("label", n);
		}
		for (const m of nextMilestone) params.append("milestone", m);
		setSearchParams(params, { replace: true });
	};

	const handleLabelChange = (next: string[]) => {
		const normalized = next.map((label) => label.trim()).filter((label) => label.length > 0);
		setLabelFilter(normalized);
		syncUrl(statusFilter, priorityFilter, normalized, milestoneFilter);
	};

	const handleClearFilters = () => {
		setStatusFilter([]);
		setPriorityFilter([]);
		setLabelFilter([]);
		setMilestoneFilter([]);
		setFilterAssignee("");
		syncUrl([], [], [], []);
		setDisplayTasks(sortedBaseTasks);
		setError(null);
	};

	const handleCleanupSuccess = async (movedCount: number) => {
		setShowCleanupModal(false);
		setCleanupSuccessMessage(`Successfully moved ${movedCount} task${movedCount !== 1 ? 's' : ''} to completed folder`);

		// Refresh the data - existing effects will handle re-filtering automatically
		if (onRefreshData) {
			await onRefreshData();
		}

		// Auto-dismiss success message after 4 seconds
		setTimeout(() => {
			setCleanupSuccessMessage(null);
		}, 4000);
	};

	const getStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case "to do":
				return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
			case "in progress":
				return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
			case "done":
				return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
		}
	};

	const getPriorityColor = (priority?: string) => {
		switch (priority?.toLowerCase()) {
			case "high":
				return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200";
			case "medium":
				return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200";
			case "low":
				return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
		}
	};

	const handleSortChange = (column: TaskSortColumn) => {
		if (sortColumn === column) {
			setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
			return;
		}

		setSortColumn(column);
		setSortDirection(column === "id" || column === "created" ? "desc" : "asc");
	};

	const getSortAriaValue = (column: TaskSortColumn): "none" | "ascending" | "descending" => {
		if (sortColumn !== column) return "none";
		return sortDirection === "asc" ? "ascending" : "descending";
	};

	const renderSortIcon = (column: TaskSortColumn) => {
		const isActive = sortColumn === column;
		if (!isActive) {
			return (
				<span className="text-[10px] text-gray-300 dark:text-gray-600 select-none" aria-hidden="true">
					↕
				</span>
			);
		}
		return (
			<span className="text-[10px] text-gray-600 dark:text-gray-300 select-none" aria-hidden="true">
				{sortDirection === "asc" ? "▲" : "▼"}
			</span>
		);
	};

	const renderSortableHeader = (label: string, column: TaskSortColumn) => (
		<th className="px-3 py-2" aria-sort={getSortAriaValue(column)}>
			<button
				type="button"
				onClick={() => handleSortChange(column)}
				className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-100"
			>
				{label}
				{renderSortIcon(column)}
			</button>
		</th>
	);

	const renderColumnGroup = () => (
		<colgroup>
			<col style={{ width: "8rem" }} />
			<col style={{ width: "28rem" }} />
			<col style={{ width: "8rem" }} />
			<col style={{ width: "7rem" }} />
			<col style={{ width: "7rem" }} />
			<col style={{ width: "11rem" }} />
			<col style={{ width: "11rem" }} />
			<col style={{ width: "11rem" }} />
			<col style={{ width: "7rem" }} />
		</colgroup>
	);

	const sortedDisplayTasks = useMemo(() => {
		const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
		const compareText = (a: string, b: string) => collator.compare(a, b);
		const withDirection = (value: number) => (sortDirection === "asc" ? value : -value);

		return [...displayTasks].sort((a, b) => {
			let result = 0;
			switch (sortColumn) {
				case "id": {
					result = withDirection(compareTaskIdsAscending(a, b));
					break;
				}
				case "title": {
					result = withDirection(compareText(a.title, b.title));
					break;
				}
				case "status": {
					result = withDirection(compareText(a.status, b.status));
					break;
				}
				case "priority": {
					const rankA = PRIORITY_RANK[(a.priority ?? "").toLowerCase()] ?? 0;
					const rankB = PRIORITY_RANK[(b.priority ?? "").toLowerCase()] ?? 0;
					result = withDirection(rankA - rankB);
					break;
				}
				case "ordinal": {
					const aOrd = a.ordinal;
					const bOrd = b.ordinal;
					if (typeof aOrd === "number" && typeof bOrd === "number") {
						result = withDirection(aOrd - bOrd);
					} else if (typeof aOrd === "number") {
						result = -1; // tasks with ordinal come first
					} else if (typeof bOrd === "number") {
						result = 1;
					}
					break;
				}
				case "milestone": {
					const milestoneA = getMilestoneLabel(a.milestone, milestoneEntities);
					const milestoneB = getMilestoneLabel(b.milestone, milestoneEntities);
					result = withDirection(compareText(milestoneA, milestoneB));
					break;
				}
				case "created": {
					const createdA = parseStoredUtcDate(a.createdDate)?.getTime();
					const createdB = parseStoredUtcDate(b.createdDate)?.getTime();
					if (createdA === undefined && createdB === undefined) {
						// result already 0 from initialization
					} else if (createdA === undefined) {
						result = 1;
					} else if (createdB === undefined) {
						result = -1;
					} else {
						result = withDirection(createdA - createdB);
					}
					break;
				}
			}

			if (result !== 0) return result;
			return compareTaskIdsAscending(b, a);
		});
	}, [displayTasks, milestoneEntities, sortColumn, sortDirection]);

	const currentCount = sortedDisplayTasks.length;

	// Flatten tasks with subtask hierarchy for table display
	const hierarchicalTasks = useMemo(() => {
		const childrenByParent = new Map<string, Task[]>();
		const childIds = new Set<string>();

		for (const t of sortedDisplayTasks) {
			if (t.parentTaskId) {
				childIds.add(t.id);
				const existing = childrenByParent.get(t.parentTaskId) || [];
				existing.push(t);
				childrenByParent.set(t.parentTaskId, existing);
			}
		}

		const result: Array<{ task: Task; depth: number }> = [];
		for (const t of sortedDisplayTasks) {
			// Skip children whose parent is in the displayed list (rendered by parent)
			if (childIds.has(t.id) && sortedDisplayTasks.some((p) => taskIdsEqual(p.id, t.parentTaskId ?? ""))) {
				continue;
			}
			result.push({ task: t, depth: 0 });
			const children = childrenByParent.get(t.id);
			if (children) {
				for (const child of children) {
					result.push({ task: child, depth: 1 });
				}
			}
		}

		return result;
	}, [sortedDisplayTasks]);

	useEffect(() => {
		const headerEl = tableHeaderScrollRef.current;
		const bodyEl = tableBodyScrollRef.current;
		if (!headerEl || !bodyEl) return;

		const syncScrollLeft = (source: HTMLDivElement, target: HTMLDivElement) => {
			if (isSyncingTableScrollRef.current) return;
			isSyncingTableScrollRef.current = true;
			target.scrollLeft = source.scrollLeft;
			isSyncingTableScrollRef.current = false;
		};

		const handleHeaderScroll = () => syncScrollLeft(headerEl, bodyEl);
		const handleBodyScroll = () => syncScrollLeft(bodyEl, headerEl);

		headerEl.addEventListener("scroll", handleHeaderScroll, { passive: true });
		bodyEl.addEventListener("scroll", handleBodyScroll, { passive: true });
		headerEl.scrollLeft = bodyEl.scrollLeft;

		return () => {
			headerEl.removeEventListener("scroll", handleHeaderScroll);
			bodyEl.removeEventListener("scroll", handleBodyScroll);
		};
	}, [currentCount]);

	return (
		<div className="container mx-auto px-4 py-8 transition-colors duration-200">
			<div className="flex flex-col gap-4 mb-6">
				<div className="flex items-center justify-between gap-3">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Tasks</h1>
						<button
							className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 dark:focus:ring-offset-gray-900 transition-colors duration-200"
							onClick={onNewTask}
						>
							+ New Task
					</button>
				</div>

				<div className="flex flex-wrap items-center gap-3 justify-between">
					<div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
						<MultiSelectDropdown
							options={availableStatuses}
							selected={statusFilter}
							onChange={(next) => { setStatusFilter(next); syncUrl(next, priorityFilter, labelFilter, milestoneFilter); }}
							menuId="task-list-status-filter-menu"
							className="min-w-[160px]"
							title="Status"
						/>

						<MultiSelectDropdown
							options={[...PRIORITY_OPTIONS]}
							selected={priorityFilter}
							onChange={(next) => { setPriorityFilter(next as SearchPriorityFilter[]); syncUrl(statusFilter, next as SearchPriorityFilter[], labelFilter, milestoneFilter); }}
							menuId="task-list-priority-filter-menu"
							className="min-w-[160px]"
							title="Priority"
						/>

						<MultiSelectDropdown
							options={["__none", ...milestoneOptions]}
							selected={milestoneFilter}
							onChange={(next) => { setMilestoneFilter(next); syncUrl(statusFilter, priorityFilter, labelFilter, next); }}
							menuId="task-list-milestone-filter-menu"
							className="min-w-[160px]"
							title="Milestone"
							labels={{ ...milestoneLabelMap, __none: "No milestone" }}
						/>

						<LabelFilterDropdown
							availableLabels={uniqueAssignees}
							selectedLabels={filterAssignee ? [filterAssignee] : []}
							onChange={(labels) => { setFilterAssignee(labels[0] ?? ""); }}
							menuId="task-list-assignee-filter-menu"
							className="min-w-[180px]"
							labelColors={authorColors}
							singleSelect
							title="Assignee"
						/>

						<LabelFilterDropdown
							availableLabels={mergedAvailableLabels}
							selectedLabels={labelFilter}
							onChange={handleLabelChange}
							menuId="task-list-labels-menu"
							labelColors={labelColors}
						/>

					</div>

					<div className="flex items-center gap-3 flex-shrink-0">
						{isFilteringTerminalStatus && currentCount > 0 && (
								<button
									type="button"
									onClick={() => setShowCleanupModal(true)}
									className="py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-2 whitespace-nowrap"
									title="Clean up old completed tasks"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
									Clean Up
								</button>
							)}

							<div className="relative">
								<button
									type="button"
									onClick={hasActiveFilters ? handleClearFilters : undefined}
									className="py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg whitespace-nowrap transition-colors duration-200 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
									style={{ visibility: hasActiveFilters ? "visible" : "hidden" }}
									aria-hidden={!hasActiveFilters}
								>
									Clear filters
							</button>
						</div>

						<div className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap text-right min-w-[170px]">
							Showing {currentCount} of {totalTasks} tasks
						</div>
					</div>
				</div>

				{hasActiveFilters && (
					<FilterChips
						chips={[
							...statusFilter.map((s) => ({
								key: `status-${s}`,
								label: `Status: ${s}`,
								onRemove: () => {
									const next = statusFilter.filter((x) => x !== s);
									setStatusFilter(next);
									syncUrl(next, priorityFilter, labelFilter, milestoneFilter);
								},
							})),
							...priorityFilter.map((p) => ({
								key: `priority-${p}`,
								label: `Priority: ${p}`,
								onRemove: () => {
									const next = priorityFilter.filter((x) => x !== p);
									setPriorityFilter(next);
									syncUrl(statusFilter, next, labelFilter, milestoneFilter);
								},
							})),
							...milestoneFilter.map((m) => ({
								key: `milestone-${m}`,
								label: m === "__none" ? "No milestone" : `Milestone: ${milestoneLabelMap[m] ?? m}`,
								onRemove: () => {
									const next = milestoneFilter.filter((x) => x !== m);
									setMilestoneFilter(next);
									syncUrl(statusFilter, priorityFilter, labelFilter, next);
								},
							})),
							...(filterAssignee
								? [{
									key: "assignee",
									label: `Assignee: ${filterAssignee}`,
									onRemove: () => { setFilterAssignee(""); },
								}]
								: []),
							...labelFilter.map((l) => ({
								key: `label-${l}`,
								label: l,
								color: labelColors?.[l],
								onRemove: () => {
									const next = labelFilter.filter((x) => x !== l);
									setLabelFilter(next);
									syncUrl(statusFilter, priorityFilter, next, milestoneFilter);
								},
							})),
						]}
					/>
				)}

				{error && (
					<div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
						{error}
					</div>
				)}
			</div>

			{currentCount === 0 ? (
				<div className="text-center py-12">
					<svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					<h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
						{hasActiveFilters ? "No tasks match the current filters" : "No tasks"}
					</h3>
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						{hasActiveFilters
							? "Try adjusting your search or clearing filters to see more tasks."
							: "Get started by creating a new task."}
					</p>
				</div>
			) : (
				<div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
					<div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/90 supports-[backdrop-filter]:dark:bg-gray-700/85">
						<div ref={tableHeaderScrollRef} className="overflow-x-auto" style={{ overflowY: "hidden" }}>
							<table className="w-full min-w-[1100px] table-fixed border-collapse">
								{renderColumnGroup()}
								<thead>
									<tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
										{renderSortableHeader("ID", "id")}
										{renderSortableHeader("Title", "title")}
										{renderSortableHeader("Status", "status")}
										{renderSortableHeader("Priority", "priority")}
										{renderSortableHeader("Ordinal", "ordinal")}
										<th className="px-3 py-2">Labels</th>
										<th className="px-3 py-2">Assignee</th>
										{renderSortableHeader("Milestone", "milestone")}
										{renderSortableHeader("Created", "created")}
									</tr>
								</thead>
							</table>
						</div>
					</div>
					<div ref={tableBodyScrollRef} className="overflow-x-auto" style={{ overflowY: "hidden" }}>
						<table className="w-full min-w-[1100px] table-fixed border-collapse">
							{renderColumnGroup()}
							<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
								{hierarchicalTasks.map(({ task, depth }) => {
									const isFromOtherBranch = Boolean(task.branch);
									const visibleLabels = task.labels.slice(0, 2);
									const labelOverflow = Math.max(task.labels.length - visibleLabels.length, 0);
									const visibleAssignees = task.assignee.slice(0, 2);
									const assigneeOverflow = Math.max(task.assignee.length - visibleAssignees.length, 0);
									const milestoneLabel = task.milestone ? getMilestoneLabel(task.milestone, milestoneEntities) : "—";
									const createdLabel = formatStoredUtcDateForCompactDisplay(task.createdDate ?? "");

									return (
										<tr
											key={task.id}
											onClick={() => onEditTask(task)}
											className={`cursor-pointer transition-colors ${
												isFromOtherBranch
													? "bg-amber-50/50 hover:bg-amber-100/70 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
													: "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/50"
											}`}
										>
											<td className="px-3 py-2.5 text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
												{task.id}
											</td>
											<td className="px-3 py-2.5">
													<div className="flex items-center gap-2 min-w-0" style={depth > 0 ? { paddingLeft: "1.5rem" } : undefined}>
														{depth > 0 && (
															<svg className="w-3 h-3 flex-shrink-0 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l-5-5-5 5" />
															</svg>
														)}
														<div className="flex flex-col min-w-0">
															{depth > 0 && task.parentTaskTitle && (
																<span className="text-[10px] text-gray-400 dark:text-gray-500 truncate mb-0.5">
																	↳ {task.parentTaskTitle}
																</span>
															)}
															<span
																className={`block truncate text-sm ${
																	isFromOtherBranch
																		? "text-gray-600 dark:text-gray-300"
																		: "text-gray-900 dark:text-gray-100"
																}`}
																title={task.title}
															>
																{task.title}
															</span>
														</div>
													{isFromOtherBranch && task.branch && (
														<span
															className="inline-flex shrink-0 items-center rounded-circle bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
															title={`Read-only task from ${task.branch} branch`}
														>
															{task.branch}
														</span>
													)}
												</div>
											</td>
											<td className="px-3 py-2.5">
												<span className={`inline-flex rounded-circle px-2 py-0.5 text-[11px] font-medium ${getStatusColor(task.status)}`}>
													{task.status}
												</span>
											</td>
											<td className="px-3 py-2.5">
												{task.priority ? (
													<span
														className={`inline-flex rounded-circle px-2 py-0.5 text-[11px] font-medium ${getPriorityColor(task.priority)}`}
													>
														{task.priority}
													</span>
												) : (
													<span className="text-xs text-gray-300 dark:text-gray-600">—</span>
												)}
											</td>
											<td className="px-3 py-2.5 text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
												{task.ordinal !== undefined ? task.ordinal : <span className="text-gray-300 dark:text-gray-600">—</span>}
											</td>
											<td className="px-3 py-2.5">
												{visibleLabels.length > 0 ? (
													<div className="flex items-center gap-1 min-w-0">
														{visibleLabels.map((label) => {
															const bgColor = labelColors?.[label];
															return (
																<span
																	key={label}
																	className={`inline-flex max-w-[7rem] truncate rounded-circle px-2 py-0.5 text-[11px] ${
																		bgColor ? "" : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
																	}`}
																	style={bgColor ? { backgroundColor: bgColor, filter: "saturate(0.55) brightness(1.35)", color: "#fff" } : undefined}
																	title={label}
																>
																	{label}
																</span>
															);
														})}
														{labelOverflow > 0 && (
															<span className="text-[11px] text-gray-500 dark:text-gray-400">+{labelOverflow}</span>
														)}
													</div>
												) : (
													<span className="text-xs text-gray-300 dark:text-gray-600">—</span>
												)}
											</td>
											<td className="px-3 py-2.5">
												{visibleAssignees.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    {visibleAssignees.map((assignee) => {
                      const color = authorColors?.[assignee.replace('@', '')];
                      return (
                        <span
                          key={assignee}
                          title={assignee}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-circle text-[10px] font-semibold ${
                            color ? '' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200'
                          }`}
                          style={color ? { backgroundColor: color, filter: "saturate(0.55) brightness(1.35)", color: '#fff' } : undefined}
                        >
                          {getAssigneeInitials(assignee)}
                        </span>
                      );
                    })}
														{assigneeOverflow > 0 && (
															<span className="text-[11px] text-gray-500 dark:text-gray-400">+{assigneeOverflow}</span>
														)}
													</div>
												) : (
													<span className="text-xs text-gray-300 dark:text-gray-600">—</span>
												)}
											</td>
											<td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300 truncate" title={milestoneLabel}>
												{milestoneLabel}
											</td>
											<td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
												{createdLabel}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Cleanup Modal */}
			<CleanupModal
				isOpen={showCleanupModal}
				onClose={() => setShowCleanupModal(false)}
				onSuccess={handleCleanupSuccess}
			/>

			{/* Cleanup Success Toast */}
			{cleanupSuccessMessage && (
				<SuccessToast
					message={cleanupSuccessMessage}
					onDismiss={() => setCleanupSuccessMessage(null)}
					icon={
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					}
				/>
			)}
		</div>
	);
};

export default TaskList;
