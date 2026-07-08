/* Screen-level keybinding registration for the task viewer */

import type { ScreenInterface } from "neo-neo-bblessed";

export interface KeybindingCallbacks {
	canHandleKey(): boolean;
	getCurrentFocus(): "list" | "detail" | "filters";
	getModalOpen(): boolean;
	getSelectedTaskIds(): Set<string>;
	openFilterPicker(controlId: string): Promise<void>;
	applyTaskLifecycleShortcut(key: string): Promise<void>;
	openCurrentTaskInEditor(): Promise<void>;
	executeBulkAction(): Promise<void>;
	executeBulkUpdate(field: string): Promise<void>;
	copyCurrentTaskId(): Promise<void>;
	showHelp(): Promise<void>;
	cleanupAndQuit(): void;
	handleTabSwitch?: () => Promise<void>;
	handleEscape(): void;
	updateHelpBar(): void;
	focusSearchInput(): void;
}

export function registerViewerKeybindings(screen: ScreenInterface, callbacks: KeybindingCallbacks): void {
	screen.key(["/"], () => {
		if (callbacks.getModalOpen()) return;
		callbacks.focusSearchInput();
	});

	screen.key(["C-f"], () => {
		if (callbacks.getModalOpen()) return;
		callbacks.focusSearchInput();
	});

	screen.key(["y", "Y"], async () => {
		if (!callbacks.canHandleKey()) return;
		await callbacks.copyCurrentTaskId();
	});

	screen.key(["c", "C"], async () => {
		if (!callbacks.canHandleKey()) return;
		await callbacks.applyTaskLifecycleShortcut("complete");
	});

	screen.key(["a", "A"], async () => {
		if (!callbacks.canHandleKey()) return;
		if (callbacks.getSelectedTaskIds().size > 0) {
			await callbacks.executeBulkAction();
		} else {
			await callbacks.applyTaskLifecycleShortcut("archive");
		}
	});

	screen.key(["s", "S"], async () => {
		if (!callbacks.canHandleKey()) return;
		if (callbacks.getSelectedTaskIds().size === 0) {
			callbacks.openFilterPicker("status");
		} else {
			await callbacks.executeBulkUpdate("status");
		}
	});

	screen.key(["p", "P"], async () => {
		if (!callbacks.canHandleKey()) return;
		if (callbacks.getSelectedTaskIds().size === 0) {
			callbacks.openFilterPicker("priority");
		} else {
			await callbacks.executeBulkUpdate("priority");
		}
	});

	screen.key(["i", "I"], async () => {
		if (!callbacks.canHandleKey()) return;
		if (callbacks.getSelectedTaskIds().size === 0) {
			callbacks.openFilterPicker("milestone");
		} else {
			await callbacks.executeBulkUpdate("milestone");
		}
	});

	screen.key(["l", "L"], async () => {
		if (!callbacks.canHandleKey()) return;
		if (callbacks.getSelectedTaskIds().size === 0) {
			callbacks.openFilterPicker("labels");
		} else {
			await callbacks.executeBulkUpdate("labels");
		}
	});

	screen.key(["e", "E", "S-e"], async () => {
		if (!callbacks.canHandleKey()) return;
		if (callbacks.getSelectedTaskIds().size > 0) {
			await callbacks.executeBulkUpdate("assignee");
		} else {
			callbacks.openCurrentTaskInEditor();
		}
	});

	screen.key(["u", "U"], async () => {
		if (!callbacks.canHandleKey()) return;
		if (callbacks.getSelectedTaskIds().size > 0) {
			await callbacks.executeBulkUpdate("dueDate");
		}
	});

	screen.key(["?"], async () => {
		if (!callbacks.canHandleKey()) return;
		await callbacks.showHelp();
	});

	screen.key(["escape"], () => {
		callbacks.handleEscape();
	});

	if (callbacks.handleTabSwitch) {
		screen.key(["tab"], async () => {
			if (!callbacks.canHandleKey()) return;
			const focus = callbacks.getCurrentFocus();
			if (focus === "list" || focus === "detail") {
				await callbacks.handleTabSwitch?.();
			}
		});
	}

	screen.key(["q", "C-c"], () => {
		if (!callbacks.canHandleKey()) return;
		callbacks.cleanupAndQuit();
	});
}
