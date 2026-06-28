import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	root: "src/web",
	plugins: [
		react({ include: "**/*.{tsx,jsx}" }),
		tailwindcss(),
		{
			name: "backlog-markdown",
			transform(code, id) {
				if (id.endsWith(".md")) {
					return {
						code: `export default ${JSON.stringify(code)};`,
						map: null,
					};
				}
			},
		},
		{
			name: "stub-bun",
			resolveId(id) {
				if (id === "bun") return "\0bun-stub";
			},
			load(id) {
				if (id === "\0bun-stub") {
					return "export const $ = async () => ({ stdout: '', stderr: '', exitCode: 0 }); export const spawn = () => ({ stdout: '', stderr: '' });";
				}
			},
		},
	],
	resolve: {
		alias: {
			"@": `${rootDir}src/web`,
		},
	},
	server: {
		port: 5173,
		proxy: {
			"/api": "http://localhost:6420",
			"/swagger": "http://localhost:6420",
		},
	},
	build: {
		outDir: `${rootDir}dist`,
		emptyOutDir: true,
		rollupOptions: {
			input: `${rootDir}src/web/index.html`,
		},
	},
});
