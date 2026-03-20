/**
 * Zvec CLI Search Command Tests
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { init } from "../src/commands/init";
import { insert } from "../src/commands/insert";
import type { SearchOptions } from "../src/commands/search";
import {
	parseSearchArgs,
	search,
	showSearchHelp,
} from "../src/commands/search";

// Test constants
const TEST_DIR = join(import.meta.dir, "test-search-temp");
const _ZVEC_HOME = TEST_DIR;

function cleanup(): void {
	try {
		rmSync(TEST_DIR, { recursive: true, force: true });
	} catch {
		// Ignore
	}
}

async function setupTestEnv(): Promise<void> {
	cleanup();
	mkdirSync(TEST_DIR, { recursive: true });
	process.env.ZVEC_HOME = TEST_DIR;
}

describe("parseSearchArgs", () => {
	it("should parse collection name", () => {
		const args = ["mycol"];
		const result = parseSearchArgs(args);
		expect(result.collection).toBe("mycol");
	});

	it("should parse vector", () => {
		const args = ["mycol", "--vector", "0.1,0.2,0.3"];
		const result = parseSearchArgs(args);
		expect(result.collection).toBe("mycol");
		expect(result.vector).toBe("0.1,0.2,0.3");
	});

	it("should parse vector with short flag", () => {
		const args = ["mycol", "-q", "0.1,0.2,0.3"];
		const result = parseSearchArgs(args);
		expect(result.vector).toBe("0.1,0.2,0.3");
	});

	it("should parse topk", () => {
		const args = ["mycol", "--vector", "0.1,0.2,0.3", "--topk", "5"];
		const result = parseSearchArgs(args);
		expect(result.topk).toBe(5);
	});

	it("should parse topk with short flag", () => {
		const args = ["mycol", "-q", "0.1,0.2,0.3", "-k", "5"];
		const result = parseSearchArgs(args);
		expect(result.topk).toBe(5);
	});

	it("should default topk to 10", () => {
		const args = ["mycol", "--vector", "0.1,0.2,0.3"];
		const result = parseSearchArgs(args);
		expect(result.topk).toBe(10);
	});

	it("should parse filter", () => {
		const args = [
			"mycol",
			"--vector",
			"0.1,0.2,0.3",
			"--filter",
			"year > 2000",
		];
		const result = parseSearchArgs(args);
		expect(result.filter).toBe("year > 2000");
	});

	it("should parse fields", () => {
		const args = [
			"mycol",
			"--vector",
			"0.1,0.2,0.3",
			"--fields",
			"title,author",
		];
		const result = parseSearchArgs(args);
		expect(result.fields).toEqual(["title", "author"]);
	});

	it("should parse fields with short flag", () => {
		const args = ["mycol", "-q", "0.1,0.2,0.3", "-F", "title,author"];
		const result = parseSearchArgs(args);
		expect(result.fields).toEqual(["title", "author"]);
	});

	it("should parse json flag", () => {
		const args = ["mycol", "--vector", "0.1,0.2,0.3", "--json"];
		const result = parseSearchArgs(args);
		expect(result.json).toBe(true);
	});

	it("should parse json flag with short flag", () => {
		const args = ["mycol", "-q", "0.1,0.2,0.3", "-j"];
		const result = parseSearchArgs(args);
		expect(result.json).toBe(true);
	});

	it("should parse vector-file", () => {
		const args = ["mycol", "--vector-file", "query.json"];
		const result = parseSearchArgs(args);
		expect(result.vectorFile).toBe("query.json");
	});

	it("should parse vector-file with short flag", () => {
		const args = ["mycol", "-f", "query.json"];
		const result = parseSearchArgs(args);
		expect(result.vectorFile).toBe("query.json");
	});

	it("should parse help flag", () => {
		const args = ["--help"];
		const result = parseSearchArgs(args);
		expect(result.help).toBe(true);
	});

	it("should parse all options together", () => {
		const args = [
			"mycol",
			"--vector",
			"0.1,0.2,0.3",
			"--topk",
			"5",
			"--filter",
			"year > 2000",
			"--fields",
			"title,author",
			"--json",
		];
		const result = parseSearchArgs(args);
		expect(result.collection).toBe("mycol");
		expect(result.vector).toBe("0.1,0.2,0.3");
		expect(result.topk).toBe(5);
		expect(result.filter).toBe("year > 2000");
		expect(result.fields).toEqual(["title", "author"]);
		expect(result.json).toBe(true);
	});
});

describe("showSearchHelp", () => {
	it("should display help text", () => {
		const originalLog = console.log;
		let output = "";
		console.log = (msg: string) => {
			output += `${msg}\n`;
		};

		showSearchHelp();

		console.log = originalLog;

		expect(output).toContain("zvec search");
		expect(output).toContain("--vector");
		expect(output).toContain("--topk");
		expect(output).toContain("--filter");
		expect(output).toContain("--fields");
		expect(output).toContain("--json");
	});
});

describe("search command integration", () => {
	beforeEach(async () => {
		await setupTestEnv();
	});

	it("should show help", async () => {
		const result = await search({ help: true } as SearchOptions);
		expect(result).toBe(0);
	});

	it("should error on missing collection name", async () => {
		const result = await search({
			vector: "0.1,0.2,0.3",
		} as SearchOptions);
		expect(result).toBe(1);
	});

	it("should error on missing query vector", async () => {
		const result = await search({
			collection: "mycol",
		} as SearchOptions);
		expect(result).toBe(1);
	});

	it("should error on non-existent collection", async () => {
		// Initialize first
		await init({} as never);

		const result = await search({
			collection: "nonexistent",
			vector: "0.1,0.2,0.3",
		} as SearchOptions);
		expect(result).toBe(1);
	});

	it("should return empty when no documents", async () => {
		await init({} as never);
		// Create collection
		await import("../src/cli.ts").then((m) =>
			m.main(["collection", "create", "testcol", "--vector", "embedding:3"]),
		);

		const result = await search({
			collection: "testcol",
			vector: "0.1,0.2,0.3",
		} as SearchOptions);
		expect(result).toBe(0);
	});

	it("should search and return results", async () => {
		// Initialize
		await init({} as never);

		// Create collection
		await import("../src/cli.ts").then((m) =>
			m.main([
				"collection",
				"create",
				"testcol",
				"--vector",
				"embedding:3",
				"--field",
				"title:string",
			]),
		);

		// Insert documents
		await insert({
			collection: "testcol",
			file: undefined,
			id: "doc1",
			vector: "1,0,0",
			fields: ["title=Doc One"],
		} as never);

		await insert({
			collection: "testcol",
			file: undefined,
			id: "doc2",
			vector: "0,1,0",
			fields: ["title=Doc Two"],
		} as never);

		await insert({
			collection: "testcol",
			file: undefined,
			id: "doc3",
			vector: "0,0,1",
			fields: ["title=Doc Three"],
		} as never);

		// Search with vector similar to doc1
		const result = await search({
			collection: "testcol",
			vector: "0.9,0.1,0",
			topk: 2,
		} as SearchOptions);

		expect(result).toBe(0);
	});

	it("should apply filter", async () => {
		await init({} as never);

		// Create collection
		await import("../src/cli.ts").then((m) =>
			m.main([
				"collection",
				"create",
				"testcol",
				"--vector",
				"embedding:3",
				"--field",
				"year:int32",
			]),
		);

		// Insert documents with year field
		await insert({
			collection: "testcol",
			file: undefined,
			id: "doc1",
			vector: "1,0,0",
			fields: ["year=2020"],
		} as never);

		await insert({
			collection: "testcol",
			file: undefined,
			id: "doc2",
			vector: "0,1,0",
			fields: ["year=2000"],
		} as never);

		// Search with filter
		const result = await search({
			collection: "testcol",
			vector: "1,0,0",
			filter: "year > 2010",
		} as SearchOptions);

		expect(result).toBe(0);
	});

	it("should output JSON", async () => {
		await init({} as never);

		// Create collection
		await import("../src/cli.ts").then((m) =>
			m.main([
				"collection",
				"create",
				"testcol",
				"--vector",
				"embedding:3",
				"--field",
				"title:string",
			]),
		);

		// Insert document
		await insert({
			collection: "testcol",
			file: undefined,
			id: "doc1",
			vector: "1,0,0",
			fields: ["title=Test"],
		} as never);

		// Search with JSON output
		const result = await search({
			collection: "testcol",
			vector: "1,0,0",
			json: true,
		} as SearchOptions);

		expect(result).toBe(0);
	});

	it("should handle vector file", async () => {
		await init({} as never);

		// Create collection
		await import("../src/cli.ts").then((m) =>
			m.main(["collection", "create", "testcol", "--vector", "embedding:3"]),
		);

		// Insert document
		await insert({
			collection: "testcol",
			file: undefined,
			id: "doc1",
			vector: "1,0,0",
		} as never);

		// Create vector file
		const vectorFile = join(TEST_DIR, "query.json");
		writeFileSync(vectorFile, JSON.stringify([1, 0, 0]));

		// Search with vector file
		const result = await search({
			collection: "testcol",
			vectorFile: vectorFile,
		} as SearchOptions);

		expect(result).toBe(0);

		// Cleanup vector file
		try {
			rmSync(vectorFile);
		} catch {
			// Ignore
		}
	});

	it("should error on dimension mismatch", async () => {
		await init({} as never);

		// Create collection with 3-dimensional vectors
		await import("../src/cli.ts").then((m) =>
			m.main(["collection", "create", "testcol", "--vector", "embedding:3"]),
		);

		// Search with 4-dimensional vector
		const result = await search({
			collection: "testcol",
			vector: "0.1,0.2,0.3,0.4",
		} as SearchOptions);

		expect(result).toBe(1);
	});

	it("should error on invalid filter expression", async () => {
		await init({} as never);

		await import("../src/cli.ts").then((m) =>
			m.main(["collection", "create", "testcol", "--vector", "embedding:3"]),
		);

		const result = await search({
			collection: "testcol",
			vector: "0.1,0.2,0.3",
			filter: "invalid",
		} as SearchOptions);

		expect(result).toBe(1);
	});

	it("should error on filter field not in schema", async () => {
		await init({} as never);

		await import("../src/cli.ts").then((m) =>
			m.main(["collection", "create", "testcol", "--vector", "embedding:3"]),
		);

		const result = await search({
			collection: "testcol",
			vector: "0.1,0.2,0.3",
			filter: "nonexistent > 100",
		} as SearchOptions);

		expect(result).toBe(1);
	});
});
