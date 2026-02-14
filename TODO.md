# SolDocs - Critical Fixes TODO

## Evaluation Summary

Ran the full project. TypeScript compiles but **the product was fundamentally broken at runtime**: every single seed program failed because none store IDLs on-chain. API worked but returned only failures. No tests existed. Security holes in the store layer.

**Status: All critical, security, and hygiene issues resolved. 160 tests passing across 8 suites.**

---

## CRITICAL - Project Does Not Function

- [x] **C1: IDL sourcing is broken** — Fixed: Bundled 7 real IDLs from GitHub repos in `seed-idls/`. Added IDL upload endpoint (`POST /api/programs/:id/idl`). Agent now checks cached IDLs before on-chain fetch. Added Anchor IDL v2 support (`metadata.name` via `getIdlName()` helper).
- [x] **C2: Seed program addresses are wrong** — Fixed: Replaced with 7 verified programs (Drift, Phoenix, Orca Whirlpools, Meteora DLMM, OpenBook v2, Metaplex Token Metadata, SPL Stake Pool).
- [x] **C3: Failed programs can never be retried** — Fixed: `addToQueue()` now returns `{ item, isNew }` and resets failed items to 'pending' on re-add.
- [x] **C4: Bundle known IDLs for demo** — Fixed: 7 bundled IDLs in `seed-idls/` directory, pre-loaded into cache on first run.

## SECURITY

- [x] **S1: Path traversal in store** — Fixed: Added `sanitizeId()` with base58 regex validation.
- [x] **S2: XSS via markdown rendering** — Fixed: Added DOMPurify for markdown sanitization, `escapeHtml()` for dynamic content.
- [x] **S3: No API rate limiting** — Fixed: In-memory rate limiter on POST/DELETE endpoints (30 req/min/IP).
- [x] **S4: No request size limits** — Fixed: Added `express.json({ limit: '5mb' })`.

## TESTING — Zero Tests Exist

- [x] **T1: Add test framework** — Installed vitest, added test scripts.
- [x] **T2: Store tests** — 26 tests: CRUD, queue management, corrupt JSON recovery, path traversal rejection, stats.
- [x] **T3: API route tests** — 17 tests: all endpoints, validation, search, pagination, IDL upload, DELETE.
- [x] **T4: IDL parsing tests** — 9 tests: all 3 offsets, malformed/empty/oversized data.
- [x] **T5: Solana client tests** — 7 tests: retry logic (429, 503, non-retryable, max retries), validation.
- [x] **T6: Doc generator tests** — 5 tests: full generation, AI call counting, batching, empty IDLs, IDL v2 format.
- [x] **T7: Agent tests** — Fixed: 41 tests covering queue processing, error handling, upgrade detection, concurrency, webhooks, max retries.

## BUGS

- [x] **B1: `createServer` takes unused `port` param** — Fixed: removed parameter.
- [x] **B2: Corrupt JSON crashes app** — Fixed: `safeReadJson()` with corrupt file recovery and backup.
- [x] **B3: Queue items stuck in 'processing' forever** — Fixed: `recoverStuckItems()` on agent startup.
- [x] **B4: Race condition in file store** — Fixed: Added FileMutex with per-file async locking and *Safe method variants for all store mutations.
- [x] **B5: Agent state not persisted** — Fixed: state now initialized from `store.getStats()`, re-reads on `getState()`.
- [x] **B6: No Express error middleware** — Fixed: added global error handler.

## PROJECT HYGIENE

- [x] **P1: No .gitignore** — Fixed: added comprehensive `.gitignore`.
- [x] **P2: No README.md** — Fixed: comprehensive README with architecture, API docs, setup instructions, testing, Docker.
- [x] **P3: No API pagination** — Fixed: page/limit params with totalPages in response.
- [x] **P4: No request logging** — Fixed: added middleware logging for `/api/` routes.
- [x] **P5: No Dockerfile** — Fixed: multi-stage Dockerfile.
- [x] **P6: No LICENSE file** — Fixed: MIT License.

## IMPROVEMENTS (if time permits)

- [x] **I1: Frontend loading/error states** — Fixed: error messages shown, Enter key handler, better UX.
- [x] **I2: Program delete/re-queue endpoint** — Fixed: DELETE endpoint, retry on POST, IDL upload endpoint.
- [x] **I3: Export docs as Markdown file** — Fixed: Download .md button on program detail page.
- [x] **I4: Webhook/notification on doc completion** — Fixed: WEBHOOK_URL env var, POST payload with doc summary, 10s timeout, non-blocking.
- [x] **I5: Agent concurrency** — Fixed: AGENT_CONCURRENCY env var, Promise.allSettled batch processing.
- [x] **I6: Startup connection validation** — Fixed: RPC connectivity + API key format check on boot.
- [x] **I7: Max retry limit** — Fixed: MAX_ATTEMPTS=10, permanent failure + queue removal after limit.
- [x] **B7: Retry doesn't reset attempt counter** — Fixed: `addToQueue()` now resets attempts to 0 when re-adding a failed program.
- [x] **B8: DELETE doesn't clean up files** — Fixed: DELETE endpoint now removes IDL cache and doc files from disk.
