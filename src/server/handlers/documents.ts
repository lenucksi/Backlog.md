import type { ServerHandlerContext } from "../types.ts";
import {
	handleDocumentUpdateError,
	isDocumentValidationError,
	parseCreateDocumentPath,
	parseDocumentTags,
	parseDocumentType,
	parseUpdateDocumentPath,
} from "../utils.ts";

export function createDocumentHandlers(ctx: ServerHandlerContext) {
	async function handleListDocs(): Promise<Response> {
		try {
			const store = await ctx.getContentStore();
			const docs = store.getDocuments();
			const docFiles = docs.map((doc) => ({
				name: doc.path?.split(/[\\/]+/).pop() ?? `${doc.title}.md`,
				id: doc.id,
				title: doc.title,
				type: doc.type,
				path: doc.path,
				createdDate: doc.createdDate,
				updatedDate: doc.updatedDate,
				lastModified: doc.updatedDate || doc.createdDate,
				tags: doc.tags || [],
			}));
			return Response.json(docFiles);
		} catch (error) {
			console.error("Error listing documents:", error instanceof Error ? error.message : String(error));
			return Response.json([]);
		}
	}

	async function handleGetDoc(docId: string): Promise<Response> {
		try {
			const doc = await ctx.core.getDocument(docId);
			if (!doc) {
				return Response.json({ error: "Document not found" }, { status: 404 });
			}
			return Response.json(doc);
		} catch (error) {
			console.error("Error loading document:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Document not found" }, { status: 404 });
		}
	}

	async function handleCreateDoc(req: Request): Promise<Response> {
		try {
			const body = await req.json();
			const filename = typeof body?.filename === "string" ? body.filename : undefined;
			const title = typeof body?.title === "string" ? body.title : filename?.replace(/\.md$/i, "");
			if (!title || title.trim().length === 0) {
				return Response.json({ error: "Document title is required" }, { status: 400 });
			}
			const type = parseDocumentType(body?.type);
			const path = parseCreateDocumentPath(body?.path);
			const tags = parseDocumentTags(body?.tags);

			const document = await ctx.core.createDocumentFromInput({
				title,
				content: typeof body?.content === "string" ? body.content : "",
				type,
				path,
				tags,
			});
			return Response.json({ success: true, ...document }, { status: 201 });
		} catch (error) {
			if (error instanceof SyntaxError) {
				return Response.json({ error: "Invalid request payload" }, { status: 400 });
			}
			if (error instanceof Error && isDocumentValidationError(error)) {
				return Response.json({ error: error.message }, { status: 400 });
			}
			console.error("Error creating document:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to create document" }, { status: 500 });
		}
	}

	async function handleUpdateDoc(req: Request, docId: string): Promise<Response> {
		try {
			const body = await req.json();
			const content = typeof body?.content === "string" ? body.content : undefined;
			const title = typeof body?.title === "string" ? body.title : undefined;
			const path = parseUpdateDocumentPath(body?.path);
			const type = parseDocumentType(body?.type);
			const tags = parseDocumentTags(body?.tags);

			if (typeof content !== "string") {
				return Response.json({ error: "Document content is required" }, { status: 400 });
			}

			let normalizedTitle: string | undefined;

			if (typeof title === "string") {
				normalizedTitle = title.trim();
				if (normalizedTitle.length === 0) {
					return Response.json({ error: "Document title cannot be empty" }, { status: 400 });
				}
			}

			const document = await ctx.core.updateDocumentFromInput({
				id: docId,
				content,
				...(normalizedTitle && { title: normalizedTitle }),
				...(path !== undefined && { path }),
				...(type !== undefined && { type }),
				...(tags !== undefined && { tags }),
			});
			return Response.json({ success: true, ...document });
		} catch (error) {
			return handleDocumentUpdateError(error);
		}
	}

	async function handleListArchivedDocs(): Promise<Response> {
		try {
			const docs = await ctx.core.filesystem.listArchivedDocuments();
			return Response.json(docs);
		} catch (error) {
			console.error("Error listing archived documents:", error instanceof Error ? error.message : String(error));
			return Response.json([]);
		}
	}

	async function handleRestoreDocument(docId: string): Promise<Response> {
		try {
			const success = await ctx.core.filesystem.restoreDocument(docId);
			if (!success) {
				return Response.json({ error: "Document not found in archive" }, { status: 404 });
			}
			return Response.json({ success: true });
		} catch (error) {
			console.error("Error restoring document:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to restore document" }, { status: 500 });
		}
	}

	async function handleDocumentArchive(docId: string): Promise<Response> {
		try {
			const success = await ctx.core.filesystem.archiveDocument(docId);
			if (!success) {
				return Response.json({ error: "Document not found" }, { status: 404 });
			}
			return Response.json({ success: true });
		} catch (error) {
			console.error("Error archiving document:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to archive document" }, { status: 500 });
		}
	}

	async function handleDocumentDelete(docId: string): Promise<Response> {
		try {
			const success = await ctx.core.filesystem.deleteDocument(docId);
			if (!success) {
				return Response.json({ error: "Document not found" }, { status: 404 });
			}
			return Response.json({ success: true });
		} catch (error) {
			console.error("Error deleting document:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to delete document" }, { status: 500 });
		}
	}

	return {
		handleListDocs,
		handleGetDoc,
		handleCreateDoc,
		handleUpdateDoc,
		handleListArchivedDocs,
		handleRestoreDocument,
		handleDocumentArchive,
		handleDocumentDelete,
	};
}
