import type React from "react";

interface StatusSelectorProps {
	configKey: string;
	label: string;
	statuses: string[];
	value: string[];
	onChange: (key: string, value: string[]) => void;
	description: string;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({
	configKey,
	label,
	statuses,
	value,
	onChange,
	description,
}) => (
	<div>
		<label htmlFor={configKey} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
			{label}
		</label>
		<div className="flex flex-wrap gap-1.5 mb-1">
			{statuses.map((status) => {
				const checked = value.includes(status);
				return (
					<button
						key={status}
						type="button"
						onClick={() => {
							onChange(configKey, checked ? value.filter((s) => s !== status) : [...value, status]);
						}}
						className={`px-2.5 py-1 text-xs rounded-md border transition-colors duration-150 ${
							checked
								? "bg-stone-100 dark:bg-stone-700 border-stone-400 dark:border-stone-500 font-medium"
								: "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400"
						}`}
					>
						{status}
					</button>
				);
			})}
		</div>
		<p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
	</div>
);

export default StatusSelector;
