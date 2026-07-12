export function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const h = hex.replace("#", "");
	const num = Number.parseInt(h, 16);
	return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function linearize(c: number): number {
	const s = c / 255;
	return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

// aislop-ignore-line knip/exports — imported by TaskCard, TaskList, used at runtime
export function getContrastTextColor(hex: string): "#fff" | "#000" {
	if (!hex) return "#fff";
	const { r, g, b } = hexToRgb(hex);
	const luminance = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
	return luminance > 0.179 ? "#000" : "#fff";
}
