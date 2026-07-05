import { MilestoneHandlers } from "../../mcp/tools/milestones/handlers.ts";
import { AppError } from "../../utils/app-error.ts";
import type { ServerHandlerContext } from "../types.ts";

async function readOptionalJsonBody(req: Request): Promise<Record<string, unknown>> {
	const text = await req.text();
	if (!text.trim()) {
		return {};
	}

	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		throw AppError.validation("Request body must be valid JSON.");
	}

	if (!body || typeof body !== "object" || Array.isArray(body)) {
		throw AppError.validation("Request body must be a JSON object.");
	}

	return body as Record<string, unknown>;
}

function getMilestoneMutationMessage(result: { content: Array<{ type: string; text?: string }> }): string {
	return result.content
		.filter((item) => item.type === "text" && typeof item.text === "string")
		.map((item) => item.text)
		.join("\n");
}

function milestoneMutationErrorResponse(error: unknown, context: string): Response {
	if (error instanceof AppError) {
		return error.formatForServer();
	}
	const message = error instanceof Error ? error.message : context;
	console.error(context, error instanceof Error ? error.message : String(error));
	return Response.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
}

export function createMilestoneHandlers(ctx: ServerHandlerContext) {
	async function handleListMilestones(): Promise<Response> {
		try {
			const milestones = await ctx.core.filesystem.listMilestones();
			return Response.json(milestones);
		} catch (error) {
			console.error("Error listing milestones:", error instanceof Error ? error.message : String(error));
			return Response.json([]);
		}
	}

	async function handleListArchivedMilestones(): Promise<Response> {
		try {
			const milestones = await ctx.core.filesystem.listArchivedMilestones();
			return Response.json(milestones);
		} catch (error) {
			console.error("Error listing archived milestones:", error instanceof Error ? error.message : String(error));
			return Response.json([]);
		}
	}

	async function handleGetMilestone(milestoneId: string): Promise<Response> {
		try {
			const milestone = await ctx.core.filesystem.loadMilestone(milestoneId);
			if (!milestone) {
				return Response.json({ error: "Milestone not found" }, { status: 404 });
			}
			return Response.json(milestone);
		} catch (error) {
			console.error("Error loading milestone:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Milestone not found" }, { status: 404 });
		}
	}

	async function handleCreateMilestone(req: Request): Promise<Response> {
		try {
			const body = (await req.json()) as { title?: string; description?: string };
			const title = body.title?.trim();

			if (!title) {
				return Response.json({ error: "Milestone title is required" }, { status: 400 });
			}

			const existingMilestones = await ctx.core.filesystem.listMilestones();
			const buildAliasKeys = (value: string): Set<string> => {
				const normalized = value.trim().toLowerCase();
				const keys = new Set<string>();
				if (!normalized) {
					return keys;
				}
				keys.add(normalized);
				if (/^\d+$/.test(normalized)) {
					const numeric = String(Number.parseInt(normalized, 10));
					keys.add(numeric);
					keys.add(`m-${numeric}`);
					return keys;
				}
				const match = normalized.match(/^m-(\d+)$/);
				if (match?.[1]) {
					const numeric = String(Number.parseInt(match[1], 10));
					keys.add(numeric);
					keys.add(`m-${numeric}`);
				}
				return keys;
			};
			const requestedKeys = buildAliasKeys(title);
			const duplicate = existingMilestones.find((milestone) => {
				const milestoneKeys = new Set<string>([...buildAliasKeys(milestone.id), ...buildAliasKeys(milestone.title)]);
				for (const key of requestedKeys) {
					if (milestoneKeys.has(key)) {
						return true;
					}
				}
				return false;
			});
			if (duplicate) {
				return Response.json({ error: "A milestone with this title or ID already exists" }, { status: 400 });
			}

			const milestone = await ctx.core.filesystem.createMilestone(title, body.description);
			return Response.json(milestone, { status: 201 });
		} catch (error) {
			console.error("Error creating milestone:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: "Failed to create milestone" }, { status: 500 });
		}
	}

	async function handleUpdateMilestone(req: Request, milestoneId: string): Promise<Response> {
		try {
			const body = await readOptionalJsonBody(req);
			const title = typeof body.title === "string" ? body.title.trim() : "";
			const description =
				typeof body.description === "string" || body.description === null ? (body.description ?? undefined) : undefined;
			const updateTasks = typeof body.updateTasks === "boolean" ? body.updateTasks : true;

			if (!title) {
				return Response.json({ error: "Milestone title is required" }, { status: 400 });
			}

			const result = await new MilestoneHandlers(ctx.core).renameMilestone({
				from: milestoneId,
				to: title,
				updateTasks,
			});

			if (description !== undefined) {
				await ctx.core.filesystem.setMilestoneDescription(milestoneId, description);
			}

			let milestone = await ctx.core.filesystem.loadMilestone(milestoneId);
			if (!milestone && title) {
				const allMilestones = await ctx.core.filesystem.listMilestones();
				const lowerNewTitle = title.toLowerCase();
				milestone = allMilestones.find((m) => m.title.toLowerCase() === lowerNewTitle) ?? null;
			}
			ctx.broadcastTasksUpdated();
			return Response.json({
				success: true,
				milestone: milestone ?? null,
				message: getMilestoneMutationMessage(result),
			});
		} catch (error) {
			return milestoneMutationErrorResponse(error, "Error updating milestone");
		}
	}

	async function handleRemoveMilestone(req: Request, milestoneId: string): Promise<Response> {
		try {
			const body = await readOptionalJsonBody(req);
			const rawTaskHandling = body.taskHandling;
			const taskHandling =
				rawTaskHandling === undefined
					? "clear"
					: rawTaskHandling === "clear" || rawTaskHandling === "keep" || rawTaskHandling === "reassign"
						? rawTaskHandling
						: null;
			const reassignTo = typeof body.reassignTo === "string" ? body.reassignTo : undefined;

			if (!taskHandling) {
				return Response.json({ error: "taskHandling must be clear, keep, or reassign" }, { status: 400 });
			}

			const result = await new MilestoneHandlers(ctx.core).removeMilestone({
				name: milestoneId,
				taskHandling,
				reassignTo,
			});
			ctx.broadcastTasksUpdated();
			return Response.json({
				success: true,
				message: getMilestoneMutationMessage(result),
			});
		} catch (error) {
			return milestoneMutationErrorResponse(error, "Error removing milestone");
		}
	}

	async function handleArchiveMilestone(milestoneId: string): Promise<Response> {
		try {
			const result = await ctx.core.archiveMilestone(milestoneId);
			if (!result.success) {
				return Response.json({ error: "Milestone not found" }, { status: 404 });
			}
			ctx.broadcastTasksUpdated();
			return Response.json({ success: true, milestone: result.milestone ?? null });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to archive milestone";
			console.error("Error archiving milestone:", error instanceof Error ? error.message : String(error));
			return Response.json({ error: message }, { status: 500 });
		}
	}

	return {
		handleListMilestones,
		handleListArchivedMilestones,
		handleGetMilestone,
		handleCreateMilestone,
		handleUpdateMilestone,
		handleRemoveMilestone,
		handleArchiveMilestone,
	};
}
