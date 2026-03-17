/**
 * Tests for delete command
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { collection, parseCollectionArgs } from "../src/commands/collection";
import {
	deleteDocuments,
	evaluateFilter,
	getAllDocuments,
	parseDeleteArgs,
	parseFilter,
	showDeleteHelp,
} from "../src/commands/delete";
import { init, parseInitArgs } from "../src/commands/init";
import { insert } from "../src/commands/insert";

describe("parseDeleteArgs", () => {
	test("parses collection name", () => {
		const result = parseDeleteArgs(["mycol", "--id", "doc1"]);
		expect(result.collection).toBe("mycol");
	});

	test("parses --id flag", () => {
		const result = parseDeleteArgs(["mycol", "--id", "doc1"]);
		expect(result.id).toBe("doc1");
	});

	test("parses --filter flag", () => {
		const result = parseDeleteArgs(["mycol", "--filter", "year < 1900"]);
		expect(result.filter).toBe("year < 1900");
	});

	test("parses --dry-run flag", () => {
		const result = parseDeleteArgs(["mycol", "--dry-run"]);
		expect(result.dryRun).toBe(true);
	});

	test("parses --help flag", () => {
		const result = parseDeleteArgs(["--help"]);
		expect(result.help).toBe(true);
	});

	test("parses -h short flag", () => {
		const result = parseDeleteArgs(["-h"]);
		expect(result.help).toBe(true);
	});

	test("collection is undefined when not provided", () => {
		const result = parseDeleteArgs([]);
		expect(result.collection).toBeUndefined();
	});

	test("parses all options together", () => {
		const result = parseDeleteArgs([
			"mycol",
			"--filter",
			"year < 1900",
			"--dry-run",
		]);
		expect(result.collection).toBe("mycol");
		expect(result.filter).toBe("year < 1900");
		expect(result.dryRun).toBe(true);
	});
});

describe("parseFilter", () => {
	test("parses less-than operator with number", () => {
		const expr = parseFilter("year < 1900");
		expect(expr.field).toBe("year");
		expect(expr.operator).toBe("<");
		expect(expr.value).toBe(1900);
	});

	test("parses greater-than operator", () => {
		const expr = parseFilter("score > 0.5");
		expect(expr.field).toBe("score");
		expect(expr.operator).toBe(">");
		expect(expr.value).toBe(0.5);
	});

	test("parses less-than-or-equal operator", () => {
		const expr = parseFilter("count <= 10");
		expect(expr.operator).toBe("<=");
		expect(expr.value).toBe(10);
	});

	test("parses greater-than-or-equal operator", () => {
		const expr = parseFilter("score >= 0.8");
		expect(expr.operator).toBe(">=");
		expect(expr.value).toBe(0.8);
	});

	test("parses equality operator (=)", () => {
		const expr = parseFilter("status = active");
		expect(expr.operator).toBe("=");
		expect(expr.value).toBe("active");
	});

	test("parses equality operator (==)", () => {
		const expr = parseFilter("active == true");
		expect(expr.operator).toBe("==");
		expect(expr.value).toBe(true);
	});

	test("parses not-equal operator", () => {
		const expr = parseFilter("status != deleted");
		expect(expr.operator).toBe("!=");
		expect(expr.value).toBe("deleted");
	});

	test("parses boolean values", () => {
		const trueExpr = parseFilter("active = true");
		expect(trueExpr.value).toBe(true);

		const falseExpr = parseFilter("active = false");
		expect(falseExpr.value).toBe(false);
	});

	test("parses null value", () => {
		const expr = parseFilter("name = null");
		expect(expr.value).toBeNull();
	});

	test("parses string values that are not numbers", () => {
		const expr = parseFilter("title = hello");
		expect(expr.value).toBe("hello");
	});

	test("throws on invalid filter expression", () => {
		expect(() => parseFilter("invalid expression")).toThrow();
	});
});

describe("evaluateFilter", () => {
	const makeDoc = (fields: Record<string, unknown>) => ({
		id: "doc1",
		fields,
		vectors: {},
		created: "2024-01-01",
		updated: "2024-01-01",
	});

	test("evaluates < correctly", () => {
		const expr = parseFilter("year < 1900");
		expect(evaluateFilter(makeDoc({ year: 1850 }), expr)).toBe(true);
		expect(evaluateFilter(makeDoc({ year: 1900 }), expr)).toBe(false);
		expect(evaluateFilter(makeDoc({ year: 2000 }), expr)).toBe(false);
	});

	test("evaluates > correctly", () => {
		const expr = parseFilter("score > 0.5");
		expect(evaluateFilter(makeDoc({ score: 0.8 }), expr)).toBe(true);
		expect(evaluateFilter(makeDoc({ score: 0.5 }), expr)).toBe(false);
		expect(evaluateFilter(makeDoc({ score: 0.3 }), expr)).toBe(false);
	});

	test("evaluates <= correctly", () => {
		const expr = parseFilter("count <= 10");
		expect(evaluateFilter(makeDoc({ count: 10 }), expr)).toBe(true);
		expect(evaluateFilter(makeDoc({ count: 5 }), expr)).toBe(true);
		expect(evaluateFilter(makeDoc({ count: 11 }), expr)).toBe(false);
	});

	test("evaluates >= correctly", () => {
		const expr = parseFilter("score >= 0.8");
		expect(evaluateFilter(makeDoc({ score: 0.8 }), expr)).toBe(true);
		expect(evaluateFilter(makeDoc({ score: 0.9 }), expr)).toBe(true);
		expect(evaluateFilter(makeDoc({ score: 0.7 }), expr)).toBe(false);
	});

	test("evaluates = correctly", () => {
		const expr = parseFilter("status = active");
		expect(evaluateFilter(makeDoc({ status: "active" }), expr)).toBe(true);
		expect(evaluateFilter(makeDoc({ status: "inactive" }), expr)).toBe(false);
	});

	test("evaluates == correctly", () => {
		const expr = parseFilter("active == true");
		expect(evaluateFilter(makeDoc({ active: true }), expr)).toBe(true);
		expect(evaluateFilter(makeDoc({ active: false }), expr)).toBe(false);
	});

	test("evaluates != correctly", () => {
		const expr = parseFilter("status != deleted");
		expect(evaluateFilter(makeDoc({ status: "active" }), expr)).toBe(true);
		expect(evaluateFilter(makeDoc({ status: "deleted" }), expr)).toBe(false);
	});

	test("returns false when field not present", () => {
		const expr = parseFilter("missing < 100");
		expect(evaluateFilter(makeDoc({ year: 2000 }), expr)).toBe(false);
	});
});

describe("delete command", () => {
	let testDir: string;
	let originalZvecHome: string | undefined;

	beforeEach(async () => {
		testDir = path.join(tmpdir(), `zvec-delete-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });

		originalZvecHome = process.env.ZVEC_HOME;
		process.env.ZVEC_HOME = testDir;

		// Setup: init and create collection
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
		const result = await deleteDocuments({ help: true });
		expect(result).toBe(0);
	});

	test("errors without collection name", async () => {
		const result = await deleteDocuments({});
		expect(result).toBe(1);
	});

	test("errors without --id or --filter", async () => {
		const result = await deleteDocuments({ collection: "testcol" });
		expect(result).toBe(1);
	});

	test("errors when collection does not exist", async () => {
		const result = await deleteDocuments({
			collection: "nonexistent",
			id: "doc1",
		});
		expect(result).toBe(1);
	});

	test("errors when document not found by ID", async () => {
		await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
		});

		const result = await deleteDocuments({
			collection: "testcol",
			id: "nonexistent",
		});
		expect(result).toBe(1);
	});

	test("deletes single document by ID", async () => {
		await insert({ collection: "testcol", id: "doc1", vector: "0.1,0.2,0.3" });
		await insert({ collection: "testcol", id: "doc2", vector: "0.4,0.5,0.6" });

		const result = await deleteDocuments({
			collection: "testcol",
			id: "doc1",
		});
		expect(result).toBe(0);

		const remaining = await getAllDocuments("testcol");
		expect(remaining.length).toBe(1);
		expect(remaining[0]?.id).toBe("doc2");
	});

	test("shows count of deleted documents", async () => {
		await insert({ collection: "testcol", id: "doc1", vector: "0.1,0.2,0.3" });

		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: unknown[]) => {
			logs.push(args.map(String).join(" "));
		};

		const result = await deleteDocuments({
			collection: "testcol",
			id: "doc1",
		});
		console.log = originalLog;

		expect(result).toBe(0);
		expect(logs.join("\n")).toContain("1 document");
	});

	test("deletes by filter expression", async () => {
		await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
			fields: ["year=1850"],
		});
		await insert({
			collection: "testcol",
			id: "doc2",
			vector: "0.4,0.5,0.6",
			fields: ["year=2020"],
		});
		await insert({
			collection: "testcol",
			id: "doc3",
			vector: "0.7,0.8,0.9",
			fields: ["year=1800"],
		});

		const result = await deleteDocuments({
			collection: "testcol",
			filter: "year < 1900",
		});
		expect(result).toBe(0);

		const remaining = await getAllDocuments("testcol");
		expect(remaining.length).toBe(1);
		expect(remaining[0]?.id).toBe("doc2");
	});

	test("shows deleted count for filter", async () => {
		await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
			fields: ["year=1800"],
		});
		await insert({
			collection: "testcol",
			id: "doc2",
			vector: "0.4,0.5,0.6",
			fields: ["year=1850"],
		});

		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: unknown[]) => {
			logs.push(args.map(String).join(" "));
		};

		const result = await deleteDocuments({
			collection: "testcol",
			filter: "year < 1900",
		});
		console.log = originalLog;

		expect(result).toBe(0);
		expect(logs.join("\n")).toContain("2 documents");
	});

	test("dry-run shows what would be deleted without deleting", async () => {
		await insert({ collection: "testcol", id: "doc1", vector: "0.1,0.2,0.3" });
		await insert({ collection: "testcol", id: "doc2", vector: "0.4,0.5,0.6" });

		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: unknown[]) => {
			logs.push(args.map(String).join(" "));
		};

		const result = await deleteDocuments({
			collection: "testcol",
			id: "doc1",
			dryRun: true,
		});
		console.log = originalLog;

		expect(result).toBe(0);
		const output = logs.join("\n");
		expect(output).toContain("Would delete");
		expect(output).toContain("doc1");

		// Document should still exist
		const remaining = await getAllDocuments("testcol");
		expect(remaining.length).toBe(2);
	});

	test("dry-run with filter shows matching document IDs", async () => {
		await insert({
			collection: "testcol",
			id: "old-doc",
			vector: "0.1,0.2,0.3",
			fields: ["year=1800"],
		});
		await insert({
			collection: "testcol",
			id: "new-doc",
			vector: "0.4,0.5,0.6",
			fields: ["year=2020"],
		});

		const logs: string[] = [];
		const originalLog = console.log;
		console.log = (...args: unknown[]) => {
			logs.push(args.map(String).join(" "));
		};

		const result = await deleteDocuments({
			collection: "testcol",
			filter: "year < 1900",
			dryRun: true,
		});
		console.log = originalLog;

		expect(result).toBe(0);
		const output = logs.join("\n");
		expect(output).toContain("Would delete 1 document");
		expect(output).toContain("old-doc");
		expect(output).not.toContain("new-doc");

		// Nothing deleted
		const remaining = await getAllDocuments("testcol");
		expect(remaining.length).toBe(2);
	});

	test("filter matching 0 documents deletes nothing", async () => {
		await insert({
			collection: "testcol",
			id: "doc1",
			vector: "0.1,0.2,0.3",
			fields: ["year=2020"],
		});

		const result = await deleteDocuments({
			collection: "testcol",
			filter: "year < 1900",
		});
		expect(result).toBe(0);

		const remaining = await getAllDocuments("testcol");
		expect(remaining.length).toBe(1);
	});

	test("errors on invalid filter expression", async () => {
		const result = await deleteDocuments({
			collection: "testcol",
			filter: "not a valid filter",
		});
		expect(result).toBe(1);
	});

	test("getAllDocuments returns empty array when no documents exist", async () => {
		const docs = await getAllDocuments("testcol");
		expect(docs).toEqual([]);
	});
});

describe("showDeleteHelp", () => {
	test("displays help without error", () => {
		expect(() => showDeleteHelp()).not.toThrow();
	});
});
