declare module "*.md" {
	declare const content: string;
	export default content;
}

declare module "mermaid/dist/mermaid.esm.mjs";
declare module "upng-js";
declare module "gifenc";

declare module "*.html" {
	declare const content: string;
	export default content;
}

declare module "*.js" {
	declare const content: string;
	export default content;
}

declare module "*.css" {
	declare const content: string;
	export default content;
}

// Minimal Bun globals for tsc compatibility
declare class BunFile {
	readonly name?: string;
	readonly size: number;
	text(): Promise<string>;
	json(): Promise<unknown>;
	stream(): ReadableStream;
	arrayBuffer(): Promise<ArrayBuffer>;
	slice(start?: number, end?: number): BunFile;
}
