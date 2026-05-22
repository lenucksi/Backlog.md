import type { ServerHandlerContext } from "../types.ts";

export function createFileHandlers(ctx: ServerHandlerContext) {
	async function handleGetFileContent(req: Request): Promise<Response> {
		try {
			const url = new URL(req.url);
			const filePath = url.searchParams.get("path");

			if (!filePath) {
				return Response.json({ error: "path query parameter is required" }, { status: 400 });
			}

			const result = await ctx.core.filesystem.readProjectFile(filePath);
			return Response.json(result);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to read file";
			return Response.json({ error: message }, { status: 500 });
		}
	}

	return { handleGetFileContent };
}
