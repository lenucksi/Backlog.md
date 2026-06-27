import { describe, expect, test } from "bun:test";
import { formatStatusWithIcon, getStatusColor, getStatusIcon, getStatusStyle } from "../ui/status-icon.ts";

describe("Status Icon Component", () => {
	describe("getStatusStyle without config (fallback heuristics)", () => {
		test("default statuses [To Do, In Progress, Done]", () => {
			const opts = { statuses: ["To Do", "In Progress", "Done"] };
			expect(getStatusStyle("To Do", opts)).toEqual({ icon: "○", color: "white" });
			expect(getStatusStyle("In Progress", opts)).toEqual({ icon: "◒", color: "yellow" });
			expect(getStatusStyle("Done", opts)).toEqual({ icon: "✔", color: "green" });
		});

		test("falls back to substring heuristic for Blocked", () => {
			const style = getStatusStyle("Blocked");
			expect(style.icon).toBe("●");
			expect(style.color).toBe("red");
		});
	});

	describe("getStatusStyle with explicit config lists", () => {
		test("custom new/running/terminal/blocked statuses", () => {
			const opts = {
				statuses: ["Neu", "In Bearbeitung", "Review", "Fertig"],
				newStatuses: ["Neu"],
				runningStatuses: ["In Bearbeitung", "Review"],
				terminalStatuses: ["Fertig"],
			};
			expect(getStatusStyle("Neu", opts)).toEqual({ icon: "○", color: "white" });
			expect(getStatusStyle("In Bearbeitung", opts)).toEqual({ icon: "◒", color: "yellow" });
			expect(getStatusStyle("Review", opts)).toEqual({ icon: "◒", color: "yellow" });
			expect(getStatusStyle("Fertig", opts)).toEqual({ icon: "✔", color: "green" });
		});

		test("custom blocked status", () => {
			const opts = {
				statuses: ["To Do", "In Progress", "Done"],
				blockedStatuses: ["Gesperrt"],
			};
			const style = getStatusStyle("Gesperrt", opts);
			expect(style.icon).toBe("●");
			expect(style.color).toBe("red");
		});
	});

	describe("getStatusStyle priority order", () => {
		test("blocked takes priority over terminal", () => {
			const opts = {
				statuses: ["To Do", "Done"],
				blockedStatuses: ["Done"],
				terminalStatuses: ["Done"],
			};
			const style = getStatusStyle("Done", opts);
			// Blocked list checked first → red
			expect(style.color).toBe("red");
		});
	});

	describe("getStatusColor", () => {
		test("returns correct color with explicit config", () => {
			const opts = {
				statuses: ["Neu", "Macht", "Fertig"],
				newStatuses: ["Neu"],
				runningStatuses: ["Macht"],
				terminalStatuses: ["Fertig"],
			};
			expect(getStatusColor("Neu", opts)).toBe("white");
			expect(getStatusColor("Macht", opts)).toBe("yellow");
			expect(getStatusColor("Fertig", opts)).toBe("green");
		});

		test("returns default color for unknown status", () => {
			expect(getStatusColor("Unknown")).toBe("white");
		});
	});

	describe("getStatusIcon", () => {
		test("returns correct icon with explicit config", () => {
			const opts = {
				statuses: ["A", "B", "C"],
				newStatuses: ["A"],
				runningStatuses: ["B"],
				terminalStatuses: ["C"],
			};
			expect(getStatusIcon("A", opts)).toBe("○");
			expect(getStatusIcon("B", opts)).toBe("◒");
			expect(getStatusIcon("C", opts)).toBe("✔");
		});

		test("returns default icon for unknown status", () => {
			expect(getStatusIcon("Unknown")).toBe("○");
		});
	});

	describe("formatStatusWithIcon", () => {
		test("formats status with correct icon", () => {
			const opts = {
				statuses: ["Todo", "Doing", "Done"],
				newStatuses: ["Todo"],
				runningStatuses: ["Doing"],
				terminalStatuses: ["Done"],
			};
			expect(formatStatusWithIcon("Todo", opts)).toBe("○ Todo");
			expect(formatStatusWithIcon("Doing", opts)).toBe("◒ Doing");
			expect(formatStatusWithIcon("Done", opts)).toBe("✔ Done");
		});

		test("formats unknown status with default icon", () => {
			expect(formatStatusWithIcon("Custom Status")).toBe("○ Custom Status");
		});
	});
});
