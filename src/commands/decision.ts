import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import type { Decision } from "../types/index.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";

export async function generateNextDecisionId(core: Core): Promise<string> {
	const config = await core.filesystem.loadConfig();
	const decisions = await core.filesystem.listDecisions();
	const allIds: string[] = [];

	try {
		const backlogDir = core.filesystem.backlogDirName;

		if (config?.remoteOperations === false) {
			if (process.env.DEBUG) {
				console.log("Remote operations disabled - generating ID from local decisions only");
			}
		} else {
			await core.gitOps.fetch();
		}

		const branches = await core.gitOps.listAllBranches();

		const branchFilePromises = branches.map(async (branch) => {
			const files = await core.gitOps.listFilesInTree(branch, `${backlogDir}/decisions`);
			return files
				.map((file) => {
					const match = file.match(/decision-(\d+)/);
					return match ? `decision-${match[1]}` : null;
				})
				.filter((id): id is string => id !== null);
		});

		const branchResults = await Promise.all(branchFilePromises);
		for (const branchIds of branchResults) {
			allIds.push(...branchIds);
		}
	} catch (error) {
		if (process.env.DEBUG) {
			console.error("Could not fetch remote decision IDs:", error);
		}
	}

	for (const decision of decisions) {
		allIds.push(decision.id);
	}

	let max = 0;
	for (const id of allIds) {
		const match = id.match(/^decision-(\d+)$/);
		if (match) {
			const num = Number.parseInt(match[1] || "0", 10);
			if (num > max) max = num;
		}
	}

	const nextIdNumber = max + 1;
	const padding = config?.zeroPaddedIds;

	if (padding && typeof padding === "number" && padding > 0) {
		const paddedId = String(nextIdNumber).padStart(padding, "0");
		return `decision-${paddedId}`;
	}

	return `decision-${nextIdNumber}`;
}

export function registerDecisionCommand(program: Command): void {
	const decisionCmd = program.command("decision");

	decisionCmd
		.command("create <title>")
		.option("-s, --status <status>")
		.action(async (title: string, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const id = await generateNextDecisionId(core);
			const decision: Decision = {
				id,
				title: title as string,
				date: new Date().toISOString().slice(0, 16).replace("T", " "),
				status: (options.status || "proposed") as Decision["status"],
				context: "",
				decision: "",
				consequences: "",
				rawContent: "",
			};
			await core.createDecision(decision);
			console.log(`Created decision ${id}`);
		});
}
