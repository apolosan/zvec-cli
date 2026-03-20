/**
 * Zvec CLI Optimize Command
 * Optimize collection for faster queries
 */

import { parseArgs } from "node:util";
import { collectionExists, optimizeCollection } from "../services/zvec.service";

export interface OptimizeOptions {
	collection?: string;
	concurrency?: number;
	help?: boolean;
}

/**
 * Parse optimize command arguments
 */
export function parseOptimizeArgs(args: string[]): OptimizeOptions {
	const { values, positionals } = parseArgs({
		args,
		options: {
			help: {
				type: "boolean",
				short: "h",
			},
			concurrency: {
				type: "string",
				short: "c",
			},
		},
		strict: false,
		allowPositionals: true,
	});

	return {
		collection: positionals[0] as string | undefined,
		concurrency: values.concurrency
			? Number.parseInt(values.concurrency as string, 10)
			: undefined,
		help: values.help as boolean | undefined,
	};
}

/**
 * Show optimize help text
 */
export function showOptimizeHelp(): void {
	console.log(`zvec optimize - Optimize collection for faster queries

USAGE:
  zvec optimize <COLLECTION> [OPTIONS]

ARGUMENTS:
  <COLLECTION>    Collection name to optimize

OPTIONS:
  -c, --concurrency <N>   Number of concurrent operations (default: auto)
  -h, --help              Show this help message

DESCRIPTION:
  Optimizes the collection index to improve query performance.
  This builds and compacts the internal data structures.

EXAMPLES:
  zvec optimize mycollection
  zvec optimize mycollection --concurrency 4
`);
}

/**
 * Optimize a collection
 */
export async function optimize(options: OptimizeOptions): Promise<number> {
	if (options.help) {
		showOptimizeHelp();
		return 0;
	}

	// Validate required arguments
	if (!options.collection) {
		console.error("Error: Missing collection name");
		console.error("Usage: zvec optimize <COLLECTION> [OPTIONS]");
		return 1;
	}

	// Check if collection exists
	try {
		const exists = await collectionExists(options.collection);
		if (!exists) {
			console.error(`Error: Collection '${options.collection}' not found`);
			return 1;
		}
	} catch (error) {
		console.error(
			`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return 1;
	}

	// Run optimization
	try {
		console.log(`Optimizing collection '${options.collection}'...`);

		await optimizeCollection(options.collection, options.concurrency);

		console.log(`✓ Collection '${options.collection}' optimized successfully`);
		return 0;
	} catch (error) {
		console.error(
			`Error: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return 1;
	}
}
