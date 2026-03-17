/**
 * Zvec CLI Delete Command
 * Delete documents from a collection
 */

import { createReadStream, writeFileSync } from "node:fs";
import * as path from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { readConfig } from "../config";
import type { Document } from "../types";
import { collectionExists } from "./collection";

export interface DeleteOptions {
	collection?: string;
	id?: string;
	filter?: string;
	dryRun?: boolean;
	help?: boolean;
}

interface FilterExpression {
	field: string;
	operator: "<" | ">" | "<=" | ">=" | "=" | "==" | "!=";
	value: unknown;
}

/**
 * Parse delete command arguments
 */
export function parseDeleteArgs(args: string[]): DeleteOptions {
	const { values, positionals } = parseArgs({
		args,
		options: {
			id: {
				type: "string",
			},
			filter: {
				type: "string",
			},
			"dry-run": {
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
		id: values.id as string | undefined,
		filter: values.filter as string | undefined,
		dryRun: values["dry-run"] as boolean | undefined,
		help: values.help as boolean | undefined,
	};
}

/**
 * Display help for delete command
 */
export function showDeleteHelp(): void {
	console.log(`zvec delete - Delete documents from a collection

USAGE:
  zvec delete <COLLECTION> [OPTIONS]

ARGUMENTS:
  <COLLECTION>    Collection name

OPTIONS:
  --id <ID>           Delete single document by ID
  --filter <EXPR>     Delete documents matching filter expression
  --dry-run           Show what would be deleted without actually deleting
  -h, --help          Show this help message

FILTER EXPRESSIONS:
  Supported operators: <, >, <=, >=, =, ==, !=
  Comparisons apply to scalar fields only.

EXAMPLES:
  zvec delete mycol --id doc1
  zvec delete mycol --filter "year < 1900"
  zvec delete mycol --filter "score >= 0.8"
  zvec delete mycol --filter "year < 1900" --dry-run
`);
}

/**
 * Parse a filter expression string
 */
export function parseFilter(filter: string): FilterExpression {
	const match = filter.match(/^\s*(\w+)\s*(<=|>=|!=|==|<|>|=)\s*(.+?)\s*$/);
	if (!match) {
		throw new Error(`Invalid filter expression: "${filter}"`);
	}

	const [, field, operator, rawValue] = match;
	if (!field || !operator || rawValue === undefined) {
		throw new Error(`Invalid filter expression: "${filter}"`);
	}

	// Parse value
	let value: unknown;
	if (rawValue === "true") value = true;
	else if (rawValue === "false") value = false;
	else if (rawValue === "null") value = null;
	else {
		const num = Number(rawValue);
		value = Number.isNaN(num) ? rawValue : num;
	}

	return {
		field,
		operator: operator as FilterExpression["operator"],
		value,
	};
}

/**
 * Evaluate whether a document matches a filter expression
 */
export function evaluateFilter(doc: Document, expr: FilterExpression): boolean {
	const docValue = doc.fields[expr.field];
	if (docValue === undefined) return false;

	switch (expr.operator) {
		case "<":
			return (docValue as number) < (expr.value as number);
		case ">":
			return (docValue as number) > (expr.value as number);
		case "<=":
			return (docValue as number) <= (expr.value as number);
		case ">=":
			return (docValue as number) >= (expr.value as number);
		case "=":
		case "==":
			return docValue === expr.value;
		case "!=":
			return docValue !== expr.value;
		default:
			return false;
	}
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
 * Read all documents from a collection's JSONL file
 */
export async function getAllDocuments(
	collectionName: string,
): Promise<Document[]> {
	const docsPath = await getDocumentsPath(collectionName);
	const file = Bun.file(docsPath);

	if (!(await file.exists())) {
		return [];
	}

	return new Promise((resolve, reject) => {
		const docs: Document[] = [];

		const rl = createInterface({
			input: createReadStream(docsPath, { encoding: "utf8" }),
			crlfDelay: Number.POSITIVE_INFINITY,
		});

		rl.on("line", (line) => {
			const trimmed = line.trim();
			if (!trimmed) return;
			try {
				const doc = JSON.parse(trimmed) as Document;
				docs.push(doc);
			} catch {
				// skip malformed lines
			}
		});

		rl.on("close", () => resolve(docs));
		rl.on("error", reject);
	});
}

/**
 * Write documents back to the collection's JSONL file (overwrites)
 */
async function writeDocuments(
	collectionName: string,
	docs: Document[],
): Promise<void> {
	const docsPath = await getDocumentsPath(collectionName);
	const content = docs.map((d) => JSON.stringify(d)).join("\n");
	writeFileSync(docsPath, content ? `${content}\n` : "", "utf8");
}

/**
 * Execute delete command
 */
export async function deleteDocuments(options: DeleteOptions): Promise<number> {
	if (options.help) {
		showDeleteHelp();
		return 0;
	}

	if (!options.collection) {
		console.error("Error: Missing collection name");
		console.error("Usage: zvec delete <COLLECTION> --id <ID>");
		console.error('       zvec delete <COLLECTION> --filter "field < value"');
		return 1;
	}

	if (!options.id && !options.filter) {
		console.error("Error: Must specify --id or --filter");
		console.error("Usage: zvec delete <COLLECTION> --id <ID>");
		console.error('       zvec delete <COLLECTION> --filter "field < value"');
		return 1;
	}

	// Check collection exists
	if (!(await collectionExists(options.collection))) {
		console.error(`Error: Collection '${options.collection}' does not exist`);
		return 1;
	}

	// Read all documents
	const allDocs = await getAllDocuments(options.collection);

	let toDelete: Document[];
	let toKeep: Document[];

	if (options.id) {
		// Delete by ID
		toDelete = allDocs.filter((doc) => doc.id === options.id);
		toKeep = allDocs.filter((doc) => doc.id !== options.id);

		if (toDelete.length === 0) {
			console.error(
				`Error: Document '${options.id}' not found in collection '${options.collection}'`,
			);
			return 1;
		}
	} else {
		// Delete by filter
		let filterExpr: FilterExpression;
		try {
			filterExpr = parseFilter(options.filter ?? "");
		} catch (error) {
			console.error(
				`Error: ${error instanceof Error ? error.message : "Invalid filter"}`,
			);
			return 1;
		}

		toDelete = allDocs.filter((doc) => evaluateFilter(doc, filterExpr));
		toKeep = allDocs.filter((doc) => !evaluateFilter(doc, filterExpr));
	}

	const count = toDelete.length;

	if (options.dryRun) {
		console.log(`Would delete ${count} document${count !== 1 ? "s" : ""}:`);
		for (const doc of toDelete) {
			console.log(`  - ${doc.id}`);
		}
		return 0;
	}

	// Write remaining documents back
	await writeDocuments(options.collection, toKeep);

	console.log(
		`✓ Deleted ${count} document${count !== 1 ? "s" : ""} from '${options.collection}'`,
	);
	return 0;
}
