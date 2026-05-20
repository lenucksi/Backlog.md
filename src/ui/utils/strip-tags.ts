type TagState = {
	name: string;
	strip: boolean;
};

function parseOpenTag(tag: string): string | null {
	if (!tag.startsWith("{") || !tag.endsWith("}") || tag.startsWith("{/")) {
		return null;
	}

	return tag.slice(1, -1).trim() || null;
}

function parseCloseTag(tag: string): string | null {
	if (tag === "{/}") {
		return "";
	}

	if (!tag.startsWith("{/") || !tag.endsWith("}")) {
		return null;
	}

	return tag.slice(2, -1).trim();
}

function isForegroundTag(name: string): boolean {
	return name.endsWith("-fg");
}

function processCloseTag(tag: string, stack: TagState[], output: string): string | null {
	const closeTagName = parseCloseTag(tag);
	if (closeTagName === null) return null;
	const openTag = stack.pop();
	if (!openTag) return output + tag;
	if (closeTagName && closeTagName !== openTag.name) {
		stack.push(openTag);
		return output + tag;
	}
	return openTag.strip ? output : output + tag;
}

function processOpenTag(tag: string, stack: TagState[], output: string): string {
	const openTagName = parseOpenTag(tag);
	if (!openTagName) return output + tag;
	const strip = isForegroundTag(openTagName);
	stack.push({ name: openTagName, strip });
	return strip ? output : output + tag;
}

export function stripBlessedFgTags(value: string): string {
	if (!value.includes("{")) {
		return value;
	}

	const tagPattern = /\{\/?[^{}]+\}|\{\/\}/g;
	const stack: TagState[] = [];
	let cursor = 0;
	let output = "";

	for (const match of value.matchAll(tagPattern)) {
		const tag = match[0];
		const start = match.index ?? 0;
		output += value.slice(cursor, start);
		cursor = start + tag.length;

		const closeResult = processCloseTag(tag, stack, output);
		if (closeResult !== null) {
			output = closeResult;
			continue;
		}
		output = processOpenTag(tag, stack, output);
	}

	output += value.slice(cursor);
	return output;
}
