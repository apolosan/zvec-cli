/**
 * Zvec CLI Config Command
 * Manage configuration settings
 */

import { parseArgs } from "node:util";
import { readConfig, writeConfig } from "../config";
import type { ZvecConfig } from "../types";

export interface ConfigOptions {
	subcommand?: "set" | "get" | "list";
	key?: string;
	value?: string;
	help?: boolean;
}

/**
 * Parse config command arguments
 */
export function parseConfigArgs(args: string[]): ConfigOptions {
	// First positional is the subcommand
	const subcommand = args[0] as "set" | "get" | "list" | undefined;

	if (!subcommand || subcommand === "list") {
		const { values } = parseArgs({
			args,
			options: {
				help: {
					type: "boolean",
					short: "h",
				},
			},
			strict: false,
			allowPositionals: true,
		});

		return {
			subcommand: subcommand ?? "list",
			help: values.help as boolean | undefined,
		};
	}

	if (subcommand === "get") {
		const { values, positionals } = parseArgs({
			args: args.slice(1),
			options: {
				help: {
					type: "boolean",
					short: "h",
				},
			},
			strict: false,
			allowPositionals: true,
		});

		return {
			subcommand: "get",
			key: positionals[0],
			help: values.help as boolean | undefined,
		};
	}

	if (subcommand === "set") {
		const { values, positionals } = parseArgs({
			args: args.slice(1),
			options: {
				help: {
					type: "boolean",
					short: "h",
				},
			},
			strict: false,
			allowPositionals: true,
		});

		return {
			subcommand: "set",
			key: positionals[0],
			value: positionals[1],
			help: values.help as boolean | undefined,
		};
	}

	return { help: true };
}

/**
 * Display help for config command
 */
export function showConfigHelp(): void {
	console.log(`zvec config - Manage configuration settings

USAGE:
  zvec config set <KEY> <VALUE>   Set a config value
  zvec config get <KEY>           Get a config value
  zvec config list                List all config values

OPTIONS:
  -h, --help         Show this help message

CONFIG KEYS:
  storage.path      Path to the storage directory

EXAMPLES:
  zvec config set storage.path ./my-data    Set custom storage path
  zvec config get storage.path              Get current storage path
  zvec config list                          Show all config values
`);
}

/**
 * Get a nested value from config using dot notation
 */
function getConfigValue(config: ZvecConfig, key: string): string | undefined {
	const parts = key.split(".");
	// biome-ignore lint/suspicious/noExplicitAny: Dynamic access needed for dot notation
	let value: any = config;

	for (const part of parts) {
		if (value && typeof value === "object" && part in value) {
			value = value[part];
		} else {
			return undefined;
		}
	}

	if (typeof value === "string") {
		return value;
	}
	return JSON.stringify(value);
}

/**
 * Set a nested value in config using dot notation
 */
function setConfigValue(
	config: ZvecConfig,
	key: string,
	value: string,
): boolean {
	const parts = key.split(".");

	if (parts.length !== 2) {
		return false;
	}

	const [section, field] = parts;

	if (section === "storage" && field === "path") {
		config.storage.path = value;
		return true;
	}

	return false;
}

/**
 * Format config for display
 */
function formatConfigList(config: ZvecConfig): string {
	const lines: string[] = ["Configuration (~/.zvecrc):", ""];

	for (const [key, value] of Object.entries(config)) {
		if (typeof value === "object" && value !== null) {
			for (const [subKey, subValue] of Object.entries(value)) {
				lines.push(`  ${key}.${subKey} = ${subValue}`);
			}
		} else {
			lines.push(`  ${key} = ${value}`);
		}
	}

	return lines.join("\n");
}

/**
 * Execute config command
 */
export async function config(options: ConfigOptions): Promise<number> {
	if (options.help) {
		showConfigHelp();
		return 0;
	}

	// Handle list subcommand
	if (options.subcommand === "list" || !options.subcommand) {
		const cfg = await readConfig();
		console.log(formatConfigList(cfg));
		return 0;
	}

	// Handle get subcommand
	if (options.subcommand === "get") {
		if (!options.key) {
			console.error("Error: Missing key argument");
			console.error("Usage: zvec config get <KEY>");
			return 1;
		}

		const cfg = await readConfig();
		const value = getConfigValue(cfg, options.key);

		if (value === undefined) {
			console.error(`Error: Unknown config key: ${options.key}`);
			return 1;
		}

		console.log(value);
		return 0;
	}

	// Handle set subcommand
	if (options.subcommand === "set") {
		if (!options.key) {
			console.error("Error: Missing key argument");
			console.error("Usage: zvec config set <KEY> <VALUE>");
			return 1;
		}

		if (!options.value) {
			console.error("Error: Missing value argument");
			console.error("Usage: zvec config set <KEY> <VALUE>");
			return 1;
		}

		const cfg = await readConfig();
		const success = setConfigValue(cfg, options.key, options.value);

		if (!success) {
			console.error(`Error: Unknown config key: ${options.key}`);
			console.error("Supported keys: storage.path");
			return 1;
		}

		await writeConfig(cfg);
		console.log(`✓ Set ${options.key} = ${options.value}`);
		return 0;
	}

	showConfigHelp();
	return 0;
}
