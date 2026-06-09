import { useEffect, useRef } from "react";
import MDEditor from "@uiw/react-md-editor";
import { renderMermaidIn } from "../utils/mermaid";

interface Props {
	source: string;
	onFileClick?: (path: string) => void;
}

const URI_AUTOLINK_PREFIX_REGEX = /^<[A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\u0000-\u0020]*>/;
const EMAIL_AUTOLINK_PREFIX_REGEX = /^<[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z0-9-]+>/;

const ENTITY_LINK_REGEX = /\b(([A-Z]+-\d+)|(?:#)?(doc-\d+)|(?:#)?(decision-\d+))\b/g;

function entityLinkReplacer(match: string): string {
	const entity = match.replace(/^#/, "");
	const cleanId = entity.replace(/^(task-)/, "");
	let basePath: string;
	if (/^doc-\d+$/i.test(cleanId)) {
		basePath = "/documentation";
	} else if (/^decision-\d+$/i.test(cleanId)) {
		basePath = "/decisions";
	} else {
		basePath = "/tasks";
	}
	return `<a href="${basePath}/${cleanId}">${match}</a>`;
}

function autoLinkEntities(source: string): string {
	const CODE_SPAN_REGEX = /(```[\s\S]*?```|`[^`]*`)/g;
	return source.split(CODE_SPAN_REGEX).map((part, i) => {
		if (i % 2 === 1) {
			return part;
		}
		return part.replace(ENTITY_LINK_REGEX, entityLinkReplacer);
	}).join('');
}

function sanitizeMarkdownSource(source: string): string {
	const CODE_SPAN_REGEX = /(```[\s\S]*?```|`[^`]*`)/g;
	return source.split(CODE_SPAN_REGEX).map((part, i) => {
		if (i % 2 === 1) {
			return part;
		}
		return part.replace(/<(?=[A-Za-z])/g, (match, offset, fullText) => {
			const remaining = fullText.slice(offset);
			if (URI_AUTOLINK_PREFIX_REGEX.test(remaining) || EMAIL_AUTOLINK_PREFIX_REGEX.test(remaining)) {
				return match;
			}
			return "&lt;";
		});
	}).join('');
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function extractText(node: Record<string, any>): string {
	if (!node.children) return "";
	return node.children
		.map((child: Record<string, any>) => {
			if (child.type === "text") return child.value;
			if (child.type === "element") return extractText(child);
			return "";
		})
		.join("");
}

const headingPlugin: any = () => (tree: Record<string, any>) => {
	const seenIds = new Set<string>();
	function visit(node: Record<string, any>) {
		if (node.type === "element" && /^h[1-6]$/.test(node.tagName)) {
			const text = extractText(node);
			if (text) {
				let id = slugify(text);
				if (seenIds.has(id)) {
					let counter = 1;
					while (seenIds.has(`${id}-${counter}`)) {
						counter++;
					}
					id = `${id}-${counter}`;
				}
				seenIds.add(id);
				node.properties = node.properties || {};
				node.properties.id = id;
			}
		}
		if (node.children) {
			node.children.forEach(visit);
		}
	}
	visit(tree);
};

export default function MermaidMarkdown({ source, onFileClick }: Props) {
	const ref = useRef<HTMLDivElement | null>(null);
	const safeSource = autoLinkEntities(sanitizeMarkdownSource(source));

	useEffect(() => {
		if (!ref.current) return;

		// Render mermaid diagrams after the markdown has been rendered
		// Use requestAnimationFrame to ensure MDEditor has finished rendering
		const frameId = requestAnimationFrame(() => {
			if (ref.current) {
				void renderMermaidIn(ref.current);
			}
		});

		return () => cancelAnimationFrame(frameId);
	}, [safeSource]);

	// Intercept hash link clicks for in-document navigation and file path clicks for preview
	useEffect(() => {
		const container = ref.current;
		if (!container) return;

		const handleClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;

			// Handle hash link navigation
			const hashAnchor = target.closest("a[href^='#']");
			if (hashAnchor) {
				const hash = hashAnchor.getAttribute("href");
				if (!hash || hash === "#") return;

				const id = hash.slice(1);
				const element = document.getElementById(id);
				if (element) {
					e.preventDefault();
					element.scrollIntoView({ behavior: "smooth", block: "start" });
					window.history.replaceState(null, "", hash);
				}
				return;
			}

			// Handle file path clicks for preview (skip entity links)
			if (onFileClick) {
				const linkAnchor = target.closest("a[href]");
				if (linkAnchor) {
					const href = linkAnchor.getAttribute("href");
					if (
						href &&
						!href.startsWith("http://") &&
						!href.startsWith("https://") &&
						!href.startsWith("#") &&
						!href.startsWith("mailto:") &&
						!href.startsWith("/tasks/") &&
						!href.startsWith("/documentation/") &&
						!href.startsWith("/decisions/")
					) {
						e.preventDefault();
						onFileClick(href);
					}
				}
			}
		};

		container.addEventListener("click", handleClick);
		return () => container.removeEventListener("click", handleClick);
	}, [onFileClick]);

	// Scroll to hash on initial render when URL contains a hash
	useEffect(() => {
		if (!ref.current) return;

		const hash = window.location.hash;
		if (hash && hash.length > 1) {
			const id = hash.slice(1);
			const frameId = requestAnimationFrame(() => {
				const element = document.getElementById(id);
				if (element) {
					element.scrollIntoView({ behavior: "smooth", block: "start" });
				}
			});
			return () => cancelAnimationFrame(frameId);
		}
	}, [safeSource]);

	return (
		<div ref={ref} className="wmde-markdown">
			<MDEditor.Markdown source={safeSource} rehypePlugins={[headingPlugin]} />
		</div>
	);
}
