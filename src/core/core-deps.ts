import type { BacklogConfig, Decision, Document, EntityType, Task, TaskListFilter } from "../types/index.ts";

export interface CoreDepsFilesystem {
	loadConfig(): Promise<BacklogConfig | null>;
	listTasks(): Promise<Task[]>;
	loadTask(id: string): Promise<Task | null>;
	saveTask(task: Task): Promise<string>;
	saveDraft(draft: Task): Promise<string>;
	loadDraft(id: string): Promise<Task | null>;
	listDrafts(): Promise<Array<{ id: string }>>;
	tasksDir: string;
	archiveTasksDir: string;
	archiveDraft(id: string): Promise<boolean>;
	promoteDraft(id: string): Promise<boolean>;
	demoteTask(id: string): Promise<boolean>;
	saveDecision(decision: Decision): Promise<void>;
	loadDecision(id: string): Promise<Decision | null>;
	saveDocument(doc: Document, subPath?: string): Promise<string>;
	loadDocument(id: string): Promise<Document | null>;
}

export interface CoreDeps {
	filesystem: CoreDepsFilesystem;
	contentStore?: {
		upsertTask(task: Task): void;
	};
	git: {
		addFile(filepath: string): Promise<void>;
		commitTaskChange(id: string, message: string, filepath: string): Promise<void>;
		addAndCommitTaskFile(id: string, filepath: string, type: "create" | "update"): Promise<void>;
	};
	idGenerator: {
		generateNextId(type: EntityType, parent?: string): Promise<string>;
	};
	requireCanonicalStatus(status: string): Promise<string>;
	normalizePriority(value: string | undefined): "high" | "medium" | "low" | undefined;
	shouldAutoCommit(overrideValue?: boolean): Promise<boolean>;
	getBacklogDirectoryName(): Promise<string>;
	withCreateLock<T>(fn: () => Promise<T>): Promise<T>;
	queryTasks(options?: {
		filters?: TaskListFilter;
		query?: string;
		limit?: number;
		includeCrossBranch?: boolean;
	}): Promise<Task[]>;
	stageAndCommit(message: string, autoCommit?: boolean): Promise<void>;
	getDocument(id: string): Promise<Document | null>;
	generateNextDecisionId(): Promise<string>;
	generateNextDocId(): Promise<string>;
}

export type TaskOpDeps = CoreDeps;
export type DraftOpDeps = CoreDeps;
export type EntityCrudDeps = Pick<
	CoreDeps,
	"filesystem" | "stageAndCommit" | "withCreateLock" | "getDocument" | "generateNextDecisionId" | "generateNextDocId"
>;
