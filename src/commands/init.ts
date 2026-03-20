import * as path from "node:path";
import { parseArgs } from "node:util";
import { configExists, getDefaultStoragePath, writeConfig } from "../config";

export interface InitOptions {
	path?: string;
	help?: boolean;
}

export function parseInitArgs(args: string[]): InitOptions {
	const { values } = parseArgs({
		args,
		options: {
			path: {
				type: "string",
				short: "p",
			},
			help: {
				type: "boolean",
				short: "h",
			},
		},
		strict: false,
	});

	return {
		path: values.path as string | undefined,
		help: values.help as boolean | undefined,
	};
}

export function showInitHelp(): void {
	console.log(`zvec init - Initialize zvec storage

USAGE:
  zvec init [OPTIONS]

OPTIONS:
  -p, --path <PATH>  Custom storage path (default: ~/.zvec/collections/)
  -h, --help         Show this help message

EXAMPLES:
  zvec init                    Initialize with default path
  zvec init --path ./my-data   Initialize with custom path
`);
}

export async function init(options: InitOptions): Promise<number> {
	if (options.help) {
		showInitHelp();
		return 0;
	}

	const storagePath = options.path
		? path.resolve(options.path)
		: getDefaultStoragePath();

	console.log(`Initializing zvec storage at: ${storagePath}`);

	const storageDir = Bun.file(storagePath);
	if (!(await storageDir.exists())) {
		const result = Bun.spawnSync(["mkdir", "-p", storagePath]);
		if (result.exitCode !== 0) {
			console.error("Failed to create storage directory");
			return 1;
		}
		console.log("✓ Created storage directory");
	} else {
		console.log("✓ Storage directory already exists");
	}

	const collectionsPath = path.join(storagePath, "collections");
	const collectionsDir = Bun.file(collectionsPath);
	if (!(await collectionsDir.exists())) {
		const result = Bun.spawnSync(["mkdir", "-p", collectionsPath]);
		if (result.exitCode !== 0) {
			console.error("Failed to create collections directory");
			return 1;
		}
		console.log("✓ Created collections directory");
	}

	const configExisted = await configExists();
	await writeConfig({
		storage: {
			path: storagePath,
		},
	});

	if (configExisted) {
		console.log("✓ Updated configuration file (~/.zvecrc)");
	} else {
		console.log("✓ Created configuration file (~/.zvecrc)");
	}

	console.log("\n✓ Initialization complete!");
	return 0;
}
