import type { Server, ServerWebSocket } from "bun";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { openUrlInBrowser } from "../utils/browser-opener.ts";
import type { ContentStore } from "../core/content-store.ts";
import type { SearchService } from "../core/search-service.ts";
import { AppError } from "../utils/app-error.ts";
import { watchConfig } from "../utils/config-watcher.ts";
import { resolveMilestoneInputForStorage } from "../utils/milestone-storage.ts";
// @ts-expect-error
import favicon from "../web/favicon.png" with { type: "file" };
import indexHtml from "../web/index.html";
import { createConfigHandlers } from "./handlers/config.ts";
import { createDecisionHandlers } from "./handlers/decisions.ts";
import { createDocumentHandlers } from "./handlers/documents.ts";
import { createDraftHandlers } from "./handlers/drafts.ts";
import { createFileHandlers } from "./handlers/files.ts";
import { createMilestoneHandlers } from "./handlers/milestones.ts";
import { createSystemHandlers } from "./handlers/system.ts";
import { createTaskHandlers } from "./handlers/tasks.ts";
import { applyNoStoreHeaders, findNextAvailablePort, isPortAvailable, markHtmlBundleNoStore } from "./middleware.ts";
import { buildRoutes } from "./router.ts";
import type { ServerHandlerContext } from "./types.ts";

const spaIndexHtml = markHtmlBundleNoStore(indexHtml);

export { findNextAvailablePort, isPortAvailable, markHtmlBundleNoStore };

export class BacklogServer {
	private core: Core;
	private server: Server<unknown> | null = null;
	private projectName = "Untitled Project";
	private sockets = new Set<ServerWebSocket<unknown>>();
	private contentStore: ContentStore | null = null;
	private searchService: SearchService | null = null;
	private unsubscribeContentStore?: () => void;
	private storeReadyBroadcasted = false;
	private configWatcher: { stop: () => void } | null = null;

	constructor(projectPath: string) {
		this.core = new Core(projectPath, { enableWatchers: true });
	}

	private async resolveMilestoneInput(milestone: string): Promise<string> {
		const { active: activeMilestones, archived: archivedMilestones } = await this.core.filesystem.listAllMilestones();
		return resolveMilestoneInputForStorage(milestone, activeMilestones, archivedMilestones);
	}

	private async ensureServicesReady(): Promise<void> {
		const store = await this.core.getContentStore();
		this.contentStore = store;

		if (!this.unsubscribeContentStore) {
			this.unsubscribeContentStore = store.subscribe((event) => {
				if (event.type === "ready") {
					if (!this.storeReadyBroadcasted) {
						this.storeReadyBroadcasted = true;
						return;
					}
					this.broadcastTasksUpdated();
					return;
				}

				this.storeReadyBroadcasted = true;
				this.broadcastTasksUpdated();
			});
		}

		const search = await this.core.getSearchService();
		this.searchService = search;
	}

	private async getContentStoreInstance(): Promise<ContentStore> {
		await this.ensureServicesReady();
		if (!this.contentStore) {
			throw new Error("Content store not initialized");
		}
		return this.contentStore;
	}

	private async getSearchServiceInstance(): Promise<SearchService> {
		await this.ensureServicesReady();
		if (!this.searchService) {
			throw new Error("Search service not initialized");
		}
		return this.searchService;
	}

	getPort(): number | null {
		return this.server?.port ?? null;
	}

	private broadcastTasksUpdated() {
		for (const ws of this.sockets) {
			try {
				ws.send("tasks-updated");
			} catch {}
		}
	}

	private broadcastConfigUpdated() {
		for (const ws of this.sockets) {
			try {
				ws.send("config-updated");
			} catch {}
		}
	}

	private createHandlerContext(): ServerHandlerContext {
		const self = this;
		return {
			core: this.core,
			getContentStore: () => this.getContentStoreInstance(),
			getSearchService: () => this.getSearchServiceInstance(),
			broadcastTasksUpdated: () => this.broadcastTasksUpdated(),
			broadcastConfigUpdated: () => this.broadcastConfigUpdated(),
			resolveMilestoneInput: (milestone: string) => this.resolveMilestoneInput(milestone),
			get projectName() {
				return self.projectName;
			},
			setProjectName: (name: string) => {
				this.projectName = name;
			},
			ensureConfigWatcher: () => {
				this.contentStore?.ensureConfigWatcher?.();
			},
		};
	}

	async handleInit(req: Request): Promise<Response> {
		return createSystemHandlers(this.createHandlerContext()).handleInit(req);
	}

