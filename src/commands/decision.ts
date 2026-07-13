import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Command } from "commander";
import { Core } from "../core/backlog.ts";
import type { Decision } from "../types/index.ts";
import { requireProjectRoot } from "../utils/cli-context.ts";
import { openInEditor } from "../utils/editor.ts";
import { EXIT } from "../utils/exit-codes.ts";
import { applyOutputOptions, getOutputMode, stdout } from "../utils/output.ts";

export async function generateNextDecisionId(core: Core): Promise<string> {
	const config = await core.filesystem.loadConfig();
	const decisions = await core.filesystem.listDecisions();
	const allIds: string[] = [];

	try {
		const backlogDir = core.filesystem.backlogDirName;

		if (config?.remoteOperations === false) {
			if (process.env.DEBUG) {
				console.error("Remote operations disabled - generating ID from local decisions only");
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
			console.error("Could not fetch remote decision IDs:", error instanceof Error ? error.message : String(error));
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

async function loadDecision(core: Core, id: string): Promise<Decision | null> {
	const normalizedId = id.startsWith("decision-") ? id : `decision-${id}`;
	return await core.filesystem.loadDecision(normalizedId);
}

export function registerDecisionCommand(program: Command): void {
	const decisionCmd = program.command("decision");

	decisionCmd
		.command("create <title>")
		.option("-s, --status <status>", "set decision status")
		.option("-l, --labels <labels>", "set labels (comma-separated)")
		.action(async (title: string, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const id = await generateNextDecisionId(core);
			const decision: Decision = {
				id,
				title: title as string,
				date: new Date().toISOString().slice(0, 16).replace("T", " "),
				status: (options.status || "proposed") as Decision["status"],
				labels: options.labels
					? String(options.labels)
							.split(",")
							.map((label: string) => label.trim())
							.filter(Boolean)
					: undefined,
				context: "",
				decision: "",
				consequences: "",
				rawContent: "",
			};
			await core.createDecision(decision);
			stdout(`Created decision ${id}`);
		});

	const decisionListFlags = [
		["--status <status>", "Filter by status"],
		["--supersedes <id>", "Filter by supersedes field"],
		["--superseded-by <id>", "Filter by supersededBy field"],
		["-l, --label <labels>", "Filter by labels (comma-separated)"],
		["--json", "output as JSON"],
	] as const;
	let cmd = decisionCmd.command("list");
	for (const [flag, desc] of decisionListFlags) cmd = cmd.option(flag, desc);
	cmd.action(async (options) => {
		applyOutputOptions(options);
		const cwd = await requireProjectRoot();
		const core = new Core(cwd);
		let decisions = await core.filesystem.listDecisions();

		if (options.status) {
			decisions = decisions.filter((d) => d.status === options.status);
		}
		if (options.supersedes) {
			const val = String(options.supersedes);
			decisions = decisions.filter((d) => d.supersedes === val);
		}
		if (options.supersededBy) {
			const val = String(options.supersededBy);
			decisions = decisions.filter((d) => d.supersededBy === val);
		}

		if (getOutputMode() === "json") {
			stdout(decisions);
			return;
		}

		if (decisions.length === 0) {
			stdout("No decisions found.");
			return;
		}

		const rows = decisions.map((d) => {
			const supersedeTag = d.supersedes
				? ` supersedes:${d.supersedes}`
				: d.supersededBy
					? ` superseded-by:${d.supersededBy}`
					: "";
			return `${d.id.padEnd(16)} ${d.status.padEnd(12)} ${d.date.padEnd(14)} ${d.title}${supersedeTag}`;
		});
		stdout(rows.join("\n"));
	});

	decisionCmd
		.command("view <id>")
		.option("--json", "output as JSON")
		.action(async (id: string, options) => {
			applyOutputOptions(options);
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const decision = await loadDecision(core, id);
			if (!decision) {
				console.error(`Decision not found: ${id}`);
				process.exit(EXIT.ERROR);
			}

			if (getOutputMode() === "json") {
				stdout(decision);
				return;
			}

			stdout(`ID:             ${decision.id}`);
			stdout(`Title:          ${decision.title}`);
			stdout(`Date:           ${decision.date}`);
			stdout(`Status:         ${decision.status}`);
			if (decision.supersedes) {
				const ref = await loadDecision(core, decision.supersedes);
				stdout(`Supersedes:     ${decision.supersedes}${ref ? ` (${ref.title})` : ""}`);
			}
			if (decision.supersededBy) {
				const ref = await loadDecision(core, decision.supersededBy);
				stdout(`Superseded by:  ${decision.supersededBy}${ref ? ` (${ref.title})` : ""}`);
			}
			stdout("");
			stdout("=== Context ===");
			stdout(decision.context || "(empty)");
			stdout("");
			stdout("=== Decision ===");
			stdout(decision.decision || "(empty)");
			stdout("");
			stdout("=== Consequences ===");
			stdout(decision.consequences || "(empty)");
			if (decision.alternatives) {
				stdout("");
				stdout("=== Alternatives ===");
				stdout(decision.alternatives);
			}
		});

	decisionCmd
		.command("resolve <id>")
		.description("Mark a decision as superseded without creating a replacement (supersede-to-nirvana)")
		.action(async (id: string) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);

			const decision = await loadDecision(core, id);
			if (!decision) {
				console.error(`Decision not found: ${id}`);
				process.exit(EXIT.ERROR);
			}
			if (decision.status === "superseded") {
				console.error(`Decision ${id} is already superseded.`);
				process.exit(EXIT.ERROR);
			}

			await core.resolveDecision(decision.id);
			stdout(`Resolved ${decision.id} — status set to superseded`);
		});

	decisionCmd
		.command("supersede <id>")
		.requiredOption("--title <title>", "Title for the new decision")
		.action(async (id: string, options) => {
			const cwd = await requireProjectRoot();
			const core = new Core(cwd);
			const config = await core.filesystem.loadConfig();

			const oldDecision = await loadDecision(core, id);
			if (!oldDecision) {
				console.error(`Decision not found: ${id}`);
				process.exit(EXIT.ERROR);
			}
			if (oldDecision.status === "superseded") {
				console.error(`Decision ${id} is already superseded.`);
				process.exit(EXIT.ERROR);
			}

			const newId = await generateNextDecisionId(core);
			const date = new Date().toISOString().slice(0, 16).replace("T", " ");

			const lines: string[] = [];
			lines.push("---");
			lines.push(`id: ${newId}`);
			lines.push(`title: ${options.title}`);
			lines.push(`date: ${date}`);
			lines.push("status: accepted");
			lines.push(`supersedes: ${oldDecision.id}`);
			lines.push("---");
			lines.push("");
			lines.push("## Context");
			lines.push("");
			lines.push(oldDecision.context || "(same context as the superseded decision)");
			lines.push("");
			lines.push("## Decision");
			lines.push("");
			lines.push("(describe the new decision)");
			lines.push("");
			lines.push("## Consequences");
			lines.push("");
			lines.push("(describe the consequences)");
			const templateContent = lines.join("\n");

			const tmpFile = join(tmpdir(), `backlog-supersede-${newId}.md`);
			writeFileSync(tmpFile, templateContent, "utf-8");

			const editorOk = await openInEditor(tmpFile, config);
			if (!editorOk) {
				console.error("Editor failed or was cancelled.");
				process.exit(EXIT.ERROR);
			}

			const { readFileSync } = await import("node:fs");
			const editedContent = readFileSync(tmpFile, "utf-8");

			const { parseDecision } = await import("../markdown/parser.ts");

			const rawDecision = parseDecision(editedContent);
			const newDecision: Decision = {
				id: newId,
				title: options.title,
				date,
				status: "accepted",
				context: rawDecision.context || "(same context as the superseded decision)",
				decision: rawDecision.decision || "(describe the new decision)",
				consequences: rawDecision.consequences || "(describe the consequences)",
				alternatives: rawDecision.alternatives,
				supersedes: oldDecision.id,
				rawContent: rawDecision.rawContent,
			};

			await core.createDecision(newDecision);

			oldDecision.status = "superseded";
			oldDecision.supersededBy = newDecision.id;
			await core.createDecision(oldDecision);

			stdout(`Created decision ${newId} superseding ${oldDecision.id}`);
			stdout(`Updated ${oldDecision.id} status to superseded`);
		});
}
