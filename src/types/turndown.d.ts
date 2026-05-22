declare module "turndown" {
	interface TurndownOptions {
		headingStyle?: "setext" | "atx";
		hr?: string;
		br?: string;
		bulletListMarker?: string;
		codeBlockStyle?: "indented" | "fenced";
		emDelimiter?: string;
		strongDelimiter?: string;
		linkStyle?: "inlined" | "referenced";
		linkReferenceStyle?: "full" | "collapsed" | "shortcut";
	}
	interface TurndownService {
		addRule(key: string, rule: TurndownRule): void;
		keep(filter: TurndownFilter): void;
		remove(filter: TurndownFilter): void;
		use(plugin: TurndownPlugin | TurndownPlugin[]): void;
		turndown(html: string): string;
	}
	type TurndownFilter = string | string[];
	type TurndownPlugin = (service: TurndownService) => void;
	type TurndownRule = {
		filter: TurndownFilter | ((node: HTMLElement, options: TurndownOptions) => boolean);
		replacement: (content: string, node: HTMLElement) => string;
	};
	class TurndownService {
		constructor(options?: TurndownOptions);
	}
	export default TurndownService;
}

declare module "turndown-plugin-gfm" {
	import type { TurndownService } from "turndown";
	export const gfm: (service: TurndownService) => void;
	export const tables: (service: TurndownService) => void;
	export const strikethrough: (service: TurndownService) => void;
	export const taskListItems: (service: TurndownService) => void;
}
