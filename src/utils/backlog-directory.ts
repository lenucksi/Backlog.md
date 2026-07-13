import { join, normalize } from "node:path";
import { DEFAULT_DIRECTORIES, DEFAULT_FILES } from "../constants/index.ts";

export type BacklogDirectorySource = "backlog" | ".backlog" | "custom";
export type BacklogConfigSource = "folder" | "root";

export interface BacklogDirectoryResolution {
	projectRoot: string;
	backlogDir: string | null;
	backlogPath: string | null;
	source: BacklogDirectorySource | null;
	configPath: string | null;
	configSource: BacklogConfigSource | null;
	rootConfigPath: string;
	rootConfigExists: boolean;
}

interface BacklogConfigMetadata {
	projectName: string | null;
	backlogDirectory: string | null;
}

function directoryExists(path: string): boolean {
	return Bun.spawnSync(["test", "-d", path]).exitCode === 0;
}

function fileExists(path: string): boolean {
	return Bun.spawnSync(["test", "-f", path]).exitCode === 0;
}

function parseBacklogConfigMetadata(content: string): BacklogConfigMetadata {
	let projectName: string | null = null;
	let backlogDirectory: string | null = null;

	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) {
			continue;
		}
		const colonIndex = line.indexOf(":");
		if (colonIndex === -1) {
			continue;
		}
		const key = line.slice(0, colonIndex).trim();
		const value = line
			.slice(colonIndex + 1)
			.trim()
			.replace(/^['"]|['"]$/g, "");
		if ((key === "project_name" || key === "projectName") && value) {
			projectName = value;
			continue;
		}
		if (key === "backlog_directory" || key === "backlogDirectory") {
			backlogDirectory = normalizeProjectBacklogDirectory(value);
		}
	}
	return { projectName, backlogDirectory };
}

function readRootBacklogConfigMetadata(rootConfigPath: string): BacklogConfigMetadata | null {
	if (!fileExists(rootConfigPath)) {
		return null;
	}
	try {
		const content = Bun.spawnSync(["cat", rootConfigPath]).stdout.toString();
		const metadata = parseBacklogConfigMetadata(content);
		return metadata.projectName ? metadata : null;
	} catch {
		return null;
	}
}

function resolveFolderConfigPath(backlogPath: string): string | null {
	const primary = join(backlogPath, DEFAULT_FILES.CONFIG);
	if (fileExists(primary)) {
		return primary;
	}
	const alternate = join(backlogPath, DEFAULT_FILES.CONFIG_YAML);
	return fileExists(alternate) ? alternate : null;
}

function resolveBuiltInBacklogDirectory(projectRoot: string): {
	backlogDir: string;
	backlogPath: string;
	source: "backlog" | ".backlog";
} | null {
	const defaultBacklogPath = join(projectRoot, DEFAULT_DIRECTORIES.BACKLOG);
	const hiddenBacklogPath = join(projectRoot, DEFAULT_DIRECTORIES.HIDDEN_BACKLOG);
	const defaultBacklogExists = directoryExists(defaultBacklogPath);
	const hiddenBacklogExists = directoryExists(hiddenBacklogPath);
	const defaultConfigPath = defaultBacklogExists ? resolveFolderConfigPath(defaultBacklogPath) : null;
	const hiddenConfigPath = hiddenBacklogExists ? resolveFolderConfigPath(hiddenBacklogPath) : null;

	if (defaultConfigPath) {
		return {
			backlogDir: DEFAULT_DIRECTORIES.BACKLOG,
			backlogPath: defaultBacklogPath,
			source: "backlog",
		};
	}

	if (hiddenConfigPath) {
		return {
			backlogDir: DEFAULT_DIRECTORIES.HIDDEN_BACKLOG,
			backlogPath: hiddenBacklogPath,
			source: ".backlog",
		};
	}

	if (defaultBacklogExists) {
		return {
			backlogDir: DEFAULT_DIRECTORIES.BACKLOG,
			backlogPath: defaultBacklogPath,
			source: "backlog",
		};
	}

	if (hiddenBacklogExists) {
		return {
			backlogDir: DEFAULT_DIRECTORIES.HIDDEN_BACKLOG,
			backlogPath: hiddenBacklogPath,
			source: ".backlog",
		};
	}

	return null;
}

export function normalizeProjectBacklogDirectory(value: string | null | undefined): string | null {
	const trimmed = String(value ?? "").trim();
	if (!trimmed) {
		return null;
	}
	if (/^(?:[a-zA-Z]:)?[\\/]/.test(trimmed)) {
		return null;
	}

	const normalized = normalize(trimmed).replace(/\\/g, "/").replace(/\/+$/g, "");
	if (!normalized || normalized === ".") {
		return null;
	}
	if (normalized === ".." || normalized.startsWith("../")) {
		return null;
	}
	return normalized;
}

function resolveDirectorySource(dir: string): BacklogDirectorySource {
	if (dir === DEFAULT_DIRECTORIES.BACKLOG) return "backlog";
	if (dir === DEFAULT_DIRECTORIES.HIDDEN_BACKLOG) return ".backlog";
	return "custom";
}

function nullResolutionResult(
	projectRoot: string,
	rootConfigPath: string,
	rootConfigExists: boolean,
): BacklogDirectoryResolution {
	return {
		projectRoot,
		backlogDir: null,
		backlogPath: null,
		source: null,
		configPath: null,
		configSource: null,
		rootConfigPath,
		rootConfigExists,
	};
}

export function resolveBacklogDirectory(projectRoot: string): BacklogDirectoryResolution {
	const rootConfigPath = join(projectRoot, DEFAULT_FILES.ROOT_CONFIG);
	const rootConfigExists = fileExists(rootConfigPath);

	if (rootConfigExists) {
		const metadata = readRootBacklogConfigMetadata(rootConfigPath);
		const configuredBacklogDir = metadata?.backlogDirectory ?? null;
		if (metadata && configuredBacklogDir) {
			const configuredBacklogPath = join(projectRoot, configuredBacklogDir);
			const configuredSource = resolveDirectorySource(configuredBacklogDir);
			return {
				projectRoot,
				backlogDir: configuredBacklogDir,
				backlogPath: configuredBacklogPath,
				source: configuredSource,
				configPath: rootConfigPath,
				configSource: "root",
				rootConfigPath,
				rootConfigExists,
			};
		}

		if (metadata) {
			const builtIn = resolveBuiltInBacklogDirectory(projectRoot);
			if (builtIn) {
				return {
					projectRoot,
					backlogDir: builtIn.backlogDir,
					backlogPath: builtIn.backlogPath,
					source: builtIn.source,
					configPath: rootConfigPath,
					configSource: "root",
					rootConfigPath,
					rootConfigExists,
				};
			}

			return nullResolutionResult(projectRoot, rootConfigPath, rootConfigExists);
		}
	}

	const builtIn = resolveBuiltInBacklogDirectory(projectRoot);
	if (!builtIn) {
		return nullResolutionResult(projectRoot, rootConfigPath, rootConfigExists);
	}

	const folderConfigPath = resolveFolderConfigPath(builtIn.backlogPath);
	return {
		projectRoot,
		backlogDir: builtIn.backlogDir,
		backlogPath: builtIn.backlogPath,
		source: builtIn.source,
		configPath: folderConfigPath,
		configSource: folderConfigPath ? "folder" : null,
		rootConfigPath,
		rootConfigExists,
	};
}
