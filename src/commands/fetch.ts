/**
 * Zvec CLI Fetch Command
 * Retrieve a document by ID from a collection
 */

import { createReadStream } from "node:fs";
import * as path from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { readConfig } from "../config";
import type { Document } from "../types";
import { collectionExists } from "./collection";

export interface FetchOptions {
	collection?: string;
	id?: string;
	json?: boolean;
	vector?: boolean;
	help?: boolean;
}

/**
 * Parse fetch command arguments
 */
export function parseFetchArgs(args: string[]): FetchOptions {
	const { values, positionals } = parseArgs({
		args,
		options: {
			json: {
				type: "boolean",
			},
			vector: {
				type: "boolean",
			},
			help: {
				type: "boolean",
				short: "h",
			},
		},
		strict: false,
		allowPositionals: true,
	});

	return {
		collection: positionals[0],
		id: positionals[1],
		json: values.json as boolean | undefined,
		vector: values.vector as boolean | undefined,
		help: values.help as boolean | undefined,
	};
}

/**
 * Display help for fetch command
 */
export function showFetchHelp(): void {
	console.log(`zvec fetch - Retrieve a document by ID

USAGE:
  zvec fetch <COLLECTION> <DOC_ID> [OPTIONS]

ARGUMENTS:
  <COLLECTION>    Collection name
  <DOC_ID>        Document ID to retrieve

OPTIONS:
  --json          Output raw JSON
  --vector        Include vector data (hidden by default)
  -h, --help      Show this help message

OUTPUT:
  Default: Formatted table of document fields
  JSON: Raw JSON document object

EXAMPLES:
  zvec fetch mycol doc1
  zvec fetch mycol doc1 --json
  zvec fetch mycol doc1 --vector
  zvec fetch mycol doc1 --json --vector
`);
}

/**
 * Get documents file path for a collection
 */
async function getDocumentsPath(collectionName: string): Promise<string> {
	const config = await readConfig();
	return path.join(
		config.storage.path,
		"collections",
		`${collectionName}.documents.jsonl`,
	);
}

/**
 * Find a document by ID in the collection's JSONL file
 * Reads line-by-line for memory efficiency
 */
export async function findDocumentById(
	collectionName: string,
	docId: string,
): Promise<Document | null> {
	const docsPath = await getDocumentsPath(collectionName);

	const file = Bun.file(docsPath);
	if (!(await file.exists())) {
		return null;
	}

	return new Promise((resolve, reject) => {
		const rl = createInterface({
			input: createReadStream(docsPath, { encoding: "utf8" }),
			crlfDelay: Number.POSITIVE_INFINITY,
		});

		let found = false;

		rl.on("line", (line) => {
			if (found) return;
			const trimmed = line.trim();
			if (!trimmed) return;
			try {
				const doc = JSON.parse(trimmed) as Document;
				if (doc.id === docId) {
					found = true;
					rl.close();
					resolve(doc);
				}
			} catch {
				// skip malformed lines
			}
		});

		rl.on("close", () => {
			if (!found) {
				resolve(null);
			}
		});

		rl.on("error", reject);
	});
}

/**
 * Format a single value for display
 */
function formatValue(value: unknown): string {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean")
		return String(value);
	if (value === null || value === undefined) return "(null)";
	return JSON.stringify(value);
}

/**
 * Format vector for display (truncated if long)
 */
function formatVector(values: number[]): string {
	const MAX_DISPLAY = 6;
	if (values.length <= MAX_DISPLAY) {
		return `[${values.join(", ")}]`;
	}
	const preview = values.slice(0, MAX_DISPLAY).join(", ");
	return `[${preview}, ... +${values.length - MAX_DISPLAY} more] (dim=${values.length})`;
}

/**
 * Display document as formatted table
 */
function printDocumentTable(doc: Document, includeVectors: boolean): void {
	// Calculate label width
	const fieldKeys = Object.keys(doc.fields);
	const vectorKeys = includeVectors ? Object.keys(doc.vectors) : [];

	const allKeys = ["id", "created", "updated", ...fieldKeys];
	const vectorLabels = vectorKeys.map((k) => `[vector] ${k}`);

	const labelWidth =
		Math.max(...[...allKeys, ...vectorLabels].map((k) => k.length)) + 2;

	const pad = (label: string) => label.padEnd(labelWidth);

	console.log("");
	console.log(`${pad("id")}${doc.id}`);
	console.log(`${pad("created")}${doc.created}`);
	console.log(`${pad("updated")}${doc.updated}`);

	if (fieldKeys.length > 0) {
		console.log("");
		for (const key of fieldKeys) {
			console.log(`${pad(key)}${formatValue(doc.fields[key])}`);
		}
	}

	if (includeVectors && vectorKeys.length > 0) {
		console.log("");
		for (const key of vectorKeys) {
			const vec = doc.vectors[key];
			console.log(
				`${pad(`[vector] ${key}`)}${vec ? formatVector(vec) : "(empty)"}`,
			);
		}
	}

	console.log("");
}

/**
 * Execute fetch command
 */
export async function fetch(options: FetchOptions): Promise<number> {
	if (options.help) {
		showFetchHelp();
		return 0;
	}

	if (!options.collection) {
		console.error("Error: Missing collection name");
		console.error("Usage: zvec fetch <COLLECTION> <DOC_ID> [OPTIONS]");
		return 1;
	}

	if (!options.id) {
		console.error("Error: Missing document ID");
		console.error("Usage: zvec fetch <COLLECTION> <DOC_ID> [OPTIONS]");
		return 1;
	}

	// Check collection exists
	if (!(await collectionExists(options.collection))) {
		console.error(`Error: Collection '${options.collection}' does not exist`);
		return 1;
	}

	// Find document
	const doc = await findDocumentById(options.collection, options.id);

	if (!doc) {
		console.error(
			`Error: Document '${options.id}' not found in collection '${options.collection}'`,
		);
		return 1;
	}

	// Output
	if (options.json) {
		if (options.vector) {
			console.log(JSON.stringify(doc, null, 2));
		} else {
			// Omit vectors from JSON output unless --vector flag is set
			const { vectors: _vectors, ...docWithoutVectors } = doc;
			console.log(JSON.stringify(docWithoutVectors, null, 2));
		}
	} else {
		printDocumentTable(doc, options.vector ?? false);
	}

	return 0;
}
