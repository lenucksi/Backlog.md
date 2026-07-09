import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { BacklogConfig } from "../../types";
import { apiClient } from "../lib/api";
import { SuccessToast } from "./SuccessToast";

const PRESET_COLORS = [
	"#f9c4c4",
	"#fad0b4",
	"#f9e6b4",
	"#c4e6c4",
	"#b4e0d0",
	"#b8d4f0",
	"#d4b8e6",
	"#f4b4c4",
	"#b4e0e6",
	"#c4e6b4",
	"#f4d0b4",
	"#c4c4d0",
];

function getLabelColor(label: string | { name: string; color?: string }): string | undefined {
	return typeof label === "string" ? undefined : label.color;
}

function getLabelName(label: string | { name: string; color?: string }): string {
	return typeof label === "string" ? label : label.name;
}

const Settings: React.FC = () => {
	const [config, setConfig] = useState<BacklogConfig | null>(null);
	const [originalConfig, setOriginalConfig] = useState<BacklogConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showSuccess, setShowSuccess] = useState(false);
	const [statuses, setStatuses] = useState<string[]>([]);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
	const [colorPickerIndex, setColorPickerIndex] = useState<number | null>(null);
	const [colorPickerColor, setColorPickerColor] = useState("");
	const [newLabelColor, setNewLabelColor] = useState("");
	const [newAuthorColor, setNewAuthorColor] = useState("");
	const colorPickerRef = useRef<HTMLDivElement>(null);

	const loadConfig = async () => {
		try {
			setLoading(true);
			const data = await apiClient.fetchConfig();
			setConfig(data);
			setOriginalConfig(data);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load configuration");
		} finally {
			setLoading(false);
		}
	};

	const loadStatuses = async () => {
		try {
			const data = await apiClient.fetchStatuses();
			setStatuses(data);
		} catch (err) {
			console.error("Failed to load statuses:", err);
		}
	};

	useEffect(() => {
		loadConfig();
		loadStatuses();
	}, [loadStatuses, loadConfig]);

	const handleInputChange = (field: keyof BacklogConfig, value: unknown) => {
		if (!config) return;

		setConfig({
			...config,
			[field]: value,
		});

		// Clear validation error for this field
		if (validationErrors[field]) {
			setValidationErrors({
				...validationErrors,
				[field]: "",
			});
		}
	};

	useEffect(() => {
		if (colorPickerIndex === null) return;
		const handler = (e: MouseEvent) => {
			if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
				setColorPickerIndex(null);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [colorPickerIndex]);

	const normalizeDefinitionOfDone = (items: string[] | undefined): string[] | undefined => {
		const normalized = (items ?? []).map((item) => item.trim()).filter((item) => item.length > 0);
		return normalized.length > 0 ? normalized : undefined;
	};

	const validateConfig = (): boolean => {
		const errors: Record<string, string> = {};

		if (!config) return false;

		// Validate project name
		if (!config.projectName.trim()) {
			errors.projectName = "Project name is required";
		}

		// Validate port number
		if (config.defaultPort && (config.defaultPort < 1 || config.defaultPort > 65535)) {
			errors.defaultPort = "Port must be between 1 and 65535";
		}

		setValidationErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSave = async () => {
		if (!config || !validateConfig()) return;

		try {
			setSaving(true);
			const normalizedConfig = {
				...config,
				definitionOfDone: normalizeDefinitionOfDone(config.definitionOfDone),
			};
			await apiClient.updateConfig(normalizedConfig);
			setConfig(normalizedConfig);
			setOriginalConfig(normalizedConfig);
			setShowSuccess(true);
			setTimeout(() => setShowSuccess(false), 3000);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save configuration");
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		setConfig(originalConfig);
		setValidationErrors({});
	};

	const hasUnsavedChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

	if (loading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="flex items-center justify-center py-12">
					<div className="text-lg text-gray-600 dark:text-gray-300">Loading settings...</div>
				</div>
			</div>
		);
	}

	if (!config) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="flex items-center justify-center py-12">
					<div className="text-red-600 dark:text-red-400">Failed to load configuration</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8 transition-colors duration-200">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Settings</h1>

				{error && (
					<div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
						<p className="text-sm text-red-700 dark:text-red-400">{error}</p>
					</div>
				)}

				<div className="space-y-8">
					{/* Project Settings */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Settings</h2>
						<div className="space-y-4">
							<div>
								<label
									htmlFor="projectName"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Project Name
								</label>
								<input
									id="projectName"
									type="text"
									value={config.projectName}
									onChange={(e) => handleInputChange("projectName", e.target.value)}
									className={`w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 transition-colors duration-200 ${
										validationErrors.projectName
											? "border-red-500 dark:border-red-400"
											: "border-gray-300 dark:border-gray-600"
									}`}
								/>
								{validationErrors.projectName && (
									<p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.projectName}</p>
								)}
							</div>

							<div>
								<label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
									Date Format
								</label>
								<select
									id="dateFormat"
									value={(config as unknown as Record<string, unknown>).dateFormat as string}
									onChange={(e) => handleInputChange("dateFormat" as keyof BacklogConfig, e.target.value)}
									className="w-full h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 transition-colors duration-200"
								>
									<option value="yyyy-mm-dd">yyyy-mm-dd</option>
									<option value="dd/mm/yyyy">dd/mm/yyyy</option>
									<option value="mm/dd/yyyy">mm/dd/yyyy</option>
								</select>
							</div>
						</div>
					</div>

					{/* Workflow Settings */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Workflow Settings</h2>
						<div className="space-y-4">
							<div>
								<label className="flex items-center justify-between">
									<div>
										<span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Commit</span>
										<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
											Automatically commit changes to Git after task operations
										</p>
									</div>
									<div className="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											checked={config.autoCommit}
											onChange={(e) => handleInputChange("autoCommit", e.target.checked)}
											className="sr-only peer"
										/>
										<div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-circle peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-circle after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
									</div>
								</label>
							</div>

							<div>
								<label className="flex items-center justify-between">
									<div>
										<span className="text-sm font-medium text-gray-700 dark:text-gray-300">Remote Operations</span>
										<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
											Fetch tasks information from remote branches
										</p>
									</div>
									<div className="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											checked={config.remoteOperations}
											onChange={(e) => handleInputChange("remoteOperations", e.target.checked)}
											className="sr-only peer"
										/>
										<div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-circle peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-circle after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
									</div>
								</label>
							</div>

							<div>
								<label className="flex items-center justify-between">
									<div>
										<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
											Auto-Collapse Milestones
										</span>
										<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
											Automatically collapse milestone lanes when all tasks are complete
										</p>
									</div>
									<div className="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											checked={config.autoCollapseMilestones ?? false}
											onChange={(e) => handleInputChange("autoCollapseMilestones", e.target.checked)}
											className="sr-only peer"
										/>
										<div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-circle peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-circle after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
									</div>
								</label>
							</div>

							<div>
								<label
									htmlFor="defaultStatus"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Default Status
								</label>
								<select
									id="defaultStatus"
									value={config.defaultStatus}
									onChange={(e) => handleInputChange("defaultStatus", e.target.value)}
									className="w-full h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 transition-colors duration-200"
								>
									{statuses.map((status) => (
										<option key={status} value={status}>
											{status}
										</option>
									))}
								</select>
								<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Default status for new tasks</p>
							</div>

							<div>
								<label
									htmlFor="terminalStatuses"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Terminal Statuses
								</label>
								<div className="flex flex-wrap gap-1.5 mb-1">
									{statuses.map((status) => {
										const checked = (config.terminalStatuses ?? []).includes(status);
										return (
											<button
												key={status}
												type="button"
												onClick={() => {
													const current = config.terminalStatuses ?? [];
													handleInputChange(
														"terminalStatuses",
														checked ? current.filter((s) => s !== status) : [...current, status],
													);
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
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Tasks in these statuses are considered complete (terminal)
								</p>
							</div>

							<div>
								<label
									htmlFor="blockedStatuses"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Blocked Statuses
								</label>
								<div className="flex flex-wrap gap-1.5 mb-1">
									{statuses.map((status) => {
										const checked = (config.blockedStatuses ?? []).includes(status);
										return (
											<button
												key={status}
												type="button"
												onClick={() => {
													const current = config.blockedStatuses ?? [];
													handleInputChange(
														"blockedStatuses",
														checked ? current.filter((s) => s !== status) : [...current, status],
													);
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
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Tasks in these statuses are considered blocked
								</p>
							</div>

							<div>
								<label
									htmlFor="defaultEditor"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Default Editor
								</label>
								<input
									id="defaultEditor"
									type="text"
									value={config.defaultEditor}
									onChange={(e) => handleInputChange("defaultEditor", e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 transition-colors duration-200"
									placeholder="e.g., vim, nano, code"
								/>
								<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Editor command to use for editing tasks (overrides EDITOR environment variable)
								</p>
							</div>
						</div>
					</div>

					{/* Labels Management */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Labels</h2>
						<div className="space-y-3">
							{config.labels.map((label, index) => {
								const labelColor = getLabelColor(label);
								const labelName = getLabelName(label);
								return (
									<div key={labelName} className="flex items-center gap-2 relative">
										<button
											type="button"
											className="size-4 rounded-circle border border-gray-300 cursor-pointer shrink-0"
											style={{ backgroundColor: labelColor || "#9ca3af" }}
											onClick={(e) => {
												e.stopPropagation();
												setColorPickerIndex(index);
												setColorPickerColor(labelColor || "");
											}}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													setColorPickerIndex(index);
													setColorPickerColor(labelColor || "");
												}
											}}
											title="Change label color"
										/>
										{colorPickerIndex === index && (
											<div
												ref={colorPickerRef}
												className="absolute left-0 top-6 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 w-56"
											>
												<div className="grid grid-cols-6 gap-1.5 mb-2">
													{PRESET_COLORS.map((c) => (
														<button
															key={c}
															type="button"
															className={`size-6 rounded-circle border-2 transition-all ${
																colorPickerColor === c
																	? "border-blue-500 scale-110"
																	: "border-transparent hover:scale-110"
															}`}
															style={{ backgroundColor: c }}
															onClick={() => setColorPickerColor(c)}
														/>
													))}
												</div>
												<div className="flex items-center gap-2">
													<input
														type="text"
														value={colorPickerColor}
														onChange={(e) => setColorPickerColor(e.target.value)}
														placeholder="#ff0000"
														className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-stone-500"
													/>
													<button
														type="button"
														onClick={async () => {
															const name = labelName;
															const color = colorPickerColor.startsWith("#") ? colorPickerColor : "";
															try {
																await apiClient.setLabelColor(name, color);
																const updated = await apiClient.fetchLabels();
																setConfig({ ...config, labels: updated });
																setColorPickerIndex(null);
															} catch (err) {
																setError(err instanceof Error ? err.message : "Failed to set label color");
															}
														}}
														className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
													>
														Apply
													</button>
												</div>
											</div>
										)}
										<span className="flex-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded text-sm">
											{labelName}
										</span>
										<button
											type="button"
											onClick={async () => {
												const newName = prompt("Rename label to:", labelName);
												if (newName?.trim() && newName.trim() !== labelName) {
													try {
														await apiClient.renameLabel(labelName, newName.trim());
														const updated = await apiClient.fetchLabels();
														setConfig({ ...config, labels: updated });
													} catch (err) {
														setError(err instanceof Error ? err.message : "Failed to rename label");
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
												if (confirm(`Remove label "${labelName}" from config?`)) {
													try {
														await apiClient.removeLabel(labelName);
														const updated = await apiClient.fetchLabels();
														setConfig({ ...config, labels: updated });
													} catch (err) {
														setError(err instanceof Error ? err.message : "Failed to remove label");
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
									style={{ backgroundColor: newLabelColor || "#9ca3af" }}
									onClick={() => {
										const idx = Math.floor(Math.random() * PRESET_COLORS.length);
										const picked = PRESET_COLORS[idx];
										setNewLabelColor(newLabelColor ? "" : (picked ?? ""));
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											const idx = Math.floor(Math.random() * PRESET_COLORS.length);
											const picked = PRESET_COLORS[idx];
											setNewLabelColor(newLabelColor ? "" : (picked ?? ""));
										}
									}}
									title="Toggle random color for new label"
								/>
								<input
									type="text"
									id="newLabelInput"
									placeholder="New label name..."
									className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400"
								/>
								<button
									type="button"
									onClick={async () => {
										const input = document.getElementById("newLabelInput") as HTMLInputElement;
										const name = input?.value?.trim();
										if (!name) return;
										try {
											await apiClient.addLabel(name, newLabelColor || undefined);
											const updated = await apiClient.fetchLabels();
											setConfig({ ...config, labels: updated });
											input.value = "";
											setNewLabelColor("");
										} catch (err) {
											setError(err instanceof Error ? err.message : "Failed to add label");
										}
									}}
									className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
								>
									Add
								</button>
							</div>
						</div>
					</div>

					{/* Authors Management */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Authors</h2>
						<div className="space-y-3">
							{(config.authors ?? []).map((author, index) => {
								const authorColor = typeof author === "string" ? undefined : author.color;
								const authorName = typeof author === "string" ? author : author.name;
								return (
									<div key={authorName} className="flex items-center gap-2 relative">
										<button
											type="button"
											className="size-4 rounded-circle border border-gray-300 cursor-pointer shrink-0"
											style={{ backgroundColor: authorColor || "#9ca3af" }}
											onClick={(e) => {
												e.stopPropagation();
												setColorPickerIndex(-(index + 1));
												setColorPickerColor(authorColor || "");
											}}
											title="Change author color"
										/>
										{colorPickerIndex === -(index + 1) && (
											<div
												ref={colorPickerRef}
												className="absolute left-0 top-6 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 w-56"
											>
												<div className="grid grid-cols-6 gap-1.5 mb-2">
													{PRESET_COLORS.map((c) => (
														<button
															key={c}
															type="button"
															className={`size-6 rounded-circle border-2 transition-all ${
																colorPickerColor === c
																	? "border-blue-500 scale-110"
																	: "border-transparent hover:scale-110"
															}`}
															style={{ backgroundColor: c }}
															onClick={() => setColorPickerColor(c)}
														/>
													))}
												</div>
												<div className="flex items-center gap-2">
													<input
														type="text"
														value={colorPickerColor}
														onChange={(e) => setColorPickerColor(e.target.value)}
														placeholder="#ff0000"
														className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-stone-500"
													/>
													<button
														type="button"
														onClick={async () => {
															const color = colorPickerColor.startsWith("#") ? colorPickerColor : "";
															try {
																await apiClient.setAuthorColor(authorName, color);
																const updated = await apiClient.fetchAuthors();
																setConfig({ ...config, authors: updated });
																setColorPickerIndex(null);
															} catch (err) {
																setError(err instanceof Error ? err.message : "Failed to set author color");
															}
														}}
														className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
													>
														Apply
													</button>
												</div>
											</div>
										)}
										<span className="flex-1 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 rounded text-sm">
											{authorName}
										</span>
										<button
											type="button"
											onClick={async () => {
												const newName = prompt("Rename author to:", authorName);
												if (newName?.trim() && newName.trim() !== authorName) {
													try {
														await apiClient.renameAuthor(authorName, newName.trim());
														const updated = await apiClient.fetchAuthors();
														setConfig({ ...config, authors: updated });
													} catch (err) {
														setError(err instanceof Error ? err.message : "Failed to rename author");
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
												if (confirm(`Remove author "${authorName}" from config?`)) {
													try {
														await apiClient.removeAuthor(authorName);
														const updated = await apiClient.fetchAuthors();
														setConfig({ ...config, authors: updated });
													} catch (err) {
														setError(err instanceof Error ? err.message : "Failed to remove author");
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
									style={{ backgroundColor: newAuthorColor || "#9ca3af" }}
									onClick={() => {
										const idx = Math.floor(Math.random() * PRESET_COLORS.length);
										const picked = PRESET_COLORS[idx];
										setNewAuthorColor(newAuthorColor ? "" : (picked ?? ""));
									}}
									title="Toggle random color for new author"
								/>
								<input
									type="text"
									id="newAuthorInput"
									placeholder="New author name..."
									className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400"
								/>
								<button
									type="button"
									onClick={async () => {
										const input = document.getElementById("newAuthorInput") as HTMLInputElement;
										const name = input?.value?.trim();
										if (!name) return;
										try {
											await apiClient.addAuthor(name, newAuthorColor || undefined);
											const updated = await apiClient.fetchAuthors();
											setConfig({ ...config, authors: updated });
											input.value = "";
											setNewAuthorColor("");
										} catch (err) {
											setError(err instanceof Error ? err.message : "Failed to add author");
										}
									}}
									className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
								>
									Add
								</button>
							</div>
						</div>
					</div>

					{/* Definition of Done Defaults */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Definition of Done Defaults</h2>
						<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
							These checklist items are added to new tasks by default.
						</p>
						<div className="space-y-3">
							{(config.definitionOfDone ?? []).map((item, index) => (
								<div key={item} className="flex items-center gap-2">
									<input
										type="text"
										value={item}
										onChange={(e) => {
											const next = [...(config.definitionOfDone ?? [])];
											next[index] = e.target.value;
											handleInputChange("definitionOfDone", next);
										}}
										className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 transition-colors duration-200"
										placeholder="Checklist item"
									/>
									<button
										type="button"
										onClick={() => {
											const next = (config.definitionOfDone ?? []).filter((_, idx) => idx !== index);
											handleInputChange("definitionOfDone", next);
										}}
										className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:underline"
									>
										Remove
									</button>
								</div>
							))}
							<button
								type="button"
								onClick={() => handleInputChange("definitionOfDone", [...(config.definitionOfDone ?? []), ""])}
								className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
							>
								+ Add item
							</button>
						</div>
					</div>

					{/* Web UI Settings */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Web UI Settings</h2>
						<div className="space-y-4">
							<div>
								<label
									htmlFor="defaultPort"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Default Port
								</label>
								<input
									id="defaultPort"
									type="number"
									min="1"
									max="65535"
									value={config.defaultPort || 6420}
									onChange={(e) => handleInputChange("defaultPort", Number.parseInt(e.target.value, 10) || 6420)}
									className={`w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 transition-colors duration-200 ${
										validationErrors.defaultPort
											? "border-red-500 dark:border-red-400"
											: "border-gray-300 dark:border-gray-600"
									}`}
								/>
								{validationErrors.defaultPort && (
									<p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.defaultPort}</p>
								)}
							</div>

							<div>
								<label className="flex items-center justify-between">
									<div>
										<span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Open Browser</span>
										<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
											Automatically open browser when starting web UI
										</p>
									</div>
									<div className="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											checked={config.autoOpenBrowser}
											onChange={(e) => handleInputChange("autoOpenBrowser", e.target.checked)}
											className="sr-only peer"
										/>
										<div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-circle peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-circle after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
									</div>
								</label>
							</div>
						</div>
					</div>

					{/* Advanced Settings */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Advanced Settings</h2>
						<div className="space-y-4">
							<div>
								<label
									htmlFor="maxColumnWidth"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Max Column Width
								</label>
								<input
									id="maxColumnWidth"
									type="number"
									min="20"
									max="200"
									value={config.maxColumnWidth}
									onChange={(e) => handleInputChange("maxColumnWidth", Number.parseInt(e.target.value, 10) || 80)}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 transition-colors duration-200"
								/>
								<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Maximum width for text columns in CLI output
								</p>
							</div>

							<div>
								<label
									htmlFor="taskResolutionStrategy"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Task Resolution Strategy
								</label>
								<select
									id="taskResolutionStrategy"
									value={config.taskResolutionStrategy}
									onChange={(e) =>
										handleInputChange("taskResolutionStrategy", e.target.value as "most_recent" | "most_progressed")
									}
									className="w-full h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 transition-colors duration-200"
								>
									<option value="most_recent">Most Recent</option>
									<option value="most_progressed">Most Progressed</option>
								</select>
								<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Strategy for resolving conflicts when tasks exist in multiple branches
								</p>
							</div>

							<div>
								<label
									htmlFor="zeroPaddedIds"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Zero-Padded IDs
								</label>
								<input
									id="zeroPaddedIds"
									type="number"
									min="0"
									max="10"
									value={config.zeroPaddedIds || 0}
									onChange={(e) => handleInputChange("zeroPaddedIds", Number.parseInt(e.target.value, 10) || 0)}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 transition-colors duration-200"
								/>
								<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Number of digits for ID padding (0 = disabled, 3 = task-001, 4 = task-0001)
								</p>
							</div>

							<div>
								<label
									htmlFor="task-prefix-readonly"
									className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
								>
									Task Prefix <span className="text-gray-400 dark:text-gray-500 font-normal">(read-only)</span>
								</label>
								<input
									id="task-prefix-readonly"
									type="text"
									value={(config.prefixes?.task || "task").toUpperCase()}
									disabled
									className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
								/>
								<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
									Set during initialization. Cannot be changed to avoid breaking existing task IDs.
								</p>
							</div>
						</div>
					</div>

					{/* Save/Cancel Buttons */}
					<div className="flex items-center justify-end gap-4">
						<button
							type="button"
							onClick={handleCancel}
							disabled={!hasUnsavedChanges || saving}
							className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-stone-400 disabled:opacity-50 transition-colors duration-200"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={handleSave}
							disabled={!hasUnsavedChanges || saving}
							className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
						>
							{saving ? "Saving..." : "Save Changes"}
						</button>
					</div>
				</div>
			</div>

			{/* Success Toast */}
			{showSuccess && <SuccessToast message="Settings saved successfully!" onDismiss={() => setShowSuccess(false)} />}
		</div>
	);
};

export default Settings;
