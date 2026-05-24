import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface FrontmatterResult {
	data: Record<string, unknown>;
	content: string;
}

export function parseFrontmatter(input: string): FrontmatterResult {
	const match = input.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!match) {
		return { data: {}, content: input.trim() };
	}
	const yamlBlock = match[1] || "";
	const content = input.slice((match[0] || "").length).trim();
	let data: Record<string, unknown> = {};
	if (yamlBlock.trim()) {
		data = parseYaml(yamlBlock) as Record<string, unknown>;
	}
	return { data, content };
}

export function stringifyFrontmatter(content: string, data: Record<string, unknown>): string {
	const yamlBlock = stringifyYaml(data).trim();
	return `---\n${yamlBlock}\n---\n${content.trim()}`;
}
