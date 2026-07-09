// @ts-nocheck
// @jsxImportSource @opentui/solid
import { createCliRenderer } from "@opentui/core";
import { render } from "@opentui/solid";
import { Core } from "../core/backlog";
import { TaskList } from "./components/task-list";

export async function startTui2(projectRoot: string) {
	const core = new Core(projectRoot);
	await core.getContentStore();

	const renderer = await createCliRenderer({
		targetFps: 60,
		exitOnCtrlC: true,
		useMouse: true,
		enableMouseMovement: true,
	});

	await render(() => <App core={core} />, renderer);
}

const isMain = import.meta.url === Bun.main;
if (isMain) {
	const cwd = process.cwd();
	startTui2(cwd).catch((err) => {
		console.error(err);
		process.exit(1);
	});
}

function App(props: { core: Core }) {
	return (
		<box width="100%" height="100%" flexDirection="column" backgroundColor="#1a1a2e">
			<box height={3} backgroundColor="#16213e" paddingLeft={2} alignItems="center">
				<text fg="#e94560">Backlog.md </text>
				<text fg="#8899aa">experimental opentui TUI</text>
			</box>
			<TaskList core={props.core} />
		</box>
	);
}
