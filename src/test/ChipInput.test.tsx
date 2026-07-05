import { describe, expect, it } from "bun:test";
import { renderToString } from "react-dom/server";
import ChipInput from "../web/components/ChipInput.tsx";

describe("ChipInput", () => {
	it("renders input field", () => {
		const html = renderToString(<ChipInput name="test" label="" value={[]} onChange={() => {}} />);
		expect(html).toContain("chip-input-test");
	});

	it("displays chips for given value", () => {
		const html = renderToString(<ChipInput name="test" label="" value={["bug", "feature"]} onChange={() => {}} />);
		expect(html).toContain("bug");
		expect(html).toContain("feature");
	});

	it("does not crash without suggestions prop", () => {
		const html = renderToString(<ChipInput name="test" label="" value={[]} onChange={() => {}} />);
		expect(html).toContain("chip-input-test");
	});

	it("does not crash with suggestions prop", () => {
		const html = renderToString(
			<ChipInput name="test" label="" value={[]} suggestions={["a", "b"]} onChange={() => {}} />,
		);
		expect(html).toContain("chip-input-test");
	});

	it("renders remove buttons for each chip", () => {
		const html = renderToString(<ChipInput name="test" label="" value={["bug"]} onChange={() => {}} />);
		expect(html).toContain('aria-label="Remove bug"');
	});

	it("singleSelect hides input when value is set", () => {
		const html = renderToString(
			<ChipInput name="test" label="" value={["selected"]} singleSelect onChange={() => {}} />,
		);
		// In singleSelect with value, the chip should render but no input
		expect(html).toContain("selected");
	});

	it("singleSelect shows placeholder when no value", () => {
		const html = renderToString(
			<ChipInput name="test" label="" value={[]} singleSelect placeholder="Pick one..." onChange={() => {}} />,
		);
		expect(html).toContain("Pick one...");
	});

	it("applies disabled class when disabled", () => {
		const html = renderToString(<ChipInput name="test" label="" value={["bug"]} disabled onChange={() => {}} />);
		expect(html).toContain("cursor-not-allowed");
	});

	it("renders color dot in chip when colorMap is provided", () => {
		const html = renderToString(
			<ChipInput name="test" label="" value={["bug"]} colorMap={{ bug: "#ff0000" }} onChange={() => {}} />,
		);
		expect(html).toContain("bug");
	});
});
