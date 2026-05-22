import type { Core } from "../core/backlog.ts";
import type { ContentStore } from "../core/content-store.ts";
import type { SearchService } from "../core/search-service.ts";

export interface ServerHandlerContext {
	core: Core;
	getContentStore(): Promise<ContentStore>;
	getSearchService(): Promise<SearchService>;
	broadcastTasksUpdated(): void;
	broadcastConfigUpdated(): void;
	resolveMilestoneInput(milestone: string): Promise<string>;
	projectName: string;
	setProjectName(name: string): void;
	ensureConfigWatcher(): void;
}
