import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const turndownService = new TurndownService({
	headingStyle: "atx",
	codeBlockStyle: "fenced",
	bulletListMarker: "-",
	emDelimiter: "*",
	strongDelimiter: "**",
	linkStyle: "inlined",
});
turndownService.use(gfm);

const EXCLUDED_TAGS = new Set([
	"script",
	"style",
	"link",
	"meta",
	"noscript",
	"svg",
	"path",
	"circle",
	"rect",
	"line",
	"polyline",
	"polygon",
	"iframe",
	"object",
	"embed",
	"applet",
]);

function cleanNode(node: Node): boolean {
	if (node.nodeType === Node.ELEMENT_NODE) {
		const el = node as HTMLElement;
		if (EXCLUDED_TAGS.has(el.tagName.toLowerCase())) {
			el.remove();
			return false;
		}
		if (el.hasAttribute("style")) {
			el.removeAttribute("style");
		}
		if (el.hasAttribute("class")) {
			el.removeAttribute("class");
		}
		if (el.hasAttribute("id")) {
			el.removeAttribute("id");
		}
		let child = el.firstChild;
		while (child) {
			const next = child.nextSibling;
			cleanNode(child);
			child = next;
		}
	}
	return true;
}

function cleanHtml(html: string): string {
	const parser = new DOMParser();
	const doc = parser.parseFromString(`<!DOCTYPE html><html><body>${html}</body></html>`, "text/html");
	const body = doc.body;
	let child = body.firstChild;
	while (child) {
		const next = child.nextSibling;
		cleanNode(child);
		child = next;
	}
	return body.innerHTML;
}

// aislop-ignore-next-line knip/exports -- used at runtime, not statically detectable
export function htmlToMarkdown(html: string): string {
	const cleaned = cleanHtml(html);
	return turndownService.turndown(cleaned);
}

// aislop-ignore-next-line knip/exports -- used at runtime, not statically detectable
export function hasHtmlInClipboard(clipboardData: DataTransfer): boolean {
	return clipboardData.types.some((t) => t === "text/html" || t === "text/rtf");
}

// aislop-ignore-next-line knip/exports -- used at runtime, not statically detectable
export function extractHtmlFromClipboard(clipboardData: DataTransfer): string | null {
	for (const type of ["text/html", "text/rtf"]) {
		const data = clipboardData.getData(type);
		if (data && data.trim().length > 0) {
			return data;
		}
	}
	return null;
}
