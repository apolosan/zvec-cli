/**
 * Tests for init command
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parseInitArgs, showInitHelp } from "../src/commands/init";
import {
	configExists,
	getConfigPath,
	getDefaultStoragePath,
	readConfig,
	writeConfig,
} from "../src/config";

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

describe("parseInitArgs", () => {
	test("parses --path option", () => {
		const result = parseInitArgs(["--path", "./custom-path"]);
		expect(result.path).toBe("./custom-path");
	});

	test("parses -p short option", () => {
		const result = parseInitArgs(["-p", "./custom-path"]);
		expect(result.path).toBe("./custom-path");
	});

	test("parses --help option", () => {
		const result = parseInitArgs(["--help"]);
		expect(result.help).toBe(true);
	});

	test("parses -h short option", () => {
		const result = parseInitArgs(["-h"]);
		expect(result.help).toBe(true);
	});

	test("returns empty options when no args provided", () => {
		const result = parseInitArgs([]);
		expect(result.path).toBeUndefined();
		expect(result.help).toBeUndefined();
	});
});

describe("showInitHelp", () => {
	test("does not throw", () => {
		expect(() => showInitHelp()).not.toThrow();
	});
});

describe("config", () => {
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

	test("getConfigPath returns path in HOME", () => {
		const configPath = getConfigPath();
		expect(configPath).toBe(path.join(tempDir, ".zvecrc"));
	});

	test("getDefaultStoragePath returns path in HOME", () => {
		const storagePath = getDefaultStoragePath();
		expect(storagePath).toBe(path.join(tempDir, ".zvec", "collections"));
	});

	test("configExists returns false when config doesn't exist", async () => {
		const exists = await configExists();
		expect(exists).toBe(false);
	});

	test("configExists returns true when config exists", async () => {
		await writeConfig({ storage: { path: "/test/path" } });
		const exists = await configExists();
		expect(exists).toBe(true);
	});

	test("writeConfig creates config file", async () => {
		const configPath = getConfigPath();
		await writeConfig({ storage: { path: "/test/path" } });

		const file = Bun.file(configPath);
		expect(await file.exists()).toBe(true);

		const content = await file.text();
		expect(content).toContain("storage:");
		expect(content).toContain("/test/path");
	});

	test("readConfig returns default when config doesn't exist", async () => {
		const config = await readConfig();
		expect(config.storage.path).toBe(getDefaultStoragePath());
	});

	test("readConfig reads existing config", async () => {
		await writeConfig({ storage: { path: "/custom/storage" } });
		const config = await readConfig();
		expect(config.storage.path).toBe("/custom/storage");
	});

	test("writeConfig is idempotent", async () => {
		await writeConfig({ storage: { path: "/path/one" } });
		await writeConfig({ storage: { path: "/path/two" } });

		const config = await readConfig();
		expect(config.storage.path).toBe("/path/two");
	});
});
