import { createConsola } from "consola";

const logger = createConsola({ level: 4 });

interface MermaidAPI {
	initialize: (config: MermaidConfig) => void;
	run?: (options?: MermaidRunOptions) => Promise<void>;
	render: (id: string, text: string) => Promise<MermaidRenderResult>;
}

interface MermaidConfig {
	startOnLoad?: boolean;
	securityLevel?: "strict" | "loose" | "antiscript" | "sandbox";
	theme?: "base" | "default" | "dark" | "forest" | "neutral" | "null";
	logLevel?: number;
	[key: string]: unknown;
}

interface MermaidRunOptions {
	nodes?: HTMLElement[];
	querySelector?: string;
	suppressErrors?: boolean;
}

interface MermaidRenderResult {
	svg: string;
	bindFunctions?: (element: HTMLElement) => void;
}

interface MermaidModule {
	default: MermaidAPI;
}

type MermaidGlobal = typeof globalThis & {
	__MERMAID_MOCK__?: MermaidModule;
};

let mermaidModule: MermaidModule | null = null;
let initializationPromise: Promise<void> | null = null;

async function ensureMermaid(): Promise<MermaidModule> {
	const mock = (globalThis as MermaidGlobal).__MERMAID_MOCK__;
	if (mock) {
		initializationPromise = null;
		return mock;
	}

	if (mermaidModule) return mermaidModule;

	mermaidModule = (await import("mermaid/dist/mermaid.esm.mjs")) as unknown as MermaidModule;
	return mermaidModule;
}

async function initializeMermaid(mermaid: MermaidAPI): Promise<void> {
	if (initializationPromise) {
		return initializationPromise;
	}

	initializationPromise = (async () => {
		mermaid.initialize({
			startOnLoad: false,
			securityLevel: "strict",
			theme: "default",
		});
	})();

	return initializationPromise;
}

async function renderDiagram(diagramText: string, wrapper: HTMLElement, mermaid: MermaidAPI): Promise<void> {
	if (mermaid.run) {
		try {
			await mermaid.run({ nodes: [wrapper] });
			return;
		} catch {
			// fall through to render
		}
	}

	if (mermaid.render) {
		try {
			const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
			const result = await mermaid.render(id, diagramText);
			wrapper.insertAdjacentHTML("beforeend", result.svg);
			if (result.bindFunctions) {
				result.bindFunctions(wrapper);
			}
			return;
		} catch {
			// fall through to warning
		}
	}

	logger.warn("mermaid: no compatible render method found, leaving raw code block");
}

export async function renderMermaidIn(element: HTMLElement): Promise<void> {
	const codeBlocks = Array.from(element.querySelectorAll("pre > code.language-mermaid")) as HTMLElement[];
	if (codeBlocks.length === 0) return;

	let m: MermaidModule;
	try {
		m = await ensureMermaid();
	} catch (err) {
		logger.warn("Failed to load mermaid", err);
		return;
	}

	await initializeMermaid(m.default);

	for (const codeEl of codeBlocks) {
		const parent = codeEl.parentElement as HTMLElement;
		if (!parent) continue;
		const diagramText = codeEl.textContent || "";

		const wrapper = document.createElement("div");
		wrapper.className = "mermaid";
		wrapper.textContent = diagramText;

		parent.replaceWith(wrapper);

		if (!document.body.contains(wrapper)) {
			element.appendChild(wrapper);
		}

		try {
			await renderDiagram(diagramText, wrapper, m.default);
		} catch (err) {
			logger.warn("mermaid render failed", err);
		}
	}
}
