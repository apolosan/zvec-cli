/**
 * Zvec CLI Type Definitions
 */

export interface ZvecConfig {
	storage: {
		path: string;
	};
}

export interface CollectionSchema {
	name: string;
	fields: SchemaField[];
	vectors: VectorField[];
	created: string;
}

export interface SchemaField {
	name: string;
	type: "string" | "int32" | "int64" | "float" | "double" | "bool";
}

export interface VectorField {
	name: string;
	dimension: number;
}

export interface Document {
	id: string;
	fields: Record<string, unknown>;
	vectors: Record<string, number[]>;
	created: string;
	updated: string;
}

export interface SearchResult {
	id: string;
	score: number;
	document: Document;
}
