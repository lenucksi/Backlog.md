import { type ElementInterface, type ScreenInterface, textbox } from "neo-neo-bblessed";

interface LabelManagerResult {
	action: "close";
}

interface LabelManagerState {
	labels: string[];
	statusMessage: string;
}

export function showLabelManager(
	parent: ElementInterface | ScreenInterface,
	initialLabels: string[],
	onSave: (labels: string[]) => void,
	onClose: () => void,
): void {
	const state: LabelManagerState = {
		labels: [...initialLabels].sort((a, b) => a.localeCompare(b)),
		statusMessage: "",
	};

	const container = textbox({
		parent,
		top: 3,
		left: "10%",
		width: "80%",
		height: "80%",
		border: "line",
		label: " Label Manager ",
		style: {
			border: { fg: "blue" },
			focus: { border: { fg: "yellow" } },
		},
		keys: true,
		vi: true,
		mouse: true,
		scrollable: true,
		alwaysScroll: true,
		content: "",
		tags: true,
	});

	function render() {
		const lines: string[] = [];
		lines.push("{bold}Labels{/bold}");
		lines.push("");
		if (state.labels.length === 0) {
			lines.push("  (no labels configured)");
		} else {
			for (const label of state.labels) {
				lines.push(`  {green-fg}●{/green-fg} ${label}`);
			}
		}
		lines.push("");
		lines.push("{bold}Commands{/bold}");
		lines.push("");
		lines.push("  {cyan-fg}a{/cyan-fg}  Add a label");
		lines.push("  {cyan-fg}d{/cyan-fg}  Delete a label");
		lines.push("  {cyan-fg}q{/cyan-fg}  Close");
		if (state.statusMessage) {
			lines.push("");
			lines.push(`{yellow-fg}${state.statusMessage}{/yellow-fg}`);
		}
		container.setContent(lines.join("\n"));
		if (typeof (parent as ScreenInterface).render === "function") {
			(parent as ScreenInterface).render();
		}
	}

	function showPrompt(title: string, callback: (value: string) => void) {
		const promptBox = textbox({
			parent,
			top: "center",
			left: "center",
			width: 50,
			height: 5,
			border: "line",
			label: ` ${title} `,
			style: { border: { fg: "cyan" } },
			inputOnFocus: true,
		});
		promptBox.focus();
		if (typeof (parent as ScreenInterface).render === "function") {
			(parent as ScreenInterface).render();
		}
		promptBox.key("escape", () => {
			promptBox.destroy();
			container.focus();
			if (typeof (parent as ScreenInterface).render === "function") {
				(parent as ScreenInterface).render();
			}
		});
		promptBox.key("enter", () => {
			const value = promptBox.getValue().trim();
			promptBox.destroy();
			if (value) {
				callback(value);
			}
			container.focus();
			if (typeof (parent as ScreenInterface).render === "function") {
				(parent as ScreenInterface).render();
			}
		});
	}

	function showSelect(title: string, items: string[], callback: (selected: string) => void) {
		const selectBox = textbox({
			parent,
			top: "center",
			left: "center",
			width: 50,
			height: Math.min(items.length + 4, 20),
			border: "line",
			label: ` ${title} `,
			style: { border: { fg: "yellow" } },
			content: items.map((item, i) => `  ${i + 1}. ${item}`).join("\n"),
			tags: true,
			keys: true,
		});
		selectBox.focus();
		if (typeof (parent as ScreenInterface).render === "function") {
			(parent as ScreenInterface).render();
		}
		selectBox.key("escape", () => {
			selectBox.destroy();
			container.focus();
			if (typeof (parent as ScreenInterface).render === "function") {
				(parent as ScreenInterface).render();
			}
		});
		selectBox.key("enter", () => {
			selectBox.destroy();
			callback(items[0] ?? "");
			container.focus();
			if (typeof (parent as ScreenInterface).render === "function") {
				(parent as ScreenInterface).render();
			}
		});
	}

	container.key("a", () => {
		showPrompt("Add Label", (value) => {
			if (state.labels.some((l) => l.toLowerCase() === value.toLowerCase())) {
				state.statusMessage = `Label already exists: ${value}`;
			} else {
				state.labels.push(value);
				state.labels.sort((a, b) => a.localeCompare(b));
				onSave([...state.labels]);
				state.statusMessage = `Added label: ${value}`;
			}
			render();
		});
	});

	container.key("d", () => {
		if (state.labels.length === 0) {
			state.statusMessage = "No labels to delete.";
			render();
			return;
		}
		showSelect("Delete Label", state.labels, (selected) => {
			state.labels = state.labels.filter((l) => l.toLowerCase() !== selected.toLowerCase());
			onSave([...state.labels]);
			state.statusMessage = `Deleted label: ${selected}`;
			render();
		});
	});

	container.key(["q", "escape"], () => {
		container.destroy();
		onClose();
	});

	render();
	container.focus();
}
