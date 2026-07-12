import type { LabelConfig, Task } from "../types/index.ts";

function normalizeLabel(label: string): string {
	return label.trim().toLowerCase();
}

export function collectAvailableLabels(tasks: Task[], configured: Array<string | LabelConfig> = []): string[] {
	const seen = new Set<string>();
	const ordered: string[] = [];

	const addLabel = (label: string | undefined) => {
		if (!label) return;
		const normalized = normalizeLabel(label);
		if (normalized.length === 0) return;
		if (seen.has(normalized)) return;
		seen.add(normalized);
		ordered.push(label);
	};

	for (const label of configured) {
		addLabel(typeof label === "string" ? label : label.name);
	}

	for (const task of tasks) {
		for (const label of task.labels || []) {
			addLabel(label);
		}
	}

	return ordered;
}

export function formatLabelSummary(selected: string[]): string {
	if (!selected || selected.length === 0) {
		return "Labels: All";
	}
	if (selected.length === 1) {
		return `Labels: ${selected[0]}`;
	}
	if (selected.length === 2) {
		return `Labels: ${selected[0]}, ${selected[1]}`;
	}
	const remaining = selected.length - 2;
	return `Labels: ${selected[0]}, ${selected[1]} +${remaining}`;
}

export function labelsToLower(labels: string[]): string[] {
	return labels.map(normalizeLabel).filter((label) => label.length > 0);
}
