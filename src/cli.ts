/**
 * Zvec CLI - Command-line interface for Zvec vector database
 */

import { parseArgs } from "node:util";
import { collection, parseCollectionArgs } from "./commands/collection";
import { config, parseConfigArgs } from "./commands/config";
import { init, parseInitArgs } from "./commands/init";

const VERSION = "0.1.0";

interface GlobalOptions {
	help?: boolean;
	version?: boolean;
}

/**
 * Parse global arguments
 * Only parses --help and --version if they appear before the command
 */
function parseGlobalArgs(args: string[]): {
	options: GlobalOptions;
	command: string | undefined;
	commandArgs: string[];
} {
	// Find where the command starts (first non-flag argument)
	let commandIndex = -1;
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg && !arg.startsWith("-")) {
			commandIndex = i;
			break;
		}
	}

	// If no command found, parse all args as global options
	if (commandIndex === -1) {
		const { values } = parseArgs({
			args,
			options: {
				help: {
					type: "boolean",
					short: "h",
				},
				version: {
					type: "boolean",
					short: "v",
				},
			},
			strict: false,
			allowPositionals: true,
		});

		return {
			options: {
				help: values.help as boolean | undefined,
				version: values.version as boolean | undefined,
			},
			command: undefined,
			commandArgs: [],
		};
	}

	// Parse only pre-command args as global options
	const globalArgs = args.slice(0, commandIndex);
	const { values } = parseArgs({
		args: globalArgs,
		options: {
			help: {
				type: "boolean",
				short: "h",
			},
			version: {
				type: "boolean",
				short: "v",
			},
		},
		strict: false,
		allowPositionals: false,
	});

	return {
		options: {
			help: values.help as boolean | undefined,
			version: values.version as boolean | undefined,
		},
		command: args[commandIndex],
		commandArgs: args.slice(commandIndex + 1),
	};
}

/**
 * Display global help
 */
function showHelp(): void {
	console.log(`zvec - Command-line interface for Zvec vector database

USAGE:
  zvec <COMMAND> [OPTIONS]
  zvec --help
  zvec --version

COMMANDS:
  init              Initialize zvec storage location
  collection        Manage collections (create, list, inspect, drop)
  config            Manage configuration
  ls                List all collections (shortcut for 'collection list')
  insert            Insert documents into a collection
  fetch             Fetch a document by ID
  delete            Delete documents from a collection
  search            Search for similar vectors
  optimize          Optimize a collection

OPTIONS:
  -h, --help        Show this help message
  -v, --version     Show version

EXAMPLES:
  zvec init                       Initialize with default storage path
  zvec init --path ./my-data      Initialize with custom storage path
  zvec --version                  Show version number
  zvec init --help                Show detailed help for init command
  zvec ls                         List all collections
  zvec collection list --json     List collections as JSON

Run 'zvec <COMMAND> --help' for command-specific help.
`);
}

/**
 * Display version
 */
function showVersion(): void {
	console.log(`zvec version ${VERSION}`);
}

/**
 * Main CLI entry point
 */
export async function main(args: string[]): Promise<number> {
	const { options, command, commandArgs } = parseGlobalArgs(args);

	// Handle global options (only if no command specified)
	if (!command) {
		if (options.version) {
			showVersion();
			return 0;
		}

		if (options.help) {
			showHelp();
			return 0;
		}

		// No command and no options - show help
		showHelp();
		return 0;
	}

	// Handle global flags even when command is specified
	if (options.version) {
		showVersion();
		return 0;
	}

	// Route to command
	switch (command) {
		case "init": {
			const initOptions = parseInitArgs(commandArgs);
			return init(initOptions);
		}

		case "config": {
			const configOptions = parseConfigArgs(commandArgs);
			return config(configOptions);
		}

		case "collection":
		case "col":
		case "ls": {
			const collectionOptions = parseCollectionArgs(
				command === "ls" ? ["list", ...commandArgs] : commandArgs,
			);
			return collection(collectionOptions);
		}

		default:
			console.error(`Unknown command: ${command}`);
			console.error("Run 'zvec --help' for usage.");
			return 1;
	}
}

// Run CLI if executed directly
if (import.meta.main) {
	const args = process.argv.slice(2);
	const exitCode = await main(args);
	process.exit(exitCode);
}
