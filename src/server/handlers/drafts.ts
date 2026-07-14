import { isCreateLockError } from "../../file-system/operations.ts";
import type { ServerHandlerContext } from "../types.ts";

export function createDraftHandlers(ctx: ServerHandlerContext) {
	async function handleListDrafts(): Promise<Response> {
		try {
			const drafts = await ctx.core.filesystem.listDrafts();
			return Response.json(drafts);
		} catch (error) {
			console.error("Error listing drafts:", error instanceof Error ? error.message : String(error));
			return Response.json([]);
		}
	}

	async function handleDraftAction(
		draftId: string,
		action: (id: string) => Promise<boolean>,
		notFoundMsg: string,
		errorMsg: string,
	): Promise<Response> {
		try {
			const success = await action(draftId);
			if (!success) {
				return Response.json({ error: notFoundMsg }, { status: 404 });
			}
			return Response.json({ success: true });
		} catch (error) {
			console.error(`${errorMsg}:`, error instanceof Error ? error.message : String(error));
			if (isCreateLockError(error)) {
				return Response.json({ error: error.message }, { status: 409 });
			}
			return Response.json({ error: errorMsg }, { status: 500 });
		}
	}

	async function handlePromoteDraft(draftId: string): Promise<Response> {
		return handleDraftAction(draftId, (id) => ctx.core.promoteDraft(id), "Draft not found", "Failed to promote draft");
	}

	async function handleArchiveDraft(draftId: string): Promise<Response> {
		return handleDraftAction(draftId, (id) => ctx.core.archiveDraft(id), "Draft not found", "Failed to archive draft");
	}

	async function handleGetDraft(draftId: string): Promise<Response> {
		try {
			const draft = await ctx.core.filesystem.loadDraft(draftId);
			if (!draft) {
				return Response.json({ error: "Draft not found" }, { status: 404 });
			}
			return Response.json(draft);
		} catch (error) {
			console.error("Error loading draft:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to load draft" }, { status: 500 });
		}
	}

	return {
		handleListDrafts,
		handleGetDraft,
		handlePromoteDraft,
		handleArchiveDraft,
	};
}
