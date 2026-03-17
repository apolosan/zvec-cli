/**
 * Zvec CLI Configuration Management
 */

import * as os from "node:os";
import * as path from "node:path";
import type { ZvecConfig } from "./types";

const CONFIG_FILE_NAME = ".zvecrc";
const DEFAULT_STORAGE_SUBDIR = ".zvec";

/**
 * Get the home directory (respects ZVEC_HOME env for testing)
 */
function getHomeDir(): string {
	return process.env.ZVEC_HOME ?? os.homedir();
}

/**
 * Get the default config file path (~/.zvecrc)
 */
export function getConfigPath(): string {
	return path.join(getHomeDir(), CONFIG_FILE_NAME);
}

/**
 * Get the default storage path (~/.zvec/collections/)
 */
export function getDefaultStoragePath(): string {
	return path.join(getHomeDir(), DEFAULT_STORAGE_SUBDIR, "collections");
}

/**
 * Get the default config object
 */
export function getDefaultConfig(): ZvecConfig {
	return {
		storage: {
			path: getDefaultStoragePath(),
		},
	};
}

/**
 * Read config from file, return default if not exists
 */
export async function readConfig(): Promise<ZvecConfig> {
	const configPath = getConfigPath();
	const file = Bun.file(configPath);

	if (!(await file.exists())) {
		return getDefaultConfig();
	}

	const content = await file.text();
	return parseConfig(content);
}

/**
 * Parse YAML-like config content
 * Simple format: nested YAML with storage.path
 */
function parseConfig(content: string): ZvecConfig {
	const config = getDefaultConfig();
	const lines = content.split("\n");
	let currentSection = "";

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		// Check for section header
		if (!trimmed.includes(":")) continue;

		// Detect indentation level
		const indent = line.length - line.trimStart().length;
		const colonIndex = trimmed.indexOf(":");
		const key = trimmed.slice(0, colonIndex).trim();
		const value = trimmed.slice(colonIndex + 1).trim();

		if (indent === 0) {
			currentSection = key;
		} else if (currentSection === "storage" && key === "path" && value) {
			config.storage.path = value;
		}
	}

	return config;
}

/**
 * Serialize config to YAML format
 */
function serializeConfig(config: ZvecConfig): string {
	return `# zvec configuration
storage:
  path: ${config.storage.path}
`;
}

/**
 * Write config to file
 */
export async function writeConfig(config: ZvecConfig): Promise<void> {
	const configPath = getConfigPath();
	const content = serializeConfig(config);
	await Bun.write(configPath, content);
}

/**
 * Check if config file exists
 */
export async function configExists(): Promise<boolean> {
	const configPath = getConfigPath();
	const file = Bun.file(configPath);
	return file.exists();
}
