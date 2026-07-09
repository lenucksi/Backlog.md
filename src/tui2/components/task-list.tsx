// @ts-nocheck
// @jsxImportSource @opentui/solid

import { useKeyboard } from "@opentui/solid";
import { createResource, createSignal } from "solid-js";
import type { Core } from "../../core/backlog";
import type { Task } from "../../types";
import { TaskDetail } from "./task-detail";

const STATUS_COLORS: Record<string, string> = {
	"To Do": "#e94560",
	"In Progress": "#f5a623",
	Done: "#4ecca3",
	Blocked: "#ff6b6b",
	Deferred: "#8899aa",
	Draft: "#6c5ce7",
};

const PRIORITY_SYMBOL: Record<string, string> = {
	high: "\u25B2",
	medium: "\u25CF",
	low: "\u25BC",
};

const PRIORITY_COLORS: Record<string, string> = {
	high: "#e94560",
	medium: "#f5a623",
	low: "#4ecca3",
};

export function TaskList(props: { core: Core }) {
	const [tasks] = createResource(() => props.core.loadTasks());
	const [selectedId, setSelectedId] = createSignal<string | null>(null);

	const taskArray = () => tasks() ?? [];
	const currentIdx = () => taskArray().findIndex((t) => t.id === selectedId());

	useKeyboard((key) => {
		const list = taskArray();
		if (list.length === 0) return;
		const idx = currentIdx();
		if (key.name === "down" && idx < list.length - 1) {
			setSelectedId(list[idx + 1].id);
		}
		if (key.name === "up" && idx > 0) {
			setSelectedId(list[idx - 1].id);
		}
	});

	return (
		<box flexGrow={1} flexDirection="row" width="100%">
			<box width={40} flexDirection="column" backgroundColor="#16213e">
				<box height={1} paddingLeft={2} backgroundColor="#0f3460">
					<text>Tasks ({tasks()?.length ?? 0})</text>
				</box>
				<box flexGrow={1} flexDirection="column" overflow="scroll">
					{tasks()?.map((task) => (
						<TaskRow
							key={task.id}
							task={task}
							selected={task.id === selectedId()}
							onSelect={() => setSelectedId(task.id)}
						/>
					))}
				</box>
			</box>
			<DetailPane tasks={tasks()} selectedId={selectedId()} />
		</box>
	);
}

function DetailPane(props: { tasks: Task[] | undefined; selectedId: string | null }) {
	const task = () => props.tasks?.find((t) => t.id === props.selectedId) ?? null;

	return (
		<box flexGrow={1} flexDirection="column" backgroundColor="#1a1a2e">
			{(() => {
				const t = task();
				if (!t) {
					return (
						<box width="100%" height="100%" alignItems="center" justifyContent="center">
							<text fg="#556677">Select a task to view details</text>
						</box>
					);
				}
				return <TaskDetail task={t} />;
			})()}
		</box>
	);
}

function TaskRow(props: { task: Task; selected: boolean; onSelect: () => void }) {
	const bg = () => (props.selected ? "#0f3460" : undefined);
	const priority = props.task.priority ?? "medium";
	return (
		// biome-ignore lint/a11y/useSemanticElements: opentui has no button element
		<box
			role="button"
			height={3}
			paddingLeft={2}
			backgroundColor={bg()}
			flexDirection="column"
			onMouseDown={(evt: { button: number }) => {
				if (evt.button === 0) props.onSelect();
			}}
		>
			<box flexDirection="row" alignItems="center">
				<text fg={PRIORITY_COLORS[priority] ?? "#8899aa"}>{PRIORITY_SYMBOL[priority] ?? "\u25CF"}</text>
				<text fg={props.selected ? "#ffffff" : "#ccddee"} paddingLeft={1}>
					{props.task.id}{" "}
				</text>
				<text fg={STATUS_COLORS[props.task.status] ?? "#8899aa"} paddingLeft={1}>
					{props.task.status}
				</text>
			</box>
			<box height={1} paddingLeft={3}>
				<text fg={props.selected ? "#ffffff" : "#8899aa"} wrapMode="truncate">
					{props.task.title}
				</text>
			</box>
		</box>
	);
}
