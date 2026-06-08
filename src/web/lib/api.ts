import type { TaskStatistics } from "../../core/statistics.ts";
import type {
	BacklogConfig,
	Decision,
	Document,
	Milestone,
	SearchPriorityFilter,
	SearchResult,
	SearchResultType,
	Task,
	TaskStatus,
} from "../../types/index.ts";
import type { DuplicateGroup } from "../../utils/duplicate-detection.ts";

const API_BASE = "/api";

export interface ReorderTaskPayload {
	taskId: string;
	targetStatus: string;
	orderedTaskIds: string[];
	targetMilestone?: string | null;
}

export interface InitializationStatus {
	initialized: boolean;
	projectPath: string;
	backlogDirectory?: string | null;
	backlogDirectorySource?: "backlog" | ".backlog" | "custom" | null;
	configLocation?: "folder" | "root" | null;
	rootConfigPath?: string | null;
}

export class ApiError extends Error {
	constructor(
		message: string,
		public status?: number,
		public code?: string,
		public data?: unknown,
	) {
		super(message);
		this.name = "ApiError";
	}

	static fromResponse(response: Response, data?: unknown): ApiError {
		const message = `HTTP ${response.status}: ${response.statusText}`;
		return new ApiError(message, response.status, response.statusText, data);
	}
}

export class NetworkError extends Error {
	constructor(message = "Network request failed") {
		super(message);
		this.name = "NetworkError";
	}
}

interface RequestConfig {
	retries?: number;
	timeout?: number;
	Headers?: Record<string, string>;
}

const DEFAULT_CONFIG: RequestConfig = {
	retries: 3,
	timeout: 10000,
};

export class ApiClient {
	private config: RequestConfig;

	constructor(config: RequestConfig = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	private async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
		const { retries = 3, timeout = 10000 } = this.config;
		let lastError: Error | undefined;

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeout);

				const response = await fetch(url, {
					...options,
					signal: controller.signal,
					headers: {
						"Content-Type": "application/json",
						...options.headers,
					},
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					let errorData: unknown = null;
					try {
						errorData = await response.json();
					} catch {
						// Ignore JSON parse errors for error data
					}
					throw ApiError.fromResponse(response, errorData);
				}

				return response;
			} catch (error) {
				lastError = error as Error;

				if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) {
					throw error;
				}

				if (attempt < retries) {
					const delay = Math.min(1000 * 2 ** attempt, 10000);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		if (lastError instanceof ApiError) {
			throw lastError;
		}
		throw new NetworkError(`Request failed after ${retries + 1} attempts: ${lastError?.message}`);
	}

