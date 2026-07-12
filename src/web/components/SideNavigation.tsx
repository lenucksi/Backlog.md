import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type {
	Decision,
	DecisionSearchResult,
	Document,
	DocumentSearchResult,
	SearchResult,
	SearchResultType,
	Task,
	TaskSearchResult,
} from "../../types";
import { apiClient } from "../lib/api";
import { parseSearchCommandQuery } from "../utils/search-command-query";
import { sanitizeUrlTitle } from "../utils/urlHelpers";
import { getWebVersion } from "../utils/version";
import CollapsibleGroup from "./CollapsibleGroup";
import ErrorBoundary from "./ErrorBoundary";
import { Icons } from "./icons";
import { SidebarSkeleton } from "./LoadingSpinner";

// Utility functions for ID transformations
const stripIdPrefix = (id: string): string => {
	// Remove any prefix pattern: letters followed by dash (task-, doc-, decision-, JIRA-, etc.)
	return id.replace(/^[a-zA-Z]+-/, "");
};

const hasTaskSearchFilters = (parsedQuery: ReturnType<typeof parseSearchCommandQuery>): boolean => {
	return Boolean(
		parsedQuery.status ||
			parsedQuery.priority ||
			parsedQuery.assignee ||
			(parsedQuery.labels && parsedQuery.labels.length > 0) ||
			(parsedQuery.modifiedFiles && parsedQuery.modifiedFiles.length > 0),
	);
};

interface NavItemProps {
	to: string;
	icon: React.ReactNode;
	label: string;
	isCollapsed?: boolean;
	rightContent?: React.ReactNode;
}

const navItemClass = (isActive: boolean, isCollapsed?: boolean) =>
	isCollapsed
		? `flex items-center justify-center p-3 rounded-md transition-colors duration-200 ${
				isActive
					? "bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400"
					: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
			}`
		: `flex items-center px-3 py-2 rounded-lg transition-colors duration-200 ${
				isActive
					? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-medium"
					: "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
			}`;

function NavItem({ to, icon, label, isCollapsed, rightContent }: NavItemProps) {
	return (
		<NavLink
			to={to}
			{...(isCollapsed ? { title: label } : {})}
			className={({ isActive }) => navItemClass(isActive, isCollapsed)}
		>
			{isCollapsed ? (
				<div className="size-6 flex items-center justify-center">{icon}</div>
			) : (
				<>
					{icon}
					<span className="ml-3 text-sm font-medium">{label}</span>
					{rightContent}
				</>
			)}
		</NavLink>
	);
}

interface DocDecisionNavLinkProps {
	id: string;
	title: string;
	icon: React.ReactNode;
	pathPrefix: string;
}

function DocDecisionNavLink({ id, title, icon, pathPrefix }: DocDecisionNavLinkProps) {
	return (
		<NavLink
			to={`${pathPrefix}/${stripIdPrefix(id)}/${sanitizeUrlTitle(title)}`}
			className={({ isActive }) =>
				`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
					isActive
						? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-medium"
						: "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
				}`
			}
		>
			<span className="text-gray-400 dark:text-gray-500">{icon}</span>
			<span className="text-xs text-gray-400 dark:text-gray-500 font-mono w-7 text-right shrink-0">
				{stripIdPrefix(id)}
			</span>
			<span className="truncate">{title}</span>
		</NavLink>
	);
}

interface CollapsedSectionButtonProps {
	pathPrefix: string;
	icon: React.ReactNode;
	label: string;
	onExpand: () => void;
}

function CollapsedSectionButton({ pathPrefix, icon, label, onExpand }: CollapsedSectionButtonProps) {
	const sectionLocation = useLocation();
	return (
		<button
			type="button"
			onClick={onExpand}
			data-tooltip-id="sidebar-tooltip"
			data-tooltip-content={label}
			className={`flex items-center justify-center p-3 rounded-md transition-colors duration-200 w-full ${
				sectionLocation.pathname.startsWith(pathPrefix)
					? "bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400"
					: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
			}`}
		>
			<div className="size-6 flex items-center justify-center">{icon}</div>
		</button>
	);
}

// Icon components imported from centralized icon set

