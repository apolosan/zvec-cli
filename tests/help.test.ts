/**
 * Tests for global help and version commands
 */

import { describe, expect, test } from "bun:test";
import { main } from "../src/cli";

describe("Global Help and Version", () => {
	describe("--version flag", () => {
		test("shows version with --version", async () => {
			const originalLog = console.log;
			const logs: string[] = [];
			console.log = (msg: string) => logs.push(msg);

			const exitCode = await main(["--version"]);

			console.log = originalLog;

			expect(exitCode).toBe(0);
			expect(logs.length).toBe(1);
			expect(logs[0]).toMatch(/zvec version \d+\.\d+\.\d+/);
		});

		test("shows version with -v", async () => {
			const originalLog = console.log;
			const logs: string[] = [];
			console.log = (msg: string) => logs.push(msg);

			const exitCode = await main(["-v"]);

			console.log = originalLog;

			expect(exitCode).toBe(0);
			expect(logs.length).toBe(1);
			expect(logs[0]).toMatch(/zvec version \d+\.\d+\.\d+/);
		});
	});

	describe("--help flag", () => {
		test("shows global help with --help", async () => {
			const originalLog = console.log;
			const logs: string[] = [];
			console.log = (msg: string) => logs.push(msg);

			const exitCode = await main(["--help"]);

			console.log = originalLog;

			expect(exitCode).toBe(0);
			expect(logs.length).toBeGreaterThan(0);
			const helpText = logs.join("\n");

			// Check for essential sections
			expect(helpText).toContain("USAGE");
			expect(helpText).toContain("COMMANDS");
			expect(helpText).toContain("OPTIONS");

			// Check for known commands
			expect(helpText).toContain("init");

			// Check for examples
			expect(helpText).toContain("EXAMPLES");
		});

		test("shows global help with -h", async () => {
			const originalLog = console.log;
			const logs: string[] = [];
			console.log = (msg: string) => logs.push(msg);

			const exitCode = await main(["-h"]);

			console.log = originalLog;

			expect(exitCode).toBe(0);
			expect(logs.length).toBeGreaterThan(0);
			const helpText = logs.join("\n");
			expect(helpText).toContain("USAGE");
		});

		test("shows help when no arguments provided", async () => {
			const originalLog = console.log;
			const logs: string[] = [];
			console.log = (msg: string) => logs.push(msg);

			const exitCode = await main([]);

			console.log = originalLog;

			expect(exitCode).toBe(0);
			expect(logs.length).toBeGreaterThan(0);
			const helpText = logs.join("\n");
			expect(helpText).toContain("USAGE");
		});
	});

	describe("command-specific help", () => {
		test("shows init help with init --help", async () => {
			const originalLog = console.log;
			const logs: string[] = [];
			console.log = (msg: string) => logs.push(msg);

			const exitCode = await main(["init", "--help"]);

			console.log = originalLog;

			expect(exitCode).toBe(0);
			expect(logs.length).toBeGreaterThan(0);
			const helpText = logs.join("\n");

			// Check for init-specific help content
			expect(helpText).toContain("zvec init");
			expect(helpText).toContain("USAGE");
			expect(helpText).toContain("OPTIONS");
			expect(helpText).toContain("--path");

			// Check for examples
			expect(helpText).toContain("EXAMPLES");
		});

		test("shows init help with init -h", async () => {
			const originalLog = console.log;
			const logs: string[] = [];
			console.log = (msg: string) => logs.push(msg);

			const exitCode = await main(["init", "-h"]);

			console.log = originalLog;

			expect(exitCode).toBe(0);
			expect(logs.length).toBeGreaterThan(0);
			const helpText = logs.join("\n");
			expect(helpText).toContain("zvec init");
		});
	});
});
