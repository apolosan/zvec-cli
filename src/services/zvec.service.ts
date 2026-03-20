import * as path from "node:path";
import type {
	ZVecCollectionOptions,
	ZVecDoc,
	ZVecDocInput,
	ZVecFieldSchema,
	ZVecFlatIndexParams,
	ZVecHnswIndexParams,
	ZVecInitOptions,
	ZVecIVFIndexParams,
	ZVecQuery,
	ZVecStatus,
	ZVecVectorSchema,
} from "@zvec/zvec";
import zvec from "@zvec/zvec";
import { readConfig } from "../config";

const {
	isZVecError,
	ZVecCollectionSchema,
	ZVecCreateAndOpen,
	ZVecDataType,
	ZVecIndexType,
	ZVecInitialize,
	ZVecLogLevel,
	ZVecLogType,
	ZVecMetricType,
	ZVecOpen,
} = zvec;

export type {
	ZVecCollectionOptions,
	ZVecDoc,
	ZVecDocInput,
	ZVecFieldSchema,
	ZVecFlatIndexParams,
	ZVecHnswIndexParams,
	ZVecInitOptions,
	ZVecIVFIndexParams,
	ZVecQuery,
	ZVecStatus,
	ZVecVectorSchema,
};
export {
	isZVecError,
	ZVecCollectionSchema,
	ZVecDataType,
	ZVecIndexType,
	ZVecInitialize,
	ZVecLogLevel,
	ZVecLogType,
	ZVecMetricType,
};

interface ZVecCollectionSchema {
	readonly name: string;
	field(fieldName: string): ZVecFieldSchema;
	vector(vectorName: string): ZVecVectorSchema;
	fields(): ZVecFieldSchema[];
	vectors(): ZVecVectorSchema[];
	toString(): string;
}

interface ZVecCollection {
	path: string;
	schema: ZVecCollectionSchema;
	options: ZVecCollectionOptions;
	stats: { docCount: number; indexCompleteness: Record<string, number> };
	insertSync(docs: ZVecDocInput): ZVecStatus;
	insertSync(docs: ZVecDocInput[]): ZVecStatus[];
	upsertSync(docs: ZVecDocInput): ZVecStatus;
	upsertSync(docs: ZVecDocInput[]): ZVecStatus[];
	updateSync(docs: ZVecDocInput): ZVecStatus;
	updateSync(docs: ZVecDocInput[]): ZVecStatus[];
	deleteSync(ids: string): ZVecStatus;
	deleteSync(ids: string[]): ZVecStatus[];
	deleteByFilterSync(filter: string): ZVecStatus;
	querySync(params: ZVecQuery): ZVecDoc[];
	fetchSync(ids: string | string[]): Record<string, ZVecDoc>;
	optimizeSync(options?: { concurrency?: number }): void;
	closeSync(): void;
	destroySync(): void;
}

let initialized = false;
const cache = new Map<string, ZVecCollection>();

export function initZvec(options?: ZVecInitOptions): void {
	if (initialized) return;
	ZVecInitialize(
		options ?? { logType: ZVecLogType.CONSOLE, logLevel: ZVecLogLevel.WARN },
	);
	initialized = true;
}

export async function getCollectionPath(name: string): Promise<string> {
	const config = await readConfig();
	return path.join(config.storage.path, "collections", name);
}

export async function openCollection(
	name: string,
	options?: ZVecCollectionOptions,
): Promise<ZVecCollection> {
	initZvec();
	const collectionPath = await getCollectionPath(name);
	const cached = cache.get(collectionPath);
	if (cached) return cached;

	try {
		const col = ZVecOpen(collectionPath, options);
		cache.set(collectionPath, col);
		return col;
	} catch (error) {
		if (isZVecError(error) && error.code === "ZVEC_NOT_FOUND") {
			throw new Error(`Collection '${name}' not found`);
		}
		throw error;
	}
}

export async function createCollection(
	name: string,
	schema: ZVecCollectionSchema,
	options?: ZVecCollectionOptions,
): Promise<ZVecCollection> {
	initZvec();
	const collectionPath = await getCollectionPath(name);

	if (cache.has(collectionPath)) {
		throw new Error(`Collection '${name}' already exists`);
	}

	try {
		const col = ZVecCreateAndOpen(collectionPath, schema, options);
		cache.set(collectionPath, col);
		return col;
	} catch (error) {
		if (isZVecError(error) && error.code === "ZVEC_ALREADY_EXISTS") {
			throw new Error(`Collection '${name}' already exists`);
		}
		throw error;
	}
}

export async function destroyCollection(name: string): Promise<void> {
	initZvec();
	const collectionPath = await getCollectionPath(name);
	const cached = cache.get(collectionPath);

	if (cached) {
		cached.destroySync();
		cache.delete(collectionPath);
		return;
	}

	try {
		const col = ZVecOpen(collectionPath);
		col.destroySync();
	} catch (error) {
		if (isZVecError(error) && error.code === "ZVEC_NOT_FOUND") {
			throw new Error(`Collection '${name}' not found`);
		}
		throw error;
	}
}

export async function insertDocs(
	name: string,
	docs: ZVecDocInput[],
): Promise<ZVecStatus[]> {
	const col = await openCollection(name);
	return col.insertSync(docs);
}

export async function insertDoc(
	name: string,
	doc: ZVecDocInput,
): Promise<ZVecStatus> {
	const col = await openCollection(name);
	return col.insertSync(doc);
}

export async function upsertDocs(
	name: string,
	docs: ZVecDocInput[],
): Promise<ZVecStatus[]> {
	const col = await openCollection(name);
	return col.upsertSync(docs);
}

export async function upsertDoc(
	name: string,
	doc: ZVecDocInput,
): Promise<ZVecStatus> {
	const col = await openCollection(name);
	return col.upsertSync(doc);
}

