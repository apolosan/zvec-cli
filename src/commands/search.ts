/**
 * Zvec CLI Search Command
 * Search for similar vectors in collections
 */

import { createReadStream } from "node:fs";
import * as path from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { readConfig } from "../config";
import type { CollectionSchema, Document, SearchResult } from "../types";
import { collectionExists, getCollectionPath } from "./collection";

export interface SearchOptions {
	collection?: string;
	vector?: string;
	vectorFile?: string;
	topk?: number;
	filter?: string;
	fields?: string[];
	json?: boolean;
	help?: boolean;
}

/**
 * Parse search command arguments
 */
export function parseSearchArgs(args: string[]): SearchOptions {
	const { values, positionals } = parseArgs({
		args,
		options: {
			vector: {
				type: "string",
				short: "q",
			},
			"vector-file": {
				type: "string",
				short: "f",
			},
			topk: {
				type: "string",
				short: "k",
				default: "10",
			},
			filter: {
				type: "string",
			},
			fields: {
				type: "string",
				short: "F",
			},
			json: {
				type: "boolean",
				short: "j",
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
		vector: values.vector as string | undefined,
		vectorFile: values["vector-file"] as string | undefined,
		topk: values.topk ? Number.parseInt(values.topk as string, 10) : undefined,
		filter: values.filter as string | undefined,
		fields: values.fields
			? (values.fields as string).split(",").map((f) => f.trim())
			: undefined,
		json: values.json as boolean | undefined,
		help: values.help as boolean | undefined,
	};
}

/**
 * Display help for search command
 */
export function showSearchHelp(): void {
	console.log(`zvec search - Search for similar vectors in a collection

USAGE:
  zvec search <COLLECTION> [OPTIONS]

OPTIONS:
  -q, --vector <VALUES>    Query vector as comma-separated numbers
  -f, --vector-file <PATH> Load query vector from JSON file
  -k, --topk <N>           Number of results to return (default: 10)
  --filter <EXPR>          Apply metadata filter (e.g., "year > 2000")
  -F, --fields <NAMES>     Comma-separated field names to display
  -j, --json               Output results as JSON
  -h, --help               Show this help message

FILTER EXPRESSIONS:
  Supported operators: <, >, <=, >=, =, ==, !=
  Examples: "year > 2000", "category == 'tech'", "active != false"

EXAMPLES:
  # Search with vector
  zvec search mycol --vector "0.1,0.2,0.3,..."

  # Search with top-k results
  zvec search mycol --vector "0.1,0.2,0.3" --topk 5

  # Load vector from file
  zvec search mycol --vector-file query.json

  # Search with metadata filter
  zvec search mycol --vector "0.1,0.2,0.3" --filter "year > 2000"

  # Search with specific fields in output
  zvec search mycol --vector "0.1,0.2,0.3" --fields "title,author"

  # JSON output
  zvec search mycol --vector "0.1,0.2,0.3" --json

  # Using short flags
  zvec search mycol -q "0.1,0.2,0.3" -k 5 -F "title,author"
`);
}

/**
 * Parse vector string to number array
 */
function parseVectorString(vectorStr: string): number[] {
	const values = vectorStr.split(",").map((v) => {
		const num = Number.parseFloat(v.trim());
		if (Number.isNaN(num)) {
			throw new Error(`Invalid vector value: ${v}`);
		}
		return num;
	});
	return values;
}

/**
 * Load vector from JSON file
 */
async function loadVectorFromFile(filePath: string): Promise<number[]> {
	const file = Bun.file(filePath);
	if (!(await file.exists())) {
		throw new Error(`File not found: ${filePath}`);
	}

	const content = await file.json();

	// Handle different JSON structures
	if (Array.isArray(content)) {
		return content as number[];
	}

	if (typeof content === "object" && content !== null) {
		const obj = content as Record<string, unknown>;
		// Look for common vector field names
		const vectorField =
			obj.vector ?? obj.embedding ?? obj.query ?? obj.values ?? obj.data;
		if (Array.isArray(vectorField)) {
			return vectorField as number[];
		}
		// If single value object, return it as array
		if (typeof vectorField === "number") {
			return [vectorField];
		}
	}

	throw new Error(
		"Invalid vector file format. Expected array or object with vector field.",
	);
}

/**
 * Parse filter expression
 * Returns (field, operator, value) or null if invalid
 */
function parseFilterExpression(
	filter: string,
): { field: string; operator: string; value: unknown } | null {
	const regex = /^\s*(\w+)\s*(<=|>=|!=|==|<|>|=)\s*(.+?)\s*$/;
	const match = filter.match(regex);

	if (!match) {
		return null;
	}

	const field = match[1] ?? "";
	const operator = match[2] ?? "";
	const valueStr = match[3] ?? "";

	// Parse value
	let value: unknown;
	try {
		value = JSON.parse(valueStr);
	} catch {
		// Keep as string if not valid JSON
		value = valueStr;
	}

	return { field, operator: operator === "=" ? "==" : operator, value };
}

/**
 * Evaluate filter on document
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evaluateFilter(doc: Document, filter: unknown): boolean {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const docFields = doc.fields as Record<string, unknown>;
	const fieldValue = docFields[(filter as { field: string }).field];

	if (fieldValue === undefined) {
		return false;
	}

	const fValue = (filter as { value: unknown }).value;
	const fOp = (filter as { operator: string }).operator;

	switch (fOp) {
		case "==":
			return fieldValue === fValue;
		case "!=":
			return fieldValue !== fValue;
		case "<": {
			const fv = fValue as number;
			return (
				typeof fieldValue === "number" &&
				typeof fv === "number" &&
				(fieldValue as number) < fv
			);
		}
		case ">": {
			const fv = fValue as number;
			return (
				typeof fieldValue === "number" &&
				typeof fv === "number" &&
				(fieldValue as number) > fv
			);
		}
		case "<=": {
			const fv = fValue as number;
			return (
				typeof fieldValue === "number" &&
				typeof fv === "number" &&
				(fieldValue as number) <= fv
			);
		}
		case ">=": {
			const fv = fValue as number;
			return (
				typeof fieldValue === "number" &&
				typeof fv === "number" &&
				(fieldValue as number) >= fv
			);
		}
		default:
			return false;
	}
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
	}

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		const aVal = a[i];
		const bVal = b[i];
		// Defensive: ensure values are numbers (not undefined)
		if (aVal === undefined || bVal === undefined) {
			continue;
		}
		dotProduct += aVal * bVal;
		normA += aVal * aVal;
		normB += bVal * bVal;
	}

	if (normA === 0 || normB === 0) {
		return 0;
	}

	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Get documents path for a collection
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
 * Read collection schema
 */
async function readCollectionSchema(
	collectionName: string,
): Promise<CollectionSchema> {
	const collectionPath = await getCollectionPath(collectionName);
	const file = Bun.file(collectionPath);

	if (!(await file.exists())) {
		throw new Error(`Collection '${collectionName}' not found`);
	}

	return (await file.json()) as CollectionSchema;
}

/**
 * Get all documents from collection
 */
async function getAllDocuments(collectionName: string): Promise<Document[]> {
	const docsPath = await getDocumentsPath(collectionName);
	const file = Bun.file(docsPath);

	if (!(await file.exists())) {
		return [];
	}

	return new Promise((resolve, reject) => {
		const documents: Document[] = [];
		const rl = createInterface({
			input: createReadStream(docsPath, { encoding: "utf8" }),
			crlfDelay: Number.POSITIVE_INFINITY,
		});

		rl.on("line", (line) => {
			const trimmed = line.trim();
			if (!trimmed) return;
			try {
				documents.push(JSON.parse(trimmed) as Document);
			} catch {
				// Skip malformed lines
			}
		});

		rl.on("close", () => {
			resolve(documents);
		});

		rl.on("error", reject);
	});
}

/**
 * Format output as table
 */
function formatTableResults(
	results: SearchResult[],
	displayFields: string[],
): void {
	// Calculate column widths
	const idWidth = Math.max("ID".length, ...results.map((r) => r.id.length));
	const scoreWidth = Math.max(
		"Score".length,
		...results.map((r) => r.score.toFixed(4).length),
	);
	const fieldWidths = displayFields.map((field) =>
		Math.max(
			field.length,
			...results.map((r) => {
				const value = r.document.fields[field];
				return value !== undefined ? String(value).length : 0;
			}),
		),
	);

	// Print header
	const header = [
		"ID".padEnd(idWidth),
		"Score".padEnd(scoreWidth),
		...displayFields.map((f, i) => f.padEnd(fieldWidths[i] ?? f.length)),
	].join("  ");
	console.log(header);
	console.log("-".repeat(header.length));

	// Print rows
	for (const result of results) {
		const row = [
			result.id.padEnd(idWidth),
			result.score.toFixed(4).padEnd(scoreWidth),
			...displayFields.map((field, i) => {
				const value = result.document.fields[field];
				const str = value !== undefined ? String(value) : "-";
				return str.padEnd(fieldWidths[i] ?? field.length);
			}),
		].join("  ");
		console.log(row);
	}
}

/**
 * Main search function
 */
export async function search(options: SearchOptions): Promise<number> {
	if (options.help) {
		showSearchHelp();
		return 0;
	}

	// Validate required arguments
	if (!options.collection) {
		console.error("Error: Missing collection name");
		console.error("Usage: zvec search <COLLECTION> [OPTIONS]");
		return 1;
	}

	if (!options.vector && !options.vectorFile) {
		console.error("Error: Missing query vector");
		console.error("Use --vector or --vector-file to provide query vector");
		console.error("Run 'zvec search --help' for usage examples");
		return 1;
	}

	// Check if collection exists
	if (!(await collectionExists(options.collection))) {
		console.error(`Error: Collection '${options.collection}' not found`);
		return 1;
	}

	// Read collection schema
	let schema: CollectionSchema;
	try {
		schema = await readCollectionSchema(options.collection);
	} catch (error) {
		console.error(error instanceof Error ? error.message : "Unknown error");
		return 1;
	}

	// Determine vector field to search
	const vectorFieldName = schema.vectors[0]?.name ?? "embedding";
	const vectorField = schema.vectors.find((v) => v.name === vectorFieldName);

	if (!vectorField) {
		console.error(
			`Error: No vector field found in collection '${options.collection}'`,
		);
		return 1;
	}

	// Load query vector
	let queryVector: number[];
	try {
		if (options.vector) {
			queryVector = parseVectorString(options.vector);
		} else if (options.vectorFile) {
			queryVector = await loadVectorFromFile(options.vectorFile);
		} else {
			// This should never happen due to earlier validation
			console.error("Error: No query vector provided");
			return 1;
		}

		// Validate dimension
		if (queryVector.length !== vectorField.dimension) {
			console.error(
				`Error: Query vector dimension mismatch: expected ${vectorField.dimension}, got ${queryVector.length}`,
			);
			return 1;
		}
	} catch (error) {
		console.error(
			`Error loading vector: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return 1;
	}

	// Parse filter if provided
	let filter: { field: string; operator: string; value: unknown } | null = null;
	if (options.filter) {
		filter = parseFilterExpression(options.filter);
		if (!filter) {
			console.error(`Error: Invalid filter expression: ${options.filter}`);
			console.error("Supported operators: <, >, <=, >=, =, ==, !=");
			return 1;
		}

		// Validate filter field exists in schema
		const f = filter as { field: string; operator: string; value: unknown };
		const fieldExists = schema.fields.some((ff) => ff.name === f.field);
		if (!fieldExists) {
			console.error(
				`Error: Filter field '${f.field}' not found in collection schema`,
			);
			return 1;
		}
	}

	// Get all documents
	let documents: Document[];
	try {
		documents = await getAllDocuments(options.collection);
	} catch (error) {
		console.error(
			`Error reading documents: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return 1;
	}

	if (documents.length === 0) {
		console.log("No documents found in collection");
		return 0;
	}

	// Calculate similarities
	const results: SearchResult[] = [];

	for (const doc of documents) {
		// Apply filter if provided
		if (filter && !evaluateFilter(doc, filter)) {
			continue;
		}

		// Get document vector
		const docVector = doc.vectors[vectorFieldName];
		if (!docVector || !Array.isArray(docVector)) {
			continue;
		}

		try {
			const score = cosineSimilarity(queryVector, docVector);
			results.push({
				id: doc.id,
				score,
				document: doc,
			});
		} catch {
			// Skip documents with dimension mismatch
		}
	}

	// Sort by score (descending) and limit to top-k
	const topk = options.topk ?? 10;
	results.sort((a, b) => b.score - a.score);
	const topResults = results.slice(0, topk);

	if (topResults.length === 0) {
		if (filter) {
			console.log(`No results found matching filter: ${options.filter}`);
		} else {
			console.log("No results found");
		}
		return 0;
	}

	// Output results
	if (options.json) {
		// JSON output
		const output = topResults.map((r) => ({
			id: r.id,
			score: r.score,
			fields:
				options.fields && options.fields.length > 0
					? Object.fromEntries(
							options.fields.map((f) => [f, r.document.fields[f]]),
						)
					: r.document.fields,
			vectors:
				vectorFieldName in r.document.vectors
					? { [vectorFieldName]: r.document.vectors[vectorFieldName] }
					: undefined,
		}));
		console.log(JSON.stringify(output, null, 2));
	} else {
		// Table output
		const displayFields =
			options.fields && options.fields.length > 0
				? options.fields
				: schema.fields.slice(0, 3).map((f) => f.name);

		console.log(
			`Found ${topResults.length} result${topResults.length !== 1 ? "s" : ""} in collection '${options.collection}'`,
		);
		console.log("");
		formatTableResults(topResults, displayFields);
	}

	return 0;
}
