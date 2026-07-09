declare module "@termless/core" {
	export interface RGB {
		r: number;
		g: number;
		b: number;
	}

	export interface Cell {
		char: string;
		fg: RGB | null;
		bg: RGB | null;
		bold: boolean;
		dim: boolean;
		italic: boolean;
		underline: false | "single" | "double" | "curly" | "dotted" | "dashed";
		underlineColor: RGB | null;
		strikethrough: boolean;
		inverse: boolean;
		blink: boolean;
		hidden: boolean;
		wide: boolean;
		continuation: boolean;
		hyperlink: string | null;
	}

	export interface CursorState {
		x: number;
		y: number;
		visible: boolean;
		style: "block" | "underline" | "bar";
	}

	export interface ScrollbackState {
		viewportOffset: number;
		totalLines: number;
		screenLines: number;
	}

	export interface TerminalOptions {
		cols?: number;
		rows?: number;
		scrollbackLimit?: number;
		backend?: TerminalBackend;
	}

	export type TerminalMode = string;

	export interface TerminalBackend {
		name: string;
		init: (options: TerminalOptions) => void;
		destroy: () => void;
		feed: (data: Uint8Array) => void;
		resize: (cols: number, rows: number) => void;
		reset: () => void;
		getText: () => string;
		getTextRange: (startRow: number, startCol: number, endRow: number, endCol: number) => string;
		getCell: (row: number, col: number) => Cell;
		getLine: (row: number) => Cell[];
		getLines: () => Cell[][];
		getCursor: () => CursorState;
		getMode: (mode: TerminalMode) => boolean;
		getTitle: () => string;
		getScrollback: () => ScrollbackState;
		scrollViewport: (delta: number) => void;
		encodeKey: (key: unknown) => unknown;
		capabilities: Record<string, unknown>;
		onResponse?: (data: Uint8Array) => void;
	}

	export interface TerminalScreen {
		getText(): string;
	}

	export interface Terminal {
		screen: TerminalScreen;
		alive: boolean;
		feed(data: string): void;
		cell(row: number, col: number): Cell;
		close(): Promise<void>;
		getMode(mode: string): boolean;
		spawn(command: string[], options?: Record<string, unknown>): Promise<void>;
		press(key: string): void;
		waitFor(text: string, timeout?: number): Promise<boolean>;
	}

	export function createTerminal(options?: Partial<TerminalOptions>): Terminal;
	export function encodeKeyToAnsi(key: unknown): unknown;
	export function termlessMatchers(): Record<string, unknown>;

	export type KeyEventType = unknown;
	export type TerminalSize = unknown;

	export class VTemplate {
		constructor(strings: TemplateStringsArray, ...values: unknown[]);
		toString(): string;
	}
}
