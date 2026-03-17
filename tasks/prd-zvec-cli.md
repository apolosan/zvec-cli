# PRD: zvec-cli — Command-Line Interface for Zvec Vector Database

## 1. Introduction/Overview

**zvec-cli** is a command-line interface for [Zvec](https://github.com/alibaba/zvec), a lightweight, lightning-fast, in-process vector database. The CLI enables developers and data scientists to manage vector collections, perform CRUD operations on documents, and execute similarity searches directly from the terminal.

### Problem Statement
Working with vector databases typically requires writing code or using complex GUI tools. zvec-cli provides a simple, scriptable interface for:
- Quick vector operations during development/testing
- Data exploration and debugging
- Automation and pipeline integration
- General-purpose vector database management

## 2. Goals

- **G1**: Provide a full-featured CLI with 5-10 core commands for vector database operations
- **G2**: Support all zvec database operations (collections, documents, queries)
- **G3**: Enable scriptable workflows with JSON output mode
- **G4**: Support multiple input formats for data import (JSON, JSONL, CSV, stdin)
- **G5**: Provide human-readable table output by default, with JSON for scripting
- **G6**: Zero external dependencies beyond zvec database itself

## 3. User Stories

### US-001: Initialize Zvec Storage
**Description:** As a user, I want to initialize a zvec storage location so that I can start managing vector collections.

**Acceptance Criteria:**
- [ ] `zvec init` creates storage directory at `~/.zvec/collections/` by default
- [ ] `zvec init --path ./custom-path` creates storage at specified location
- [ ] Command creates `.zvecrc` config file with storage path
- [ ] Idempotent: re-running init on existing storage is safe
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

---

### US-002: Create Collection
**Description:** As a user, I want to create a new collection with a defined schema so that I can store documents with vectors.

**Acceptance Criteria:**
- [ ] `zvec collection create <name> --vector <fieldName>:<dimension>` creates collection
- [ ] Support multiple vector fields: `--vector embedding:1536 --vector thumbnail:512`
- [ ] Support scalar fields: `--field title:string --field year:int32`
- [ ] Default vector field name is "embedding" if not specified
- [ ] Error message if collection already exists
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

---

### US-003: List Collections
**Description:** As a user, I want to list all collections so that I can see what's available.

**Acceptance Criteria:**
- [ ] `zvec collection list` (or `zvec ls`) shows all collections
- [ ] Default output: table with columns (name, documents, vectors, created)
- [ ] `--json` flag outputs raw JSON
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

---

### US-004: Inspect Collection Schema
**Description:** As a user, I want to view a collection's schema and stats so that I understand its structure.

**Acceptance Criteria:**
- [ ] `zvec collection inspect <name>` (or `zvec inspect <name>`) shows schema
- [ ] Output includes: field names, types, vector dimensions
- [ ] Output includes collection stats (document count, size)
- [ ] `--json` flag for machine-readable output
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

---

### US-005: Drop Collection
**Description:** As a user, I want to delete a collection so that I can remove unused data.

**Acceptance Criteria:**
- [ ] `zvec collection drop <name>` removes collection
- [ ] Requires `--force` or `-y` flag to confirm (no interactive prompt in v1)
- [ ] Error if collection doesn't exist
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

---

### US-006: Insert Documents
**Description:** As a user, I want to insert documents with vectors so that I can populate my collection.

**Acceptance Criteria:**
- [ ] `zvec insert <collection> --file data.json` inserts from JSON file
- [ ] Support JSONL format: `--file data.jsonl`
- [ ] Support CSV with vector columns: `--file data.csv --vector-col "embedding"`
- [ ] Support stdin: `cat data.json | zvec insert <collection>`
- [ ] Single document via CLI: `zvec insert <collection> --id doc1 --vector "0.1,0.2,0.3" --field title="Hello"`
- [ ] Batch insert with progress indicator for large files
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

---

### US-007: Fetch Document by ID
**Description:** As a user, I want to retrieve a document by ID so that I can inspect its contents.

**Acceptance Criteria:**
- [ ] `zvec fetch <collection> <docId>` retrieves and displays document
- [ ] Default output: formatted table of fields
- [ ] `--json` flag for raw JSON output
- [ ] `--vector` flag to include vector data (hidden by default)
- [ ] Error message if document not found
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

---

### US-008: Delete Documents
**Description:** As a user, I want to delete documents so that I can remove unwanted data.

**Acceptance Criteria:**
- [ ] `zvec delete <collection> --id <docId>` deletes single document
- [ ] `zvec delete <collection> --filter "year < 1900"` deletes by filter
- [ ] Show count of deleted documents
- [ ] `--dry-run` flag shows what would be deleted without deleting
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

---

### US-009: Similarity Search
**Description:** As a user, I want to search for similar vectors so that I can find related documents.

**Acceptance Criteria:**
- [ ] `zvec search <collection> --vector "0.1,0.2,0.3,..." --topk 10` performs similarity search
- [ ] `--vector-file query.json` loads query vector from file
- [ ] `--filter "year > 2000"` applies metadata filter
- [ ] Default output: table with columns (id, score, [selected fields])
- [ ] `--json` flag for raw JSON output
- [ ] `--fields "title,author"` specifies which fields to display
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

---

### US-010: Optimize Collection
**Description:** As a user, I want to optimize a collection so that queries are faster.

**Acceptance Criteria:**
- [ ] `zvec optimize <collection>` runs optimization
- [ ] Shows progress/status during optimization
- [ ] Reports completion status
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

---

### US-011: Global Help and Version
**Description:** As a user, I want to see help text and version info so that I can learn how to use the CLI.

**Acceptance Criteria:**
- [ ] `zvec --help` shows all available commands
- [ ] `zvec --version` shows version number
- [ ] `zvec <command> --help` shows command-specific help
- [ ] Help text includes usage examples
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

---

### US-012: Configuration Management
**Description:** As a user, I want to configure default settings so that I don't repeat common flags.

**Acceptance Criteria:**
- [ ] `zvec config set storage.path ./custom-path` sets config value
- [ ] `zvec config get storage.path` shows config value
- [ ] `zvec config list` shows all config values
- [ ] Config stored in `~/.zvecrc` (YAML format)
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes

## 4. Functional Requirements

### FR-1: Command Structure
- FR-1.1: Root command is `zvec` (or `zvec-cli`)
- FR-1.2: Subcommands follow pattern: `zvec <noun> <verb>` or `zvec <verb>`
- FR-1.3: Global flags: `--help`, `--version`, `--json`, `--path`

### FR-2: Collection Management
- FR-2.1: `zvec init [--path <path>]` - Initialize storage
- FR-2.2: `zvec collection create <name> [options]` - Create collection
- FR-2.3: `zvec collection list` / `zvec ls` - List collections
- FR-2.4: `zvec collection inspect <name>` / `zvec inspect <name>` - View schema
- FR-2.5: `zvec collection drop <name> [-y]` - Delete collection

### FR-3: Document Operations
- FR-3.1: `zvec insert <collection> [options]` - Insert documents
- FR-3.2: `zvec fetch <collection> <id>` - Get document by ID
- FR-3.3: `zvec delete <collection> [options]` - Delete documents

### FR-4: Query Operations
- FR-4.1: `zvec search <collection> --vector <values>` - Similarity search
- FR-4.2: `zvec optimize <collection>` - Optimize index

### FR-5: Configuration
- FR-5.1: `zvec config set <key> <value>` - Set config
- FR-5.2: `zvec config get <key>` - Get config value
- FR-5.3: `zvec config list` - List all config

### FR-6: Input/Output
- FR-6.1: Default output format is human-readable table
- FR-6.2: `--json` flag outputs JSON
- FR-6.3: Support JSON, JSONL, CSV input formats
- FR-6.4: Support stdin piping for batch operations

### FR-7: Error Handling
- FR-7.1: Clear error messages with actionable guidance
- FR-7.2: Non-zero exit codes for errors
- FR-7.3: Graceful handling of missing collections/documents

## 5. Non-Goals (Out of Scope)

- **NG-1**: Embedded embedding generation (zvec handles this or user provides pre-computed vectors)
- **NG-2**: Server mode or API endpoints
- **NG-3**: Authentication or multi-user support
- **NG-4**: Replication or distributed operations
- **NG-5**: Web UI or graphical interface
- **NG-6**: Real-time streaming subscriptions
- **NG-7**: Integration with external vector databases (Pinecone, Weaviate, etc.)

## 6. Design Considerations

### CLI Design
- Follow Unix philosophy: do one thing well, compose via pipes
- Consistent flag naming across commands
- Short aliases for common flags: `-k` for `--topk`, `-f` for `--filter`
- Progress indicators for long operations
- Colorized output (with `--no-color` option)

### Output Formatting
- Use `console.table`-style formatting for tabular data
- Truncate long vectors in table view: `[0.1, 0.2, 0.3, ... 1536 dims]`
- JSON output should be valid, parseable JSON (not pretty-printed by default)

## 7. Technical Considerations

### Stack
- **Runtime**: Bun (fast startup, native TypeScript)
- **Language**: TypeScript (strict mode)
- **Vector DB**: `@zvec/zvec` npm package
- **CLI Framework**: Custom or lightweight (avoid heavy frameworks)
- **Config**: YAML via simple parser
- **Linting/Formatting**: Biome

### Architecture
```
zvec-cli/
├── index.ts              # Entry point, CLI parsing
├── src/
│   ├── commands/         # Command handlers
│   │   ├── init.ts
│   │   ├── collection.ts
│   │   ├── insert.ts
│   │   ├── search.ts
│   │   └── ...
│   ├── output/           # Output formatters
│   │   ├── table.ts
│   │   └── json.ts
│   ├── input/            # Input parsers
│   │   ├── json.ts
│   │   ├── jsonl.ts
│   │   └── csv.ts
│   ├── config.ts         # Configuration management
│   └── zvec-client.ts    # Zvec database wrapper
├── tests/                # Test files
├── package.json
├── tsconfig.json
└── biome.json
```

### Performance
- CLI startup time < 100ms
- Batch insert should stream large files (not load all into memory)
- Search results should stream for large result sets

## 8. Success Metrics

- **M1**: All 12 user stories completed with passing tests
- **M2**: CLI startup time < 100ms
- **M3**: 100% type coverage (strict TypeScript)
- **M4**: All quality checks pass: `bun run check`
- **M5**: Commands work correctly with zvec database operations

## 9. Open Questions

1. **Q1**: Should we support custom vector similarity metrics (cosine, euclidean, dot product) or use zvec defaults?
2. **Q2**: Should `zvec search` support query-by-text (requiring embedding generation) in future versions?
3. **Q3**: Should we add `zvec export` command for exporting collection data?
4. **Q4**: Should config support per-project overrides (`.zvecrc` in project directory)?

## 10. Implementation Priority

### Phase 1: Foundation (US-001, US-011, US-012)
- CLI framework setup
- Help/version commands
- Configuration management
- Init command

### Phase 2: Collection Management (US-002, US-003, US-004, US-005)
- Create, list, inspect, drop collections

### Phase 3: Document Operations (US-006, US-007, US-008)
- Insert, fetch, delete documents
- Input format parsers

### Phase 4: Search & Optimize (US-009, US-010)
- Similarity search with filters
- Collection optimization
