import type React from "react";
import { useEffect, useState } from "react";
import type { TaskStatistics } from "../../core/statistics";
import type { Task } from "../../types";
import { apiClient } from "../lib/api";
import { Icons } from "./icons";
import LoadingSpinner from "./LoadingSpinner";

interface MetricCardProps {
	icon: React.ReactNode;
	iconBgColor: string;
	value: string | number;
	label: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, iconBgColor, value, label }) => (
	<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
		<div className="flex items-center">
			<div className={`p-3 ${iconBgColor} rounded-lg`}>{icon}</div>
			<div className="ml-4">
				<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
				<p className="text-gray-600 dark:text-gray-400 text-sm">{label}</p>
			</div>
		</div>
	</div>
);

interface DistributionListProps {
	entries: Record<string, number>;
	iconFn: (key: string) => React.ReactNode;
	colorFn: (key: string) => string;
	total: number;
	barColor: string;
	formatLabel?: (label: string) => string;
}

const DistributionList: React.FC<DistributionListProps> = ({
	entries,
	iconFn,
	colorFn,
	total,
	barColor,
	formatLabel,
}) => (
	<div className="space-y-4">
		{Object.entries(entries)
			.filter(([, count]) => count > 0)
			.map(([key, count]) => (
				<div key={key} className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						{iconFn(key)}
						<span className={`px-3 py-1 rounded-circle text-sm font-medium ${colorFn(key)}`}>
							{formatLabel ? formatLabel(key) : key}
						</span>
					</div>
					<div className="flex items-center gap-3">
						<div className="text-right">
							<div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{count}</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">{Math.round((count / total) * 100)}%</div>
						</div>
						<div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-circle h-2">
							<div
								className={`${barColor} h-2 rounded-circle transition-all duration-300`}
								style={{ width: `${(count / total) * 100}%` }}
							/>
						</div>
					</div>
				</div>
			))}
	</div>
);

const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

const PRIORITY_STYLES: Record<string, string> = {
	high: "text-red-500",
	medium: "text-yellow-500",
	low: "text-blue-500",
};

