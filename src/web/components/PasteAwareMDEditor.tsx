import type { MDEditorProps } from "@uiw/react-md-editor";
import MDEditor from "@uiw/react-md-editor";
import { useEffect, useRef } from "react";
import { extractHtmlFromClipboard, hasHtmlInClipboard, htmlToMarkdown } from "../utils/paste-as-markdown";

export default function PasteAwareMDEditor(props: MDEditorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const onChangeRef = useRef(props.onChange);
	onChangeRef.current = props.onChange;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handler = (e: ClipboardEvent) => {
			if (!e.clipboardData) return;
			if (!hasHtmlInClipboard(e.clipboardData)) return;

			const target = e.target as HTMLElement;
			if (target.tagName !== "TEXTAREA") return;

			const html = extractHtmlFromClipboard(e.clipboardData);
			if (!html) return;

			e.preventDefault();
			e.stopPropagation();

			const markdown = htmlToMarkdown(html);
			const textarea = target as HTMLTextAreaElement;
			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			const before = textarea.value.slice(0, start);
			const after = textarea.value.slice(end);
			const newValue = `${before}${markdown}${after}`;

			const onChange = onChangeRef.current;
			if (onChange) {
				onChange(newValue);
			}

			requestAnimationFrame(() => {
				const newCursor = start + markdown.length;
				textarea.setSelectionRange(newCursor, newCursor);
				textarea.focus();
			});
		};

		container.addEventListener("paste", handler, true);
		return () => container.removeEventListener("paste", handler, true);
	}, []);

	return (
		<div ref={containerRef}>
			<MDEditor {...props} />
		</div>
	);
}