	private async fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
		const response = await this.fetchWithRetry(url, options);
		return response.json();
	}

	private async getJson<T>(url: string, errorMessage: string): Promise<T> {
		const response = await fetch(url);
		if (!response.ok) throw new Error(errorMessage);
		return response.json();
	}

	private async sendJson<T>(url: string, method: string, body: unknown, errorMessage: string): Promise<T> {
		const response = await fetch(url, {
			method,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		if (!response.ok) throw new Error(errorMessage);
		return response.json();
	}

	async fetchTasks(options?: {
		status?: string;
		assignee?: string;
		parent?: string;
		priority?: SearchPriorityFilter;
		labels?: string[];
		crossBranch?: boolean;
	}): Promise<Task[]> {
		const params = new URLSearchParams();
		if (options?.status) params.append("status", options.status);
		if (options?.assignee) params.append("assignee", options.assignee);
		if (options?.parent) params.append("parent", options.parent);
		if (options?.priority) params.append("priority", options.priority);
		if (options?.labels) {
			for (const label of options.labels) {
				if (label && label.trim().length > 0) {
					params.append("label", label.trim());
				}
			}
		}
		if (options?.crossBranch !== false) params.append("crossBranch", "true");

		const url = `${API_BASE}/tasks${params.toString() ? `?${params.toString()}` : ""}`;
		return this.fetchJson<Task[]>(url);
	}

	async search(
		options: {
			query?: string;
			types?: SearchResultType[];
			status?: string | string[];
			priority?: SearchPriorityFilter | SearchPriorityFilter[];
			assignee?: string | string[];
			labels?: string[];
			modifiedFiles?: string[];
			limit?: number;
		} = {},
	): Promise<SearchResult[]> {
		const params = new URLSearchParams();
		if (options.query) {
			params.set("query", options.query);
		}
		if (options.types && options.types.length > 0) {
			for (const type of options.types) {
				params.append("type", type);
			}
		}
		if (options.status) {
			const statuses = Array.isArray(options.status) ? options.status : [options.status];
			for (const status of statuses) {
				params.append("status", status);
			}
		}
		if (options.priority) {
			const priorities = Array.isArray(options.priority) ? options.priority : [options.priority];
			for (const priority of priorities) {
				params.append("priority", priority);
			}
		}
		if (options.assignee) {
			const assignees = Array.isArray(options.assignee) ? options.assignee : [options.assignee];
			for (const assignee of assignees) {
				if (assignee && assignee.trim().length > 0) {
					params.append("assignee", assignee.trim());
				}
			}
		}
		if (options.labels) {
			for (const label of options.labels) {
				if (label && label.trim().length > 0) {
					params.append("label", label.trim());
				}
			}
		}
		if (options.modifiedFiles) {
			for (const file of options.modifiedFiles) {
				if (file && file.trim().length > 0) {
					params.append("modifiedFile", file.trim());
				}
			}
		}
		if (options.limit !== undefined) {
			params.set("limit", String(options.limit));
		}

		const url = `${API_BASE}/search${params.toString() ? `?${params.toString()}` : ""}`;
		return this.fetchJson<SearchResult[]>(url);
	}

	async fetchTask(id: string): Promise<Task> {
		return this.fetchJson<Task>(`${API_BASE}/tasks/${id}`);
	}

	async createTask(task: Omit<Task, "id" | "createdDate">): Promise<Task> {
		return this.fetchJson<Task>(`${API_BASE}/tasks`, {
			method: "POST",
			body: JSON.stringify(task),
		});
	}

	async updateTask(
		id: string,
		updates: Omit<Partial<Task>, "milestone"> & { milestone?: string | null },
	): Promise<Task> {
		return this.fetchJson<Task>(`${API_BASE}/tasks/${id}`, {
			method: "PUT",
			body: JSON.stringify(updates),
		});
	}

	async reorderTask(payload: ReorderTaskPayload): Promise<{ success: boolean; task: Task }> {
		return this.fetchJson<{ success: boolean; task: Task }>(`${API_BASE}/tasks/reorder`, {
			method: "POST",
			body: JSON.stringify(payload),
		});
	}

	async archiveTask(id: string): Promise<void> {
		await this.fetchWithRetry(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
	}

	async completeTask(id: string): Promise<void> {
		await this.fetchWithRetry(`${API_BASE}/tasks/${id}/complete`, { method: "POST" });
	}

	async demoteTask(id: string): Promise<void> {
		await this.fetchWithRetry(`${API_BASE}/tasks/${id}/demote`, { method: "POST" });
	}

	async getCleanupPreview(age: number): Promise<{
		count: number;
		tasks: Array<{ id: string; title: string; updatedDate?: string; createdDate: string }>;
	}> {
		return this.fetchJson<{
			count: number;
			tasks: Array<{ id: string; title: string; updatedDate?: string; createdDate: string }>;
		}>(`${API_BASE}/tasks/cleanup?age=${age}`);
	}

	async executeCleanup(
		age: number,
	): Promise<{ success: boolean; movedCount: number; totalCount: number; message: string; failedTasks?: string[] }> {
		return this.fetchJson<{
			success: boolean;
			movedCount: number;
			totalCount: number;
			message: string;
			failedTasks?: string[];
		}>(`${API_BASE}/tasks/cleanup/execute`, {
			method: "POST",
			body: JSON.stringify({ age }),
		});
	}

	async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
		return this.updateTask(id, { status });
	}

	async fetchStatuses(): Promise<string[]> {
		return this.getJson<string[]>(`${API_BASE}/statuses`, "Failed to fetch statuses");
	}

	async fetchLabels(): Promise<Array<{ name: string; color?: string }>> {
		return this.getJson<Array<{ name: string; color?: string }>>(`${API_BASE}/config/labels`, "Failed to fetch labels");
	}

	async addLabel(name: string, color?: string): Promise<Array<{ name: string; color?: string }>> {
		return this.sendJson<Array<{ name: string; color?: string }>>(
			`${API_BASE}/config/labels`,
			"POST",
			{ name, ...(color ? { color } : {}) },
			"Failed to add label",
		);
	}

	async renameLabel(
		oldName: string,
		newName: string,
		color?: string,
	): Promise<Array<{ name: string; color?: string }>> {
		return this.sendJson<Array<{ name: string; color?: string }>>(
			`${API_BASE}/config/labels/${encodeURIComponent(oldName)}`,
			"PUT",
			{ name: newName, ...(color ? { color } : {}) },
			"Failed to rename label",
		);
	}

	async removeLabel(name: string): Promise<Array<{ name: string; color?: string }>> {
		return this.fetchJson<Array<{ name: string; color?: string }>>(
			`${API_BASE}/config/labels/${encodeURIComponent(name)}`,
			{
				method: "DELETE",
			},
		);
	}

	async setLabelColor(name: string, color: string): Promise<Array<{ name: string; color?: string }>> {
		return this.sendJson<Array<{ name: string; color?: string }>>(
			`${API_BASE}/config/labels/${encodeURIComponent(name)}`,
			"PUT",
			{ color },
			"Failed to set label color",
		);
	}

	async fetchConfig(): Promise<BacklogConfig> {
		return this.getJson<BacklogConfig>(`${API_BASE}/config`, "Failed to fetch config");
	}

	async updateConfig(config: BacklogConfig): Promise<BacklogConfig> {
		return this.sendJson<BacklogConfig>(`${API_BASE}/config`, "PUT", config, "Failed to update config");
	}

	async fetchDocs(): Promise<Document[]> {
		return this.getJson<Document[]>(`${API_BASE}/docs`, "Failed to fetch documentation");
	}

	async fetchDoc(filename: string): Promise<Document> {
		return this.getJson<Document>(`${API_BASE}/docs/${encodeURIComponent(filename)}`, "Failed to fetch document");
	}

	async fetchDocument(id: string): Promise<Document> {
		return this.getJson<Document>(`${API_BASE}/docs/${encodeURIComponent(id)}`, "Failed to fetch document");
	}

	async fetchFileContent(path: string): Promise<{ content: string; language: string }> {
		return this.getJson<{ content: string; language: string }>(
			`${API_BASE}/file-content?path=${encodeURIComponent(path)}`,
			"Failed to fetch file content",
		);
	}

	async updateDoc(filename: string, content: string, title?: string, path?: string | null): Promise<Document> {
		const payload: Record<string, unknown> = { content };
		if (typeof title === "string") payload.title = title;
		if (path !== undefined) payload.path = path;
		return this.sendJson<Document>(
			`${API_BASE}/docs/${encodeURIComponent(filename)}`,
			"PUT",
			payload,
			"Failed to update document",
		);
	}

	async createDoc(filename: string, content: string, path?: string): Promise<Document & { success?: boolean }> {
		return this.sendJson<Document & { success?: boolean }>(
			`${API_BASE}/docs`,
			"POST",
			{ filename, content, path },
			"Failed to create document",
		);
	}

	async archiveDoc(id: string): Promise<{ success: boolean }> {
		return this.fetchJson<{ success: boolean }>(`${API_BASE}/docs/${encodeURIComponent(id)}/archive`, {
			method: "POST",
		});
	}

	async deleteDoc(id: string): Promise<{ success: boolean }> {
		return this.fetchJson<{ success: boolean }>(`${API_BASE}/docs/${encodeURIComponent(id)}`, {
			method: "DELETE",
		});
	}

	async fetchArchivedDocs(): Promise<Array<{ id: string; title: string; path: string }>> {
		return this.getJson<Array<{ id: string; title: string; path: string }>>(
			`${API_BASE}/docs/archived`,
			"Failed to fetch archived documents",
		);
	}

	async restoreDoc(id: string): Promise<{ success: boolean }> {
		return this.fetchJson<{ success: boolean }>(`${API_BASE}/docs/${encodeURIComponent(id)}/restore`, {
			method: "POST",
		});
	}

	async fetchCompletedTasks(): Promise<Task[]> {
		return this.getJson<Task[]>(`${API_BASE}/tasks/completed`, "Failed to fetch completed tasks");
	}

	async reopenTask(id: string): Promise<{ success: boolean }> {
		return this.fetchJson<{ success: boolean }>(`${API_BASE}/tasks/${encodeURIComponent(id)}/reopen`, {
			method: "POST",
		});
	}

	async fetchDecisions(): Promise<Decision[]> {
		return this.getJson<Decision[]>(`${API_BASE}/decisions`, "Failed to fetch decisions");
	}

	async fetchDecision(id: string): Promise<Decision> {
		return this.getJson<Decision>(`${API_BASE}/decisions/${encodeURIComponent(id)}`, "Failed to fetch decision");
	}

	async fetchDecisionData(id: string): Promise<Decision> {
		return this.getJson<Decision>(`${API_BASE}/decisions/${encodeURIComponent(id)}`, "Failed to fetch decision");
	}

	async updateDecision(id: string, content: string): Promise<void> {
		const response = await fetch(`${API_BASE}/decisions/${encodeURIComponent(id)}`, {
			method: "PUT",
			headers: {
				"Content-Type": "text/plain",
			},
			body: content,
		});
		if (!response.ok) {
			throw new Error("Failed to update decision");
		}
	}

	async createDecision(title: string): Promise<Decision> {
		return this.sendJson<Decision>(`${API_BASE}/decisions`, "POST", { title }, "Failed to create decision");
	}

	async resolveDecision(id: string): Promise<{ success: boolean; decision: Decision }> {
		return this.sendJson<{ success: boolean; decision: Decision }>(
			`${API_BASE}/decisions/${encodeURIComponent(id)}/resolve`,
			"POST",
			{},
			"Failed to resolve decision",
		);
	}

	async fetchMilestones(): Promise<Milestone[]> {
		return this.getJson<Milestone[]>(`${API_BASE}/milestones`, "Failed to fetch milestones");
	}

	async fetchArchivedMilestones(): Promise<Milestone[]> {
		return this.getJson<Milestone[]>(`${API_BASE}/milestones/archived`, "Failed to fetch archived milestones");
	}

	async fetchMilestone(id: string): Promise<Milestone> {
		return this.getJson<Milestone>(`${API_BASE}/milestones/${encodeURIComponent(id)}`, "Failed to fetch milestone");
	}

	async createMilestone(title: string, description?: string): Promise<Milestone> {
		const response = await fetch(`${API_BASE}/milestones`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ title, description }),
		});
		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(data.error || "Failed to create milestone");
		}
		return response.json();
	}

	async updateMilestone(
		id: string,
		title: string,
	): Promise<{ success: boolean; milestone?: Milestone | null; message?: string }> {
		const response = await fetch(`${API_BASE}/milestones/${encodeURIComponent(id)}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ title }),
		});
		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(data.error || "Failed to update milestone");
		}
		return response.json();
	}

	async removeMilestone(
		id: string,
		options: { taskHandling?: "clear" | "keep" | "reassign"; reassignTo?: string } = {},
	): Promise<{ success: boolean; message?: string }> {
		const response = await fetch(`${API_BASE}/milestones/${encodeURIComponent(id)}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(options),
		});
		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(data.error || "Failed to remove milestone");
		}
		return response.json();
	}

	async archiveMilestone(id: string): Promise<{ success: boolean; milestone?: Milestone | null }> {
		const response = await fetch(`${API_BASE}/milestones/${encodeURIComponent(id)}/archive`, {
			method: "POST",
		});
		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(data.error || "Failed to archive milestone");
		}
		return response.json();
	}

	async fetchStatistics(): Promise<
		TaskStatistics & { statusCounts: Record<string, number>; priorityCounts: Record<string, number> }
	> {
		return this.fetchJson<
			TaskStatistics & { statusCounts: Record<string, number>; priorityCounts: Record<string, number> }
		>(`${API_BASE}/statistics`);
	}

	async fetchDuplicates(): Promise<DuplicateGroup[]> {
		return this.fetchJson<DuplicateGroup[]>(`${API_BASE}/duplicates`);
	}

	async checkStatus(): Promise<InitializationStatus> {
		return this.fetchJson<InitializationStatus>(`${API_BASE}/status`);
	}

	async initializeProject(options: {
		projectName: string;
		backlogDirectory?: string;
		backlogDirectorySource?: "backlog" | ".backlog" | "custom";
		configLocation?: "folder" | "root";
		integrationMode: "mcp" | "cli" | "none";
		mcpClients?: ("claude" | "codex" | "gemini" | "kiro" | "guide")[];
		agentInstructions?: ("CLAUDE.md" | "AGENTS.md" | "GEMINI.md" | ".github/copilot-instructions.md")[];
		installClaudeAgent?: boolean;
		filesystemOnly?: boolean;
		advancedConfig?: {
			checkActiveBranches?: boolean;
			remoteOperations?: boolean;
			activeBranchDays?: number;
			bypassGitHooks?: boolean;
			autoCommit?: boolean;
			zeroPaddedIds?: number;
			taskPrefix?: string;
			defaultEditor?: string;
			defaultPort?: number;
			autoOpenBrowser?: boolean;
		};
	}): Promise<{ success: boolean; projectName: string; mcpResults?: Record<string, string> }> {
		return this.fetchJson<{ success: boolean; projectName: string; mcpResults?: Record<string, string> }>(
			`${API_BASE}/init`,
			{
				method: "POST",
				body: JSON.stringify(options),
			},
		);
	}
}

export const apiClient = new ApiClient();
