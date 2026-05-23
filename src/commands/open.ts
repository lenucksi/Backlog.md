import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import { AppError } from "../utils/app-error.ts";
import { openUrlInBrowser } from "../utils/browser-opener.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";
import { sanitizeUrlTitle, stripIdPrefix } from "../utils/url-helpers.ts";

type EntityType = "task" | "document" | "decision";

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

async function resolveEntityTitle(core: Core, entityType: EntityType, id: string): Promise<string> {
	switch (entityType) {
		case "task": {
			const task = await core.loadTaskById(id);
			if (!task) {
				throw AppError.notFound(`Task not found: ${id}`);
			}
			return task.title;
		}
		case "document": {
			const doc = await core.getDocument(id);
			if (!doc) {
				throw AppError.notFound(`Document not found: ${id}`);
			}
			return doc.title;
		}
		case "decision": {
			const decision = await core.filesystem.loadDecision(id);
			if (!decision) {
				throw AppError.notFound(`Decision not found: ${id}`);
			}
			return decision.title;
		}
	}
}

export function registerOpenCommand(program: Command): void {
	program
		.command("open <id>")
		.description("Open a task, document, or decision in the browser")
		.option("-p, --port <port>", "port the web server is running on")
		.action(async (id: string, options: { port?: string }) => {
			try {
				const entityType = detectEntityType(id);
				if (!entityType) {
					console.error(`Unknown entity ID format: ${id}`);
					console.error("Expected formats: BACK-531, doc-007, decision-003");
					process.exitCode = 1;
					return;
				}

				const cwd = await requireProjectRoot();
				const core = new Core(cwd);
				await core.ensureConfigLoaded();

				const config = await core.filesystem.loadConfig();
				const defaultPort = config?.defaultPort ?? 6420;
				const port = options.port ? Number.parseInt(options.port, 10) : defaultPort;

				if (Number.isNaN(port) || port < 1 || port > 65535) {
					console.error("Invalid port number. Must be between 1 and 65535.");
					process.exitCode = 1;
					return;
				}

				const title = await resolveEntityTitle(core, entityType, id);

				const url = buildUrl(`http://localhost:${port}`, entityType, id, title);

				console.log(`Opening ${entityType} ${id}...`);
				console.log(`  URL: ${url}`);
				await openUrlInBrowser(url);
			} catch (error) {
				console.error(AppError.formatCLIError(error));
				process.exitCode = 1;
			}
		});
}
