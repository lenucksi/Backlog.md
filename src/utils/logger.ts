import { createConsola } from "consola";

const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LEVEL_MAP: Record<LogLevel, number> = {
	debug: 4,
	info: 3,
	warn: 2,
	error: 1,
	fatal: 0,
};

type LogArg = unknown;

let logger: ReturnType<typeof createConsola> | null = null;
let currentLevel = 3;

function createLoggerInstance() {
	if (isBrowser) {
		return createConsola({ level: currentLevel });
	}

	return createConsola({
		level: currentLevel,
		reporters: [
			{
				log(logObj) {
					if (logObj.level != null && logObj.level > currentLevel) return;
					const prefix = `[${(logObj.type ?? "log").toUpperCase()}]`;
					const message = logObj.args.map(formatArg).join(" ");
					process.stderr.write(`${prefix} ${message}\n`);
				},
			},
		],
	});
}

function formatArg(arg: LogArg): string {
	if (typeof arg === "string") return arg;
	if (arg instanceof Error) return arg.message;
	try {
		return JSON.stringify(arg);
	} catch {
		return String(arg);
	}
}

export function getLogger() {
	if (!logger) {
		logger = createLoggerInstance();
	}
	return logger;
}

export function setLogLevel(level: LogLevel) {
	currentLevel = LEVEL_MAP[level] ?? 3;
	if (logger) logger.level = currentLevel;
}

export function resetLogger() {
	logger = null;
}
