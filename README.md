# SolDocs

**Autonomous Solana Program Explorer & Documentation Agent**

SolDocs is an AI-powered agent that autonomously discovers Solana programs, fetches their Anchor IDLs, and generates comprehensive human-readable documentation using Claude AI. It serves everything through a web explorer and REST API.

## Why SolDocs?

Solana developers struggle to understand deployed on-chain programs. IDLs are machine-readable but not human-friendly. SolDocs bridges this gap by:

- **Autonomously** discovering and documenting Solana programs
- **AI-generating** comprehensive docs: overviews, instruction references, account schemas, security analysis
- **Detecting upgrades** and automatically re-documenting changed programs
- **Serving** everything through a searchable web explorer and REST API

## Quick Start

```bash
# Clone and install
cd src
npm install

# Configure environment
cp .env.example .env
# Edit .env with your keys:
#   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
#   ANTHROPIC_API_KEY=sk-ant-...

# Run
npm run dev
```

Open http://localhost:3000 to see the web explorer.

The agent automatically seeds 7 well-known programs (Drift, Phoenix, Orca Whirlpools, Meteora DLMM, OpenBook v2, Metaplex Token Metadata, SPL Stake Pool) on first run and begins generating documentation.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   SolDocs Agent                      │
│                                                      │
│  ┌──────────┐   ┌───────────┐   ┌────────────────┐  │
│  │Discovery │──▶│IDL Fetcher│──▶│Claude AI DocGen│  │
│  │  Loop    │   │(chain/    │   │(4-pass:        │  │
│  │          │   │ bundled/  │   │ overview,       │  │
│  │          │   │ uploaded) │   │ instructions,   │  │
│  │          │   │           │   │ accounts,       │  │
│  │          │   │           │   │ security)       │  │
│  └──────────┘   └───────────┘   └────────┬───────┘  │
│                                           │          │
│  ┌──────────┐   ┌───────────┐            │          │
│  │ Express  │◀──│JSON Store │◀───────────┘          │
│  │ API +    │   │(programs, │                        │
│  │ Web UI   │   │ docs, IDLs│                        │
│  └──────────┘   │ queue)    │                        │
│                  └───────────┘                        │
└─────────────────────────────────────────────────────┘
```

## IDL Sourcing

SolDocs supports three ways to get program IDLs:

1. **Bundled IDLs** — Ships with 7 pre-fetched IDLs for well-known programs, ready to document on first run
2. **On-chain fetch** — Derives the Anchor IDL PDA and attempts to fetch + decompress from the Solana blockchain
3. **Manual upload** — Upload any IDL via `POST /api/programs/:id/idl` for programs without on-chain IDLs

Supports both Anchor IDL v1 (`name` field) and v2 (`metadata.name` field) formats.

## AI Documentation Pipeline

Each program goes through a 4-pass Claude AI analysis:

| Pass | Purpose | Details |
|------|---------|---------|
| 1 | **Program Overview** | Architecture, key features, instruction summary |
| 2 | **Instruction Docs** | Per-instruction docs with account tables, args, TypeScript examples (batched 5 at a time) |
| 3 | **Account & Type Docs** | Account schemas, custom types, events, error codes |
| 4 | **Security Analysis** | Access control, common pitfalls, integration best practices, trust assumptions |

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/agent/status` | Agent state, stats, errors |
| `GET` | `/api/programs` | List programs (supports `?search=`, `?page=`, `?limit=`) |
| `GET` | `/api/programs/:id` | Full program docs |
| `GET` | `/api/programs/:id/idl` | Raw cached IDL |
| `POST` | `/api/programs` | Add program to queue `{ "programId": "..." }` |
| `POST` | `/api/programs/:id/idl` | Upload IDL for a program |
| `DELETE` | `/api/programs/:id` | Remove program and its docs |
| `GET` | `/api/queue` | View processing queue |

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SOLANA_RPC_URL` | Yes | — | Solana RPC endpoint |
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key for Claude |
| `API_PORT` | No | `3000` | HTTP server port |
| `AGENT_DISCOVERY_INTERVAL_MS` | No | `300000` | Agent loop interval (ms) |
| `AGENT_CONCURRENCY` | No | `1` | Programs to process in parallel |
| `WEBHOOK_URL` | No | — | POST notification on doc completion |

## Testing

```bash
npm test           # Run all tests (243 tests across 10 suites)
npm run test:watch # Watch mode
```

Test coverage includes:
- **Agent** (41 tests) — Lifecycle, concurrency, webhooks, discovery, error handling, IDL changes, max retry limits
- **Store** (31 tests) — CRUD, queue management, mutex locking, corrupt JSON recovery, path traversal security, file cleanup
- **API** (18 tests) — All endpoints, validation, search, pagination, file cleanup on DELETE
- **IDL parsing** (9 tests) — All Anchor format offsets, edge cases
- **Solana client** (7 tests) — Retry logic, exponential backoff
- **Config** (27 tests) — Required env vars, defaults, optional vars, concurrency bounds, NaN-safe numeric parsing
- **Startup** (6 tests) — RPC connection validation, API key format checks
- **Doc generator** (45 tests) — Full pipeline, batching, IDL v2 format, error propagation, markdown structure, validation warnings, prompt template content verification
- **AI client** (22 tests) — Rate limiting, retry logic (429/529/500), exponential backoff, error handling, model configuration
- **Webhook** (19 tests) — Payload structure, overview truncation, instruction count parsing, HTTP error handling, timeout, edge cases

## Deployment

### Docker

```bash
docker build -t soldocs .
docker run -p 3000:3000 \
  -e SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -v soldocs-data:/app/data \
  soldocs
```

### Docker Compose

```bash
# Copy and configure environment
cp src/.env.example .env
# Edit .env with your SOLANA_RPC_URL and ANTHROPIC_API_KEY

# Start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

Data is persisted in a named volume (`soldocs-data`) across container restarts. The container runs as a non-root user and includes a health check on `/api/health`.

## Project Structure

```
src/
├── index.ts                 # Entry point
├── config.ts                # Environment config
├── types.ts                 # TypeScript interfaces (IDL v1 + v2)
├── agent/
│   ├── core.ts              # Autonomous agent loop
│   ├── discovery.ts         # Program discovery + seed programs
│   └── webhook.ts           # Webhook notifications on doc completion
├── solana/
│   ├── client.ts            # RPC connection with retry
│   ├── idl.ts               # Anchor IDL PDA fetching + decompression
│   └── program-info.ts      # Program metadata
├── ai/
│   ├── client.ts            # Claude SDK wrapper with rate limiting
│   └── prompts.ts           # Doc generation prompt templates
├── docs/
│   └── generator.ts         # 4-pass doc generation orchestrator
├── api/
│   ├── server.ts            # Express setup, rate limiting, CORS
│   └── routes.ts            # REST API endpoints
├── store/
│   └── index.ts             # JSON file persistence with atomic writes
├── seed-idls/               # Bundled IDLs for 7 programs
├── public/                  # Web explorer SPA
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── tests/                   # 243 tests across 10 suites
```

## Security

- Startup validation of Solana RPC connectivity and API key format
- Path traversal prevention via base58 ID validation
- XSS protection via DOMPurify on all rendered markdown
- Request body size limits (5MB)
- Rate limiting on write endpoints (30 req/min/IP)
- Input validation on all API parameters

## License

MIT — see [LICENSE](LICENSE)
