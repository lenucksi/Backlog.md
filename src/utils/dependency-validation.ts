import type { Task } from "../types/index.ts";

function buildDependencyMap(tasks: Task[]): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const task of tasks) {
		map.set(task.id, task.dependencies ?? []);
	}
	return map;
}

export function findCyclePath(taskId: string, newDependencies: string[], allTasks: Task[]): string[] | null {
	const depMap = buildDependencyMap(allTasks);

	for (const newDep of newDependencies) {
		if (newDep === taskId) {
			return [taskId, taskId];
		}

		const visited = new Set<string>();
		const path: string[] = [newDep];
		const stack: Array<{ node: string; depth: number }> = [{ node: newDep, depth: 0 }];

		while (stack.length > 0) {
			const entry = stack.pop();
			if (!entry) break;
			const { node, depth } = entry;
			const deps = depMap.get(node) ?? [];

			for (const dep of deps) {
				if (dep === taskId) {
					return [...path.slice(0, depth + 1), dep, taskId];
				}
				if (!visited.has(dep)) {
					visited.add(dep);
					path[depth + 1] = dep;
					stack.push({ node: dep, depth: depth + 1 });
				}
			}
		}
	}

	return null;
}

export function validateDependencyChange(
	taskId: string,
	newDependencies: string[],
	allTasks: Task[],
): { valid: true } | { valid: false; cycle: string[] } {
	const cycle = findCyclePath(taskId, newDependencies, allTasks);
	if (cycle) {
		return { valid: false, cycle };
	}
	return { valid: true };
}