const STATUS_ICON_MAP: Record<string, React.ReactNode> = {
	"to do": <Icons.CheckmarkCircle />,
	"in progress": (
		<svg aria-hidden="true" className="size-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	),
	done: (
		<svg aria-hidden="true" className="size-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
			<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
	),
};

const StatusIcon = ({ status }: { status: string }) =>
	STATUS_ICON_MAP[status.toLowerCase()] ?? (
		<svg aria-hidden="true" className="size-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
			/>
		</svg>
	);

const PriorityIcon = ({ priority }: { priority: string }) => {
	const color = PRIORITY_STYLES[priority.toLowerCase()];
	if (color) {
		return (
			<svg aria-hidden="true" className={`size-4 ${color}`} fill="currentColor" viewBox="0 0 24 24">
				<path d={STAR_PATH} />
			</svg>
		);
	}
	return (
		<svg aria-hidden="true" className="size-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
		</svg>
	);
};

interface StatisticsData extends Omit<TaskStatistics, "statusCounts" | "priorityCounts" | "archivedTasks"> {
	archivedTasks: Task[];
	statusCounts: Record<string, number>;
	priorityCounts: Record<string, number>;
}

interface StatisticsProps {
	tasks?: Task[];
	isLoading?: boolean;
	onEditTask?: (task: Task) => void;
	projectName?: string;
	statuses?: string[];
	newStatuses?: string[];
	runningStatuses?: string[];
	terminalStatuses?: string[];
	blockedStatuses?: string[];
}

const Statistics: React.FC<StatisticsProps> = ({
	tasks: _tasks,
	isLoading: externalLoading,
	onEditTask,
	projectName,
	statuses: availableStatuses,
	newStatuses,
	runningStatuses,
	terminalStatuses,
	blockedStatuses,
}) => {
	const [statistics, setStatistics] = useState<StatisticsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [loadingMessage, setLoadingMessage] = useState("Building statistics...");
	const [archivedSearch, setArchivedSearch] = useState("");

	useEffect(() => {
		let isMounted = true;
		let messageInterval: NodeJS.Timeout | undefined;

		const fetchStatistics = async () => {
			if (!isMounted) return;

			try {
				setLoading(true);
				setError(null);

				// Loading messages that reflect actual backend operations
				const loadingMessages = [
					"Building statistics...",
					"Loading local tasks...",
					"Loading completed tasks...",
					"Merging tasks...",
					"Checking task states across branches...",
					"Loading drafts...",
					"Calculating statistics...",
				];

				if (isMounted) setLoadingMessage(loadingMessages[0] || "");

				// Cycle through loading messages at a readable pace
				let messageIndex = 0;
				messageInterval = setInterval(() => {
					if (!isMounted || messageIndex >= loadingMessages.length - 1) {
						clearInterval(messageInterval);
						return;
					}
					messageIndex++;
					setLoadingMessage(loadingMessages[messageIndex] || "");
				}, 800); // 800ms so users can actually read each message

				// Fetch data (this happens in parallel with message cycling)
				const data = await apiClient.fetchStatistics();

				if (messageInterval) {
					clearInterval(messageInterval);
				}

				if (isMounted) {
					setStatistics(data);
				}
			} catch (err) {
				if (isMounted) {
					console.error("Failed to fetch statistics:", err);
					setError("Failed to load statistics");
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		fetchStatistics();

		return () => {
			isMounted = false;
			if (messageInterval) {
				clearInterval(messageInterval);
			}
		};
	}, []);

	useEffect(() => {
		if (loading || externalLoading || !statistics) return;
		const hash = window.location.hash.slice(1);
		if (hash) {
			const el = document.getElementById(hash);
			if (el) el.scrollIntoView({ behavior: "smooth" });
		}
	}, [loading, externalLoading, statistics]);

	if (loading || externalLoading) {
		return (
			<div className="flex flex-col justify-center items-center h-64 space-y-4">
				<LoadingSpinner size="lg" text="" />
				<div className="text-center">
					<p className="text-lg font-medium text-gray-900 dark:text-gray-100">
						{loading ? loadingMessage : "Loading statistics..."}
					</p>
					<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">This might take a while...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-8 text-center">
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
					<p className="text-red-600 dark:text-red-400 font-medium">Error loading statistics</p>
					<p className="text-red-500 dark:text-red-300 text-sm mt-1">{error}</p>
				</div>
			</div>
		);
	}

	if (!statistics) {
		return (
			<div className="p-8 text-center">
				<p className="text-gray-500 dark:text-gray-400">No statistics available</p>
			</div>
		);
	}

	const filteredArchivedTasks = statistics.archivedTasks.filter(
		(t) =>
			!archivedSearch ||
			t.title.toLowerCase().includes(archivedSearch.toLowerCase()) ||
			t.id.toLowerCase().includes(archivedSearch.toLowerCase()),
	);

	const TaskPreview = ({
		task,
		showDate,
		onClick,
	}: {
		task: Task;
		showDate: "created" | "updated";
		onClick?: () => void;
	}) => {
		const formatDate = (dateStr: string) => {
			const hasTime = dateStr.includes(" ") || dateStr.includes("T");
			const date = new Date(dateStr.replace(" ", "T") + (hasTime ? ":00Z" : "T00:00:00Z"));

			if (hasTime) {
				return date.toLocaleString(undefined, {
					year: "numeric",
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				});
			}
			return date.toLocaleDateString();
		};

		const displayDate = showDate === "created" ? task.createdDate : task.updatedDate || task.createdDate;

		return (
			<button
				type="button"
				key={task.id}
				className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors duration-200 text-left w-full ${
					onClick ? "hover:bg-gray-100 dark:hover:bg-gray-600/50 cursor-pointer" : ""
				}`}
				onClick={onClick}
				onKeyDown={
					onClick
						? (e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onClick();
								}
							}
						: undefined
				}
			>
				<StatusIcon status={task.status} />
				<div className="flex-1 min-w-0">
					<p className="font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{task.id} • {showDate === "created" ? "Created" : "Updated"} {formatDate(displayDate)}
					</p>
				</div>
			</button>
		);
	};

	const getStatusColor = (status: string) => {
		const lower = status.toLowerCase();
		if (blockedStatuses?.some((s) => s.toLowerCase() === lower))
			return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";
		if (terminalStatuses?.some((s) => s.toLowerCase() === lower))
			return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
		if (runningStatuses?.some((s) => s.toLowerCase() === lower))
			return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200";
		if (newStatuses?.some((s) => s.toLowerCase() === lower))
			return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
		// Fallback: first → new, last → terminal, middle → running
		if (availableStatuses?.length) {
			const first = availableStatuses[0]?.toLowerCase();
			const last = availableStatuses[availableStatuses.length - 1]?.toLowerCase();
			if (lower === first) return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
			if (lower === last) return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
			if (availableStatuses.length >= 3) return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200";
		}
		return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
	};

	const getPriorityColor = (priority: string) => {
		switch (priority.toLowerCase()) {
			case "high":
				return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";
			case "medium":
				return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200";
			case "low":
				return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200";
			case "none":
				return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
			default:
				return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
		}
	};

	return (
		<div className="max-w-7xl mx-auto p-6 space-y-8">
			{/* Header */}
			<div className="text-center">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
					{projectName ? `${projectName} Statistics` : "Project Statistics"}
				</h1>
				<p className="text-gray-600 dark:text-gray-400">Overview of your project's task metrics and activity</p>
			</div>

			{/* Key Metrics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<MetricCard
					icon={<Icons.Tasks />}
					iconBgColor="bg-blue-100 dark:bg-blue-900/30"
					value={statistics.totalTasks}
					label="Total Tasks"
				/>
				<MetricCard
					icon={
						<svg
							aria-hidden="true"
							className="size-6 text-green-600 dark:text-green-400"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					}
					iconBgColor="bg-green-100 dark:bg-green-900/30"
					value={statistics.completedTasks}
					label="Completed"
				/>
				<MetricCard
					icon={<Icons.DocumentChart />}
					iconBgColor="bg-purple-100 dark:bg-purple-900/30"
					value={`${statistics.completionPercentage}%`}
					label="Completion"
				/>
				<MetricCard
					icon={
						<svg
							aria-hidden="true"
							className="size-6 text-orange-600 dark:text-orange-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
					}
					iconBgColor="bg-orange-100 dark:bg-orange-900/30"
					value={statistics.draftCount}
					label="Drafts"
				/>
			</div>

			{/* Progress Bar */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Overall Progress</h3>
				{(() => {
					const total = statistics.totalTasks;
					const done = statistics.doneTasks;
					const archived = statistics.archivedCount;
					const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
					const archivedPct = total > 0 ? Math.round((archived / total) * 100) : 0;
					const remainingPct = Math.max(100 - donePct - archivedPct, 0);
					return (
						<>
							<div
								className="w-full bg-gray-200 dark:bg-gray-700 rounded-circle h-4 mb-2 flex overflow-hidden"
								title={`${done} done (${donePct}%) · ${archived} archived (${archivedPct}%) · ${total - done - archived} remaining (${remainingPct}%)`}
							>
								{donePct > 0 && (
									<div className="bg-green-500 h-4 transition-all duration-300" style={{ width: `${donePct}%` }} />
								)}
								{archivedPct > 0 && (
									<div className="bg-blue-400 h-4 transition-all duration-300" style={{ width: `${archivedPct}%` }} />
								)}
							</div>
							<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
								<span className="flex items-center gap-1.5">
									<span className="inline-block size-2.5 rounded-circle bg-green-500" />
									{done} done
								</span>
								<span className="flex items-center gap-1.5">
									<span className="inline-block size-2.5 rounded-circle bg-blue-400" />
									{archived} archived
								</span>
								<span className="flex items-center gap-1.5">
									<span className="inline-block size-2.5 rounded-circle bg-gray-300 dark:bg-gray-600" />
									{total - done - archived} remaining
								</span>
							</div>
						</>
					);
				})()}
			</div>

			{/* Status and Priority Distribution */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Status Distribution */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Status Distribution</h3>
					<DistributionList
						entries={statistics.statusCounts}
						iconFn={(s) => <StatusIcon status={s} />}
						colorFn={getStatusColor}
						total={statistics.totalTasks}
						barColor="bg-blue-500"
					/>
				</div>

				{/* Priority Distribution */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Priority Distribution</h3>
					<DistributionList
						entries={statistics.priorityCounts}
						iconFn={(p) => <PriorityIcon priority={p} />}
						colorFn={getPriorityColor}
						total={statistics.totalTasks}
						barColor="bg-yellow-500"
						formatLabel={(p) => (p === "none" ? "No Priority" : p.charAt(0).toUpperCase() + p.slice(1))}
					/>
				</div>
			</div>

			{/* Recent Activity */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Recently Created */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recently Created</h3>
					{statistics.recentActivity.created.length > 0 ? (
						<div className="space-y-3">
							{statistics.recentActivity.created.map((task) => (
								<TaskPreview
									key={task.id}
									task={task}
									showDate="created"
									onClick={onEditTask ? () => onEditTask(task) : undefined}
								/>
							))}
						</div>
					) : (
						<p className="text-gray-500 dark:text-gray-400 text-sm">No recently created tasks</p>
					)}
				</div>

				{/* Recently Updated */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recently Updated</h3>
					{statistics.recentActivity.updated.length > 0 ? (
						<div className="space-y-3">
							{statistics.recentActivity.updated.map((task) => (
								<TaskPreview
									key={task.id}
									task={task}
									showDate="updated"
									onClick={onEditTask ? () => onEditTask(task) : undefined}
								/>
							))}
						</div>
					) : (
						<p className="text-gray-500 dark:text-gray-400 text-sm">No recently updated tasks</p>
					)}
				</div>
			</div>

			{/* Project Health - Completely redesigned as a summary row */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Health</h3>

					<div className="flex items-center gap-4 text-sm">
						<div className="flex items-center gap-1">
							<span className="text-gray-600 dark:text-gray-400">Avg age:</span>
							<span className="font-medium text-gray-900 dark:text-gray-100">
								{statistics.projectHealth.averageTaskAge}d
							</span>
						</div>

						{statistics.projectHealth.staleTasks.length > 0 && (
							<div className="flex items-center gap-1">
								<div className="size-2 bg-yellow-500 rounded-circle" />
								<span className="font-medium text-yellow-700 dark:text-yellow-400">
									{statistics.projectHealth.staleTasks.length} stale
								</span>
							</div>
						)}

						{statistics.projectHealth.blockedTasks.length > 0 && (
							<div className="flex items-center gap-1">
								<div className="size-2 bg-red-500 rounded-circle" />
								<span className="font-medium text-red-700 dark:text-red-400">
									{statistics.projectHealth.blockedTasks.length} blocked
								</span>
							</div>
						)}
						{statistics.projectHealth.deadlockedTaskGroups.length > 0 && (
							<div className="flex items-center gap-1">
								<div className="size-2 bg-purple-500 rounded-circle" />
								<span className="font-medium text-purple-700 dark:text-purple-400">
									{statistics.projectHealth.deadlockedTaskGroups.length} deadlocked
								</span>
							</div>
						)}

						{statistics.projectHealth.staleTasks.length === 0 &&
							statistics.projectHealth.blockedTasks.length === 0 &&
							statistics.projectHealth.deadlockedTaskGroups.length === 0 && (
								<div className="flex items-center gap-1">
									<div className="size-2 bg-green-500 rounded-circle" />
									<span className="font-medium text-green-700 dark:text-green-400">All good!</span>
								</div>
							)}
					</div>
				</div>

				{/* Expandable task lists - only show if there are issues */}
				{(statistics.projectHealth.staleTasks.length > 0 ||
					statistics.projectHealth.blockedTasks.length > 0 ||
					statistics.projectHealth.deadlockedTaskGroups.length > 0 ||
					statistics.archivedTasks.length > 0) && (
					<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Stale Tasks */}
							{statistics.projectHealth.staleTasks.length > 0 && (
								<div>
									<h4 className="font-medium text-yellow-700 dark:text-yellow-400 mb-3 text-sm">
										Stale Tasks (&gt;30 days)
									</h4>
									<p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
										Tasks that haven't been updated in over 30 days and may need attention or archiving
									</p>
									<div className="space-y-2">
										{statistics.projectHealth.staleTasks.slice(0, 3).map((task) => (
											<TaskPreview
												key={task.id}
												task={task}
												showDate="updated"
												onClick={onEditTask ? () => onEditTask(task) : undefined}
											/>
										))}
										{statistics.projectHealth.staleTasks.length > 3 && (
											<p className="text-xs text-gray-500 dark:text-gray-400 px-3">
												+{statistics.projectHealth.staleTasks.length - 3} more stale tasks
											</p>
										)}
									</div>
								</div>
							)}

							{/* Blocked Tasks (dependency) */}
							{statistics.projectHealth.blockedTasks.length > 0 && (
								<div>
									<h4 className="font-medium text-red-700 dark:text-red-400 mb-3 text-sm">
										Blocked Tasks (dependency)
									</h4>
									<p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
										Tasks that cannot progress because their dependencies are not yet completed
									</p>
									<div className="space-y-2">
										{statistics.projectHealth.blockedTasks.slice(0, 3).map((task) => (
											<TaskPreview
												key={task.id}
												task={task}
												showDate="created"
												onClick={onEditTask ? () => onEditTask(task) : undefined}
											/>
										))}
										{statistics.projectHealth.blockedTasks.length > 3 && (
											<p className="text-xs text-gray-500 dark:text-gray-400 px-3">
												+{statistics.projectHealth.blockedTasks.length - 3} more blocked tasks
											</p>
										)}
									</div>
								</div>
							)}

							{/* Blocked by Status */}
							{statistics.projectHealth.blockedByStatus.length > 0 && (
								<div>
									<h4 className="font-medium text-orange-700 dark:text-orange-400 mb-3 text-sm">Blocked by Status</h4>
									<p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
										Tasks whose status indicates they are blocked
									</p>
									<div className="space-y-2">
										{statistics.projectHealth.blockedByStatus.slice(0, 3).map((task) => (
											<TaskPreview
												key={task.id}
												task={task}
												showDate="created"
												onClick={onEditTask ? () => onEditTask(task) : undefined}
											/>
										))}
										{statistics.projectHealth.blockedByStatus.length > 3 && (
											<p className="text-xs text-gray-500 dark:text-gray-400 px-3">
												+{statistics.projectHealth.blockedByStatus.length - 3} more blocked by status
											</p>
										)}
									</div>
								</div>
							)}

							{/* Deadlocked Tasks */}
							{statistics.projectHealth.deadlockedTaskGroups.length > 0 && (
								<div>
									<h4 className="font-medium text-purple-700 dark:text-purple-400 mb-3 text-sm">Deadlocked Tasks</h4>
									<p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
										Tasks in circular dependency chains that cannot be completed
									</p>
									<div className="space-y-2">
										{statistics.projectHealth.deadlockedTaskGroups.map((group) => (
											<div key={group.join("→")} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
												<p className="text-sm font-mono text-purple-700 dark:text-purple-400">{group.join(" → ")}</p>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Archived Tasks - standalone section */}
			<div
				id="archived"
				className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
			>
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
						Archived Tasks
						{statistics.archivedTasks.length > 0 && (
							<span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
								({statistics.archivedTasks.length})
							</span>
						)}
					</h3>
				</div>

				{statistics.archivedTasks.length > 0 ? (
					<>
						<div className="relative mb-4">
							<div className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 dark:text-gray-500 pointer-events-none">
								<Icons.Search />
							</div>
							<input
								type="text"
								value={archivedSearch}
								onChange={(e) => setArchivedSearch(e.target.value)}
								placeholder="Search archived tasks by title or ID..."
								className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400"
							/>
							{archivedSearch && (
								<button
									type="button"
									onClick={() => setArchivedSearch("")}
									className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
									aria-label="Clear search"
								>
									<Icons.Close />
								</button>
							)}
						</div>
						<div className="space-y-2">
							{filteredArchivedTasks.length > 0 ? (
								filteredArchivedTasks.map((task) => (
									<div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
										<div className="flex-1 min-w-0">
											<p className="font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
											<p className="text-sm text-gray-500 dark:text-gray-400">{task.id}</p>
										</div>
										<div className="flex items-center gap-2 flex-shrink-0">
											{onEditTask && (
												<button
													type="button"
													onClick={() => onEditTask(task)}
													className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
												>
													View
												</button>
											)}
											<button
												type="button"
												onClick={async () => {
													try {
														await apiClient.reopenTask(task.id);
														const data = await apiClient.fetchStatistics();
														setStatistics(data);
													} catch (err) {
														console.error("Failed to reopen task:", err);
													}
												}}
												className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors"
											>
												Reopen
											</button>
										</div>
									</div>
								))
							) : (
								<p className="text-sm text-gray-500 dark:text-gray-400">No archived tasks match your search.</p>
							)}
						</div>
					</>
				) : (
					<p className="text-sm text-gray-500 dark:text-gray-400">No archived tasks.</p>
				)}
			</div>
		</div>
	);
};

export default Statistics;
