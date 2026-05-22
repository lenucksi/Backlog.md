/**
 * vterm.js backend for termless (@termless/core).
 *
 * Wraps vterm.js (standalone, zero-dependency, 100% terminfo.dev coverage)
 * to implement the TerminalBackend interface.
 *
 * Unlike @termless/xtermjs, vterm.js is a standalone npm package with
 * proper relative imports — no bun patch needed.
 *
 * DA1/DA2/DSR queries from the child process (e.g. blessed) are intercepted
 * in feed() and responses are forwarded via onResponse() back through the PTY.
 *
 * Usage:
 *   import { createTerminal } from "@termless/core"
 *   import { createVtermBackend } from "./vterm-backend"
 *
 *   const term = createTerminal({ backend: createVtermBackend(), cols: 120, rows: 40 })
 */

import { createVtermScreen } from "vterm.js";
import type {
	TerminalBackend,
	TerminalOptions,
	Cell,
	CursorState,
	TerminalMode,
	ScrollbackState,
	RGB,
} from "@termless/core";
import { encodeKeyToAnsi } from "@termless/core";

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

/** Map vterm.js underline style to termless format (false for none). */
function mapUnderline(style: string): Cell["underline"] {
	if (style === "none" || style === false) return false;
	if (style === "single") return "single";
	if (style === "double") return "double";
	if (style === "curly") return "curly";
	if (style === "dotted") return "dotted";
	if (style === "dashed") return "dashed";
	return false;
}

/** Convert vterm.js Cell to termless Cell. */
function convertCell(vc: Record<string, unknown>): Cell {
	return {
		char: (vc.char as string) ?? "",
		fg: (vc.fg as RGB) ?? null,
		bg: (vc.bg as RGB) ?? null,
		bold: (vc.bold as boolean) ?? false,
		dim: (vc.faint as boolean) ?? false,
		italic: (vc.italic as boolean) ?? false,
		underline: mapUnderline(vc.underline as string),
		underlineColor: (vc.underlineColor as RGB) ?? null,
		strikethrough: (vc.strikethrough as boolean) ?? false,
		inverse: (vc.inverse as boolean) ?? false,
		blink: (vc.blink as boolean) ?? false,
		hidden: (vc.hidden as boolean) ?? false,
		wide: (vc.wide as boolean) ?? false,
		continuation: false,
		hyperlink: (vc.url as string | null) ?? null,
	};
}

export function createVtermBackend(opts?: Partial<TerminalOptions>): TerminalBackend {
	let screen: ReturnType<typeof createVtermScreen> | null = null;
	let title = "";
	const decoder = new TextDecoder();

	const backend: TerminalBackend = {
		name: "vterm",

		init(options: TerminalOptions): void {
			screen = createVtermScreen({
				cols: options.cols ?? DEFAULT_COLS,
				rows: options.rows ?? DEFAULT_ROWS,
			});
			title = "";
		},

		destroy(): void {
			screen = null;
		},

		feed(data: Uint8Array): void {
			if (!screen) throw new Error("vterm backend not initialized — call init() first");

			const esc = String.fromCharCode(27);
			const str = decoder.decode(data);

			// Intercept DA1 (Device Attributes) — VT100 identify query
			// Blessed sends this to detect terminal capabilities
			if (str.includes(`${esc}[c`) || str.includes(`${esc}[0c`)) {
				backend.onResponse?.(new TextEncoder().encode(`${esc}[?1;2c`));
			}
			// Intercept DA2 (Secondary Device Attributes)
			if (str.includes(`${esc}[>c`) || str.includes(`${esc}[>0c`)) {
				backend.onResponse?.(new TextEncoder().encode(`${esc}[>1;1234;0c`));
			}
			// Intercept DSR (Device Status Report) cursor position
			if (str.includes(`${esc}[6n`)) {
				const cursor = screen.getCursorPosition();
				backend.onResponse?.(new TextEncoder().encode(`${esc}[${cursor.y + 1};${cursor.x + 1}R`));
			}

			screen.process(data);

			// Track window title changes (OSC 2)
			const newTitle = screen.getTitle();
			if (newTitle) title = newTitle;
		},

		resize(cols: number, rows: number): void {
			screen?.resize(cols, rows);
		},

		reset(): void {
			if (screen) {
				const cols = screen.cols;
				const rows = screen.rows;
				screen = createVtermScreen({ cols, rows });
			}
			title = "";
		},

		getText(): string {
			return screen?.getText() ?? "";
		},

		getTextRange(startRow: number, startCol: number, endRow: number, endCol: number): string {
			if (!screen) return "";
			// vterm.js has getTextRange with same signature
			return screen.getTextRange(startRow, startCol, endRow, endCol);
		},

		getCell(row: number, col: number): Cell {
			if (!screen) {
				return {
					char: "", fg: null, bg: null, bold: false, dim: false,
					italic: false, underline: false, underlineColor: null,
					strikethrough: false, inverse: false, blink: false,
					hidden: false, wide: false, continuation: false, hyperlink: null,
				};
			}
			return convertCell(screen.getCell(row, col) as unknown as Record<string, unknown>);
		},

		getLine(row: number): Cell[] {
			if (!screen) return [];
			const cols = screen.cols;
			const line = screen.getLine(row);
			const cells: Cell[] = [];
			for (let col = 0; col < cols; col++) {
				cells.push(convertCell(line[col] as unknown as Record<string, unknown>));
			}
			return cells;
		},

		getLines(): Cell[][] {
			if (!screen) return [];
			const rows = screen.rows;
			const result: Cell[][] = [];
			for (let row = 0; row < rows; row++) {
				result.push(this.getLine(row));
			}
			return result;
		},

		getCursor(): CursorState {
			if (!screen) return { x: 0, y: 0, visible: true, style: "block" };
			const pos = screen.getCursorPosition();
			return {
				x: pos.x,
				y: pos.y,
				visible: screen.getCursorVisible(),
				style: screen.getCursorShape() as CursorState["style"],
			};
		},

		getMode(mode: TerminalMode): boolean {
			if (!screen) return false;
			return screen.getMode(mode);
		},

		getTitle(): string {
			return title;
		},

		getScrollback(): ScrollbackState {
			if (!screen) {
				return { viewportOffset: 0, totalLines: 0, screenLines: 0 };
			}
			// totalLines must include both scrollback + visible screen
			const screenLines = screen.rows;
			return {
				viewportOffset: screen.getViewportOffset(),
				totalLines: screen.getScrollbackLength() + screenLines,
				screenLines,
			};
		},

		scrollViewport(delta: number): void {
			screen?.scrollViewport(delta);
		},

		encodeKey: encodeKeyToAnsi,

		capabilities: {
			name: "vterm",
			version: "0.4.0",
			truecolor: true,
			kittyKeyboard: true,
			kittyGraphics: false,
			sixel: true,
			osc8Hyperlinks: true,
			semanticPrompts: true,
			unicode: "15.1",
			reflow: true,
			extensions: new Set(["kittyKeyboard", "bracketedPaste", "focusTracking", "sixel"]),
		},
	};

	// Eagerly init if opts provided
	if (opts) {
		backend.init({
			cols: opts.cols ?? DEFAULT_COLS,
			rows: opts.rows ?? DEFAULT_ROWS,
			scrollbackLimit: opts.scrollbackLimit,
		});
	}

	return backend;
}
