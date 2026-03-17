/**
 * Tests for fetch command
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { collection, parseCollectionArgs } from "../src/commands/collection";
import {
	fetch,
	findDocumentById,
	parseFetchArgs,
	showFetchHelp,
} from "../src/commands/fetch";
import { init, parseInitArgs } from "../src/commands/init";
import { insert } from "../src/commands/insert";

describe("parseFetchArgs", () => {
	test("parses collection name", () => {
		const result = parseFetchArgs(["mycol", "doc1"]);
		expect(result.collection).toBe("mycol");
	});

	test("parses document ID", () => {
		const result = parseFetchArgs(["mycol", "doc1"]);
		expect(result.id).toBe("doc1");
	});

	test("parses --json flag", () => {
		const result = parseFetchArgs(["mycol", "doc1", "--json"]);
		expect(result.json).toBe(true);
	});

	test("parses --vector flag", () => {
		const result = parseFetchArgs(["mycol", "doc1", "--vector"]);
		expect(result.vector).toBe(true);
	});

	test("parses --help flag", () => {
		const result = parseFetchArgs(["--help"]);
		expect(result.help).toBe(true);
	});

	test("parses -h short flag", () => {
		const result = parseFetchArgs(["-h"]);
		expect(result.help).toBe(true);
	});

	test("parses all options together", () => {
		const result = parseFetchArgs(["mycol", "doc1", "--json", "--vector"]);
		expect(result.collection).toBe("mycol");
		expect(result.id).toBe("doc1");
		expect(result.json).toBe(true);
		expect(result.vector).toBe(true);
	});

	test("collection and id are undefined when not provided", () => {
		const result = parseFetchArgs([]);
		expect(result.collection).toBeUndefined();
		expect(result.id).toBeUndefined();
	});
});

describe("fetch command", () => {
	let testDir: string;
	let originalZvecHome: string | undefined;

	beforeEach(async () => {
		testDir = path.join(tmpdir(), `zvec-fetch-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });

		originalZvecHome = process.env.ZVEC_HOME;
		process.env.ZVEC_HOME = testDir;

		// Setup: init and create collection with documents
		await init(parseInitArgs([]));
		await collection(
			parseCollectionArgs(["create", "testcol", "--vector", "embedding:3"]),
		);
	});

	afterEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}

		if (originalZvecHome !== undefined) {
			process.env.ZVEC_HOME = originalZvecHome;
		} else {
			delete process.env.ZVEC_HOME;
		}
	});

	test("shows help", async () => {
		const result = await fetch({ help: true });
		expect(result).toBe(0);
	});

	test("errors without collection name", async () => {
		const result = await fetch({});
		expect(result).toBe(1);
	});

	test("errors without document ID", async () => {
		const result = await fetch({ collection: "testcol" });
		expect(result).toBe(1);
	});

	test("errors when collection does not exist", async () => {
		const result = await fetch({ collection: "nonexistent", id: "doc1" });
		expect(result).toBe(1);
	});

	test("errors when document not found", async () => {
		const result = await fetch({ collection: "testcol", id: "nonexistent" });
		expect(result).toBe(1);
	});

	test("fetches and displays document in table format", async () => {
		await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
			fields: ["title=Hello", "year=2024"],
		});

		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: unknown[]) => {
			logs.push(args.map(String).join(" "));
		};

		const result = await fetch({ collection: "testcol", id: "doc1" });

		console.log = originalLog;

		expect(result).toBe(0);
		const output = logs.join("\n");
		expect(output).toContain("doc1");
		expect(output).toContain("Hello");
		expect(output).toContain("2024");
		// Vectors should NOT appear by default
		expect(output).not.toContain("[vector]");
	});

	test("includes vectors with --vector flag in table format", async () => {
		await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
			fields: ["title=Hello"],
		});

		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: unknown[]) => {
			logs.push(args.map(String).join(" "));
		};

		const result = await fetch({
			collection: "testcol",
			id: "doc1",
			vector: true,
		});

		console.log = originalLog;

		expect(result).toBe(0);
		const output = logs.join("\n");
		expect(output).toContain("[vector]");
		expect(output).toContain("0.1");
	});

	test("outputs raw JSON with --json flag", async () => {
		await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
			fields: ["title=Hello"],
		});

		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: unknown[]) => {
			logs.push(args.map(String).join(" "));
		};

		const result = await fetch({
			collection: "testcol",
			id: "doc1",
			json: true,
		});

		console.log = originalLog;

		expect(result).toBe(0);
		const output = logs.join("\n");
		const parsed = JSON.parse(output);
		expect(parsed.id).toBe("doc1");
		expect(parsed.fields.title).toBe("Hello");
		// Vectors should NOT be in JSON output without --vector
		expect(parsed.vectors).toBeUndefined();
	});

	test("includes vectors in JSON with --json --vector flags", async () => {
		await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
			fields: ["title=Hello"],
		});

		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: unknown[]) => {
			logs.push(args.map(String).join(" "));
		};

		const result = await fetch({
			collection: "testcol",
			id: "doc1",
			json: true,
			vector: true,
		});

		console.log = originalLog;

		expect(result).toBe(0);
		const output = logs.join("\n");
		const parsed = JSON.parse(output);
		expect(parsed.id).toBe("doc1");
		expect(parsed.vectors).toBeDefined();
		expect(parsed.vectors.embedding).toEqual([0.1, 0.2, 0.3]);
	});

	test("fetches correct document when multiple exist", async () => {
		// Insert multiple documents
		await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
			fields: ["title=First"],
		});
		await insert({
			collection: "testcol",
			id: "doc2",
			vector: "0.4,0.5,0.6",
			fields: ["title=Second"],
		});
		await insert({
			collection: "testcol",
			id: "doc3",
			vector: "0.7,0.8,0.9",
			fields: ["title=Third"],
		});

		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: unknown[]) => {
			logs.push(args.map(String).join(" "));
		};

		const result = await fetch({
			collection: "testcol",
			id: "doc2",
			json: true,
			vector: true,
		});

		console.log = originalLog;

		expect(result).toBe(0);
		const parsed = JSON.parse(logs.join("\n"));
		expect(parsed.id).toBe("doc2");
		expect(parsed.fields.title).toBe("Second");
		expect(parsed.vectors.embedding).toEqual([0.4, 0.5, 0.6]);
	});

	test("errors on last document when ID not found after searching all", async () => {
		await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
		});

		const result = await fetch({ collection: "testcol", id: "missing" });
		expect(result).toBe(1);
	});

	test("findDocumentById returns null when collection has no documents", async () => {
		const doc = await findDocumentById("testcol", "doc1");
		expect(doc).toBeNull();
	});

	test("findDocumentById returns document by ID", async () => {
		await insert({
			collection: "testcol",
			id: "doc42",
			vector: "1.0,2.0,3.0",
			fields: ["title=Answer"],
		});

		const doc = await findDocumentById("testcol", "doc42");
		expect(doc).not.toBeNull();
		expect(doc?.id).toBe("doc42");
		expect(doc?.fields.title).toBe("Answer");
	});

	test("findDocumentById returns null for non-existent ID", async () => {
		await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
		});

		const doc = await findDocumentById("testcol", "does-not-exist");
		expect(doc).toBeNull();
	});
});

describe("showFetchHelp", () => {
	test("displays help without error", () => {
		expect(() => showFetchHelp()).not.toThrow();
	});
});
