/* Status icon and color mappings for consistent UI display */

import type { BacklogConfig } from "../types/index.ts";

export interface StatusStyle {
	icon: string;
	color: string;
}

export interface StatusStyleOptions {
	blockedStatuses?: string[];
	newStatuses?: string[];
	runningStatuses?: string[];
	terminalStatuses?: string[];
	statuses?: string[];
}

function normalize(value: string): string {
	return value.trim().toLowerCase();
}

/**
 * Get the icon and color for a given status using config-driven category lookup.
 *
 * Category priority:
 * 1. blockedStatuses → red ●
 * 2. terminalStatuses → green ✔
 * 3. runningStatuses  → yellow ◒
 * 4. newStatuses      → white ○
 *
 * When a config list is not provided, fallback heuristics apply:
 * - Blocked: substring "blocked" check
 * - Terminal: last entry in statuses
 * - New: first entry in statuses
 * - Running: middle entries (not first, not last)
 */
export function getStatusStyle(status: string, options?: StatusStyleOptions): StatusStyle {
	const lower = normalize(status);

	// 1. Blocked — explicit config list
	if (options?.blockedStatuses?.length) {
		if (options.blockedStatuses.some((bs) => normalize(bs) === lower)) {
			return { icon: "●", color: "red" };
		}
	}
	// Fallback: substring heuristic (backward compat)
	if (status.toLowerCase().includes("blocked")) {
		return { icon: "●", color: "red" };
	}

	// 2. Terminal — explicit config list
	if (options?.terminalStatuses?.length) {
		if (options.terminalStatuses.some((ts) => normalize(ts) === lower)) {
			return { icon: "✔", color: "green" };
		}
	}
	// Fallback: last status
	if (options?.statuses?.length && !options?.terminalStatuses?.length) {
		const last = options.statuses[options.statuses.length - 1];
		if (last && normalize(last) === lower) {
			return { icon: "✔", color: "green" };
		}
	}

	// 3. Running — explicit config list
	if (options?.runningStatuses?.length) {
		if (options.runningStatuses.some((rs) => normalize(rs) === lower)) {
			return { icon: "◒", color: "yellow" };
		}
	}

	// 4. New — explicit config list
	if (options?.newStatuses?.length) {
		if (options.newStatuses.some((ns) => normalize(ns) === lower)) {
			return { icon: "○", color: "white" };
		}
	}
	// Fallback: first status
	if (options?.statuses?.length && !options?.newStatuses?.length) {
		const first = options.statuses[0];
		if (first && normalize(first) === lower) {
			return { icon: "○", color: "white" };
		}
	}

	// 5. Fallback: middle status → running when no explicit runningStatuses
	if (options?.statuses && options.statuses.length >= 3 && !options?.runningStatuses?.length) {
		const first = normalize(options.statuses[0] ?? "");
		const last = normalize(options.statuses[options.statuses.length - 1] ?? "");
		if (lower !== first && lower !== last) {
			return { icon: "◒", color: "yellow" };
		}
	}

	return { icon: "○", color: "white" };
}

/** Build StatusStyleOptions from a BacklogConfig (convenience helper). */
export function statusOptionsFromConfig(
	config?: Pick<
		BacklogConfig,
		"statuses" | "newStatuses" | "runningStatuses" | "terminalStatuses" | "blockedStatuses"
	> | null,
): StatusStyleOptions {
	return {
		blockedStatuses: config?.blockedStatuses,
		newStatuses: config?.newStatuses,
		runningStatuses: config?.runningStatuses,
		terminalStatuses: config?.terminalStatuses,
		statuses: config?.statuses,
	};
}

/**
 * Get just the color for a status (for backward compatibility)
 * @param status - The task status
 * @returns The color for the status
 */
export function getStatusColor(status: string, options?: StatusStyleOptions): string {
	return getStatusStyle(status, options).color;
}

/**
 * Get just the icon for a status
 * @param status - The task status
 * @returns The icon for the status
 */
export function getStatusIcon(status: string, options?: StatusStyleOptions): string {
	return getStatusStyle(status, options).icon;
}

/**
 * Format a status with its icon
 * @param status - The task status
 * @returns The formatted status string with icon
 */
export function formatStatusWithIcon(status: string, options?: StatusStyleOptions): string {
	const style = getStatusStyle(status, options);
	return `${style.icon} ${status}`;
}
