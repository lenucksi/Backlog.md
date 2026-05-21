const BACKTICK = "`";

export function hasBacktickInjection(input: string): boolean {
	return input.includes(BACKTICK);
}

export function escapeBackticks(input: string): string {
	return input.replace(/`/g, "\\`");
}

export function warnShellInjection(input: string, fieldName: string): void {
	if (hasBacktickInjection(input)) {
		console.warn(
			`  ⚠️  Input for ${fieldName} contains backticks. Backticks are interpreted by shells as command substitution.`,
		);
		console.warn(`       Use single quotes ('...') on the command line to prevent shell expansion.`);
	}
}
