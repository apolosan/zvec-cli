/**
 * Zvec CLI Insert Command
 * Insert documents into collections
 */

import { appendFileSync } from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { readConfig } from "../config";
import type { CollectionSchema, Document } from "../types";
import { collectionExists, getCollectionPath } from "./collection";

export interface InsertOptions {
	collection?: string;
	file?: string;
	id?: string;
	vector?: string;
	fields?: string[];
	vectorCol?: string;
	help?: boolean;
}

/**
 * Parse insert command arguments
 */
export function parseInsertArgs(args: string[]): InsertOptions {
	const { values, positionals } = parseArgs({
		args,
		options: {
			file: {
				type: "string",
				short: "f",
			},
			id: {
				type: "string",
			},
			vector: {
				type: "string",
			},
			field: {
				type: "string",
				multiple: true,
			},
			"vector-col": {
				type: "string",
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
		file: values.file as string | undefined,
		id: values.id as string | undefined,
		vector: values.vector as string | undefined,
		fields: (values.field as string[] | undefined) ?? [],
		vectorCol: values["vector-col"] as string | undefined,
		help: values.help as boolean | undefined,
	};
}

/**
 * Display help for insert command
 */
export function showInsertHelp(): void {
	console.log(`zvec insert - Insert documents into a collection

USAGE:
  zvec insert <COLLECTION> [OPTIONS]

OPTIONS:
  -f, --file <PATH>       Insert from file (JSON, JSONL, or CSV)
  --id <ID>               Document ID (for single document insert)
  --vector <VALUES>       Vector values as comma-separated numbers
  --field <NAME>=<VALUE>  Set a field value (can be repeated)
  --vector-col <NAME>     Vector column name for CSV files (default: "embedding")
  -h, --help              Show this help message

INPUT FORMATS:
  JSON file:    Array of documents or single document object
  JSONL file:   One JSON document per line
  CSV file:     Vector column as comma-separated values in quotes

STDIN:
  Read from stdin when no --file specified:
  cat data.json | zvec insert mycol

EXAMPLES:
  # Insert from JSON file
  zvec insert mycol --file data.json

  # Insert from JSONL file
  zvec insert mycol --file data.jsonl

  # Insert from CSV with vector column
  zvec insert mycol --file data.csv --vector-col embedding

  # Insert from stdin
  cat data.json | zvec insert mycol

  # Insert single document via CLI
  zvec insert mycol --id doc1 --vector "0.1,0.2,0.3" --field title="Hello"

  # Insert with multiple fields
  zvec insert mycol --id doc2 --vector "0.4,0.5,0.6" \\
    --field title="World" --field year=2024 --field active=true
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
 * Parse field value from string
 */
function parseFieldValue(value: string): unknown {
	// Try to parse as JSON (for numbers, booleans, etc.)
	try {
		return JSON.parse(value);
	} catch {
		// Return as string if not valid JSON
		return value;
	}
}

/**
 * Parse field specification: "name=value"
 */
function parseFieldSpec(spec: string): { name: string; value: unknown } | null {
	const eqIndex = spec.indexOf("=");
	if (eqIndex === -1) {
		return null;
	}

	const name = spec.slice(0, eqIndex);
	const valueStr = spec.slice(eqIndex + 1);

	if (!name) {
		return null;
	}

	return { name, value: parseFieldValue(valueStr) };
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
 * Validate document against collection schema
 */
function validateDocument(
	doc: Document,
	schema: CollectionSchema,
): string | null {
	// Validate vectors
	for (const vectorField of schema.vectors) {
		const vector = doc.vectors[vectorField.name];
		if (vector !== undefined) {
			if (!Array.isArray(vector)) {
				return `Vector field '${vectorField.name}' must be an array`;
			}
			if (vector.length !== vectorField.dimension) {
				return `Vector field '${vectorField.name}' has wrong dimension: expected ${vectorField.dimension}, got ${vector.length}`;
			}
			for (const val of vector) {
				if (typeof val !== "number" || Number.isNaN(val)) {
					return `Vector field '${vectorField.name}' contains invalid value`;
				}
			}
		}
	}

	// Validate scalar fields
	for (const scalarField of schema.fields) {
		const value = doc.fields[scalarField.name];
		if (value !== undefined) {
			const actualType = typeof value;
			let expectedType: string;

			switch (scalarField.type) {
				case "string":
					expectedType = "string";
					break;
				case "bool":
					expectedType = "boolean";
					break;
				case "int32":
				case "int64":
				case "float":
				case "double":
					expectedType = "number";
					break;
				default:
					expectedType = "unknown";
			}

			if (actualType !== expectedType) {
				return `Field '${scalarField.name}' has wrong type: expected ${expectedType}, got ${actualType}`;
			}
		}
	}

	return null;
}

/**
 * Append document to documents file
 */
async function appendDocument(
	collectionName: string,
	doc: Document,
): Promise<void> {
	const docsPath = await getDocumentsPath(collectionName);
	const line = `${JSON.stringify(doc)}\n`;
	appendFileSync(docsPath, line, "utf8");
}

/**
 * Read documents from JSON file
 */
async function readJsonDocuments(filePath: string): Promise<unknown[]> {
	const file = Bun.file(filePath);
	if (!(await file.exists())) {
		throw new Error(`File not found: ${filePath}`);
	}

	const content = await file.json();

	// Handle both single document and array of documents
	if (Array.isArray(content)) {
		return content;
	}

	return [content];
}

/**
 * Read documents from JSONL file
 */
async function readJsonlDocuments(filePath: string): Promise<unknown[]> {
	const file = Bun.file(filePath);
	if (!(await file.exists())) {
		throw new Error(`File not found: ${filePath}`);
	}

	const content = await file.text();
	const lines = content.trim().split("\n");
	const docs: unknown[] = [];

	for (const line of lines) {
		if (line.trim()) {
			docs.push(JSON.parse(line));
		}
	}

	return docs;
}

/**
 * Read documents from CSV file
 */
async function readCsvDocuments(
	filePath: string,
	vectorCol: string,
): Promise<unknown[]> {
	const file = Bun.file(filePath);
	if (!(await file.exists())) {
		throw new Error(`File not found: ${filePath}`);
	}

	const content = await file.text();
	const lines = content.trim().split("\n");

	if (lines.length === 0) {
		return [];
	}

	// Parse header
	const header = parseCsvLine(lines[0] ?? "");
	if (!header) {
		throw new Error("Empty CSV file");
	}

	// Find vector column index
	const vectorColIndex = header.indexOf(vectorCol);
	if (vectorColIndex === -1) {
		throw new Error(`Vector column '${vectorCol}' not found in CSV`);
	}

	const docs: unknown[] = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		if (!line || !line.trim()) continue;

		const values = parseCsvLine(line);
		if (!values || values.length !== header.length) {
			console.error(`Warning: Skipping malformed line ${i + 1}`);
			continue;
		}

		const doc: Record<string, unknown> = {};

		for (let j = 0; j < header.length; j++) {
			const colName = header[j];
			const value = values[j];

			if (colName && value !== undefined) {
				if (j === vectorColIndex) {
					// Parse vector from comma-separated string
					doc[colName] = value.split(",").map((v) => {
						const num = Number.parseFloat(v.trim());
						return Number.isNaN(num) ? 0 : num;
					});
				} else {
					// Try to parse as number, otherwise keep as string
					const num = Number.parseFloat(value);
					doc[colName] = Number.isNaN(num) ? value : num;
				}
			}
		}

		docs.push(doc);
	}

	return docs;
}

/**
 * Parse CSV line handling quoted values
 */
function parseCsvLine(line: string): string[] | null {
	if (!line.trim()) return null;

	const values: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				// Escaped quote
				current += '"';
				i++;
			} else {
				// Toggle quote state
				inQuotes = !inQuotes;
			}
		} else if (char === "," && !inQuotes) {
			values.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}

	values.push(current.trim());
	return values;
}

/**
 * Convert raw document to Document type
 */
function normalizeDocument(
	raw: unknown,
	schema: CollectionSchema,
	defaultVectorName: string,
): Document {
	if (typeof raw !== "object" || raw === null) {
		throw new Error("Document must be an object");
	}

	const obj = raw as Record<string, unknown>;
	const now = new Date().toISOString();

	// Extract ID
	const id = typeof obj.id === "string" ? obj.id : generateId();

	// Separate vectors from fields
	const fields: Record<string, unknown> = {};
	const vectors: Record<string, number[]> = {};

	for (const [key, value] of Object.entries(obj)) {
		if (key === "id") continue;

		// Check if this is a vector field
		const isVectorField = schema.vectors.some((v) => v.name === key);

		if (isVectorField && Array.isArray(value)) {
			vectors[key] = value as number[];
		} else if (
			key === defaultVectorName &&
			Array.isArray(value) &&
			!vectors[defaultVectorName]
		) {
			vectors[key] = value as number[];
		} else {
			fields[key] = value;
		}
	}

	return {
		id,
		fields,
		vectors,
		created: now,
		updated: now,
	};
}

/**
 * Generate unique document ID
 */
function generateId(): string {
	return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Show progress indicator
 */
function showProgress(current: number, total: number): void {
	const percent = Math.round((current / total) * 100);
	const barLength = 30;
	const filled = Math.round((barLength * current) / total);
	const bar = "█".repeat(filled) + "░".repeat(barLength - filled);
	process.stdout.write(
		`\rInserting: [${bar}] ${percent}% (${current}/${total})`,
	);
}

/**
 * Insert documents from various sources
 */
export async function insert(options: InsertOptions): Promise<number> {
	if (options.help) {
		showInsertHelp();
		return 0;
	}

	if (!options.collection) {
		console.error("Error: Missing collection name");
		console.error("Usage: zvec insert <COLLECTION> [OPTIONS]");
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

	// Determine default vector field name
	const defaultVectorName = schema.vectors[0]?.name ?? "embedding";
	const vectorCol = options.vectorCol ?? defaultVectorName;

	let documents: unknown[];

	// Determine input source
	if (options.file) {
		// Read from file
		const ext = path.extname(options.file).toLowerCase();

		try {
			if (ext === ".json") {
				documents = await readJsonDocuments(options.file);
			} else if (ext === ".jsonl") {
				documents = await readJsonlDocuments(options.file);
			} else if (ext === ".csv") {
				documents = await readCsvDocuments(options.file, vectorCol);
			} else {
				console.error(`Error: Unsupported file format: ${ext}`);
				console.error("Supported formats: .json, .jsonl, .csv");
				return 1;
			}
		} catch (error) {
			console.error(
				`Error reading file: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			return 1;
		}
	} else if (
		options.id ||
		options.vector ||
		(options.fields ?? []).length > 0 ||
		!process.stdin.isTTY
	) {
		// Single document via CLI or stdin
		if (options.id && options.vector) {
			// Single document via CLI args
			let vector: number[];
			try {
				vector = parseVectorString(options.vector);
			} catch (error) {
				console.error(
					`Error: ${error instanceof Error ? error.message : "Invalid vector"}`,
				);
				return 1;
			}

			const fields: Record<string, unknown> = {};
			for (const spec of options.fields ?? []) {
				const parsed = parseFieldSpec(spec);
				if (!parsed) {
					console.error(`Error: Invalid field specification: ${spec}`);
					console.error("Expected format: --field name=value");
					return 1;
				}
				fields[parsed.name] = parsed.value;
			}

			documents = [
				{
					id: options.id,
					[defaultVectorName]: vector,
					...fields,
				},
			];
		} else if (!process.stdin.isTTY) {
			// Read from stdin
			let stdinContent = "";
			try {
				for await (const chunk of Bun.stdin.stream()) {
					stdinContent += Buffer.from(chunk).toString();
				}
			} catch {
				console.error("Error: Failed to read from stdin");
				return 1;
			}

			if (!stdinContent.trim()) {
				console.error("Error: No input provided on stdin");
				return 1;
			}

			try {
				// Try to parse as JSON first
				const parsed = JSON.parse(stdinContent);
				documents = Array.isArray(parsed) ? parsed : [parsed];
			} catch {
				// Try JSONL format
				try {
					const lines = stdinContent.trim().split("\n");
					documents = lines
						.filter((line) => line.trim())
						.map((line) => JSON.parse(line));
				} catch (error) {
					console.error(
						`Error parsing stdin: ${error instanceof Error ? error.message : "Invalid format"}`,
					);
					return 1;
				}
			}
		} else {
			console.error("Error: No input provided");
			console.error("Use --file to specify a file, or provide data via stdin");
			return 1;
		}
	} else {
		console.error("Error: No input provided");
		console.error("Use --file to specify a file, or provide data via stdin");
		return 1;
	}

	if (documents.length === 0) {
		console.error("Error: No documents to insert");
		return 1;
	}

	// Insert documents
	const total = documents.length;
	let inserted = 0;
	let errors = 0;

	for (let i = 0; i < documents.length; i++) {
		const rawDoc = documents[i];

		try {
			const doc = normalizeDocument(rawDoc, schema, defaultVectorName);

			// Validate document
			const validationError = validateDocument(doc, schema);
			if (validationError) {
				console.error(`\nError in document ${i + 1}: ${validationError}`);
				errors++;
				continue;
			}

			// Append to documents file
			await appendDocument(options.collection, doc);
			inserted++;

			// Show progress for large batches
			if (total > 10) {
				showProgress(i + 1, total);
			}
		} catch (error) {
			console.error(
				`\nError processing document ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			errors++;
		}
	}

	// Clear progress line and show summary
	if (total > 10) {
		process.stdout.write(`\r${" ".repeat(80)}\r`);
	}

	if (errors > 0) {
		console.log(`⚠ Inserted ${inserted}/${total} documents (${errors} errors)`);
		return 1;
	}

	console.log(
		`✓ Inserted ${inserted} document${inserted !== 1 ? "s" : ""} into '${options.collection}'`,
	);
	return 0;
}
