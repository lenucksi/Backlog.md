import React, { useState, useRef, useEffect, type KeyboardEvent } from "react";

interface ChipInputProps {
	value: string[];
	onChange: (values: string[]) => void;
	placeholder?: string;
	label: string;
	name: string;
	disabled?: boolean;
	suggestions?: string[];
	singleSelect?: boolean;
	colorMap?: Record<string, string>;
}

const ChipInput: React.FC<ChipInputProps> = ({
	value,
	onChange,
	placeholder,
	label,
	name,
	disabled,
	suggestions,
	singleSelect,
	colorMap,
}) => {
	const [inputValue, setInputValue] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
	const inputRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const inputId = `chip-input-${name}`;

	const filteredSuggestions = (suggestions ?? []).filter(
		(s) =>
			s.toLowerCase().includes(inputValue.toLowerCase()) &&
			!value.includes(s) &&
			inputValue.length > 0,
	);

	const addChip = (text: string) => {
		const trimmed = text.trim();
		if (trimmed && !value.includes(trimmed)) {
			if (singleSelect) {
				onChange([trimmed]);
			} else {
				onChange([...value, trimmed]);
			}
		}
		setInputValue("");
		setShowSuggestions(false);
		setSelectedSuggestion(-1);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (disabled) return;

		if (showSuggestions && filteredSuggestions.length > 0) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				e.stopPropagation();
				setSelectedSuggestion((prev) =>
					prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
				);
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				e.stopPropagation();
				setSelectedSuggestion((prev) =>
					prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
				);
				return;
			}
			if (e.key === "Enter" && selectedSuggestion >= 0) {
				e.preventDefault();
				const selected = filteredSuggestions[selectedSuggestion];
				if (selected) addChip(selected);
				return;
			}
			if (e.key === "Escape") {
				setShowSuggestions(false);
				setSelectedSuggestion(-1);
				return;
			}
		}

		if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
			e.preventDefault();
			if (!singleSelect || value.length === 0) {
				addChip(inputValue);
			}
		} else if (e.key === "Backspace" && !inputValue && value.length > 0) {
			if (singleSelect) {
				onChange([]);
			} else {
				onChange(value.slice(0, -1));
			}
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		if (newValue.endsWith(",") && !singleSelect) {
			const chipValue = newValue.slice(0, -1).trim();
			if (chipValue) addChip(chipValue);
			else setInputValue("");
		} else {
			setInputValue(newValue);
			setShowSuggestions(true);
			setSelectedSuggestion(-1);
		}
	};

	const handleBlur = () => {
		setTimeout(() => {
			setShowSuggestions(false);
			setSelectedSuggestion(-1);
		}, 150);
	};

	useEffect(() => {
		if (!showSuggestions || filteredSuggestions.length === 0) {
			setSelectedSuggestion(-1);
		}
	}, [showSuggestions, filteredSuggestions.length]);

	useEffect(() => {
		if (selectedSuggestion < 0 || !dropdownRef.current) return;
		const el = dropdownRef.current.children[selectedSuggestion] as HTMLElement | undefined;
		el?.scrollIntoView({ block: "nearest" });
	}, [selectedSuggestion]);

	const removeChip = (index: number) => {
		if (disabled) return;
		if (singleSelect) {
			onChange([]);
		} else {
			onChange(value.filter((_, i) => i !== index));
		}
	};

	return (
		<div className="w-full">
			<label
				htmlFor={inputId}
				className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200"
			>
				{label}
			</label>
			<div
				className={`relative w-full min-h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 focus-within:border-transparent transition-colors duration-200 pr-2 ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
			>
				<div className="flex flex-wrap gap-2 items-center w-full">
					{value.map((item, index) => (
						<span
							key={index}
							className="inline-flex items-center gap-1 px-2 py-0.5 text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-md flex-shrink-0 min-w-0 max-w-full transition-colors duration-200"
						>
							{colorMap?.[item] && (
								<span
									className="inline-block w-2 h-2 rounded-full shrink-0"
									style={{ backgroundColor: colorMap[item] }}
								/>
							)}
							<span className="truncate max-w-[16rem] sm:max-w-[20rem] md:max-w-[24rem]">
								{item}
							</span>
							{!disabled && (
								<button
									type="button"
									onClick={() => removeChip(index)}
									className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-sm p-0.5 transition-colors duration-200"
									aria-label={`Remove ${item}`}
								>
									<svg
										className="w-3 h-3"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
											clipRule="evenodd"
										/>
									</svg>
								</button>
							)}
						</span>
					))}
					{(!singleSelect || value.length === 0) && (
						<input
							ref={inputRef}
							id={inputId}
							type="text"
							value={inputValue}
							onChange={handleInputChange}
							onKeyDown={handleKeyDown}
							onBlur={handleBlur}
							onFocus={() => inputValue.length > 0 && setShowSuggestions(true)}
							placeholder={value.length === 0 ? placeholder : ""}
							className="flex-1 min-w-[2ch] outline-none text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
							disabled={disabled}
						/>
					)}
				</div>
			</div>
			{showSuggestions && filteredSuggestions.length > 0 && (
				<div
					ref={dropdownRef}
					className="absolute z-50 mt-1 w-64 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg"
				>
					{filteredSuggestions.map((suggestion, index) => (
						<button
							key={suggestion}
							type="button"
							onMouseDown={(e) => {
								e.preventDefault();
								addChip(suggestion);
							}}
							onMouseEnter={() => setSelectedSuggestion(index)}
							className={`w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center gap-2 ${
								index === selectedSuggestion
									? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200"
									: "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
							}`}
						>
							{colorMap?.[suggestion] && (
								<span
									className="inline-block w-2 h-2 rounded-full shrink-0"
									style={{ backgroundColor: colorMap[suggestion] }}
								/>
							)}
							{suggestion}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default ChipInput;
