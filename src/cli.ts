/**
 * Zvec CLI - Command-line interface for Zvec vector database
 */

import { parseArgs } from "node:util";
import { init, parseInitArgs, showInitHelp } from "./commands/init";

const VERSION = "0.1.0";

interface GlobalOptions {
	help?: boolean;
	version?: boolean;
}

/**
 * Parse global arguments
 */
function parseGlobalArgs(args: string[]): {
	options: GlobalOptions;
	command: string | undefined;
	commandArgs: string[];
} {
	const { values, positionals } = parseArgs({
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
		command: positionals[0],
		commandArgs: positionals.slice(1),
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
  insert            Insert documents into a collection
  fetch             Fetch a document by ID
  delete            Delete documents from a collection
  search            Search for similar vectors
  optimize          Optimize a collection

OPTIONS:
  -h, --help        Show this help message
  -v, --version     Show version

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

	// Handle global options
	if (options.version) {
		showVersion();
		return 0;
	}

	if (options.help) {
		showHelp();
		return 0;
	}

	// Route to command
	switch (command) {
		case "init":
			return init(parseInitArgs(commandArgs));

		case "init --help":
		case "-h":
			showInitHelp();
			return 0;

		case undefined:
			showHelp();
			return 0;

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
