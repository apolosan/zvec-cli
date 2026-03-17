/**
 * Tests for collection command
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import * as os from "node:os";
import * as path from "node:path";
import {
	collection,
	collectionExists,
	parseCollectionArgs,
	parseCreateArgs,
} from "../src/commands/collection";
import { readConfig } from "../src/config";

// Use temp directory for tests
const TEST_HOME = path.join(os.tmpdir(), `zvec-collection-test-${Date.now()}`);

beforeAll(async () => {
	// Set ZVEC_HOME for all tests
	process.env.ZVEC_HOME = TEST_HOME;

	// Create test directories (storage path is derived from ZVEC_HOME)
	const config = await readConfig();
	Bun.spawnSync(["mkdir", "-p", config.storage.path]);
});

afterAll(async () => {
	// Cleanup temp directory
	Bun.spawnSync(["rm", "-rf", TEST_HOME]);
	delete process.env.ZVEC_HOME;
});

describe("parseCreateArgs", () => {
	test("parses collection name", () => {
		const result = parseCreateArgs(["mycol"]);
		expect(result.name).toBe("mycol");
		expect(result.vectors).toEqual([]);
		expect(result.fields).toEqual([]);
	});

	test("parses single vector field", () => {
		const result = parseCreateArgs(["mycol", "--vector", "embedding:1536"]);
		expect(result.name).toBe("mycol");
		expect(result.vectors).toEqual(["embedding:1536"]);
	});

	test("parses multiple vector fields", () => {
		const result = parseCreateArgs([
			"mycol",
			"--vector",
			"embedding:1536",
			"--vector",
			"thumbnail:512",
		]);
		expect(result.vectors).toEqual(["embedding:1536", "thumbnail:512"]);
	});

	test("parses scalar fields", () => {
		const result = parseCreateArgs([
			"mycol",
			"--field",
			"title:string",
			"--field",
			"year:int32",
		]);
		expect(result.fields).toEqual(["title:string", "year:int32"]);
	});

	test("parses help flag", () => {
		const result = parseCreateArgs(["--help"]);
		expect(result.help).toBe(true);
	});
});

describe("parseCollectionArgs", () => {
	test("parses create subcommand", () => {
		const result = parseCollectionArgs(["create", "mycol"]);
		expect(result.subcommand).toBe("create");
		expect(result.createOptions?.name).toBe("mycol");
	});

	test("parses list subcommand", () => {
		const result = parseCollectionArgs(["list"]);
		expect(result.subcommand).toBe("list");
	});

	test("parses inspect subcommand", () => {
		const result = parseCollectionArgs(["inspect", "mycol"]);
		expect(result.subcommand).toBe("inspect");
		expect(result.inspectOptions?.name).toBe("mycol");
	});

	test("parses drop subcommand", () => {
		const result = parseCollectionArgs(["drop", "mycol", "--force"]);
		expect(result.subcommand).toBe("drop");
		expect(result.dropOptions?.name).toBe("mycol");
		expect(result.dropOptions?.force).toBe(true);
	});

	test("returns help when no subcommand", () => {
		const result = parseCollectionArgs([]);
		expect(result.subcommand).toBeUndefined();
	});
});

describe("collection command - create", () => {
	test("shows help with --help flag", async () => {
		const result = await collection({
			subcommand: "create",
			createOptions: { name: "test", vectors: [], fields: [], help: true },
		});
		expect(result).toBe(0);
	});

	test("errors without collection name", async () => {
		const result = await collection({
			subcommand: "create",
			createOptions: { name: undefined, vectors: [], fields: [], help: false },
		});
		expect(result).toBe(1);
	});

	test("errors with invalid collection name", async () => {
		const result = await collection({
			subcommand: "create",
			createOptions: {
				name: "my collection!",
				vectors: [],
				fields: [],
				help: false,
			},
		});
		expect(result).toBe(1);
	});

	test("creates collection with default vector field", async () => {
		const colName = `test-default-${Date.now()}`;
		const result = await collection({
			subcommand: "create",
			createOptions: { name: colName, vectors: [], fields: [], help: false },
		});
		expect(result).toBe(0);

		// Verify collection exists
		expect(await collectionExists(colName)).toBe(true);

		// Verify schema
		const config = await readConfig();
		const collectionPath = path.join(
			config.storage.path,
			"collections",
			`${colName}.json`,
		);
		const file = Bun.file(collectionPath);
		const schema = await file.json();
		expect(schema.name).toBe(colName);
		expect(schema.vectors).toHaveLength(1);
		expect(schema.vectors[0].name).toBe("embedding");
		expect(schema.vectors[0].dimension).toBe(1536);
	});

	test("creates collection with custom vector field", async () => {
		const colName = `test-custom-vec-${Date.now()}`;
		const result = await collection({
			subcommand: "create",
			createOptions: {
				name: colName,
				vectors: ["content:768"],
				fields: [],
				help: false,
			},
		});
		expect(result).toBe(0);

		// Verify schema
		const config = await readConfig();
		const collectionPath = path.join(
			config.storage.path,
			"collections",
			`${colName}.json`,
		);
		const file = Bun.file(collectionPath);
		const schema = await file.json();
		expect(schema.vectors).toHaveLength(1);
		expect(schema.vectors[0].name).toBe("content");
		expect(schema.vectors[0].dimension).toBe(768);
	});

	test("creates collection with multiple vector fields", async () => {
		const colName = `test-multi-vec-${Date.now()}`;
		const result = await collection({
			subcommand: "create",
			createOptions: {
				name: colName,
				vectors: ["embedding:1536", "thumbnail:512"],
				fields: [],
				help: false,
			},
		});
		expect(result).toBe(0);

		// Verify schema
		const config = await readConfig();
		const collectionPath = path.join(
			config.storage.path,
			"collections",
			`${colName}.json`,
		);
		const file = Bun.file(collectionPath);
		const schema = await file.json();
		expect(schema.vectors).toHaveLength(2);
		expect(schema.vectors[0].name).toBe("embedding");
		expect(schema.vectors[0].dimension).toBe(1536);
		expect(schema.vectors[1].name).toBe("thumbnail");
		expect(schema.vectors[1].dimension).toBe(512);
	});

	test("creates collection with scalar fields", async () => {
		const colName = `test-scalar-${Date.now()}`;
		const result = await collection({
			subcommand: "create",
			createOptions: {
				name: colName,
				vectors: [],
				fields: ["title:string", "year:int32", "score:float"],
				help: false,
			},
		});
		expect(result).toBe(0);

		// Verify schema
		const config = await readConfig();
		const collectionPath = path.join(
			config.storage.path,
			"collections",
			`${colName}.json`,
		);
		const file = Bun.file(collectionPath);
		const schema = await file.json();
		expect(schema.fields).toHaveLength(3);
		expect(schema.fields[0].name).toBe("title");
		expect(schema.fields[0].type).toBe("string");
		expect(schema.fields[1].name).toBe("year");
		expect(schema.fields[1].type).toBe("int32");
		expect(schema.fields[2].name).toBe("score");
		expect(schema.fields[2].type).toBe("float");
	});

	test("errors if collection already exists", async () => {
		const colName = `test-exists-${Date.now()}`;

		// Create first
		await collection({
			subcommand: "create",
			createOptions: { name: colName, vectors: [], fields: [], help: false },
		});

		// Try to create again
		const result = await collection({
			subcommand: "create",
			createOptions: { name: colName, vectors: [], fields: [], help: false },
		});
		expect(result).toBe(1);
	});

	test("errors with invalid vector specification", async () => {
		const result = await collection({
			subcommand: "create",
			createOptions: {
				name: "test-invalid-vec",
				vectors: ["invalid"],
				fields: [],
				help: false,
			},
		});
		expect(result).toBe(1);
	});

	test("errors with invalid field type", async () => {
		const result = await collection({
			subcommand: "create",
			createOptions: {
				name: "test-invalid-field",
				vectors: [],
				fields: ["title:invalidtype"],
				help: false,
			},
		});
		expect(result).toBe(1);
	});

	test("errors with invalid dimension", async () => {
		const result = await collection({
			subcommand: "create",
			createOptions: {
				name: "test-invalid-dim",
				vectors: ["embedding:abc"],
				fields: [],
				help: false,
			},
		});
		expect(result).toBe(1);
	});
});

describe("collection command - other subcommands", () => {
	test("list shows help with --help flag", async () => {
		const result = await collection({
			subcommand: "list",
			listOptions: { help: true },
		});
		expect(result).toBe(0);
	});

	test("list returns 0 with empty collections", async () => {
		// Save original ZVEC_HOME
		const originalHome = process.env.ZVEC_HOME;

		// Use a fresh temp directory
		const emptyHome = path.join(os.tmpdir(), `zvec-empty-${Date.now()}`);
		process.env.ZVEC_HOME = emptyHome;

		const result = await collection({
			subcommand: "list",
			listOptions: { help: false },
		});
		expect(result).toBe(0);

		// Cleanup and restore
		Bun.spawnSync(["rm", "-rf", emptyHome]);
		process.env.ZVEC_HOME = originalHome;
	});

	test("list outputs JSON with --json flag", async () => {
		// Create a collection first
		const colName = `test-list-json-${Date.now()}`;
		await collection({
			subcommand: "create",
			createOptions: { name: colName, vectors: [], fields: [], help: false },
		});

		const result = await collection({
			subcommand: "list",
			listOptions: { help: false, json: true },
		});
		expect(result).toBe(0);
	});

	test("list shows created collections", async () => {
		// Create a collection
		const colName = `test-list-table-${Date.now()}`;
		await collection({
			subcommand: "create",
			createOptions: { name: colName, vectors: [], fields: [], help: false },
		});

		const result = await collection({
			subcommand: "list",
			listOptions: { help: false },
		});
		expect(result).toBe(0);
	});

	test("inspect shows schema for existing collection", async () => {
		// Create a collection first
		const colName = `test-inspect-${Date.now()}`;
		await collection({
			subcommand: "create",
			createOptions: {
				name: colName,
				vectors: ["embedding:768"],
				fields: ["title:string", "year:int32"],
				help: false,
			},
		});

		const result = await collection({
			subcommand: "inspect",
			inspectOptions: { name: colName, help: false },
		});
		expect(result).toBe(0);
	});

	test("inspect errors for non-existent collection", async () => {
		const result = await collection({
			subcommand: "inspect",
			inspectOptions: { name: "non-existent-collection", help: false },
		});
		expect(result).toBe(1);
	});

	test("inspect errors without collection name", async () => {
		const result = await collection({
			subcommand: "inspect",
			inspectOptions: { name: undefined, help: false },
		});
		expect(result).toBe(1);
	});

	test("inspect shows help with --help flag", async () => {
		const result = await collection({
			subcommand: "inspect",
			inspectOptions: { help: true },
		});
		expect(result).toBe(0);
	});

	test("inspect outputs JSON with --json flag", async () => {
		// Create a collection first
		const colName = `test-inspect-json-${Date.now()}`;
		await collection({
			subcommand: "create",
			createOptions: {
				name: colName,
				vectors: ["embedding:512"],
				fields: ["content:string"],
				help: false,
			},
		});

		const result = await collection({
			subcommand: "inspect",
			inspectOptions: { name: colName, help: false, json: true },
		});
		expect(result).toBe(0);
	});

	test("drop returns not implemented", async () => {
		const result = await collection({
			subcommand: "drop",
			dropOptions: { name: "test", help: false, force: true },
		});
		expect(result).toBe(1);
	});
});
