import { mkdir, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface LockOptions {
	stale?: number;
	retries?: number;
	retryDelay?: number;
}

export async function lockDirectory(lockDir: string, options: LockOptions = {}): Promise<() => Promise<void>> {
	const stale = options.stale ?? 10_000;
	const retries = options.retries ?? 0;
	const retryDelay = options.retryDelay ?? 100;

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			await mkdir(lockDir, { recursive: false });
			const heartbeatPath = join(lockDir, "heartbeat");
			await writeFile(heartbeatPath, String(Date.now()));
			return async () => {
				try {
					await unlink(heartbeatPath);
				} catch {
					// ignore
				}
				try {
					await rmdir(lockDir);
				} catch {
					// ignore
				}
			};
		} catch (err: unknown) {
			if ((err as NodeJS.ErrnoException)?.code !== "EEXIST") {
				throw err;
			}
			if (attempt < retries) {
				const heartbeatPath = join(lockDir, "heartbeat");
				try {
					const hb = await stat(heartbeatPath);
					if (Date.now() - hb.mtimeMs > stale) {
						await rmdir(lockDir, { recursive: true });
						attempt--;
						continue;
					}
				} catch {
					// heartbeat missing or unreadable; lock is broken
					await rmdir(lockDir, { recursive: true }).catch(() => {});
					attempt--;
					continue;
				}
				await new Promise((r) => setTimeout(r, retryDelay));
			}
		}
	}

	throw Object.assign(new Error("Could not acquire lock"), { code: "ELOCKED" });
}