	async start(port?: number, openBrowser = true): Promise<void> {
		if (this.server) {
			console.log("Server already running");
			return;
		}

		const config = await this.core.filesystem.loadConfig();

		const finalPort = port ?? config?.defaultPort ?? 6420;
		this.projectName = config?.projectName || "Untitled Project";

		const shouldOpenBrowser = openBrowser && (config?.autoOpenBrowser ?? true);

		this.configWatcher = watchConfig(this.core, {
			onConfigChanged: () => {
				this.broadcastConfigUpdated();
			},
		});

		try {
			await this.ensureServicesReady();

			const ctx = this.createHandlerContext();

			const routes = buildRoutes(
				{
					tasks: createTaskHandlers(ctx),
					documents: createDocumentHandlers(ctx),
					decisions: createDecisionHandlers(ctx),
					drafts: createDraftHandlers(ctx),
					milestones: createMilestoneHandlers(ctx),
					files: createFileHandlers(ctx),
					config: createConfigHandlers(ctx),
					system: createSystemHandlers(ctx),
				},
				spaIndexHtml,
			);

			const serveOptions = {
				port: finalPort,
				development: process.env.NODE_ENV === "development",
				routes,
				fetch: async (req: Request, server: Server<unknown>) => {
					const res = await this.handleRequest(req, server);

					if (req.method === "GET" || req.method === "HEAD") {
						applyNoStoreHeaders(res.headers);
					}

					return res;
				},
				error: this.handleError.bind(this),
				websocket: {
					open: (ws: ServerWebSocket) => {
						this.sockets.add(ws);
					},
					message(ws: ServerWebSocket) {
						ws.send("pong");
					},
					close: (ws: ServerWebSocket) => {
						this.sockets.delete(ws);
					},
				},
				/* biome-ignore format: keep cast on single line below for type narrowing */
			};
			this.server = Bun.serve(serveOptions as unknown as Parameters<typeof Bun.serve>[0]);

			const url = `http://localhost:${finalPort}`;
			console.log(`🚀 Backlog.md browser interface running at ${url}`);
			console.log(`📊 Project: ${this.projectName}`);
			const stopKey = process.platform === "darwin" ? "Cmd+C" : "Ctrl+C";
			console.log(`⏹️  Press ${stopKey} to stop the server`);

			if (shouldOpenBrowser) {
				console.log("🌐 Opening browser...");
				await openUrlInBrowser(url);
			} else {
				console.log("💡 Open your browser and navigate to the URL above");
			}
		} catch (error) {
			const errorCode = (error as { code?: string })?.code;
			const errorMessage = (error as Error)?.message;
			if (errorCode === "EADDRINUSE" || errorMessage?.includes("address already in use")) {
				console.error(`\n❌ Error: Port ${finalPort} is already in use. Use --port to specify a different port.\n`);
				process.exit(1);
			}

			console.error("❌ Failed to start server:", errorMessage || error);
			process.exit(1);
		}
	}

	private _stopping = false;

	async stop(): Promise<void> {
		if (this._stopping) return;
		this._stopping = true;

		try {
			this.unsubscribeContentStore?.();
			this.unsubscribeContentStore = undefined;
		} catch {}

		try {
			this.configWatcher?.stop();
			this.configWatcher = null;
		} catch {}

		this.core.disposeSearchService();
		this.core.disposeContentStore();
		this.searchService = null;
		this.contentStore = null;
		this.storeReadyBroadcasted = false;

		for (const ws of this.sockets) {
			try {
				ws.close();
			} catch {}
		}
		this.sockets.clear();

		if (this.server) {
			const serverRef = this.server;
			const stopPromise = (async () => {
				try {
					await serverRef.stop();
				} catch {}
			})();
			const timeout = new Promise<void>((resolve) => setTimeout(resolve, 1500));
			await Promise.race([stopPromise, timeout]);
			this.server = null;
			console.log("Server stopped");
		}

		this._stopping = false;
	}



	private async handleRequest(req: Request, server: Server<unknown>): Promise<Response> {
		const url = new URL(req.url);
		const pathname = url.pathname;

		if (req.headers.get("upgrade") === "websocket") {
			const success = server.upgrade(req, { data: undefined });
			if (success) {
				return new Response(null, { status: 101 });
			}
			return new Response("WebSocket upgrade failed", { status: 400 });
		}

		if (pathname.startsWith("/favicon")) {
			const faviconFile = Bun.file(favicon);
			return new Response(faviconFile, {
				headers: { "Content-Type": "image/png" },
			});
		}

		return new Response("Not Found", { status: 404 });
	}

	private handleError(error: Error): Response {
		if (error instanceof AppError) {
			return error.formatForServer();
		}
		console.error("Server Error:", error);
		return new Response("Internal Server Error", { status: 500 });
	}
}
