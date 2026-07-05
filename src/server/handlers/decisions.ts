import type { ServerHandlerContext } from "../types.ts";

export function createDecisionHandlers(ctx: ServerHandlerContext) {
	async function handleListDecisions(): Promise<Response> {
		try {
			const store = await ctx.getContentStore();
			const decisions = store.getDecisions();
			const decisionFiles = decisions.map((decision) => ({
				id: decision.id,
				title: decision.title,
				status: decision.status,
				date: decision.date,
				context: decision.context,
				decision: decision.decision,
				consequences: decision.consequences,
				alternatives: decision.alternatives,
			}));
			return Response.json(decisionFiles);
		} catch (error) {
			console.error("Error listing decisions:", error instanceof Error ? error.message : String(error));
			return Response.json([]);
		}
	}

	async function handleGetDecision(decisionId: string): Promise<Response> {
		try {
			const store = await ctx.getContentStore();
			const normalizedId = decisionId.startsWith("decision-") ? decisionId : `decision-${decisionId}`;
			const decision = store.getDecisions().find((item) => item.id === normalizedId || item.id === decisionId);

			if (!decision) {
				return Response.json({ error: "Decision not found" }, { status: 404 });
			}

			return Response.json(decision);
		} catch (error) {
			console.error("Error loading decision:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Decision not found" }, { status: 404 });
		}
	}

	async function handleCreateDecision(req: Request): Promise<Response> {
		const { title } = await req.json();

		try {
			const decision = await ctx.core.createDecisionWithTitle(title);
			return Response.json(decision, { status: 201 });
		} catch (error) {
			console.error("Error creating decision:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to create decision" }, { status: 500 });
		}
	}

	async function handleUpdateDecision(req: Request, decisionId: string): Promise<Response> {
		const content = await req.text();

		try {
			await ctx.core.updateDecisionFromContent(decisionId, content);
			return Response.json({ success: true });
		} catch (error) {
			if (error instanceof Error && error.message.includes("not found")) {
				return Response.json({ error: "Decision not found" }, { status: 404 });
			}
			console.error("Error updating decision:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to update decision" }, { status: 500 });
		}
	}

	async function handleResolveDecision(decisionId: string): Promise<Response> {
		try {
			const normalizedId = decisionId.startsWith("decision-") ? decisionId : `decision-${decisionId}`;
			const decision = await ctx.core.resolveDecision(normalizedId);
			return Response.json({ success: true, decision });
		} catch (error) {
			if (error instanceof Error && error.message.includes("not found")) {
				return Response.json({ error: "Decision not found" }, { status: 404 });
			}
			if (error instanceof Error && error.message.includes("already superseded")) {
				return Response.json({ error: error.message }, { status: 409 });
			}
			console.error("Error resolving decision:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to resolve decision" }, { status: 500 });
		}
	}

	return {
		handleListDecisions,
		handleGetDecision,
		handleCreateDecision,
		handleUpdateDecision,
		handleResolveDecision,
	};
}
