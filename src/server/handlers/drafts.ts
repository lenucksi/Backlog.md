import { isCreateLockError } from "../../file-system/operations.ts";
import type { ServerHandlerContext } from "../types.ts";

export function createDraftHandlers(ctx: ServerHandlerContext) {
	async function handleListDrafts(): Promise<Response> {
		try {
			const drafts = await ctx.core.filesystem.listDrafts();
			return Response.json(drafts);
		} catch (error) {
			console.error("Error listing drafts:", error);
			return Response.json([]);
		}
	}

	async function handlePromoteDraft(draftId: string): Promise<Response> {
		try {
			const success = await ctx.core.promoteDraft(draftId);
			if (!success) {
				return Response.json({ error: "Draft not found" }, { status: 404 });
			}
			return Response.json({ success: true });
		} catch (error) {
			console.error("Error promoting draft:", error);
			if (isCreateLockError(error)) {
				return Response.json({ error: error.message }, { status: 409 });
			}
			return Response.json({ error: "Failed to promote draft" }, { status: 500 });
		}
	}

	return {
		handleListDrafts,
		handlePromoteDraft,
	};
}
