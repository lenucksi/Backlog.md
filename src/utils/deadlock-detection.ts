import type { Task } from "../types/index.ts";

/**
 * Detect deadlocked task groups (cycles in the dependency graph)
 * using Tarjan's SCC algorithm.
 * Returns groups of task IDs that form cycles (each group has 2+ tasks).
 */
export function detectDeadlocks(tasks: Task[]): string[][] {
	const graph = buildDependencyGraph(tasks);
	return tarjanSCC(graph).filter((scc) => scc.length > 1);
}

type Graph = Map<string, string[]>;

function buildDependencyGraph(tasks: Task[]): Graph {
	const graph: Graph = new Map();
	for (const t of tasks) {
		graph.set(t.id, []);
	}
	for (const t of tasks) {
		const deps = t.dependencies || [];
		for (const dep of deps) {
			if (graph.has(dep)) {
				graph.get(t.id)?.push(dep);
			}
		}
	}
	return graph;
}

function tarjanSCC(graph: Graph): string[][] {
	const indexMap = new Map<string, number>();
	const lowLinkMap = new Map<string, number>();
	const onStack = new Set<string>();
	const stack: string[] = [];
	const sccs: string[][] = [];
	let index = 0;

	function strongConnect(v: string) {
		indexMap.set(v, index);
		lowLinkMap.set(v, index);
		index++;
		stack.push(v);
		onStack.add(v);

		const neighbors = graph.get(v) || [];
		for (const w of neighbors) {
			const wIndex = indexMap.get(w);
			if (wIndex === undefined) {
				strongConnect(w);
				const vLow = lowLinkMap.get(v);
				const wLow = lowLinkMap.get(w);
				if (vLow !== undefined && wLow !== undefined) {
					lowLinkMap.set(v, Math.min(vLow, wLow));
				}
			} else if (onStack.has(w)) {
				const vLow = lowLinkMap.get(v);
				if (vLow !== undefined) {
					lowLinkMap.set(v, Math.min(vLow, wIndex));
				}
			}
		}

		const vLow = lowLinkMap.get(v);
		const vIdx = indexMap.get(v);
		if (vLow !== undefined && vIdx !== undefined && vLow === vIdx) {
			const scc: string[] = [];
			let w: string | undefined;
			do {
				w = stack.pop();
				if (w === undefined) break;
				onStack.delete(w);
				scc.push(w);
			} while (w !== v);
			sccs.push(scc);
		}
	}

	for (const v of graph.keys()) {
		if (!indexMap.has(v)) {
			strongConnect(v);
		}
	}

	return sccs;
}
