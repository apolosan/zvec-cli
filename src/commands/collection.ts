/**
 * Zvec CLI Collection Command
 * Manage collections (create, list, inspect, drop)
 */

import { existsSync } from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { readConfig } from "../config";
import type { CollectionSchema, SchemaField, VectorField } from "../types";

export interface CollectionCreateOptions {
	name?: string;
	vectors: string[];
	fields: string[];
	help?: boolean;
}

export interface CollectionOptions {
	subcommand?: "create" | "list" | "inspect" | "drop";
	createOptions?: CollectionCreateOptions;
	listOptions?: { help?: boolean; json?: boolean };
	inspectOptions?: { name?: string; help?: boolean; json?: boolean };
	dropOptions?: { name?: string; help?: boolean; force?: boolean };
	help?: boolean;
}

/**
 * Parse collection command arguments
 */
export function parseCollectionArgs(args: string[]): CollectionOptions {
	// First positional is the subcommand
	const subcommand = args[0] as
		| "create"
		| "list"
		| "inspect"
		| "drop"
		| undefined;

	if (!subcommand) {
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
			help: values.help as boolean | undefined,
		};
	}

	if (subcommand === "create") {
		return {
			subcommand: "create",
			createOptions: parseCreateArgs(args.slice(1)),
		};
	}

	if (subcommand === "list") {
		const { values } = parseArgs({
			args: args.slice(1),
			options: {
				help: {
					type: "boolean",
					short: "h",
				},
				json: {
					type: "boolean",
				},
			},
			strict: false,
			allowPositionals: true,
		});

		return {
			subcommand: "list",
			listOptions: {
				help: values.help as boolean | undefined,
				json: values.json as boolean | undefined,
			},
		};
	}

	if (subcommand === "inspect") {
		const { values, positionals } = parseArgs({
			args: args.slice(1),
			options: {
				help: {
					type: "boolean",
					short: "h",
				},
				json: {
					type: "boolean",
				},
			},
			strict: false,
			allowPositionals: true,
		});

		return {
			subcommand: "inspect",
			inspectOptions: {
				name: positionals[0],
				help: values.help as boolean | undefined,
				json: values.json as boolean | undefined,
			},
		};
	}

	if (subcommand === "drop") {
		const { values, positionals } = parseArgs({
			args: args.slice(1),
			options: {
				help: {
					type: "boolean",
					short: "h",
				},
				force: {
					type: "boolean",
					short: "y",
				},
			},
			strict: false,
			allowPositionals: true,
		});

		return {
			subcommand: "drop",
			dropOptions: {
				name: positionals[0],
				help: values.help as boolean | undefined,
				force: values.force as boolean | undefined,
			},
		};
	}

	return { help: true };
}

/**
 * Parse create subcommand arguments
 */
