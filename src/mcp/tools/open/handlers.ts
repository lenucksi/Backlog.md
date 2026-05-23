import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { AppError } from "../../../utils/app-error.ts";
import { openUrlInBrowser } from "../../../utils/browser-opener.ts";
import { sanitizeUrlTitle, stripIdPrefix } from "../../../utils/url-helpers.ts";
import type { McpServer } from "../../server.ts";

type EntityType = "task" | "document" | "decision";

export type OpenInBrowserArgs = { id: string; port?: number };

function detectEntityType(id: string): EntityType | null {
	if (/^back-\d+$/i.test(id)) {
		return "task";
	}
	if (/^doc-\d+$/i.test(id)) {
		return "document";
	}
	if (/^decision-\d+$/i.test(id)) {
		return "decision";
	}
	return null;
}

function buildUrl(base: string, entityType: EntityType, id: string, title: string): string {
	const cleanId = stripIdPrefix(id);
	const slug = sanitizeUrlTitle(title);
	const pathMap: Record<EntityType, string> = {
		task: "tasks",
		document: "documentation",
		decision: "decisions",
	};
	return `${base}/${pathMap[entityType]}/${cleanId}/${slug}`;
}

export class OpenHandlers {
	constructor(private readonly server: McpServer) {}

	async openInBrowser(args: OpenInBrowserArgs): Promise<CallToolResult> {
		try {
			const entityType = detectEntityType(args.id);
			if (!entityType) {
				return {
					content: [
						{
							type: "text",
							text: `Unknown entity ID format: ${args.id}. Expected formats: BACK-531, doc-007, decision-003`,
						},
					],
					isError: true,
				};
			}

			const config = await this.server.filesystem.loadConfig();
			const defaultPort = config?.defaultPort ?? 6420;
			const port = args.port ?? defaultPort;

			if (port < 1 || port > 65535) {
				return {
					content: [{ type: "text", text: "Invalid port number. Must be between 1 and 65535." }],
					isError: true,
				};
			}

			let title: string;
			switch (entityType) {
				case "task": {
					const task = await this.server.loadTaskById(args.id);
					if (!task) throw AppError.notFound(`Task not found: ${args.id}`);
					title = task.title;
					break;
				}
				case "document": {
					const doc = await this.server.getDocument(args.id);
					if (!doc) throw AppError.notFound(`Document not found: ${args.id}`);
					title = doc.title;
					break;
				}
				case "decision": {
					const decision = await this.server.filesystem.loadDecision(args.id);
					if (!decision) throw AppError.notFound(`Decision not found: ${args.id}`);
					title = decision.title;
					break;
				}
			}

			const url = buildUrl(`http://localhost:${port}`, entityType, args.id, title);
			await openUrlInBrowser(url);

			return {
				content: [{ type: "text", text: `Opened ${url}` }],
			};
		} catch (error) {
			const message = AppError.formatCLIError(error);
			return {
				content: [{ type: "text", text: message }],
				isError: true,
			};
		}
	}
}
