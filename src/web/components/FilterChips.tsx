export interface FilterChip {
	key: string;
	label: string;
	color?: string;
	onRemove: () => void;
}

interface FilterChipsProps {
	chips: FilterChip[];
}

export default function FilterChips({ chips }: FilterChipsProps) {
	if (chips.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-2">
			{chips.map((chip) => (
				<span
					key={chip.key}
					className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-circle border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
				>
					{chip.color && (
						<span
							className="inline-block size-2 rounded-circle flex-shrink-0"
							style={{ backgroundColor: chip.color }}
						/>
					)}
					<span className="max-w-[200px] truncate">{chip.label}</span>
					<button
						type="button"
						onClick={chip.onRemove}
						className="inline-flex items-center justify-center size-3.5 rounded-circle hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0 ml-0.5"
						aria-label={`Remove filter: ${chip.label}`}
					>
						<svg className="size-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</span>
			))}
		</div>
	);
}
