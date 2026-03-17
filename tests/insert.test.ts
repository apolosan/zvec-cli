/**
 * Tests for insert command
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { collection, parseCollectionArgs } from "../src/commands/collection";
import { init, parseInitArgs } from "../src/commands/init";
import {
	insert,
	parseInsertArgs,
	showInsertHelp,
} from "../src/commands/insert";

describe("parseInsertArgs", () => {
	test("parses collection name", () => {
		const result = parseInsertArgs(["mycol"]);
		expect(result.collection).toBe("mycol");
	});

	test("parses --file option", () => {
		const result = parseInsertArgs(["mycol", "--file", "data.json"]);
		expect(result.file).toBe("data.json");
	});

	test("parses -f short option", () => {
		const result = parseInsertArgs(["mycol", "-f", "data.json"]);
		expect(result.file).toBe("data.json");
	});

	test("parses --id option", () => {
		const result = parseInsertArgs(["mycol", "--id", "doc1"]);
		expect(result.id).toBe("doc1");
	});

	test("parses --vector option", () => {
		const result = parseInsertArgs(["mycol", "--vector", "0.1,0.2,0.3"]);
		expect(result.vector).toBe("0.1,0.2,0.3");
	});

	test("parses multiple --field options", () => {
		const result = parseInsertArgs([
			"mycol",
			"--field",
			"title=Hello",
			"--field",
			"year=2024",
		]);
		expect(result.fields).toEqual(["title=Hello", "year=2024"]);
	});

	test("parses --vector-col option", () => {
		const result = parseInsertArgs(["mycol", "--vector-col", "embedding"]);
		expect(result.vectorCol).toBe("embedding");
	});

	test("parses --help flag", () => {
		const result = parseInsertArgs(["--help"]);
		expect(result.help).toBe(true);
	});

	test("parses -h short flag", () => {
		const result = parseInsertArgs(["-h"]);
		expect(result.help).toBe(true);
	});

	test("parses all options together", () => {
		const result = parseInsertArgs([
			"mycol",
			"--id",
			"doc1",
			"--vector",
			"0.1,0.2",
			"--field",
			"title=Test",
		]);
		expect(result.collection).toBe("mycol");
		expect(result.id).toBe("doc1");
		expect(result.vector).toBe("0.1,0.2");
		expect(result.fields).toEqual(["title=Test"]);
	});
});

describe("insert command", () => {
	let testDir: string;
	let originalZvecHome: string | undefined;

	beforeEach(() => {
		// Create temp directory for each test
		testDir = path.join(tmpdir(), `zvec-insert-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });

		// Set ZVEC_HOME for isolated testing
		originalZvecHome = process.env.ZVEC_HOME;
		process.env.ZVEC_HOME = testDir;
	});

	afterEach(() => {
		// Clean up
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}

		// Restore ZVEC_HOME
		if (originalZvecHome !== undefined) {
			process.env.ZVEC_HOME = originalZvecHome;
		} else {
			delete process.env.ZVEC_HOME;
		}
	});

	test("shows help", async () => {
		const result = await insert({ help: true });
		expect(result).toBe(0);
	});

	test("errors without collection name", async () => {
		const result = await insert({});
		expect(result).toBe(1);
	});

	test("errors when collection doesn't exist", async () => {
		const result = await insert({ collection: "nonexistent" });
		expect(result).toBe(1);
	});

	test("inserts single document via CLI args", async () => {
		// Initialize
		await init(parseInitArgs([]));

		// Create collection with 3-dimensional vector
		await collection(
			parseCollectionArgs(["create", "testcol", "--vector", "embedding:3"]),
		);

		// Insert document
		const result = await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
			fields: ["title=Hello", "year=2024"],
		});

		expect(result).toBe(0);

		// Verify document was created
		const docsPath = path.join(
			testDir,
			".zvec",
			"collections",
			"collections",
			"testcol.documents.jsonl",
		);
		expect(existsSync(docsPath)).toBe(true);

		const content = await Bun.file(docsPath).text();
		const lines = content.trim().split("\n");
		expect(lines.length).toBe(1);

		const doc = JSON.parse(lines[0] ?? "");
		expect(doc.id).toBe("doc1");
		expect(doc.vectors.embedding).toEqual([0.1, 0.2, 0.3]);
		expect(doc.fields.title).toBe("Hello");
		expect(doc.fields.year).toBe(2024);
	});

	test("inserts document with numeric and boolean fields", async () => {
		await init(parseInitArgs([]));
		await collection(
			parseCollectionArgs(["create", "testcol", "--vector", "embedding:3"]),
		);

		const result = await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
			fields: ["count=42", "active=true", "score=3.14"],
		});

		expect(result).toBe(0);

		const docsPath = path.join(
			testDir,
			".zvec",
			"collections",
			"collections",
			"testcol.documents.jsonl",
		);
		const content = await Bun.file(docsPath).text();
		const doc = JSON.parse(content.trim());

		expect(doc.fields.count).toBe(42);
		expect(doc.fields.active).toBe(true);
		expect(doc.fields.score).toBe(3.14);
	});

	test("errors on invalid vector format", async () => {
		await init(parseInitArgs([]));
		await collection(parseCollectionArgs(["create", "testcol"]));

		const result = await insert({
			collection: "testcol",
			id: "doc1",
			vector: "invalid,values,here",
		});

		expect(result).toBe(1);
	});

	test("errors on missing collection", async () => {
		const result = await insert({
			collection: "nonexistent",
			id: "doc1",
			vector: "0.1,0.2,0.3",
		});

		expect(result).toBe(1);
	});

	test("inserts from JSON file with array", async () => {
		await init(parseInitArgs([]));
		await collection(
			parseCollectionArgs(["create", "testcol", "--vector", "embedding:3"]),
		);

		// Create test JSON file
		const jsonPath = path.join(testDir, "data.json");
		const data = [
			{ id: "doc1", embedding: [0.1, 0.2, 0.3], title: "First" },
			{ id: "doc2", embedding: [0.4, 0.5, 0.6], title: "Second" },
		];
		writeFileSync(jsonPath, JSON.stringify(data));

		const result = await insert({
			collection: "testcol",
			file: jsonPath,
		});

		expect(result).toBe(0);

		const docsPath = path.join(
			testDir,
			".zvec",
			"collections",
			"collections",
			"testcol.documents.jsonl",
		);
		const content = await Bun.file(docsPath).text();
		const lines = content.trim().split("\n");
		expect(lines.length).toBe(2);

		const doc1 = JSON.parse(lines[0] ?? "");
		expect(doc1.id).toBe("doc1");
		expect(doc1.vectors.embedding).toEqual([0.1, 0.2, 0.3]);
		expect(doc1.fields.title).toBe("First");

		const doc2 = JSON.parse(lines[1] ?? "");
		expect(doc2.id).toBe("doc2");
		expect(doc2.vectors.embedding).toEqual([0.4, 0.5, 0.6]);
		expect(doc2.fields.title).toBe("Second");
	});

	test("inserts from JSON file with single object", async () => {
		await init(parseInitArgs([]));
		await collection(
			parseCollectionArgs(["create", "testcol", "--vector", "embedding:3"]),
		);

		const jsonPath = path.join(testDir, "data.json");
		const data = { id: "doc1", embedding: [0.1, 0.2, 0.3], title: "Test" };
		writeFileSync(jsonPath, JSON.stringify(data));

		const result = await insert({
			collection: "testcol",
			file: jsonPath,
		});

		expect(result).toBe(0);

		const docsPath = path.join(
			testDir,
			".zvec",
			"collections",
			"collections",
			"testcol.documents.jsonl",
		);
		const content = await Bun.file(docsPath).text();
		const lines = content.trim().split("\n");
		expect(lines.length).toBe(1);

		const doc = JSON.parse(lines[0] ?? "");
		expect(doc.id).toBe("doc1");
	});

	test("inserts from JSONL file", async () => {
		await init(parseInitArgs([]));
		await collection(
			parseCollectionArgs(["create", "testcol", "--vector", "embedding:2"]),
		);

		const jsonlPath = path.join(testDir, "data.jsonl");
		const data = [
			{ id: "doc1", embedding: [0.1, 0.2], title: "First" },
			{ id: "doc2", embedding: [0.3, 0.4], title: "Second" },
		];
		writeFileSync(jsonlPath, data.map((d) => JSON.stringify(d)).join("\n"));

		const result = await insert({
			collection: "testcol",
			file: jsonlPath,
		});

		expect(result).toBe(0);

		const docsPath = path.join(
			testDir,
			".zvec",
			"collections",
			"collections",
			"testcol.documents.jsonl",
		);
		const content = await Bun.file(docsPath).text();
		const lines = content.trim().split("\n");
		expect(lines.length).toBe(2);
	});

	test("inserts from CSV file", async () => {
		await init(parseInitArgs([]));
		await collection(
			parseCollectionArgs(["create", "testcol", "--vector", "embedding:3"]),
		);

		const csvPath = path.join(testDir, "data.csv");
		const csvContent = `id,title,embedding
doc1,First,"0.1,0.2,0.3"
doc2,Second,"0.4,0.5,0.6"`;
		writeFileSync(csvPath, csvContent);

		const result = await insert({
			collection: "testcol",
			file: csvPath,
			vectorCol: "embedding",
		});

		expect(result).toBe(0);

		const docsPath = path.join(
			testDir,
			".zvec",
			"collections",
			"collections",
			"testcol.documents.jsonl",
		);
		const content = await Bun.file(docsPath).text();
		const lines = content.trim().split("\n");
		expect(lines.length).toBe(2);

		const doc1 = JSON.parse(lines[0] ?? "");
		expect(doc1.id).toBe("doc1");
		expect(doc1.vectors.embedding).toEqual([0.1, 0.2, 0.3]);
		expect(doc1.fields.title).toBe("First");
	});

	test("errors on unsupported file format", async () => {
		await init(parseInitArgs([]));
		await collection(parseCollectionArgs(["create", "testcol"]));

		const result = await insert({
			collection: "testcol",
			file: "data.xml",
		});

		expect(result).toBe(1);
	});

	test("errors on non-existent file", async () => {
		await init(parseInitArgs([]));
		await collection(parseCollectionArgs(["create", "testcol"]));

		const result = await insert({
			collection: "testcol",
			file: "/nonexistent/file.json",
		});

		expect(result).toBe(1);
	});

	test("generates ID if not provided", async () => {
		await init(parseInitArgs([]));
		await collection(
			parseCollectionArgs(["create", "testcol", "--vector", "embedding:3"]),
		);

		const jsonPath = path.join(testDir, "data.json");
		const data = { embedding: [0.1, 0.2, 0.3], title: "Test" };
		writeFileSync(jsonPath, JSON.stringify(data));

		const result = await insert({
			collection: "testcol",
			file: jsonPath,
		});

		expect(result).toBe(0);

		const docsPath = path.join(
			testDir,
			".zvec",
			"collections",
			"collections",
			"testcol.documents.jsonl",
		);
		const content = await Bun.file(docsPath).text();
		const doc = JSON.parse(content.trim());

		expect(doc.id).toBeDefined();
		expect(doc.id).toMatch(/^doc_/);
	});

	test("validates vector dimension", async () => {
		await init(parseInitArgs([]));
		await collection(parseCollectionArgs(["create", "testcol"]));

		// Collection has default embedding:1536, but we provide only 3 values
		const jsonPath = path.join(testDir, "data.json");
		const data = { id: "doc1", embedding: [0.1, 0.2, 0.3] };
		writeFileSync(jsonPath, JSON.stringify(data));

		const result = await insert({
			collection: "testcol",
			file: jsonPath,
		});

		// Should error due to dimension mismatch
		expect(result).toBe(1);
	});

	test("validates vector dimension with custom dimension", async () => {
		await init(parseInitArgs([]));
		await collection(
			parseCollectionArgs(["create", "testcol", "--vector", "embedding:3"]),
		);

		const jsonPath = path.join(testDir, "data.json");
		const data = { id: "doc1", embedding: [0.1, 0.2, 0.3] };
		writeFileSync(jsonPath, JSON.stringify(data));

		const result = await insert({
			collection: "testcol",
			file: jsonPath,
		});

		// Should succeed with matching dimension
		expect(result).toBe(0);
	});

	test("errors on invalid field specification", async () => {
		await init(parseInitArgs([]));
		await collection(parseCollectionArgs(["create", "testcol"]));

		const result = await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
			fields: ["invalid_spec_without_equals"],
		});

		expect(result).toBe(1);
	});

	test("handles empty JSON array", async () => {
		await init(parseInitArgs([]));
		await collection(parseCollectionArgs(["create", "testcol"]));

		const jsonPath = path.join(testDir, "data.json");
		writeFileSync(jsonPath, "[]");

		const result = await insert({
			collection: "testcol",
			file: jsonPath,
		});

		expect(result).toBe(1);
	});

	test("inserts multiple documents with progress", async () => {
		await init(parseInitArgs([]));
		await collection(
			parseCollectionArgs(["create", "testcol", "--vector", "embedding:2"]),
		);

		// Create a file with 15 documents (triggers progress display)
		const jsonPath = path.join(testDir, "data.json");
		const data = [];
		for (let i = 0; i < 15; i++) {
			data.push({
				id: `doc${i}`,
				embedding: [i * 0.1, i * 0.2],
				title: `Document ${i}`,
			});
		}
		writeFileSync(jsonPath, JSON.stringify(data));

		const result = await insert({
			collection: "testcol",
			file: jsonPath,
		});

		expect(result).toBe(0);

		const docsPath = path.join(
			testDir,
			".zvec",
			"collections",
			"collections",
			"testcol.documents.jsonl",
		);
		const content = await Bun.file(docsPath).text();
		const lines = content.trim().split("\n");
		expect(lines.length).toBe(15);
	});
});

describe("showInsertHelp", () => {
	test("displays help without error", () => {
		expect(() => showInsertHelp()).not.toThrow();
	});
});
