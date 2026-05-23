import type { Task } from "../types/index.ts";

export interface DuplicateGroup {
	id: string;
	tasks: Task[];
}

export function scanForDuplicateIds(tasks: Task[]): DuplicateGroup[] {
	const groups = new Map<string, Task[]>();

	for (const task of tasks) {
		const id = task.id;
		if (!id) continue;
		const existing = groups.get(id) ?? [];
		existing.push(task);
		groups.set(id, existing);
	}

	const duplicates: DuplicateGroup[] = [];
	for (const [id, group] of groups) {
		if (group.length > 1) {
			duplicates.push({ id, tasks: group });
		}
	}

	return duplicates.sort((a, b) => a.id.localeCompare(b.id));
}

export function formatDuplicateWarning(duplicates: DuplicateGroup[]): string {
	if (duplicates.length === 0) return "";

	const lines: string[] = ["", "⚠️  WARNING: Duplicate task IDs detected!", ""];

	for (const group of duplicates) {
		lines.push(`  ID: ${group.id}`);
		for (const task of group.tasks) {
			const title = task.title || "(untitled)";
			const source = task.source ?? "local";
			const status = task.status ? ` [${task.status}]` : "";
			lines.push(`    - "${title}" (${source}${status})`);
		}
		lines.push("");
	}

	lines.push("  Duplicate IDs can cause data loss. Review and deduplicate.");
	lines.push("");

	return lines.join("\n");
}
