import type { Core } from "../../../core/backlog.ts";
import type { Decision } from "../../../types/index.ts";
import { AppError } from "../../errors/mcp-errors.ts";
import type { CallToolResult } from "../../types.ts";

export type DecisionListArgs = {
	search?: string;
	status?: string;
	supersedes?: string;
	supersededBy?: string;
};

export type DecisionViewArgs = {
	id: string;
};

export type DecisionSupersedeArgs = {
	id: string;
	title: string;
};

export type DecisionCreateArgs = {
	title: string;
	status?: string;
	context?: string;
	decision?: string;
	consequences?: string;
	alternatives?: string;
};

export type DecisionSearchArgs = {
	query: string;
	limit?: number;
};

export type DecisionResolveArgs = {
	id: string;
	title?: string;
};

export class DecisionHandlers {
	constructor(private readonly core: Core) {}

	private async loadDecisionOrThrow(id: string): Promise<Decision> {
		const normalizedId = id.startsWith("decision-") ? id : `decision-${id}`;
		const decision = await this.core.filesystem.loadDecision(normalizedId);
		if (!decision) {
			throw AppError.notFound(`Decision not found: ${id}`);
		}
		return decision;
	}

	private async resolveTitle(id: string): Promise<string> {
		const normalizedId = id.startsWith("decision-") ? id : `decision-${id}`;
		const decision = await this.core.filesystem.loadDecision(normalizedId);
		return decision ? decision.title : id;
	}

	private formatDecisionSummaryLine(decision: Decision, suffix = ""): string {
		const tags: string[] = [decision.status, decision.date];
		if (decision.supersedes) {
			tags.push("supersedes:" + decision.supersedes);
		}
		if (decision.supersededBy) {
			tags.push("superseded-by:" + decision.supersededBy);
		}
		return "  " + decision.id + " - " + decision.title + " (" + tags.join(", ") + ")" + suffix;
	}

	async listDecisions(args: DecisionListArgs = {}): Promise<CallToolResult> {
		const decisions = await this.core.filesystem.listDecisions();
		const { search, status, supersedes, supersededBy } = args;

		const filtered = decisions.filter((d) => {
			if (search) {
				const q = search.toLowerCase();
				const haystacks = [d.id, d.title];
				if (!haystacks.some((v) => v.toLowerCase().includes(q))) {
					return false;
				}
			}
			if (status && d.status !== status) return false;
			if (supersedes && d.supersedes !== supersedes) return false;
			if (supersededBy && d.supersededBy !== supersededBy) return false;
			return true;
		});

		if (filtered.length === 0) {
			return {
				content: [{ type: "text", text: "No decisions found." }],
			};
		}

		const lines: string[] = ["Decisions:"];
		for (const d of filtered) {
			lines.push(this.formatDecisionSummaryLine(d));
		}

		return {
			content: [{ type: "text", text: lines.join("\n") }],
		};
	}

	async viewDecision(args: DecisionViewArgs): Promise<CallToolResult> {
		const decision = await this.loadDecisionOrThrow(args.id);

		const lines: string[] = [
			"Decision: " + decision.id,
			"Title: " + decision.title,
			"Date: " + decision.date,
			"Status: " + decision.status,
		];

		if (decision.supersedes) {
			const title = await this.resolveTitle(decision.supersedes);
			lines.push("Supersedes: " + decision.supersedes + " (" + title + ")");
		}
		if (decision.supersededBy) {
			const title = await this.resolveTitle(decision.supersededBy);
			lines.push("Superseded by: " + decision.supersededBy + " (" + title + ")");
		}
		lines.push("");
		lines.push("=== Context ===");
		lines.push(decision.context || "(empty)");
		lines.push("");
		lines.push("=== Decision ===");
		lines.push(decision.decision || "(empty)");
		lines.push("");
		lines.push("=== Consequences ===");
		lines.push(decision.consequences || "(empty)");
		if (decision.alternatives) {
			lines.push("");
			lines.push("=== Alternatives ===");
			lines.push(decision.alternatives);
		}

		return {
			content: [{ type: "text", text: lines.join("\n") }],
		};
	}

	async createDecision(args: DecisionCreateArgs): Promise<CallToolResult> {
		const { generateNextDecisionId } = await import("../../../commands/decision.ts");
		const id = await generateNextDecisionId(this.core);
		const date = new Date().toISOString().slice(0, 16).replace("T", " ");

		const decision: Decision = {
			id,
			title: args.title,
			date,
			status: (args.status as Decision["status"]) || "proposed",
			context: args.context || "",
			decision: args.decision || "",
			consequences: args.consequences || "",
			alternatives: args.alternatives,
			rawContent: "",
		};

		await this.core.createDecision(decision);

		return {
			content: [
				{
					type: "text",
					text: `Created decision ${id} - ${args.title}`,
				},
			],
		};
	}

	async searchDecisions(args: DecisionSearchArgs): Promise<CallToolResult> {
		const decisions = await this.core.filesystem.listDecisions();
		const q = args.query.toLowerCase();
		const searchFields = ["id", "title", "context", "decision", "consequences"] as const;
		const limit = args.limit ?? 20;

		const filtered = decisions.filter((d) =>
			searchFields.some((field) => {
				const value = d[field];
				return typeof value === "string" && value.toLowerCase().includes(q);
			}),
		);

		if (filtered.length === 0) {
			return {
				content: [{ type: "text", text: "No decisions matched the search query." }],
			};
		}

		const lines: string[] = ["Search results:"];
		let count = 0;
		for (const d of filtered) {
			if (count >= limit) break;
			lines.push(this.formatDecisionSummaryLine(d));
			count++;
		}

		if (filtered.length > limit) {
			lines.push(`(Showing ${limit} of ${filtered.length} results)`);
		}

		return {
			content: [{ type: "text", text: lines.join("\n") }],
		};
	}

	async resolveDecision(args: DecisionResolveArgs): Promise<CallToolResult> {
		const oldDecision = await this.loadDecisionOrThrow(args.id);

		if (oldDecision.status === "superseded") {
			throw AppError.validation("Decision " + args.id + " is already superseded.");
		}

		oldDecision.status = "superseded";
		await this.core.createDecision(oldDecision);

		const note = args.title ? ` (${args.title})` : "";

		return {
			content: [
				{
					type: "text",
					text: "Updated " + oldDecision.id + " status to superseded" + note + ".",
				},
			],
		};
	}

	async supersedeDecision(args: DecisionSupersedeArgs): Promise<CallToolResult> {
		const oldDecision = await this.loadDecisionOrThrow(args.id);

		if (oldDecision.status === "superseded") {
			throw AppError.validation("Decision " + args.id + " is already superseded.");
		}

		const { generateNextDecisionId } = await import("../../../commands/decision.ts");
		const newId = await generateNextDecisionId(this.core);
		const date = new Date().toISOString().slice(0, 16).replace("T", " ");

		const newDecision: Decision = {
			id: newId,
			title: args.title,
			date,
			status: "accepted",
			context: oldDecision.context,
			decision: oldDecision.decision,
			consequences: oldDecision.consequences,
			alternatives: oldDecision.alternatives,
			supersedes: oldDecision.id,
			rawContent: "",
		};

		await this.core.createDecision(newDecision);

		oldDecision.status = "superseded";
		oldDecision.supersededBy = newDecision.id;
		await this.core.createDecision(oldDecision);

		return {
			content: [
				{
					type: "text",
					text: [
						"Created decision " + newId + " superseding " + oldDecision.id + ".",
						"Updated " + oldDecision.id + " status to superseded.",
					].join("\n"),
				},
			],
		};
	}
}
