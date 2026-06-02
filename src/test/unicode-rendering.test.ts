import { describe, expect, test } from "bun:test";

const testIfTty = process.stdout.isTTY ? test : test.skip;
import { box } from "neo-neo-bblessed";
import { createScreen } from "../ui/tui.ts";

describe("Unicode rendering", () => {
	testIfTty("Chinese characters display without replacement", () => {
		const screen = createScreen({ smartCSR: false });
		const content = "测试中文";
		const b = box({ parent: screen, content });
		screen.render();
		const rendered = String(b.content).replaceAll("\u0003", "");
		expect(rendered).toBe(content);
		screen.destroy();
	});
});
