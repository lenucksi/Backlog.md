import { useEffect, useState } from "react";
import type { DuplicateGroup } from "../../utils/duplicate-detection.ts";
import { apiClient } from "../lib/api.ts";

export default function DuplicateIdWarning() {
	const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		apiClient
			.fetchDuplicates()
			.then(setDuplicates)
			.catch(() => {});
	}, []);

	if (duplicates.length === 0 || dismissed) return null;

	return (
		<div className="fixed top-0 left-0 right-0 bg-amber-500 dark:bg-amber-600 text-white px-4 py-3 text-sm shadow-lg z-50 animate-slide-in-down transition-colors duration-200">
			<div className="flex items-center justify-between max-w-7xl mx-auto">
				<div className="flex items-center gap-3">
					<div className="size-2 bg-white rounded-circle animate-pulse" />
					<span className="font-semibold">Duplicate IDs detected:</span>
					<span>
						{duplicates.map((g) => g.id).join(", ")} — {duplicates.reduce((acc, g) => acc + g.tasks.length, 0)} tasks
						affected.
					</span>
				</div>
				<button
					onClick={() => setDismissed(true)}
					className="px-3 py-1.5 bg-amber-600 dark:bg-amber-700 hover:bg-amber-700 dark:hover:bg-amber-800 rounded text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-400"
				>
					Dismiss
				</button>
			</div>
		</div>
	);
}
