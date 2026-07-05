import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface CollapsibleGroupProps {
	title: string;
	icon: React.ReactNode;
	count: number;
	storageKey: string;
	onCreate?: () => void;
	headerRightContent?: React.ReactNode;
	children: React.ReactNode;
	defaultCollapsed?: boolean;
	to?: string;
}

function CollapsibleGroup({
	title,
	icon,
	count,
	storageKey,
	onCreate,
	headerRightContent,
	children,
	defaultCollapsed = false,
	to,
}: CollapsibleGroupProps) {
	const [isCollapsed, setIsCollapsed] = useState(() => {
		const saved = localStorage.getItem(storageKey);
		if (saved !== null) return JSON.parse(saved);
		return defaultCollapsed;
	});

	useEffect(() => {
		localStorage.setItem(storageKey, JSON.stringify(isCollapsed));
	}, [isCollapsed, storageKey]);

	useEffect(() => {
		const saved = localStorage.getItem(storageKey);
		if (saved === null && defaultCollapsed) {
			setIsCollapsed(true);
		}
	}, [defaultCollapsed, storageKey]);

	return (
		<div className="px-4 py-4">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-3">
					<button
						onClick={() => setIsCollapsed(!isCollapsed)}
						className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors duration-200"
						title={isCollapsed ? `Expand ${title.toLowerCase()}` : `Collapse ${title.toLowerCase()}`}
					>
						{isCollapsed ? (
							<svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
							</svg>
						) : (
							<svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							</svg>
						)}
					</button>
					<span className="text-gray-500 dark:text-gray-400">{icon}</span>
					{to ? (
						<Link
							to={to}
							className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 whitespace-nowrap hover:underline transition-colors"
						>
							{title} ({count}) →
						</Link>
					) : (
						<span className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 whitespace-nowrap">
							{title} ({count})
						</span>
					)}
				</div>
				<div className="flex items-center gap-1">
					{headerRightContent}
					{onCreate && (
						<button
							onClick={onCreate}
							className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors duration-200"
							title={`Create new ${title.toLowerCase()}`}
						>
							<svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
								<circle cx="12" cy="12" r="10" />
							</svg>
						</button>
					)}
				</div>
			</div>
			{!isCollapsed && (
				<div className="space-y-1">
					{count === 0 ? (
						<p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No {title.toLowerCase()}</p>
					) : (
						children
					)}
				</div>
			)}
		</div>
	);
}

export default CollapsibleGroup;
