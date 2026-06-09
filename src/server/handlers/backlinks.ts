import type { ServerHandlerContext } from "../types.ts";

export function createBacklinkHandlers(ctx: ServerHandlerContext) {
	async function handleGetBacklinks(entityId: string): Promise<Response> {
		try {
			if (!entityId) {
				return Response.json({ error: "entityId is required" }, { status: 400 });
			}
			const results = await ctx.core.findBacklinks(entityId);
			return Response.json(results);
		} catch (error) {
			console.error("Error finding backlinks:", error);
			return Response.json({ error: "Failed to find backlinks" }, { status: 500 });
		}
	}

	return { handleGetBacklinks };
}
