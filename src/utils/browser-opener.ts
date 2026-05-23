import { $ } from "bun";

export async function openUrlInBrowser(url: string): Promise<void> {
	const platform = process.platform;
	let cmd: string[];
	switch (platform) {
		case "darwin":
			cmd = ["open", url];
			break;
		case "win32":
			cmd = ["cmd", "/c", "start", "", url];
			break;
		default:
			cmd = ["xdg-open", url];
			break;
	}
	await $`${cmd}`.quiet();
}
