import { useRef, useState } from "react";
import LabelColorPicker, { PRESET_COLORS } from "./LabelColorPicker";

function getEntityColor(item: string | { name: string; color?: string }): string | undefined {
	return typeof item === "string" ? undefined : item.color;
}

function getEntityName(item: string | { name: string; color?: string }): string {
	return typeof item === "string" ? item : item.name;
}

interface EntityApi {
	add: (name: string, color?: string) => Promise<unknown>;
	rename: (oldName: string, newName: string) => Promise<unknown>;
	remove: (name: string) => Promise<unknown>;
	setColor: (name: string, color: string) => Promise<unknown>;
	fetch: () => Promise<Array<string | { name: string; color?: string }>>;
}

interface ConfigEntityManagerProps {
	title: string;
	items: Array<string | { name: string; color?: string }>;
	api: EntityApi;
	badgeClass: string;
	placeholder: string;
	entityName: string;
	onItemsChange: (items: Array<string | { name: string; color?: string }>) => void;
	onError: (error: string | null) => void;
}

export default function ConfigEntityManager({
	title,
	items,
	api,
	badgeClass,
	placeholder,
	entityName,
	onItemsChange,
	onError,
}: ConfigEntityManagerProps) {
	const [colorPickerIndex, setColorPickerIndex] = useState<number | null>(null);
	const [newItemColor, setNewItemColor] = useState("");
	const colorPickerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Outside-click handler for color picker
	const handleOutsideClick = (e: MouseEvent) => {
		if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
			setColorPickerIndex(null);
		}
	};
	// We attach/detach via effect inside the component — but we need to use a ref
	// to avoid re-attaching on every render
	const savedHandler = useRef<typeof handleOutsideClick>(handleOutsideClick);
	savedHandler.current = handleOutsideClick;

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
			<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
			<div className="space-y-3">
				{items.map((item, index) => {
					const color = getEntityColor(item);
					const name = getEntityName(item);
					return (
						<div key={name} className="flex items-center gap-2 relative">
							<button
								type="button"
								className="size-4 rounded-circle border border-gray-300 cursor-pointer shrink-0"
								style={{ backgroundColor: color || "#9ca3af" }}
								onClick={(e) => {
									e.stopPropagation();
									setColorPickerIndex(index);
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										setColorPickerIndex(index);
									}
								}}
								title={`Change ${entityName} color`}
							/>
							{colorPickerIndex === index && (
								<div
									ref={(el) => {
										(colorPickerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
									}}
									className="absolute left-0 top-6 z-50"
								>
									<LabelColorPicker
										initialColor={color || ""}
										onApply={async (newColor) => {
											try {
												await api.setColor(name, newColor);
												const updated = await api.fetch();
												onItemsChange(updated);
											} catch (err) {
												onError(err instanceof Error ? err.message : `Failed to set ${entityName} color`);
												throw err;
											}
										}}
										onClose={() => setColorPickerIndex(null)}
									/>
								</div>
							)}
							<span className={`flex-1 px-3 py-1.5 rounded text-sm ${badgeClass}`}>{name}</span>
							<button
								type="button"
								onClick={async () => {
									const newName = prompt(`Rename ${entityName} to:`, name);
									if (newName?.trim() && newName.trim() !== name) {
										try {
											await api.rename(name, newName.trim());
											const updated = await api.fetch();
											onItemsChange(updated);
										} catch (err) {
											onError(err instanceof Error ? err.message : `Failed to rename ${entityName}`);
										}
									}
								}}
								className="px-2 py-1 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors"
							>
								Rename
							</button>
							<button
								type="button"
								onClick={async () => {
									if (confirm(`Remove ${entityName} "${name}" from config?`)) {
										try {
											await api.remove(name);
											const updated = await api.fetch();
											onItemsChange(updated);
										} catch (err) {
											onError(err instanceof Error ? err.message : `Failed to remove ${entityName}`);
										}
									}
								}}
								className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
							>
								Delete
							</button>
						</div>
					);
				})}
				<div className="flex items-center gap-2 pt-2">
					<button
						type="button"
						className="size-4 rounded-circle border border-gray-300 cursor-pointer shrink-0"
						style={{ backgroundColor: newItemColor || "#9ca3af" }}
						onClick={() => {
							const idx = Math.floor(Math.random() * PRESET_COLORS.length);
							const picked = PRESET_COLORS[idx];
							setNewItemColor(newItemColor ? "" : (picked ?? ""));
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								const idx = Math.floor(Math.random() * PRESET_COLORS.length);
								const picked = PRESET_COLORS[idx];
								setNewItemColor(newItemColor ? "" : (picked ?? ""));
							}
						}}
						title={`Toggle random color for new ${entityName}`}
					/>
					<input
						ref={inputRef}
						type="text"
						id={`new${title.replace(/\s+/g, "")}Input`}
						placeholder={placeholder}
						className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400"
					/>
					<button
						type="button"
						onClick={async () => {
							const el = inputRef.current;
							if (!el) return;
							const name = el.value.trim();
							if (!name) return;
							try {
								await api.add(name, newItemColor || undefined);
								const updated = await api.fetch();
								onItemsChange(updated);
								el.value = "";
								setNewItemColor("");
							} catch (err) {
								onError(err instanceof Error ? err.message : `Failed to add ${entityName}`);
							}
						}}
						className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
					>
						Add
					</button>
				</div>
			</div>
		</div>
	);
}
