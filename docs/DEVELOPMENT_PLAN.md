# Zvec-CLI - Plano de Desenvolvimento

> **Versão do Documento:** 1.0.0  
> **Data de Criação:** 2025-03-17  
> **Runtime Alvo:** Bun  
> **Linguagem:** TypeScript  
> **Fonte de Referência:** [Documentação Oficial Zvec](https://zvec.org/en/docs)

---

## 1. Visão Geral do Projeto

### 1.1 Objetivo

O **zvec-cli** é uma interface de linha de comando (CLI) que serve como ponto de entrada para o **Zvec Database** - um banco de dados vetorial open-source, rápido e leve que opera totalmente in-process. O zvec-cli permitirá que usuários realizem **TODAS** as operações disponíveis no Zvec Database diretamente do terminal, sem a necessidade de escrever código.

### 1.2 Proposta de Valor

- **Simplicidade**: Operações complexas de banco de dados vetorial através de comandos simples
- **Produtividade**: Prototipagem rápida e desenvolvimento local sem necessidade de código
- **Portabilidade**: Funciona em qualquer ambiente onde Bun/Node.js esteja disponível
- **Completude**: Acesso a 100% das funcionalidades do Zvec Database via CLI

### 1.3 Escopo Funcional

O zvec-cli deve suportar:

| Categoria | Operações |
|-----------|-----------|
| **Gerenciamento de Collections** | Create, Open, Destroy, Optimize, Inspect, Schema Evolution |
| **Operações de Dados** | Insert, Upsert, Update, Delete, Fetch, Query |
| **Configuração Global** | Init com opções de log, threads, etc. |
| **Embeddings (AI Extension)** | Geração de embeddings locais e via API |
| **Reranking (AI Extension)** | Reordenação de resultados via rerankers |
| **Utilitários** | Help, Version, Shell Interativo, Batch Operations |

---

## 2. Arquitetura do Sistema

### 2.1 Estrutura de Diretórios

```
zvec-cli/
├── bin/
│   └── zvec.ts                    # Entry point executável
├── src/
│   ├── index.ts                   # Exportação principal
│   ├── cli/
│   │   ├── index.ts               # CLI principal (parser de argumentos)
│   │   ├── commands/              # Comandos organizados por categoria
│   │   │   ├── index.ts           # Registro de comandos
│   │   │   ├── collection/
│   │   │   │   ├── index.ts       # Comandos de collection
│   │   │   │   ├── create.ts      # zvec collection create
│   │   │   │   ├── open.ts        # zvec collection open (info)
│   │   │   │   ├── destroy.ts     # zvec collection destroy
│   │   │   │   ├── optimize.ts    # zvec collection optimize
│   │   │   │   ├── inspect.ts     # zvec collection inspect
│   │   │   │   └── list.ts        # zvec collection list
│   │   │   ├── document/
│   │   │   │   ├── index.ts       # Comandos de documento
│   │   │   │   ├── insert.ts      # zvec doc insert
│   │   │   │   ├── upsert.ts      # zvec doc upsert
│   │   │   │   ├── update.ts      # zvec doc update
│   │   │   │   ├── delete.ts      # zvec doc delete
│   │   │   │   ├── fetch.ts       # zvec doc fetch
│   │   │   │   └── query.ts       # zvec doc query
│   │   │   ├── schema/
│   │   │   │   ├── index.ts       # Comandos de schema
│   │   │   │   ├── add-column.ts  # zvec schema add-column
│   │   │   │   ├── drop-column.ts # zvec schema drop-column
│   │   │   │   ├── alter-column.ts# zvec schema alter-column
│   │   │   │   ├── create-index.ts# zvec schema create-index
│   │   │   │   └── drop-index.ts  # zvec schema drop-index
│   │   │   ├── embedding/
│   │   │   │   ├── index.ts       # Comandos de embedding
│   │   │   │   ├── dense.ts       # zvec embed dense
│   │   │   │   └── sparse.ts      # zvec embed sparse
│   │   │   ├── reranker/
│   │   │   │   ├── index.ts       # Comandos de reranking
│   │   │   │   └── rerank.ts      # zvec rerank
│   │   │   ├── config/
│   │   │   │   ├── index.ts       # Comandos de configuração
│   │   │   │   ├── init.ts        # zvec init
│   │   │   │   └── set.ts         # zvec config set
│   │   │   └── shell/
│   │   │       └── index.ts       # zvec shell (REPL interativo)
│   │   ├── parser/
│   │   │   ├── index.ts           # Parser de argumentos
│   │   │   ├── types.ts           # Tipos de argumentos
│   │   │   └── validators.ts      # Validadores de input
│   │   └── output/
│   │       ├── index.ts           # Formatador de output
│   │       ├── json.ts            # Formatador JSON
│   │       ├── table.ts           # Formatador Tabela
│   │       ├── yaml.ts            # Formatador YAML
│   │       └── plain.ts           # Formatador texto simples
│   ├── core/
│   │   ├── index.ts               # Core exports
│   │   ├── connection.ts          # Gerenciamento de conexão/collection
│   │   ├── context.ts             # Contexto global da CLI
│   │   └── errors.ts              # Classes de erro customizadas
│   ├── services/
│   │   ├── index.ts               # Services exports
│   │   ├── collection.service.ts  # Lógica de collections
│   │   ├── document.service.ts    # Lógica de documentos
│   │   ├── schema.service.ts      # Lógica de schema
│   │   ├── embedding.service.ts   # Lógica de embeddings
│   │   ├── reranker.service.ts    # Lógica de reranking
│   │   └── config.service.ts      # Lógica de configuração
│   ├── utils/
│   │   ├── index.ts               # Utils exports
│   │   ├── file.ts                # Utilitários de arquivo
│   │   ├── json.ts                # Parser/serializer JSON
│   │   ├── validation.ts          # Validadores genéricos
│   │   ├── formatting.ts          # Formatação de dados
│   │   ├── logger.ts              # Sistema de logging
│   │   └── prompt.ts              # Prompts interativos
│   └── types/
│       ├── index.ts               # Tipos exports
│       ├── zvec.types.ts          # Tipos do Zvec
│       ├── cli.types.ts           # Tipos da CLI
│       └── config.types.ts        # Tipos de configuração
├── tests/
│   ├── unit/
│   │   ├── cli/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── collection.test.ts
│   │   ├── document.test.ts
│   │   ├── query.test.ts
│   │   └── embedding.test.ts
│   └── e2e/
│       └── cli.test.ts
├── docs/
│   ├── DEVELOPMENT_PLAN.md        # Este documento
│   ├── API.md                     # Documentação da API interna
│   └── USAGE.md                   # Guia de uso da CLI
├── examples/
│   ├── basic-usage.sh             # Exemplos básicos
│   ├── schema-definition.json     # Exemplo de schema
│   ├── batch-insert.json          # Exemplo de insert em lote
│   └── queries/                   # Exemplos de queries
│       ├── simple-query.json
│       ├── filtered-query.json
│       └── multi-vector-query.json
├── scripts/
│   ├── build.ts                   # Script de build
│   └── release.ts                 # Script de release
├── .zvecrc.example                # Exemplo de arquivo de configuração
├── package.json
├── tsconfig.json
├── bunfig.toml                    # Configuração do Bun
└── README.md
```

### 2.2 Fluxo de Execução

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Entrada do Usuário                          │
│                    $ zvec collection create ...                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CLI Parser (src/cli/parser)                 │
│  - Parse argumentos                                                  │
│  - Validar sintaxe                                                   │
│  - Resolver comando                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Command Handler (src/cli/commands)             │
│  - Validar parâmetros específicos                                    │
│  - Carregar configuração                                             │
│  - Invocar Service correspondente                                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Service Layer (src/services)                 │
│  - Lógica de negócio                                                 │
│  - Validação de regras                                               │
│  - Orquestração de operações                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Core Layer (src/core)                           │
│  - Gerenciamento de conexão                                          │
│  - Contexto global                                                   │
│  - Integração com Zvec SDK                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Zvec Node.js SDK                            │
│  - zvec npm package                                                  │
│  - Operações no banco de dados                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Output Formatter (src/cli/output)             │
│  - Formatador JSON/Table/YAML/Plain                                  │
│  - Renderização de resultados                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Padrões de Design

#### 2.3.1 Command Pattern
Cada comando CLI implementa uma interface comum:

```typescript
interface Command {
  name: string;
  description: string;
  aliases?: string[];
  arguments: ArgumentDefinition[];
  options: OptionDefinition[];
  examples?: string[];
  execute(context: CommandContext): Promise<CommandResult>;
}
```

#### 2.3.2 Service Layer Pattern
Serviços encapsulam a lógica de negócio:

```typescript
interface CollectionService {
  create(options: CreateCollectionOptions): Promise<Collection>;
  open(path: string, options?: OpenOptions): Promise<Collection>;
  destroy(path: string): Promise<void>;
  optimize(path: string, options?: OptimizeOptions): Promise<void>;
  inspect(path: string): Promise<CollectionInfo>;
  list(basePath?: string): Promise<CollectionListItem[]>;
}
```

#### 2.3.3 Repository Pattern
Abstração para acesso aos dados:

```typescript
interface CollectionRepository {
  getCollection(path: string): Promise<ZVecCollection>;
  saveSchema(path: string, schema: CollectionSchema): Promise<void>;
  loadSchema(path: string): Promise<CollectionSchema>;
}
```

#### 2.3.4 Factory Pattern
Criação de objetos complexos:

```typescript
interface OutputFormatterFactory {
  create(format: OutputFormat): OutputFormatter;
}

interface SchemaBuilderFactory {
  createFromJSON(json: object): CollectionSchemaBuilder;
  createFromCLI(args: ParsedArgs): CollectionSchemaBuilder;
}
```

---

## 3. Dependências

### 3.1 Dependências de Produção

```json
{
  "dependencies": {
    "zvec": "^0.x.x",           // SDK oficial do Zvec para Node.js
    "commander": "^12.x.x",     // Framework para CLI
    "inquirer": "^9.x.x",       // Prompts interativos
    "chalk": "^5.x.x",          // Cores no terminal
    "ora": "^8.x.x",            // Spinners e progress indicators
    "cli-table3": "^0.6.x",     // Tabelas formatadas
    "yaml": "^2.x.x",           // Parser YAML
    "lodash": "^4.x.x",         // Utilitários
    "zod": "^3.x.x",            // Validação de schemas
    "conf": "^13.x.x",          // Persistência de configuração
    "update-notifier": "^7.x.x" // Verificação de atualizações
  }
}
```

### 3.2 Dependências de Desenvolvimento

```json
{
  "devDependencies": {
    "@types/bun": "latest",
    "@types/lodash": "^4.x.x",
    "@types/inquirer": "^9.x.x",
    "typescript": "^5.x.x",
    "vitest": "^1.x.x",         // Framework de testes
    "@vitest/coverage-v8": "^1.x.x",
    "eslint": "^8.x.x",
    "@typescript-eslint/parser": "^7.x.x",
    "@typescript-eslint/eslint-plugin": "^7.x.x",
    "prettier": "^3.x.x",
    "husky": "^9.x.x",          // Git hooks
    "lint-staged": "^15.x.x",
    "tsup": "^8.x.x",           // Bundler
    "pkg": "^5.x.x"             // Empacotamento de binários
  }
}
```

---

## 4. Especificação Detalhada de Comandos

### 4.1 Comandos Globais

#### 4.1.1 `zvec --version`
Exibe a versão da CLI.

```bash
zvec --version
zvec -v
```

**Output:**
```
zvec-cli v1.0.0
zvec-sdk v0.x.x
bun v1.3.0
```

#### 4.1.2 `zvec --help`
Exibe ajuda geral ou específica de um comando.

```bash
zvec --help
zvec -h
zvec collection create --help
```

#### 4.1.3 `zvec init`
Inicializa a configuração global do Zvec (equivalente ao `zvec.init()` do SDK).

```bash
zvec init [options]

Opções:
  --log-type <type>      Tipo de log: console, file, none (padrão: console)
  --log-level <level>    Nível de log: debug, info, warn, error (padrão: warn)
  --query-threads <n>    Número de threads para queries (padrão: auto)
  --config <path>        Caminho para arquivo de configuração
```

**Exemplos:**
```bash
# Inicialização com configurações padrão
zvec init

# Inicialização com logs detalhados
zvec init --log-level debug --log-type console

# Usar arquivo de configuração customizado
zvec init --config ./zvec-config.yaml
```

#### 4.1.4 `zvec shell`
Inicia um shell interativo (REPL) para executar múltiplos comandos.

```bash
zvec shell [options]

Opções:
  --collection <path>    Abre uma collection automaticamente
  --history <path>       Arquivo de histórico (padrão: ~/.zvec_history)
```

**Exemplo de sessão:**
```
$ zvec shell --collection ./my-collection
zvec> schema
Collection: my-collection
Fields: title (STRING), year (INT32)
Vectors: embedding (768, HNSW)

zvec> query --vector "[0.1, 0.2, ...]" --topk 5
Found 5 documents:
  doc_1: 0.95
  doc_2: 0.89
  ...

zvec> insert --file ./new-docs.json
Inserted 10 documents

zvec> exit
```

---

### 4.2 Comandos de Collection

#### 4.2.1 `zvec collection create`
Cria uma nova collection com schema definido.

```bash
zvec collection create <path> [options]

Argumentos:
  path                   Caminho onde a collection será criada

Opções:
  --name <name>          Nome da collection (padrão: nome do diretório)
  --schema <file>        Arquivo JSON/YAML com definição do schema
  --field <definition>   Define um campo escalar (múltiplos permitidos)
  --vector <definition>  Define um campo vetorial (múltiplos permitidos)
  --option <key=value>   Opções da collection (read-only, enable-mmap)
  --overwrite            Sobrescreve collection existente
  --open                 Abre a collection após criar

Formato --field:
  name:type[:nullable][:index]
  Tipos: string, int32, int64, float32, float64, bool,
         array_string, array_int32, array_int64, array_float32, array_float64

Formato --vector:
  name:dimension:index_type:metric_type
  Tipos de índice: flat, hnsw, ivf
  Tipos de métrica: l2, ip, cosine
```

**Exemplos:**

```bash
# Criar collection com schema inline
zvec collection create ./my-books \
  --name "books" \
  --field "title:string:index" \
  --field "author:string" \
  --field "year:int32" \
  --field "tags:array_string" \
  --vector "embedding:768:hnsw:cosine"

# Criar collection a partir de arquivo de schema
zvec collection create ./my-books --schema ./schema.json

# Criar collection com múltiplos vetores
zvec collection create ./multi-modal \
  --field "description:string" \
  --vector "text_embedding:384:hnsw:cosine" \
  --vector "image_embedding:512:ivf:l2"

# Criar e abrir imediatamente
zvec collection create ./my-books --schema ./schema.json --open
```

**Arquivo de Schema (JSON):**
```json
{
  "name": "books",
  "fields": [
    {
      "name": "title",
      "data_type": "STRING",
      "nullable": false,
      "index": true
    },
    {
      "name": "author",
      "data_type": "STRING",
      "nullable": true
    },
    {
      "name": "year",
      "data_type": "INT32",
      "nullable": false
    },
    {
      "name": "tags",
      "data_type": "ARRAY_STRING",
      "nullable": true
    }
  ],
  "vectors": [
    {
      "name": "embedding",
      "dimension": 768,
      "index_type": "HNSW",
      "metric_type": "COSINE",
      "index_params": {
        "M": 16,
        "ef_construction": 200
      }
    }
  ]
}
```

**Arquivo de Schema (YAML):**
```yaml
name: books
fields:
  - name: title
    data_type: STRING
    nullable: false
    index: true
  - name: author
    data_type: STRING
    nullable: true
  - name: year
    data_type: INT32
    nullable: false
  - name: tags
    data_type: ARRAY_STRING
    nullable: true

vectors:
  - name: embedding
    dimension: 768
    index_type: HNSW
    metric_type: COSINE
    index_params:
      M: 16
      ef_construction: 200
```

#### 4.2.2 `zvec collection open`
Abre e exibe informações de uma collection existente.

```bash
zvec collection open <path> [options]

Argumentos:
  path                   Caminho para a collection

Opções:
  --read-only            Abre em modo somente leitura
  --no-mmap              Desabilita memory-mapped I/O
  --json                 Output em formato JSON
```

**Exemplos:**
```bash
# Abrir collection
zvec collection open ./my-books

# Abrir em modo read-only
zvec collection open ./my-books --read-only

# Output JSON
zvec collection open ./my-books --json
```

**Output (formato tabela):**
```
┌─────────────────────────────────────────────────────────┐
│ Collection: books                                        │
│ Path: /home/user/my-books                                │
│ Options: read-only=false, mmap=true                      │
├─────────────────────────────────────────────────────────┤
│ Fields                                                   │
├──────────┬──────────┬──────────┬───────────┬───────────┤
│ Name     │ Type     │ Nullable │ Index     │ Default   │
├──────────┼──────────┼──────────┼───────────┼───────────┤
│ title    │ STRING   │ false    │ inverted  │ -         │
│ author   │ STRING   │ true     │ -         │ -         │
│ year     │ INT32    │ false    │ -         │ -         │
│ tags     │ ARR_STR  │ true     │ -         │ -         │
├──────────┴──────────┴──────────┴───────────┴───────────┤
│ Vectors                                                  │
├────────────┬────────────┬─────────┬──────────┬─────────┤
│ Name       │ Type       │ Dim     │ Index    │ Metric  │
├────────────┼────────────┼─────────┼──────────┼─────────┤
│ embedding  │ DENSE      │ 768     │ HNSW     │ COSINE  │
└────────────┴────────────┴─────────┴──────────┴─────────┘
```

#### 4.2.3 `zvec collection list`
Lista todas as collections em um diretório.

```bash
zvec collection list [base-path] [options]

Argumentos:
  base-path              Diretório base para busca (padrão: diretório atual)

Opções:
  --recursive, -r        Busca recursivamente
  --format <format>      Formato de output: table, json, simple (padrão: table)
```

**Exemplos:**
```bash
# Listar collections no diretório atual
zvec collection list

# Listar recursivamente
zvec collection list /data --recursive

# Output JSON
zvec collection list --format json
```

#### 4.2.4 `zvec collection destroy`
Remove permanentemente uma collection.

```bash
zvec collection destroy <path> [options]

Argumentos:
  path                   Caminho para a collection

Opções:
  --force, -f            Não pede confirmação
  --backup <path>        Cria backup antes de destruir
```

**Exemplos:**
```bash
# Destruir com confirmação
zvec collection destroy ./my-books

# Forçar sem confirmação
zvec collection destroy ./my-books --force

# Criar backup antes
zvec collection destroy ./my-books --backup ./backups/
```

#### 4.2.5 `zvec collection optimize`
Otimiza uma collection para melhor performance de busca.

```bash
zvec collection optimize <path> [options]

Argumentos:
  path                   Caminho para a collection

Opções:
  --wait                 Aguarda a otimização completar (padrão)
  --no-wait              Executa em background
  --check                Apenas verifica status da otimização
```

**Exemplos:**
```bash
# Otimizar e aguardar
zvec collection optimize ./my-books

# Verificar status
zvec collection optimize ./my-books --check

# Otimização em background
zvec collection optimize ./my-books --no-wait
```

#### 4.2.6 `zvec collection inspect`
Exibe informações detalhadas e estatísticas de uma collection.

```bash
zvec collection inspect <path> [options]

Argumentos:
  path                   Caminho para a collection

Opções:
  --schema               Mostra apenas o schema
  --stats                Mostra apenas estatísticas
  --format <format>      Formato: table, json, yaml (padrão: table)
```

**Output (estatísticas):**
```
┌─────────────────────────────────────────────────────────┐
│ Collection Statistics                                    │
├─────────────────────────────────────────────────────────┤
│ Document Count:        10,234                            │
│ Index Complete:        95.2%                             │
│ Buffer Size:           512 documents                     │
│ Disk Usage:            256 MB                            │
│ Memory Usage:          128 MB                            │
│ Last Optimized:        2025-03-17 10:30:00              │
└─────────────────────────────────────────────────────────┘
```

---

### 4.3 Comandos de Documento

#### 4.3.1 `zvec doc insert`
Insere um ou mais documentos na collection.

```bash
zvec doc insert <collection-path> [options]

Argumentos:
  collection-path        Caminho para a collection

Opções:
  --file <path>          Arquivo JSON/YAML com documentos
  --doc <json>           Documento inline em JSON
  --id <id>              ID do documento (com --doc)
  --fields <json>        Campos escalares (com --doc)
  --vector <name:values> Vetor nomeado (com --doc, múltiplos permitidos)
  --batch-size <n>       Tamanho do lote para inserção (padrão: 100)
  --optimize             Otimiza após inserção
```

**Exemplos:**

```bash
# Inserir de arquivo
zvec doc insert ./my-books --file ./documents.json

# Inserir documento inline
zvec doc insert ./my-books \
  --id "book_1" \
  --fields '{"title": "1984", "author": "Orwell", "year": 1949}' \
  --vector "embedding:[0.1,0.2,0.3,...]"

# Inserir múltiplos com otimização
zvec doc insert ./my-books --file ./documents.json --batch-size 500 --optimize
```

**Formato de arquivo de documentos:**
```json
{
  "documents": [
    {
      "id": "book_1",
      "fields": {
        "title": "1984",
        "author": "George Orwell",
        "year": 1949,
        "tags": ["dystopia", "classic"]
      },
      "vectors": {
        "embedding": [0.1, 0.2, 0.3, "..."]
      }
    },
    {
      "id": "book_2",
      "fields": {
        "title": "Brave New World",
        "author": "Aldous Huxley",
        "year": 1932
      },
      "vectors": {
        "embedding": [0.4, 0.5, 0.6, "..."]
      }
    }
  ]
}
```

#### 4.3.2 `zvec doc upsert`
Insere ou substitui documentos (upsert).

```bash
zvec doc upsert <collection-path> [options]

# Mesmas opções do insert
```

#### 4.3.3 `zvec doc update`
Atualiza campos específicos de documentos existentes.

```bash
zvec doc update <collection-path> [options]

Argumentos:
  collection-path        Caminho para a collection

Opções:
  --id <id>              ID do documento a atualizar
  --file <path>          Arquivo com atualizações
  --fields <json>        Campos a atualizar
  --vector <name:values> Vetor a atualizar
```

**Exemplos:**
```bash
# Atualizar campos escalares
zvec doc update ./my-books --id "book_1" \
  --fields '{"year": 1950, "tags": ["dystopia", "classic", "political"]}'

# Atualizar vetor
zvec doc update ./my-books --id "book_1" \
  --vector "embedding:[0.15,0.25,0.35,...]"
```

#### 4.3.4 `zvec doc delete`
Remove documentos por ID ou filtro.

```bash
zvec doc delete <collection-path> [options]

Argumentos:
  collection-path        Caminho para a collection

Opções:
  --id <id>              ID do documento (múltiplos permitidos)
  --ids <file>           Arquivo com lista de IDs
  --filter <expr>        Expressão de filtro para deleção em massa
  --dry-run              Mostra o que seria deletado sem executar
  --force                Não pede confirmação para deleção em massa
```

**Exemplos:**
```bash
# Deletar por ID
zvec doc delete ./my-books --id "book_1"

# Deletar múltiplos IDs
zvec doc delete ./my-books --id "book_1" --id "book_2" --id "book_3"

# Deletar por filtro
zvec doc delete ./my-books --filter "year < 1900"

# Deletar com filtro complexo
zvec doc delete ./my-books --filter "year >= 1800 AND year < 1900 AND author = 'Unknown'"

# Preview sem executar
zvec doc delete ./my-books --filter "year < 1900" --dry-run
```

#### 4.3.5 `zvec doc fetch`
Recupera documentos por ID.

```bash
zvec doc fetch <collection-path> [options]

Argumentos:
  collection-path        Caminho para a collection

Opções:
  --id <id>              ID do documento (múltiplos permitidos)
  --ids <file>           Arquivo com lista de IDs
  --fields <list>        Campos a retornar (separados por vírgula)
  --vectors <list>       Vetores a retornar (separados por vírgula)
  --format <format>      Formato: json, yaml, table (padrão: json)
```

**Exemplos:**
```bash
# Buscar documento único
zvec doc fetch ./my-books --id "book_1"

# Buscar múltiplos
zvec doc fetch ./my-books --id "book_1" --id "book_2"

# Buscar apenas campos específicos
zvec doc fetch ./my-books --id "book_1" --fields "title,author"

# Buscar sem vetores (mais rápido)
zvec doc fetch ./my-books --id "book_1" --vectors ""
```

#### 4.3.6 `zvec doc query`
Executa busca vetorial com filtros opcionais.

```bash
zvec doc query <collection-path> [options]

Argumentos:
  collection-path        Caminho para a collection

Opções de Query:
  --vector <name:values> Nome e valores do vetor de busca
  --vector-file <path>   Arquivo com vetor de busca
  --doc-id <id>          Usa embedding de documento existente como query
  --topk <n>             Número de resultados (padrão: 10)

Opções de Filtro:
  --filter <expr>        Expressão de filtro SQL-like
  --filter-file <path>   Arquivo com filtro

Opções de Multi-Vector:
  --vectors <json>       Múltiplos vetores com pesos (JSON)

Opções de Output:
  --fields <list>        Campos a retornar
  --vectors <list>       Vetores a retornar
  --format <format>      Formato: json, table, yaml (padrão: table)
  --include-score        Inclui score de similaridade (padrão: true)
  --include-fields       Inclui campos escalares (padrão: true)

Parâmetros de Índice:
  --ef <n>               Parâmetro ef para HNSW
  --nprobe <n>           Parâmetro nprobe para IVF
```

**Exemplos:**

```bash
# Query simples
zvec doc query ./my-books \
  --vector "embedding:[0.1,0.2,0.3,...]" \
  --topk 5

# Query com filtro
zvec doc query ./my-books \
  --vector "embedding:[0.1,0.2,0.3,...]" \
  --filter "year >= 1900 AND author = 'Orwell'" \
  --topk 10

# Query usando documento existente como referência
zvec doc query ./my-books \
  --doc-id "book_1" \
  --topk 5

# Multi-vector query com pesos
zvec doc query ./multi-modal \
  --vectors '{"text_embedding": {"vector": [0.1,...], "weight": 0.7}, "image_embedding": {"vector": [0.5,...], "weight": 0.3}}' \
  --topk 10

# Query com parâmetros de índice customizados
zvec doc query ./my-books \
  --vector "embedding:[0.1,...]" \
  --ef 100 \
  --topk 20
```

**Output (formato tabela):**
```
┌────────────────────────────────────────────────────────────────┐
│ Query Results (top 5)                                           │
├─────────┬──────────────────────┬──────────┬────────────────────┤
│ Rank    │ ID                   │ Score    │ Title              │
├─────────┼──────────────────────┼──────────┼────────────────────┤
│ 1       │ book_42              │ 0.9823   │ Animal Farm        │
│ 2       │ book_17              │ 0.9456   │ 1984               │
│ 3       │ book_89              │ 0.9234   │ Brave New World    │
│ 4       │ book_23              │ 0.9012   │ Fahrenheit 451     │
│ 5       │ book_56              │ 0.8876   │ The Handmaid's Tale│
└─────────┴──────────────────────┴──────────┴────────────────────┘
```

---

### 4.4 Comandos de Schema (DDL)

#### 4.4.1 `zvec schema add-column`
Adiciona um novo campo escalar à collection.

```bash
zvec schema add-column <collection-path> [options]

Argumentos:
  collection-path        Caminho para a collection

Opções:
  --name <name>          Nome do campo
  --type <type>          Tipo: string, int32, int64, float32, float64, bool, array_*
  --nullable             Permite valores nulos
  --index                Cria índice invertido
  --default <value>      Valor padrão para documentos existentes
```

**Exemplos:**
```bash
# Adicionar campo com valor padrão
zvec schema add-column ./my-books \
  --name "rating" \
  --type "int32" \
  --default "0"

# Adicionar campo nullable com índice
zvec schema add-column ./my-books \
  --name "category" \
  --type "string" \
  --nullable \
  --index
```

#### 4.4.2 `zvec schema drop-column`
Remove um campo escalar da collection.

```bash
zvec schema drop-column <collection-path> --name <field-name> [--force]
```

#### 4.4.3 `zvec schema alter-column`
Altera propriedades de um campo existente.

```bash
zvec schema alter-column <collection-path> [options]

Opções:
  --name <name>          Nome do campo
  --rename <new-name>    Novo nome para o campo
  --type <type>          Novo tipo (apenas upcasts seguros)
  --nullable <bool>      Altera nullable
```

**Exemplos:**
```bash
# Renomear campo
zvec schema alter-column ./my-books --name "year" --rename "publish_year"

# Alterar tipo (upcast seguro)
zvec schema alter-column ./my-books --name "pages" --type "int64"
```

#### 4.4.4 `zvec schema create-index`
Cria índice em um campo escalar.

```bash
zvec schema create-index <collection-path> --field <field-name>
```

#### 4.4.5 `zvec schema drop-index`
Remove índice de um campo escalar.

```bash
zvec schema drop-index <collection-path> --field <field-name>
```

---

### 4.5 Comandos de Embedding (AI Extension)

#### 4.5.1 `zvec embed dense`
Gera embeddings densos para textos.

```bash
zvec embed dense [options]

Opções:
  --text <text>          Texto para embeddar
  --file <path>          Arquivo com textos (um por linha ou JSON)
  --type <type>          Tipo: local, openai, qwen, jina (padrão: local)
  --model <model>        Modelo específico
  --output <path>        Arquivo de saída para embeddings
  --format <format>      Formato de saída: json, numpy, binary
  --batch-size <n>       Tamanho do lote (padrão: 32)

Opções OpenAI:
  --api-key <key>        Chave da API OpenAI (ou OPENAI_API_KEY env)

Opções Qwen:
  --api-key <key>        Chave da API Dashscope (ou DASHSCOPE_API_KEY env)

Opções Jina:
  --api-key <key>        Chave da API Jina (ou JINA_API_KEY env)
  --task <task>          Task type: retrieval.passage, retrieval.query, etc.
  --dimensions <n>       Dimensões (Matryoshka)
```

**Exemplos:**
```bash
# Embedding local (all-MiniLM-L6-v2)
zvec embed dense --text "Hello world"

# Embedding de arquivo
zvec embed dense --file ./texts.txt --output ./embeddings.json

# Embedding com OpenAI
zvec embed dense --text "Hello world" --type openai --model text-embedding-3-small

# Embedding em lote
zvec embed dense --file ./documents.json --type local --batch-size 64 --output ./embeddings.json
```

#### 4.5.2 `zvec embed sparse`
Gera embeddings esparsos (SPLADE, BM25).

```bash
zvec embed sparse [options]

Opções:
  --text <text>          Texto para embeddar
  --file <path>          Arquivo com textos
  --type <type>          Tipo: splade, bm25 (padrão: splade)
  --output <path>        Arquivo de saída
```

**Exemplos:**
```bash
# Embedding SPLADE local
zvec embed sparse --text "machine learning algorithms"

# Embedding BM25
zvec embed sparse --text "search query" --type bm25
```

---

### 4.6 Comandos de Reranking (AI Extension)

#### 4.6.1 `zvec rerank`
Reordena resultados de busca.

```bash
zvec rerank [options]

Opções:
  --query <text>         Query original
  --results <file>       Arquivo com resultados a reranquear
  --type <type>          Tipo: local, qwen, rrf, weighted (padrão: local)
  --topn <n>             Número de resultados após reranking
  --field <name>         Campo a usar para reranking (padrão: primeiro campo texto)
  --output <path>        Arquivo de saída

Opções RRF:
  --k <n>                Parâmetro k para RRF (padrão: 60)

Opções Weighted:
  --weights <json>       Pesos para cada fonte de resultados
```

**Exemplos:**
```bash
# Reranking local
zvec rerank --query "machine learning" --results ./search_results.json --topn 10

# Reranking com Qwen
zvec rerank --query "machine learning" --results ./search_results.json --type qwen

# RRF fusion
zvec rerank --type rrf --results ./multi_vector_results.json --k 60
```

---

### 4.7 Comandos de Configuração

#### 4.7.1 `zvec config set`
Define configurações persistentes.

```bash
zvec config set <key> <value>

# Exemplos
zvec config set default_collection_path /data/collections
zvec config set output_format json
zvec config set embedding.type openai
zvec config set embedding.api_key sk-xxx
```

#### 4.7.2 `zvec config get`
Obtém valor de configuração.

```bash
zvec config get <key>
zvec config get all
```

#### 4.7.3 `zvec config list`
Lista todas as configurações.

```bash
zvec config list [--format table|json]
```

---

## 5. Formatos de Input/Output

### 5.1 Formatos Suportados

| Formato | Extensão | Input | Output |
|---------|----------|-------|--------|
| JSON    | .json    | ✅    | ✅     |
| YAML    | .yaml, .yml | ✅ | ✅     |
| CSV     | .csv     | ✅ (fields) | ✅ |
| NDJSON  | .ndjson, .jsonl | ✅ | ✅ |
| Binary  | .bin, .npy | ✅ (vectors) | ✅ (vectors) |

### 5.2 Detecção Automática de Formato

A CLI detecta automaticamente o formato baseado na extensão do arquivo ou no header do conteúdo.

### 5.3 Schema de Documento (JSON)

```json
{
  "id": "string",
  "fields": {
    "field_name": "value",
    ...
  },
  "vectors": {
    "vector_name": [0.1, 0.2, ...],
    "sparse_vector_name": {
      "index": value,
      ...
    }
  }
}
```

### 5.4 Schema de Resultado de Query (JSON)

```json
{
  "query": {
    "vector": "embedding",
    "topk": 10,
    "filter": "year >= 2000"
  },
  "results": [
    {
      "id": "doc_1",
      "score": 0.95,
      "fields": {
        "title": "Document Title",
        "year": 2020
      },
      "vectors": {
        "embedding": [0.1, 0.2, ...]
      }
    }
  ],
  "metadata": {
    "total": 1,
    "latency_ms": 5.2
  }
}
```

---

## 6. Sistema de Configuração

### 6.1 Hierarquia de Configuração

```
1. Argumentos de CLI (maior prioridade)
2. Variáveis de ambiente (ZVEC_*)
3. Arquivo .zvecrc no diretório atual
4. Arquivo .zvecrc no diretório home (~/.zvecrc)
5. Configurações padrão (menor prioridade)
```

### 6.2 Arquivo .zvecrc

```yaml
# ~/.zvecrc
version: 1

defaults:
  collection_path: ./collections
  output_format: table
  log_level: warn

embedding:
  default_type: local
  openai:
    model: text-embedding-3-small
    api_key: ${OPENAI_API_KEY}
  qwen:
    model: text-embedding-v3
    api_key: ${DASHSCOPE_API_KEY}

display:
  color: true
  unicode: true
  table_style: rounded
  max_column_width: 50

performance:
  batch_size: 100
  parallel_queries: 4
```

### 6.3 Variáveis de Ambiente

```bash
ZVEC_COLLECTION_PATH=/data/collections
ZVEC_OUTPUT_FORMAT=json
ZVEC_LOG_LEVEL=debug
ZVEC_EMBEDDING_TYPE=openai
OPENAI_API_KEY=sk-xxx
DASHSCOPE_API_KEY=xxx
JINA_API_KEY=xxx
```

---

## 7. Tratamento de Erros

### 7.1 Códigos de Erro

| Código | Categoria | Descrição |
|--------|-----------|-----------|
| 0      | Success   | Operação bem-sucedida |
| 1      | General   | Erro genérico |
| 2      | Input     | Erro de input/validação |
| 3      | NotFound  | Recurso não encontrado |
| 4      | AlreadyExists | Recurso já existe |
| 5      | Permission | Erro de permissão |
| 6      | Database  | Erro do Zvec |
| 7      | Network   | Erro de rede (APIs) |
| 8      | Config    | Erro de configuração |

### 7.2 Formato de Erro

```json
{
  "error": {
    "code": 3,
    "type": "NotFound",
    "message": "Collection not found at path: ./my-collection",
    "details": {
      "path": "./my-collection"
    },
    "suggestion": "Use 'zvec collection create' to create a new collection"
  }
}
```

### 7.3 Mensagens de Erro Amigáveis

```
❌ Error: Collection not found

The specified path does not contain a valid Zvec collection:
  ./my-collection

Suggestions:
  • Check if the path is correct
  • Create a new collection with: zvec collection create ./my-collection
  • List existing collections with: zvec collection list
```

---

## 8. Logging e Debugging

### 8.1 Níveis de Log

- `error`: Apenas erros
- `warn`: Warnings e erros
- `info`: Informações gerais, warnings e erros
- `debug`: Informações detalhadas para debugging
- `trace`: Informações extremamente detalhadas

### 8.2 Formato de Log

```
[2025-03-17 10:30:45.123] [INFO] [CollectionService] Creating collection at ./my-books
[2025-03-17 10:30:45.456] [DEBUG] [CollectionService] Schema: {"name": "books", ...}
[2025-03-17 10:30:46.789] [INFO] [CollectionService] Collection created successfully
```

### 8.3 Arquivo de Log

```bash
# Habilitar log em arquivo
zvec --log-file ./zvec.log collection create ./my-books

# Log com rotação
zvec --log-file ./logs/zvec-%DATE%.log --log-rotate daily
```

---

## 9. Performance e Otimizações

### 9.1 Processamento em Lote

- Operações de insert/upsert/update processadas em lotes configuráveis
- Paralelização automática quando possível
- Progress indicators para operações longas

### 9.2 Streaming de Grandes Volumes

```bash
# Stream de documentos de stdin
cat large_file.json | zvec doc insert ./my-collection --stream

# Export com streaming
zvec doc query ./my-collection --vector "..." --stream > results.ndjson
```

### 9.3 Cache

- Cache de schemas de collection
- Cache de conexões abertas
- Cache de configurações

---

## 10. Testes

### 10.1 Testes Unitários

- Parser de argumentos
- Validadores de input
- Formatadores de output
- Services (mocked)

### 10.2 Testes de Integração

- Operações CRUD completas
- Queries com filtros
- Schema evolution
- Embeddings

### 10.3 Testes E2E

- Fluxos completos de CLI
- Cenários de uso real
- Performance benchmarks

### 10.4 Cobertura de Código

Meta: **90%+ de cobertura**

---

## 11. Roadmap de Desenvolvimento

### Fase 1: Fundação (Semanas 1-2)

| Semana | Tarefas |
|--------|---------|
| 1 | Setup do projeto, estrutura de diretórios, configuração de build/test |
| 1 | Implementar CLI parser básico com commander |
| 1 | Sistema de configuração e logging |
| 2 | Comandos: `init`, `collection create`, `collection open`, `collection list` |
| 2 | Output formatters (JSON, table) |
| 2 | Testes unitários básicos |

### Fase 2: Operações CRUD (Semanas 3-4)

| Semana | Tarefas |
|--------|---------|
| 3 | Comandos de documento: `insert`, `upsert`, `fetch` |
| 3 | Validação de schemas e documentos |
| 3 | Processamento em lote |
| 4 | Comandos de documento: `update`, `delete` |
| 4 | Comandos de collection: `destroy`, `optimize`, `inspect` |
| 4 | Testes de integração |

### Fase 3: Queries e Filtros (Semanas 5-6)

| Semana | Tarefas |
|--------|---------|
| 5 | Comando `query` básico (single vector) |
| 5 | Parser de expressões de filtro |
| 5 | Parâmetros de índice customizáveis |
| 6 | Multi-vector query |
| 6 | Grouped query |
| 6 | Formatação avançada de resultados |

### Fase 4: Schema Evolution (Semana 7)

| Semana | Tarefas |
|--------|---------|
| 7 | Comandos: `add-column`, `drop-column`, `alter-column` |
| 7 | Comandos: `create-index`, `drop-index` |
| 7 | Validação de alterações seguras |

### Fase 5: AI Extensions (Semanas 8-9)

| Semana | Tarefas |
|--------|---------|
| 8 | Comando `embed dense` (local, OpenAI, Qwen, Jina) |
| 8 | Comando `embed sparse` (SPLADE, BM25) |
| 9 | Comando `rerank` (local, Qwen, RRF, weighted) |
| 9 | Integração com pipeline de query |

### Fase 6: Shell Interativo (Semana 10)

| Semana | Tarefas |
|--------|---------|
| 10 | Implementação do REPL |
| 10 | Histórico de comandos |
| 10 | Autocomplete |
| 10 | Variáveis de sessão |

### Fase 7: Polish e Release (Semanas 11-12)

| Semana | Tarefas |
|--------|---------|
| 11 | Tratamento de erros abrangente |
| 11 | Documentação completa |
| 11 | Exemplos e tutoriais |
| 12 | Testes E2E |
| 12 | Performance optimization |
| 12 | Release v1.0.0 |

---

## 12. Métricas de Sucesso

### 12.1 Funcionalidade

- ✅ 100% das operações do Zvec SDK cobertas
- ✅ Suporte a todos os tipos de dados e índices
- ✅ Compatibilidade com Python e Node.js SDKs

### 12.2 Usabilidade

- ✅ Curva de aprendizado < 5 minutos para operações básicas
- ✅ Help contextuais e mensagens de erro claras
- ✅ Documentação completa com exemplos

### 12.3 Performance

- ✅ Overhead < 10% vs uso direto do SDK
- ✅ Suporte a datasets com milhões de documentos
- ✅ Latência de query < 100ms para collections otimizadas

### 12.4 Qualidade

- ✅ Cobertura de testes > 90%
- ✅ Zero bugs críticos no release
- ✅ Código lintado e formatado

---

## 13. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Mudanças na API do Zvec | Média | Alto | Manter compatibilidade com versões, testes automatizados |
| Performance insuficiente | Baixa | Médio | Profiling, otimizações, processamento paralelo |
| Complexidade excessiva | Média | Médio | Design modular, documentação clara |
| Bugs em edge cases | Alta | Médio | Testes extensivos, beta testing |

---

## 14. Considerações Finais

### 14.1 Filosofia de Design

1. **Simplicidade primeiro**: Comandos intuitivos e descritivos
2. **Completude**: Acesso a todas as funcionalidades do Zvec
3. **Performance**: Operações eficientes mesmo com grandes volumes
4. **Extensibilidade**: Arquitetura modular para futuras expansões

### 14.2 Manutenção

- Versionamento semântico (SemVer)
- Changelog automatizado
- Depreciação gradual de features
- Suporte a múltiplas versões do Zvec SDK

---

## 15. Referências

- [Documentação Oficial do Zvec](https://zvec.org/en/docs)
- [Zvec Node.js API Reference](https://zvec.org/api-reference/nodejs/)
- [Zvec GitHub Repository](https://github.com/alibaba/zvec)
- [Bun Documentation](https://bun.sh/docs)
- [Commander.js Documentation](https://github.com/tj/commander.js)
- [Inquirer.js Documentation](https://github.com/SBoudrias/Inquirer.js)

---

*Documento criado em: 2025-03-17*  
*Última atualização: 2025-03-17*
