import net from "node:net";

const NO_STORE_HEADERS = {
	"Cache-Control": "no-store, max-age=0, must-revalidate",
	Pragma: "no-cache",
	Expires: "0",
} as const;

export function applyNoStoreHeaders(headers: Headers): void {
	for (const [name, value] of Object.entries(NO_STORE_HEADERS)) {
		headers.set(name, value);
	}
}

export function markHtmlBundleNoStore(bundle: Bun.HTMLBundle): Bun.HTMLBundle {
	if (!bundle.files) {
		return bundle;
	}

	for (const file of bundle.files) {
		if (file.loader === "html" && file.isEntry) {
			Object.assign(file.headers, NO_STORE_HEADERS);
		}
	}

	return bundle;
}

export async function isPortAvailable(port: number): Promise<boolean> {
	if (port < 1 || port > 65535) return false;
	return new Promise((resolve) => {
		const srv = net.createServer();
		srv.listen(port, "127.0.0.1", () => srv.close(() => resolve(true)));
		srv.on("error", () => resolve(false));
	});
}

export async function findNextAvailablePort(startPort: number): Promise<number> {
	let port = startPort;
	while (!(await isPortAvailable(port))) port++;
	return port;
}
