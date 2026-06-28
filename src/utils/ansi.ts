import { hexToRgb } from "./color.ts";

export function hexToAnsi256(hex: string): number {
	const { r, g, b } = hexToRgb(hex);
	const best = ANSI216_COLORS.reduce(
		(best, ansi) => {
			const dr = r - ansi.r;
			const dg = g - ansi.g;
			const db = b - ansi.b;
			const dist = dr * dr + dg * dg + db * db;
			return dist < best.dist ? { ansi: ansi.code, dist } : best;
		},
		{ ansi: 0, dist: Number.POSITIVE_INFINITY },
	);
	return best.ansi;
}

export function detectTerminalColorSupport(): "truecolor" | "256" | "none" {
	if (!process.stdout.isTTY || !process.stderr.isTTY) return "none";
	const colorTerm = process.env.COLORTERM;
	if (colorTerm === "truecolor" || colorTerm === "24bit") return "truecolor";
	const term = process.env.TERM;
	if (term?.includes("truecolor") || term?.includes("24bit")) return "truecolor";
	if (term?.includes("256")) return "256";
	if (term) return "256";
	return "none";
}

export function hexToTruecolorSequence(hex: string): string {
	const { r, g, b } = hexToRgb(hex);
	return `\x1b[38;2;${r};${g};${b}m`;
}

export function hexToAnsiSequence(hex: string): string {
	const support = detectTerminalColorSupport();
	if (support === "truecolor") return hexToTruecolorSequence(hex);
	if (support === "256") {
		const code = hexToAnsi256(hex);
		return `\x1b[38;5;${code}m`;
	}
	return "";
}

export function colorizeLabel(hex: string | null, text: string): string {
	if (!hex) return text;
	const seq = hexToAnsiSequence(hex);
	if (!seq) return text;
	return `${seq}${text}\x1b[0m`;
}

const ANSI216_COLORS: { code: number; r: number; g: number; b: number }[] = (() => {
	const colors: { code: number; r: number; g: number; b: number }[] = [];
	for (let code = 16; code < 232; code++) {
		const r = ((code - 16) / 36) % 6;
		const g = ((code - 16) / 6) % 6;
		const b = (code - 16) % 6;
		colors.push({
			code,
			r: Math.round((r / 5) * 255),
			g: Math.round((g / 5) * 255),
			b: Math.round((b / 5) * 255),
		});
	}
	for (let i = 0; i < 24; i++) {
		const shade = Math.round((i / 23) * 255);
		colors.push({ code: 232 + i, r: shade, g: shade, b: shade });
	}
	return colors;
})();