interface SideNavigationProps {
	tasks: Task[];
	docs: Document[];
	decisions: Decision[];
	archivedDocs: Array<{ id: string; title: string; path: string }>;
	completedTasks: Task[];
	isLoading: boolean;
	error?: Error | null;
	onRetry?: () => void;
	onRefreshData: () => Promise<void>;
}

const SideNavigation = memo(function SideNavigation({
	tasks,
	docs,
	decisions,
	archivedDocs,
	completedTasks,
	isLoading,
	error,
	onRetry,
}: SideNavigationProps) {
	const [isCollapsed, setIsCollapsed] = useState(() => {
		const saved = localStorage.getItem("sideNavCollapsed");
		return saved ? JSON.parse(saved) : false;
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [searchInputRef, setSearchInputRef] = useState<HTMLInputElement | null>(null);
	const [archivedDocsOpen, setArchivedDocsOpen] = useState(false);
	const [supersededOpen, setSupersededOpen] = useState(false);
	const [version, setVersion] = useState<string>("");
	const [sidebarWidth, setSidebarWidth] = useState(() => {
		const saved = localStorage.getItem("sideNavWidth");
		if (saved) {
			const parsed = Number.parseInt(saved, 10);
			if (!Number.isNaN(parsed)) return Math.min(Math.max(parsed, 240), 600);
		}
		return 380;
	});
	const [isResizing, setIsResizing] = useState(false);
	const [docSortField, setDocSortField] = useState<"id" | "title" | "lastModified" | "createdDate">("title");
	const [docSortDir, setDocSortDir] = useState<"asc" | "desc">("asc");
	const [decisionSortField, setDecisionSortField] = useState<"id" | "title" | "date">("title");
	const [decisionSortDir, setDecisionSortDir] = useState<"asc" | "desc">("asc");
	const navigate = useNavigate();

	const handleCreateDocument = useCallback(() => {
		navigate("/documentation/new");
	}, [navigate]);

	useEffect(() => {
		localStorage.setItem("sideNavCollapsed", JSON.stringify(isCollapsed));
	}, [isCollapsed]);

	useEffect(() => {
		getWebVersion()
			.then(setVersion)
			.catch(() => setVersion(""));
	}, []);

	// Add keyboard shortcut for search
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				if (isCollapsed) {
					// Expand sidebar first, then focus will happen on next render
					setIsCollapsed(false);
				} else if (searchInputRef) {
					searchInputRef.focus();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [searchInputRef, isCollapsed]);

	// Auto-focus search input when sidebar expands
	useEffect(() => {
		if (!isCollapsed && searchInputRef) {
			// Small delay to ensure the input is rendered
			const timer = setTimeout(() => {
				searchInputRef.focus();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [isCollapsed, searchInputRef]);

	// Perform unified search via centralized API (debounced)
	useEffect(() => {
		const query = searchQuery.trim();
		if (query === "") {
			setSearchResults([]);
			setSearchError(null);
			setIsSearching(false);
			return;
		}

		let cancelled = false;
		setIsSearching(true);
		setSearchError(null);
		const timeout = setTimeout(async () => {
			try {
				const parsedQuery = parseSearchCommandQuery(query);
				const types: SearchResultType[] | undefined =
					parsedQuery.types ?? (hasTaskSearchFilters(parsedQuery) ? ["task"] : undefined);
				const results = await apiClient.search({ ...parsedQuery, types, limit: 15 });
				if (!cancelled) {
					setSearchResults(results);
				}
			} catch (err) {
				console.error("Sidebar search failed:", err);
				if (!cancelled) {
					setSearchResults([]);
					setSearchError("Search failed");
				}
			} finally {
				if (!cancelled) {
					setIsSearching(false);
				}
			}
		}, 200);

		return () => {
			cancelled = true;
			clearTimeout(timeout);
		};
	}, [searchQuery]);

	const unifiedSearchResults = useMemo(() => {
		if (!searchQuery.trim()) {
			return [];
		}
		const filtered = searchResults
			.filter((result) => result.score === null || result.score <= 0.45)
			.sort((a, b) => {
				const scoreA = a.score ?? Number.POSITIVE_INFINITY;
				const scoreB = b.score ?? Number.POSITIVE_INFINITY;
				return scoreA - scoreB;
			});

		return filtered.slice(0, 5);
	}, [searchQuery, searchResults]);

	const sortedDocs = useMemo(() => {
		return [...docs].sort((a, b) => {
			let cmp = 0;
			switch (docSortField) {
				case "id":
					cmp = Number.parseInt(stripIdPrefix(a.id), 10) - Number.parseInt(stripIdPrefix(b.id), 10);
					break;
				case "title":
					cmp = a.title.localeCompare(b.title);
					break;
				case "lastModified":
					cmp = (a.lastModified || "").localeCompare(b.lastModified || "");
					break;
				case "createdDate":
					cmp = (a.createdDate || "").localeCompare(b.createdDate || "");
					break;
			}
			return docSortDir === "asc" ? cmp : -cmp;
		});
	}, [docs, docSortField, docSortDir]);

	const sortedDecisions = useMemo(() => {
		return [...decisions]
			.filter((d) => d.status !== "superseded")
			.sort((a, b) => {
				let cmp = 0;
				switch (decisionSortField) {
					case "id":
						cmp = Number.parseInt(stripIdPrefix(a.id), 10) - Number.parseInt(stripIdPrefix(b.id), 10);
						break;
					case "title":
						cmp = a.title.localeCompare(b.title);
						break;
					case "date":
						cmp = (a.date || "").localeCompare(b.date || "");
						break;
				}
				return decisionSortDir === "asc" ? cmp : -cmp;
			});
	}, [decisions, decisionSortField, decisionSortDir]);

	const _handleResizeStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			setIsResizing(true);

			const startX = e.clientX;
			const startWidth = sidebarWidth;

			document.body.style.userSelect = "none";
			document.body.style.cursor = "col-resize";

			const handleMouseMove = (e: MouseEvent) => {
				const delta = e.clientX - startX;
				const newWidth = Math.min(Math.max(startWidth + delta, 240), 600);
				setSidebarWidth(newWidth);
				localStorage.setItem("sideNavWidth", String(newWidth));
			};

			const handleMouseUp = () => {
				setIsResizing(false);
				document.body.style.userSelect = "";
				document.body.style.cursor = "";
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};

			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		},
		[sidebarWidth],
	);

	const toggleCollapse = useCallback(() => {
		setIsCollapsed((prev: boolean) => !prev);
	}, []);

	return (
		<ErrorBoundary>
			<div
				className={`relative bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-full z-10 ${isCollapsed ? "w-16" : ""} ${isResizing ? "transition-none" : "transition-[width,opacity] duration-300"}`}
				style={isCollapsed ? undefined : { width: sidebarWidth }}
			>
				{/* Search Bar */}
				<div
					className={`${isCollapsed ? "px-2" : "px-4"} border-b border-gray-200 dark:border-gray-700 h-18 flex items-center relative`}
				>
					{/* Collapse Toggle Button - Always positioned on the border */}
					<button
						type="button"
						onClick={toggleCollapse}
						className="absolute -right-3 top-1/2 transform -translate-y-1/2 z-10 flex items-center justify-center size-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-circle shadow-sm hover:shadow-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200"
						aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
						title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					>
						{isCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
					</button>

					{!isCollapsed ? (
						<div className="flex items-center w-full">
							<div className="relative flex-1">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
									<Icons.Search />
								</div>
								<input
									ref={setSearchInputRef}
									type="text"
									placeholder="Search (⌘K)..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 focus:border-transparent transition-colors duration-200"
								/>
								{searchQuery && (
									<button
										type="button"
										onClick={() => setSearchQuery("")}
										className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
									>
										<Icons.Close />
									</button>
								)}
							</div>
						</div>
					) : (
						<div className="flex items-center justify-center">
							<button
								type="button"
								onClick={() => setIsCollapsed(false)}
								className="flex items-center justify-center p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
								title="Search (⌘K)"
							>
								<Icons.Search />
							</button>
						</div>
					)}
				</div>

				{/* Unified Search Results */}
				{!isCollapsed && searchQuery.trim() && unifiedSearchResults.length > 0 && (
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Search Results</h3>
							{isSearching && <span className="text-xs text-gray-500 dark:text-gray-400">Searching…</span>}
						</div>
						<div className="space-y-1">
							{unifiedSearchResults.map((result) => {
								const item =
									result.type === "task"
										? (result as TaskSearchResult).task
										: result.type === "document"
											? (result as DocumentSearchResult).document
											: (result as DecisionSearchResult).decision;
								const getResultLink = () => {
									if (result.type === "document") {
										return `/documentation/${stripIdPrefix(item.id)}/${sanitizeUrlTitle(item.title)}`;
									}
									if (result.type === "decision") {
										return `/decisions/${stripIdPrefix(item.id)}/${sanitizeUrlTitle(item.title)}`;
									}
									return `/?highlight=${encodeURIComponent(item.id)}`;
								};

								const getResultIcon = () => {
									if (result.type === "document")
										return (
											<span className="text-green-500">
												<Icons.DocumentPage />
											</span>
										);
									if (result.type === "decision")
										return (
											<span className="text-stone-500">
												<Icons.DecisionPage />
											</span>
										);
									return (
										<span className="text-purple-500">
											<Icons.Tasks />
										</span>
									);
								};

								return (
									<NavLink
										key={`${result.type}-${item.id}`}
										to={getResultLink()}
										className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
									>
										{getResultIcon()}
										<div className="flex-1 min-w-0">
											<div className="font-medium truncate">{item.title}</div>
											<div className="text-xs text-gray-500 dark:text-gray-400 truncate">
												{result.type.charAt(0).toUpperCase() + result.type.slice(1)} • {item.id}
											</div>
										</div>
										{result.score !== null && (
											<div className="text-xs text-gray-400 dark:text-gray-500">
												{`${Math.round((1 - result.score) * 100)}%`}
											</div>
										)}
									</NavLink>
								);
							})}
						</div>
					</div>
				)}

				{!isCollapsed && searchQuery.trim() && unifiedSearchResults.length === 0 && !isSearching && !searchError && (
					<div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
						No matching results
					</div>
				)}

				{!isCollapsed && searchQuery.trim() && searchError && (
					<div className="px-4 py-2 text-sm text-red-600 dark:text-red-400 border-b border-gray-200 dark:border-gray-700">
						{searchError}
					</div>
				)}

				<nav className="flex-1 overflow-y-auto overflow-x-hidden">
					{/* Loading Indicator - only show when expanded since collapsed nav is static */}
					{isLoading && !isCollapsed && <SidebarSkeleton isCollapsed={false} />}

					{/* Error State */}
					{error && !isLoading && !isCollapsed && (
						<div className="px-4 py-4">
							<div className="text-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
								<p className="text-sm text-red-700 dark:text-red-400 mb-2">Failed to load navigation</p>
								{onRetry && (
									<button
										type="button"
										onClick={onRetry}
										className="text-xs px-3 py-1 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200"
									>
										Retry
									</button>
								)}
							</div>
						</div>
					)}

					{/* Tasks Section - Hidden in collapsed state and when loading */}
					{!isCollapsed && !isLoading && (
						<div className="px-4 py-4">
							<div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
								<span className="text-gray-500 dark:text-gray-400">
									<Icons.Tasks />
								</span>
								<span className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 whitespace-nowrap">
									Tasks ({tasks.length})
								</span>
							</div>
						</div>
					)}

					{/* Navigation items only show when expanded and not loading */}
					{!isCollapsed && !isLoading && (
						<div className="px-4 space-y-1">
							<NavItem to="/" icon={<Icons.Board />} label="Kanban Board" />
							<NavItem to="/tasks" icon={<Icons.List />} label="All Tasks" />
							<NavItem to="/milestones" icon={<Icons.Milestone />} label="Milestones" />
							<NavItem to="/drafts" icon={<Icons.Draft />} label="Drafts" />
							<NavItem to="/statistics" icon={<Icons.Statistics />} label="Statistics" />
						</div>
					)}

					{/* Archived Tasks Navigation */}
					{!isCollapsed && !isLoading && completedTasks.length > 0 && (
						<NavLink
							to="/statistics#archived"
							className={({ isActive }) =>
								`flex items-center px-3 py-2 rounded-lg transition-colors duration-200 ${
									isActive
										? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-medium"
										: "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
								}`
							}
						>
							<Icons.List />
							<span className="ml-3 text-sm font-medium">Archived Tasks</span>
							<span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{completedTasks.length}</span>
						</NavLink>
					)}

					{!isCollapsed && !isLoading && (
						<>
							{/* Divider between Tasks and Documents */}
							<div className="mx-4 my-2 border-t border-gray-200 dark:border-gray-700" />

							<CollapsibleGroup
								title="Documents"
								icon={<Icons.Document />}
								count={sortedDocs.length}
								storageKey="docsCollapsed"
								onCreate={handleCreateDocument}
								defaultCollapsed={sortedDocs.length > 6}
								headerRightContent={
									<>
										<button
											type="button"
											onClick={() => setDocSortDir((d) => (d === "asc" ? "desc" : "asc"))}
											className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors duration-200"
											title={docSortDir === "asc" ? "Ascending" : "Descending"}
										>
											{docSortDir === "asc" ? "▲" : "▼"}
										</button>
										<select
											value={docSortField}
											onChange={(e) => setDocSortField(e.target.value as typeof docSortField)}
											className="text-xs bg-transparent text-gray-400 dark:text-gray-500 border-none outline-none cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
										>
											<option value="id">#</option>
											<option value="title">Name</option>
											<option value="lastModified">Zuletzt</option>
											<option value="createdDate">Erstellt</option>
										</select>
									</>
								}
							>
								{sortedDocs.map((doc) => (
									<DocDecisionNavLink
										key={doc.id}
										id={doc.id}
										title={doc.title}
										icon={<Icons.DocumentPage />}
										pathPrefix="/documentation"
									/>
								))}

								{/* Archived Docs toggle inside Documents section */}
								<div className="pt-1 mt-1 border-t border-gray-100 dark:border-gray-700/50">
									<button
										type="button"
										onClick={() => setArchivedDocsOpen(!archivedDocsOpen)}
										className="flex items-center gap-1.5 w-full px-3 py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
									>
										<svg
											aria-hidden="true"
											className={`size-3 transition-transform ${archivedDocsOpen ? "rotate-90" : ""}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
										</svg>
										Archived ({archivedDocs.length})
									</button>
									{archivedDocsOpen && (
										<div className="space-y-0.5 mt-0.5">
											{archivedDocs.map((doc) => (
												<NavLink
													key={doc.id}
													to={`/documentation/${stripIdPrefix(doc.id)}/${sanitizeUrlTitle(doc.title)}`}
													className={({ isActive }) =>
														`flex items-center gap-3 px-3 py-1 text-xs rounded-lg transition-colors duration-200 ml-4 ${
															isActive
																? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-medium"
																: "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-400"
														}`
													}
												>
													<span className="truncate">{doc.title}</span>
												</NavLink>
											))}
										</div>
									)}
								</div>
							</CollapsibleGroup>

							{/* Divider between Documents and Decisions */}
							<div className="mx-4 my-2 border-t border-gray-200 dark:border-gray-700" />

							<CollapsibleGroup
								title="Decisions"
								icon={<Icons.Decision />}
								count={sortedDecisions.length}
								storageKey="decisionsCollapsed"
								defaultCollapsed={sortedDecisions.length > 6}
								headerRightContent={
									<>
										<button
											type="button"
											onClick={() => setDecisionSortDir((d) => (d === "asc" ? "desc" : "asc"))}
											className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors duration-200"
											title={decisionSortDir === "asc" ? "Ascending" : "Descending"}
										>
											{decisionSortDir === "asc" ? "▲" : "▼"}
										</button>
										<select
											value={decisionSortField}
											onChange={(e) => setDecisionSortField(e.target.value as typeof decisionSortField)}
											className="text-xs bg-transparent text-gray-400 dark:text-gray-500 border-none outline-none cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
										>
											<option value="id">#</option>
											<option value="title">Name</option>
											<option value="date">Datum</option>
										</select>
									</>
								}
							>
								{sortedDecisions.map((decision) => (
									<DocDecisionNavLink
										key={decision.id}
										id={decision.id}
										title={decision.title}
										icon={<Icons.DecisionPage />}
										pathPrefix="/decisions"
									/>
								))}
								{/* Superseded toggle inside Decisions section */}
								<div className="pt-1 mt-1 border-t border-gray-100 dark:border-gray-700/50">
									<button
										type="button"
										onClick={() => setSupersededOpen(!supersededOpen)}
										className="flex items-center gap-1.5 w-full px-3 py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
									>
										<svg
											aria-hidden="true"
											className={`size-3 transition-transform ${supersededOpen ? "rotate-90" : ""}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
										</svg>
										Superseded ({decisions.filter((d) => d.status === "superseded").length})
									</button>
									{supersededOpen && (
										<div className="space-y-0.5 mt-0.5">
											{decisions
												.filter((d) => d.status === "superseded")
												.map((decision) => (
													<NavLink
														key={decision.id}
														to={`/decisions/${stripIdPrefix(decision.id)}/${sanitizeUrlTitle(decision.title)}`}
														className={({ isActive }) =>
															`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg transition-colors duration-200 ml-4 ${
																isActive
																	? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-medium"
																	: "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-400"
															}`
														}
													>
														<span className="text-gray-400 dark:text-gray-500 font-mono shrink-0">
															{stripIdPrefix(decision.id)}
														</span>
														<div className="flex-1 min-w-0">
															<span className="truncate">{decision.title}</span>
															{decision.supersededBy && (
																<div className="text-xs text-gray-400 dark:text-gray-500 truncate">
																	superseded by {decision.supersededBy}
																</div>
															)}
														</div>
													</NavLink>
												))}
										</div>
									)}
								</div>
							</CollapsibleGroup>
						</>
					)}

					{isCollapsed && (
						<div className="px-2 py-2 space-y-2">
							<NavItem to="/" icon={<Icons.Board />} label="Kanban Board" isCollapsed />
							<NavItem to="/tasks" icon={<Icons.List />} label="All Tasks" isCollapsed />
							<NavItem to="/drafts" icon={<Icons.Draft />} label="Drafts" isCollapsed />
							<NavItem to="/milestones" icon={<Icons.Milestone />} label="Milestones" isCollapsed />
							<NavItem to="/statistics" icon={<Icons.Statistics />} label="Statistics" isCollapsed />
							<CollapsedSectionButton
								pathPrefix="/documentation"
								icon={<Icons.Document />}
								label="Documentation"
								onExpand={() => setIsCollapsed(false)}
							/>
							<CollapsedSectionButton
								pathPrefix="/decisions"
								icon={<Icons.Decision />}
								label="Decisions"
								onExpand={() => setIsCollapsed(false)}
							/>
						</div>
					)}
				</nav>

				{/* Settings Button - Bottom Left */}
				<div className={`border-t border-gray-200 dark:border-gray-700 ${isCollapsed ? "px-2 py-2" : "px-4 py-4"}`}>
					{!isCollapsed ? (
						<NavItem
							to="/settings"
							icon={<Icons.DocumentSettings />}
							label="Settings"
							rightContent={
								version ? (
									<span className="ml-auto text-xs text-gray-500 dark:text-gray-400">Backlog.md - v{version}</span>
								) : undefined
							}
						/>
					) : (
						<NavLink
							to="/settings"
							data-tooltip-id="sidebar-tooltip"
							data-tooltip-content="Settings"
							className={({ isActive }) =>
								`flex items-center justify-center p-3 rounded-md transition-colors duration-200 ${
									isActive
										? "bg-stone-50 dark:bg-stone-900/30 text-stone-700 dark:text-stone-400"
										: "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
								}`
							}
						>
							<div className="size-6 flex items-center justify-center">
								<Icons.DocumentSettings />
							</div>
						</NavLink>
					)}
				</div>

				{!isCollapsed && (
					<div className="absolute right-0 top-0 bottom-0 w-1.5 z-20 group">
						<input
							type="range"
							min={240}
							max={600}
							value={sidebarWidth}
							onChange={(e) => {
								const newWidth = Number(e.target.value);
								setSidebarWidth(newWidth);
								localStorage.setItem("sideNavWidth", String(newWidth));
							}}
							aria-label="Sidebar width"
							className="absolute inset-0 cursor-col-resize opacity-0 m-0"
						/>
						<div className="pointer-events-none absolute right-px top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-blue-400 group-active:bg-blue-500 transition-colors duration-150" />
					</div>
				)}
			</div>
		</ErrorBoundary>
	);
});

export default SideNavigation;