export function parseCreateArgs(args: string[]): CollectionCreateOptions {
	const { values, positionals } = parseArgs({
		args,
		options: {
			vector: {
				type: "string",
				multiple: true,
			},
			field: {
				type: "string",
				multiple: true,
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
		name: positionals[0],
		vectors: (values.vector as string[] | undefined) ?? [],
		fields: (values.field as string[] | undefined) ?? [],
		help: values.help as boolean | undefined,
	};
}

/**
 * Display help for collection command
 */
export function showCollectionHelp(): void {
	console.log(`zvec collection - Manage collections

USAGE:
  zvec collection <SUBCOMMAND> [OPTIONS]

SUBCOMMANDS:
  create <NAME>     Create a new collection
  list              List all collections
  inspect <NAME>    View collection schema and stats
  drop <NAME>       Delete a collection

OPTIONS:
  -h, --help        Show this help message

EXAMPLES:
  zvec collection create mycol --vector embedding:1536
  zvec collection list
  zvec collection inspect mycol
  zvec collection drop mycol --force

Run 'zvec collection <SUBCOMMAND> --help' for subcommand-specific help.
`);
}

/**
 * Display help for list subcommand
 */
export function showListHelp(): void {
	console.log(`zvec collection list - List all collections

USAGE:
  zvec collection list [OPTIONS]
  zvec ls [OPTIONS]

OPTIONS:
  --json      Output as JSON
  -h, --help  Show this help message

OUTPUT:
  Default: Table with columns (name, documents, vectors, created)
  JSON: Array of collection objects

EXAMPLES:
  zvec collection list
  zvec ls
  zvec collection list --json
`);
}

/**
 * Display help for inspect subcommand
 */
export function showInspectHelp(): void {
	console.log(`zvec collection inspect - View collection schema and stats

USAGE:
  zvec collection inspect <NAME> [OPTIONS]
  zvec inspect <NAME> [OPTIONS]

OPTIONS:
  --json      Output as JSON
  -h, --help  Show this help message

OUTPUT:
  Default: Formatted schema with field info and collection stats
  JSON: Full collection schema object

EXAMPLES:
  zvec collection inspect mycol
  zvec inspect mycol
  zvec inspect mycol --json
`);
}

/**
 * Display help for create subcommand
 */
export function showCreateHelp(): void {
	console.log(`zvec collection create - Create a new collection

USAGE:
  zvec collection create <NAME> [OPTIONS]

OPTIONS:
  --vector <NAME>:<DIM>   Add a vector field with dimension (can be repeated)
  --field <NAME>:<TYPE>   Add a scalar field (can be repeated)
  -h, --help              Show this help message

VECTOR FIELDS:
  Specify vector fields with name and dimension.
  If no vector field is specified, defaults to "embedding" with dimension 1536.

SCALAR FIELD TYPES:
  string, int32, int64, float, double, bool

EXAMPLES:
  zvec collection create documents
  zvec collection create images --vector embedding:512
  zvec collection create articles --vector embedding:1536 --field title:string --field year:int32
  zvec collection create media --vector content:768 --vector thumbnail:128
`);
}

/**
 * Parse vector specification: "name:dimension"
 */
function parseVectorSpec(
	spec: string,
): { name: string; dimension: number } | null {
	const parts = spec.split(":");
	if (parts.length !== 2) {
		return null;
	}

	const name = parts[0];
	const dimension = Number.parseInt(parts[1] ?? "", 10);

	if (!name || Number.isNaN(dimension) || dimension <= 0) {
		return null;
	}

	return { name, dimension };
}

/**
 * Parse field specification: "name:type"
 */
function parseFieldSpec(
	spec: string,
): { name: string; type: SchemaField["type"] } | null {
	const parts = spec.split(":");
	if (parts.length !== 2) {
		return null;
	}

	const name = parts[0];
	const type = parts[1] as SchemaField["type"];

	const validTypes: SchemaField["type"][] = [
		"string",
		"int32",
		"int64",
		"float",
		"double",
		"bool",
	];
	if (!name || !validTypes.includes(type)) {
		return null;
	}

	return { name, type };
}

/**
 * Get collection file path
 */
async function getCollectionPath(collectionName: string): Promise<string> {
	const config = await readConfig();
	return path.join(
		config.storage.path,
		"collections",
		`${collectionName}.json`,
	);
}

/**
 * Ensure collections directory exists
 */
async function ensureCollectionsDir(): Promise<void> {
	const config = await readConfig();
	const collectionsDir = path.join(config.storage.path, "collections");
	const dir = Bun.file(collectionsDir);
	if (!(await dir.exists())) {
		Bun.spawnSync(["mkdir", "-p", collectionsDir]);
	}
}

/**
 * Check if collection exists
 */
export async function collectionExists(
	collectionName: string,
): Promise<boolean> {
	const collectionPath = await getCollectionPath(collectionName);
	const file = Bun.file(collectionPath);
	return file.exists();
}

/**
 * Create collection file
 */
export async function createCollectionFile(
	collectionName: string,
	schema: CollectionSchema,
): Promise<void> {
	const collectionPath = await getCollectionPath(collectionName);
	await Bun.write(collectionPath, JSON.stringify(schema, null, 2));
}

/**
 * Execute create subcommand
 */
async function create(options: CollectionCreateOptions): Promise<number> {
	if (options.help) {
		showCreateHelp();
		return 0;
	}

	if (!options.name) {
		console.error("Error: Missing collection name");
		console.error("Usage: zvec collection create <NAME> [OPTIONS]");
		return 1;
	}

	// Validate collection name (alphanumeric, underscore, hyphen)
	if (!/^[a-zA-Z0-9_-]+$/.test(options.name)) {
		console.error(
			"Error: Invalid collection name. Use only letters, numbers, underscore, and hyphen.",
		);
		return 1;
	}

	// Check if collection already exists
	if (await collectionExists(options.name)) {
		console.error(`Error: Collection '${options.name}' already exists`);
		return 1;
	}

	// Parse vector fields
	const vectorFields: VectorField[] = [];
	for (const spec of options.vectors) {
		const parsed = parseVectorSpec(spec);
		if (!parsed) {
			console.error(`Error: Invalid vector specification: ${spec}`);
			console.error("Expected format: --vector <name>:<dimension>");
			return 1;
		}
		vectorFields.push(parsed);
	}

	// Default vector field if none specified
	if (vectorFields.length === 0) {
		vectorFields.push({ name: "embedding", dimension: 1536 });
	}

	// Parse scalar fields
	const scalarFields: SchemaField[] = [];
	for (const spec of options.fields) {
		const parsed = parseFieldSpec(spec);
		if (!parsed) {
			console.error(`Error: Invalid field specification: ${spec}`);
			console.error(
				"Expected format: --field <name>:<type> (types: string, int32, int64, float, double, bool)",
			);
			return 1;
		}
		scalarFields.push(parsed);
	}

	// Create schema
	const schema: CollectionSchema = {
		name: options.name,
		fields: scalarFields,
		vectors: vectorFields,
		created: new Date().toISOString(),
	};

	// Write collection file
	await ensureCollectionsDir();
	await createCollectionFile(options.name, schema);

	// Display success message
	console.log(`✓ Created collection '${options.name}'`);
	console.log("");
	console.log("Vector fields:");
	for (const v of vectorFields) {
		console.log(`  ${v.name}: dimension ${v.dimension}`);
	}

	if (scalarFields.length > 0) {
		console.log("");
		console.log("Scalar fields:");
		for (const f of scalarFields) {
			console.log(`  ${f.name}: ${f.type}`);
		}
	}

	return 0;
}

/**
 * Get collections directory path
 */
async function getCollectionsDir(): Promise<string> {
	const config = await readConfig();
	return path.join(config.storage.path, "collections");
}

/**
 * List all collections
 */
interface CollectionInfo {
	name: string;
	documents: number;
	vectors: number;
	created: string;
}

async function list(options: {
	help?: boolean;
	json?: boolean;
}): Promise<number> {
	if (options.help) {
		showListHelp();
		return 0;
	}

	const collectionsDir = await getCollectionsDir();

	// Check if collections directory exists
	if (!existsSync(collectionsDir)) {
		if (options.json) {
			console.log("[]");
		} else {
			console.log("No collections found. Run 'zvec init' first.");
		}
		return 0;
	}

	// Read all JSON files in the collections directory
	const globber = new Bun.Glob("*.json");
	const collectionFiles: CollectionInfo[] = [];

	for await (const file of globber.scan({ cwd: collectionsDir })) {
		const filePath = path.join(collectionsDir, file);
		const content = Bun.file(filePath);

		if (await content.exists()) {
			try {
				const schema = (await content.json()) as CollectionSchema;
				collectionFiles.push({
					name: schema.name,
					documents: 0, // Document counting not implemented yet
					vectors: schema.vectors.length,
					created: schema.created,
				});
			} catch {
				// Skip files that can't be parsed
				console.error(`Warning: Could not parse ${file}`);
			}
		}
	}

	// Sort by name
	collectionFiles.sort((a, b) => a.name.localeCompare(b.name));

	if (options.json) {
		console.log(JSON.stringify(collectionFiles, null, 2));
	} else {
		if (collectionFiles.length === 0) {
			console.log("No collections found.");
			return 0;
		}

		// Calculate column widths
		const nameWidth = Math.max(4, ...collectionFiles.map((c) => c.name.length));
		const docsWidth = Math.max(
			9,
			...collectionFiles.map((c) => c.documents.toString().length),
		);
		const vecsWidth = Math.max(
			7,
			...collectionFiles.map((c) => c.vectors.toString().length),
		);

		// Print header
		console.log(
			`${"NAME".padEnd(nameWidth)}  ${"DOCUMENTS".padStart(docsWidth)}  ${"VECTORS".padStart(vecsWidth)}  CREATED`,
		);
		console.log("-".repeat(nameWidth + docsWidth + vecsWidth + 30));

		// Print rows
		for (const col of collectionFiles) {
			const createdDate = new Date(col.created).toLocaleDateString();
			console.log(
				`${col.name.padEnd(nameWidth)}  ${col.documents.toString().padStart(docsWidth)}  ${col.vectors.toString().padStart(vecsWidth)}  ${createdDate}`,
			);
		}
	}

	return 0;
}

/**
 * Inspect a collection - show schema and stats
 */
async function inspect(options: {
	name?: string;
	help?: boolean;
	json?: boolean;
}): Promise<number> {
	if (options.help) {
		showInspectHelp();
		return 0;
	}

	if (!options.name) {
		console.error("Error: Missing collection name");
		console.error("Usage: zvec collection inspect <NAME> [OPTIONS]");
		return 1;
	}

	// Check if collection exists
	const collectionPath = await getCollectionPath(options.name);
	const file = Bun.file(collectionPath);

	if (!(await file.exists())) {
		console.error(`Error: Collection '${options.name}' not found`);
		return 1;
	}

	// Read collection schema
	let schema: CollectionSchema;
	try {
		schema = (await file.json()) as CollectionSchema;
	} catch {
		console.error(`Error: Could not parse collection '${options.name}'`);
		return 1;
	}

	// Get file size for stats
	const stats = await file.stat();
	const fileSize = stats?.size ?? 0;

	// Format file size
	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	if (options.json) {
		// Output JSON format with stats
		const output = {
			...schema,
			stats: {
				documentCount: 0, // Document counting not implemented yet
				sizeBytes: fileSize,
				sizeFormatted: formatSize(fileSize),
			},
		};
		console.log(JSON.stringify(output, null, 2));
	} else {
		// Output formatted text
		console.log(`Collection: ${schema.name}`);
		console.log(`Created: ${new Date(schema.created).toLocaleString()}`);
		console.log(`Size: ${formatSize(fileSize)}`);
		console.log("");

		// Show vector fields
		console.log("Vector Fields:");
		for (const v of schema.vectors) {
			console.log(`  ${v.name}: dimension ${v.dimension}`);
		}

		// Show scalar fields
		if (schema.fields.length > 0) {
			console.log("");
			console.log("Scalar Fields:");
			for (const f of schema.fields) {
				console.log(`  ${f.name}: ${f.type}`);
			}
		} else {
			console.log("");
			console.log("Scalar Fields: (none defined)");
		}

		console.log("");
		console.log("Documents: 0 (not implemented)");
	}

	return 0;
}

/**
 * Execute collection command
 */
export async function collection(options: CollectionOptions): Promise<number> {
	if (options.help) {
		showCollectionHelp();
		return 0;
	}

	switch (options.subcommand) {
		case "create":
			if (!options.createOptions) {
				showCreateHelp();
				return 1;
			}
			return create(options.createOptions);

		case "list":
			if (!options.listOptions) {
				return list({ help: false });
			}
			return list(options.listOptions);

		case "inspect":
			if (!options.inspectOptions) {
				return inspect({ help: false });
			}
			return inspect(options.inspectOptions);

		case "drop":
			console.error("Error: 'drop' subcommand not yet implemented");
			return 1;

		default:
			showCollectionHelp();
			return 0;
	}
}
