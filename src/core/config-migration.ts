import type { BacklogConfig } from "../types/index.ts";
import { getSchemaDefaults } from "../utils/config-schema.ts";

export function migrateConfig(config: Partial<BacklogConfig>): BacklogConfig {
	const definedConfig = Object.fromEntries(Object.entries(config).filter(([_, v]) => v !== undefined));

	const result = {
		...getSchemaDefaults(),
		...definedConfig,
	} as unknown as BacklogConfig;

	if (!result.projectName) result.projectName = "Untitled Project";
	if (!result.statuses?.length) result.statuses = ["To Do", "In Progress", "Done"];
	if (!result.labels) result.labels = [];

	if (result.maxColumnWidth === 80) {
		result.maxColumnWidth = 20;
	}

	return result;
}

export function needsMigration(config: Partial<BacklogConfig>): boolean {
	return config.projectName === undefined || config.statuses === undefined;
}
