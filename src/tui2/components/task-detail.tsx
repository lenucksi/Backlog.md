// @ts-nocheck
// @jsxImportSource @opentui/solid
import type { Task } from "../../types";

const STATUS_COLORS: Record<string, string> = {
	"To Do": "#e94560",
	"In Progress": "#f5a623",
	Done: "#4ecca3",
	Blocked: "#ff6b6b",
	Deferred: "#8899aa",
	Draft: "#6c5ce7",
};

export function TaskDetail(props: { task: Task }) {
	const t = props.task;

	return (
		<box flexDirection="column" width="100%" height="100%" padding={2}>
			<box flexDirection="row" alignItems="center" height={3}>
				<text fg="#e94560">{t.id} </text>
				<StatusBadge status={t.status} />
			</box>
			<box height={2}>
				<text fg="#ffffff">{t.title}</text>
			</box>
			{t.description ? <DescriptionBox desc={t.description} /> : null}
			{t.labels && t.labels.length > 0 ? <LabelsRow labels={t.labels} /> : null}
			<box flexDirection="row" height={2}>
				<text fg="#8899aa">Priority: </text>
				<text fg={priorityColor(t.priority)}>{t.priority ?? "none"}</text>
			</box>
			{t.assignee && t.assignee.length > 0 ? (
				<box flexDirection="row" height={2}>
					<text fg="#8899aa">Assignee: </text>
					<text fg="#ccddee">{t.assignee.join(", ")}</text>
				</box>
			) : null}
			{t.milestone ? (
				<box flexDirection="row" height={2}>
					<text fg="#8899aa">Milestone: </text>
					<text fg="#f5a623">{t.milestone}</text>
				</box>
			) : null}
		</box>
	);
}

function StatusBadge(props: { status: string }) {
	const color = STATUS_COLORS[props.status] ?? "#556677";
	return (
		<box backgroundColor={color} paddingLeft={1} paddingRight={1} marginLeft={2}>
			<text>{props.status}</text>
		</box>
	);
}

function DescriptionBox(props: { desc: string }) {
	return (
		<box flexGrow={1} flexDirection="column">
			<text fg="#8899aa">Description:</text>
			<box height={6} paddingLeft={2}>
				<text fg="#ccddee" wrapMode="word">
					{props.desc}
				</text>
			</box>
		</box>
	);
}

function LabelsRow(props: { labels: string[] }) {
	return (
		<box flexDirection="row" height={2}>
			<text fg="#8899aa">Labels:</text>
			<box flexDirection="row" paddingLeft={1}>
				{props.labels.map((label) => (
					<box key={label} backgroundColor="#0f3460" paddingLeft={1} paddingRight={1} marginRight={1}>
						<text fg="#ccddee">{label}</text>
					</box>
				))}
			</box>
		</box>
	);
}

function priorityColor(priority: string | undefined | null): string {
	switch (priority) {
		case "high":
			return "#e94560";
		case "medium":
			return "#f5a623";
		case "low":
			return "#4ecca3";
		default:
			return "#8899aa";
	}
}
