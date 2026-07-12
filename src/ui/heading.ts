export type HeadingLevel = 1 | 2 | 3;

/** Map heading level → colour + bold flag */
export function getHeadingStyle(level: HeadingLevel): { color: string; bold: boolean } {
	switch (level) {
		case 1:
			return { color: "bright-white", bold: true };
		case 2:
			return { color: "cyan", bold: false };
		default:
			return { color: "white", bold: false };
	}
}

/** Wrap plain text with blessed colour / bold tags */
export function formatHeading(text: string, level: HeadingLevel): string {
	const { color, bold } = getHeadingStyle(level);
	const tagColour = color.replace("-", "");
	return bold
		? `{bold}{${tagColour}-fg}${text}{/${tagColour}-fg}{/bold}`
		: `{${tagColour}-fg}${text}{/${tagColour}-fg}`;
}