export async function updateDocs(
	name: string,
	docs: ZVecDocInput[],
): Promise<ZVecStatus[]> {
	const col = await openCollection(name);
	return col.updateSync(docs);
}

export async function updateDoc(
	name: string,
	doc: ZVecDocInput,
): Promise<ZVecStatus> {
	const col = await openCollection(name);
	return col.updateSync(doc);
}

export async function deleteDocs(
	name: string,
	ids: string[],
): Promise<ZVecStatus[]> {
	const col = await openCollection(name);
	return col.deleteSync(ids);
}

export async function deleteDoc(name: string, id: string): Promise<ZVecStatus> {
	const col = await openCollection(name);
	return col.deleteSync(id);
}

export async function deleteByFilter(
	name: string,
	filter: string,
): Promise<ZVecStatus> {
	const col = await openCollection(name);
	return col.deleteByFilterSync(filter);
}

export async function fetchDocs(
	name: string,
	ids: string | string[],
): Promise<Record<string, ZVecDoc>> {
	const col = await openCollection(name);
	return col.fetchSync(ids);
}

export async function queryDocs(
	name: string,
	query: ZVecQuery,
): Promise<ZVecDoc[]> {
	const col = await openCollection(name);
	return col.querySync(query);
}

export async function optimizeCollection(
	name: string,
	concurrency?: number,
): Promise<void> {
	const col = await openCollection(name);
	col.optimizeSync(concurrency ? { concurrency } : undefined);
}

export async function getStats(
	name: string,
): Promise<{ docCount: number; indexCompleteness: Record<string, number> }> {
	const col = await openCollection(name);
	return col.stats;
}

export async function getSchema(name: string): Promise<ZVecCollectionSchema> {
	const col = await openCollection(name);
	return col.schema as unknown as ZVecCollectionSchema;
}

export function makeVectorSchema(
	name: string,
	dimension: number,
	indexType: "hnsw" | "ivf" | "flat" = "hnsw",
	metricType: "l2" | "ip" | "cosine" = "cosine",
): ZVecVectorSchema {
	const metric = {
		l2: ZVecMetricType.L2,
		ip: ZVecMetricType.IP,
		cosine: ZVecMetricType.COSINE,
	}[metricType];

	const indexParams:
		| ZVecHnswIndexParams
		| ZVecIVFIndexParams
		| ZVecFlatIndexParams =
		indexType === "hnsw"
			? { indexType: ZVecIndexType.HNSW, metricType: metric }
			: indexType === "ivf"
				? { indexType: ZVecIndexType.IVF, metricType: metric }
				: { indexType: ZVecIndexType.FLAT, metricType: metric };

	return { name, dataType: ZVecDataType.VECTOR_FP32, dimension, indexParams };
}

export function makeFieldSchema(
	name: string,
	type: "string" | "bool" | "int32" | "int64" | "float" | "double",
	nullable = false,
	indexed = false,
): ZVecFieldSchema {
	const types = {
		string: ZVecDataType.STRING,
		bool: ZVecDataType.BOOL,
		int32: ZVecDataType.INT32,
		int64: ZVecDataType.INT64,
		float: ZVecDataType.FLOAT,
		double: ZVecDataType.DOUBLE,
	};

	return {
		name,
		dataType: types[type],
		nullable,
		indexParams: indexed ? { indexType: ZVecIndexType.INVERT } : undefined,
	};
}

export function clearCache(): void {
	for (const col of cache.values()) {
		try {
			col.closeSync();
		} catch {}
	}
	cache.clear();
}

export async function collectionExists(name: string): Promise<boolean> {
	const collectionPath = await getCollectionPath(name);
	return cache.has(collectionPath) || Bun.file(collectionPath).exists();
}

export async function listCollections(): Promise<
	{ name: string; docCount: number; vectors: number; fields: number }[]
> {
	initZvec();
	const config = await readConfig();
	const collectionsDir = path.join(config.storage.path, "collections");

	const dir = Bun.file(collectionsDir);
	if (!(await dir.exists())) {
		return [];
	}

	const entries = await Array.fromAsync(
		new Bun.Glob("*").scan({ cwd: collectionsDir }),
	);
	const results: {
		name: string;
		docCount: number;
		vectors: number;
		fields: number;
	}[] = [];

	for (const entry of entries) {
		const collectionPath = path.join(collectionsDir, entry);
		try {
			const col = ZVecOpen(collectionPath);
			const stats = col.stats;
			const schema = col.schema;
			results.push({
				name: entry,
				docCount: stats.docCount,
				vectors: schema.vectors().length,
				fields: schema.fields().length,
			});
		} catch {}
	}

	return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCollectionInfo(name: string): Promise<{
	name: string;
	vectors: { name: string; dimension: number }[];
	fields: { name: string; type: string }[];
	docCount: number;
	indexCompleteness: Record<string, number>;
}> {
	const col = await openCollection(name);
	const stats = col.stats;
	const schema = col.schema;

	const TYPE_NAMES: Record<number, string> = {
		[ZVecDataType.STRING]: "string",
		[ZVecDataType.BOOL]: "bool",
		[ZVecDataType.INT32]: "int32",
		[ZVecDataType.INT64]: "int64",
		[ZVecDataType.FLOAT]: "float",
		[ZVecDataType.DOUBLE]: "double",
	};

	return {
		name: schema.name,
		vectors: schema
			.vectors()
			.map((v) => ({ name: v.name, dimension: v.dimension ?? 0 })),
		fields: schema.fields().map((f) => ({
			name: f.name,
			type: TYPE_NAMES[f.dataType] ?? "unknown",
		})),
		docCount: stats.docCount,
		indexCompleteness: stats.indexCompleteness,
	};
}
