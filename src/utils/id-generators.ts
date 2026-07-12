import type { Core } from "../index.ts";
import { getLogger } from "./logger.ts";

/**
 * Generate the next available document ID by checking all branches and local documents
 * @param core Core instance for filesystem and git operations
 * @returns Promise<string> Next available document ID (e.g., "doc-001")
 */
export async function generateNextDocId(core: Core): Promise<string> {
	const config = await core.filesystem.loadConfig();
	const docs = await core.filesystem.listDocuments();
	const allIds: string[] = [];

	try {
		const backlogDir = core.filesystem.backlogDirName;

		// Skip remote operations if disabled
		if (config?.remoteOperations === false) {
			if (process.env.DEBUG) {
				console.log("Remote operations disabled - generating ID from local documents only");
			}
		} else {
			await core.gitOps.fetch();
		}

		const branches = await core.gitOps.listAllBranches();

		const branchFilePromises = branches.map(async (branch) => {
			const files = await core.gitOps.listFilesInTree(branch, `${backlogDir}/docs`);
			return files
				.map((file) => {
					const match = file.match(/doc-(\d+)/);
					return match ? `doc-${match[1]}` : null;
				})
				.filter((id): id is string => id !== null);
		});

		const branchResults = await Promise.all(branchFilePromises);
		for (const branchIds of branchResults) {
			allIds.push(...branchIds);
		}
	} catch (error) {
		// Suppress errors for offline mode or other git issues
		if (process.env.DEBUG) {
			getLogger().error("Could not fetch remote document IDs:", error instanceof Error ? error.message : String(error));
		}
	}

	// Add local document IDs
	for (const doc of docs) {
		allIds.push(doc.id);
	}

	// Find the highest numeric ID
	let max = 0;
	for (const id of allIds) {
		const match = id.match(/^doc-(\d+)$/);
		if (match) {
			const num = Number.parseInt(match[1] || "0", 10);
			if (num > max) max = num;
		}
	}

	const nextIdNumber = max + 1;
	const padding = config?.zeroPaddedIds;

	if (padding && typeof padding === "number" && padding > 0) {
		const paddedId = String(nextIdNumber).padStart(padding, "0");
		return `doc-${paddedId}`;
	}

	return `doc-${nextIdNumber}`;
}
