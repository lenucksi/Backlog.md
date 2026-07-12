import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { BacklogConfig } from "../../types";
import { apiClient } from "../lib/api";
import ConfigEntityManager from "./ConfigEntityManager";
import StatusSelector from "./StatusSelector";
import { SuccessToast } from "./SuccessToast";

const Settings: React.FC = () => {
	const [config, setConfig] = useState<BacklogConfig | null>(null);
	const [originalConfig, setOriginalConfig] = useState<BacklogConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showSuccess, setShowSuccess] = useState(false);
	const [statuses, setStatuses] = useState<string[]>([]);
	const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

	const loadConfig = useCallback(async () => {
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
	}, []);

	const loadStatuses = useCallback(async () => {
		try {
			const data = await apiClient.fetchStatuses();
			setStatuses(data);
		} catch (err) {
			console.error("Failed to load statuses:", err);
		}
	}, []);

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

	const normalizeDefinitionOfDone = (items: string[] | undefined): string[] | undefined => {
		const normalized = (items ?? []).map((item) => item.trim()).filter((item) => item.length > 0);
		return normalized.length > 0 ? normalized : undefined;
	};

	const validateConfig = (): boolean => {
		const errors: Record<string, string> = {};

		if (!config) return false;

		if (!config.projectName.trim()) {
			errors.projectName = "Project name is required";
		}

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

							<StatusSelector
								configKey="terminalStatuses"
								label="Terminal Statuses"
								statuses={statuses}
								value={config.terminalStatuses ?? []}
								onChange={(key, value) => handleInputChange(key as keyof BacklogConfig, value)}
								description="Tasks in these statuses are considered complete (terminal)"
							/>

							<StatusSelector
								configKey="blockedStatuses"
								label="Blocked Statuses"
								statuses={statuses}
								value={config.blockedStatuses ?? []}
								onChange={(key, value) => handleInputChange(key as keyof BacklogConfig, value)}
								description="Tasks in these statuses are considered blocked"
							/>

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

					<ConfigEntityManager
						title="Labels"
						items={config.labels}
						api={{
							add: (name, color) => apiClient.addLabel(name, color),
							rename: (oldName, newName) => apiClient.renameLabel(oldName, newName),
							remove: (name) => apiClient.removeLabel(name),
							setColor: (name, color) => apiClient.setLabelColor(name, color),
							fetch: () => apiClient.fetchLabels(),
						}}
						badgeClass="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
						placeholder="New label name..."
						entityName="label"
						onItemsChange={(items) => setConfig((prev) => (prev ? { ...prev, labels: items } : null))}
						onError={setError}
					/>

					<ConfigEntityManager
						title="Authors"
						items={config.authors ?? []}
						api={{
							add: (name, color) => apiClient.addAuthor(name, color),
							rename: (oldName, newName) => apiClient.renameAuthor(oldName, newName),
							remove: (name) => apiClient.removeAuthor(name),
							setColor: (name, color) => apiClient.setAuthorColor(name, color),
							fetch: () => apiClient.fetchAuthors(),
						}}
						badgeClass="bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200"
						placeholder="New author name..."
						entityName="author"
						onItemsChange={(items) => setConfig((prev) => (prev ? { ...prev, authors: items } : null))}
						onError={setError}
					/>

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
