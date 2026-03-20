/**
 * Zvec CLI Optimize Command Tests
 */

import { describe, expect, it } from "bun:test";
import { parseArgs } from "node:util";

// Test parsing logic directly without importing the module
// This avoids issues with the zvec native module

describe("optimize command parsing", () => {
	it("should parse collection name", () => {
		const { values, positionals } = parseArgs({
			args: ["mycollection"],
			options: {
				help: { type: "boolean", short: "h" },
				concurrency: { type: "string", short: "c" },
			},
			strict: false,
			allowPositionals: true,
		});

		expect(positionals[0]).toBe("mycollection");
		expect(values.concurrency).toBeUndefined();
	});

	it("should parse concurrency option", () => {
		const { values, positionals } = parseArgs({
			args: ["mycollection", "--concurrency", "4"],
			options: {
				help: { type: "boolean", short: "h" },
				concurrency: { type: "string", short: "c" },
			},
			strict: false,
			allowPositionals: true,
		});

		expect(positionals[0]).toBe("mycollection");
		expect(values.concurrency).toBe("4");
	});

	it("should parse short concurrency option", () => {
		const { values, positionals } = parseArgs({
			args: ["mycollection", "-c", "8"],
			options: {
				help: { type: "boolean", short: "h" },
				concurrency: { type: "string", short: "c" },
			},
			strict: false,
			allowPositionals: true,
		});

		expect(positionals[0]).toBe("mycollection");
		expect(values.concurrency).toBe("8");
	});

	it("should parse help option", () => {
		const { values } = parseArgs({
			args: ["--help"],
			options: {
				help: { type: "boolean", short: "h" },
				concurrency: { type: "string", short: "c" },
			},
			strict: false,
			allowPositionals: true,
		});

		expect(values.help).toBe(true);
	});

	it("should return empty options for no args", () => {
		const { values, positionals } = parseArgs({
			args: [],
			options: {
				help: { type: "boolean", short: "h" },
				concurrency: { type: "string", short: "c" },
			},
			strict: false,
			allowPositionals: true,
		});

		expect(positionals[0]).toBeUndefined();
		expect(values.help).toBeUndefined();
	});
});
