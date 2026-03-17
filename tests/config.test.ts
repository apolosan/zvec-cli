/**
 * Tests for config command
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseConfigArgs, showConfigHelp } from "../src/commands/config";
import { readConfig, writeConfig } from "../src/config";

// Test helper to create temp directories
function createTempDir(): string {
	const tempDir = path.join(os.tmpdir(), `zvec-test-${Date.now()}`);
	fs.mkdirSync(tempDir, { recursive: true });
	return tempDir;
}

// Test helper to cleanup temp directories
function cleanupTempDir(dir: string): void {
	try {
		fs.rmSync(dir, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
}

describe("parseConfigArgs", () => {
	test("parses list subcommand", () => {
		const result = parseConfigArgs(["list"]);
		expect(result.subcommand).toBe("list");
	});

	test("defaults to list when no subcommand", () => {
		const result = parseConfigArgs([]);
		expect(result.subcommand).toBe("list");
	});

	test("parses get subcommand with key", () => {
		const result = parseConfigArgs(["get", "storage.path"]);
		expect(result.subcommand).toBe("get");
		expect(result.key).toBe("storage.path");
	});

	test("parses set subcommand with key and value", () => {
		const result = parseConfigArgs(["set", "storage.path", "./custom"]);
		expect(result.subcommand).toBe("set");
		expect(result.key).toBe("storage.path");
		expect(result.value).toBe("./custom");
	});

	test("parses --help option", () => {
		const result = parseConfigArgs(["--help"]);
		expect(result.help).toBe(true);
	});

	test("parses -h short option", () => {
		const result = parseConfigArgs(["-h"]);
		expect(result.help).toBe(true);
	});
});

describe("showConfigHelp", () => {
	test("does not throw", () => {
		expect(() => showConfigHelp()).not.toThrow();
	});
});

describe("config command integration", () => {
	let tempDir: string;
	let originalHome: string | undefined;

	beforeEach(() => {
		// Save original ZVEC_HOME
		originalHome = process.env.ZVEC_HOME;
		// Create temp dir and set as ZVEC_HOME
		tempDir = createTempDir();
		process.env.ZVEC_HOME = tempDir;
	});

	afterEach(() => {
		// Restore original ZVEC_HOME
		if (originalHome === undefined) {
			delete process.env.ZVEC_HOME;
		} else {
			process.env.ZVEC_HOME = originalHome;
		}
		// Cleanup temp dir
		cleanupTempDir(tempDir);
	});

	test("config get retrieves storage.path", async () => {
		await writeConfig({ storage: { path: "/test/storage" } });
		const cfg = await readConfig();
		expect(cfg.storage.path).toBe("/test/storage");
	});

	test("config set updates storage.path", async () => {
		await writeConfig({ storage: { path: "/original/path" } });
		await writeConfig({ storage: { path: "/new/path" } });

		const cfg = await readConfig();
		expect(cfg.storage.path).toBe("/new/path");
	});

	test("config list returns all values", async () => {
		await writeConfig({ storage: { path: "/custom/path" } });
		const cfg = await readConfig();

		expect(cfg.storage.path).toBe("/custom/path");
	});
});
