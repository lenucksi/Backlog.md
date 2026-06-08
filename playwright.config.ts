import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./src/test/e2e",
	timeout: 30000,
	fullyParallel: true,
	outputDir: "./tmp/playwright-results",
	retries: 0,
	use: {
		baseURL: "http://localhost:6420",
		viewport: { width: 1280, height: 720 },
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},
	webServer: {
		command: "bun run scripts/e2e-test-server.ts",
		port: 6420,
		reuseExistingServer: false,
		timeout: 15000,
	},
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
});
