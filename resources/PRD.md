# SolDocs Agent - Task List

- [x] Fix B4: Race condition in `src/store/index.ts` (add per-file mutex)
- [x] Add T7: Agent tests in `src/tests/agent.test.ts` (8+ tests)
- [x] Add I4: Webhook notification on doc completion (WEBHOOK_URL env)
- [x] Add I5: Agent concurrency (AGENT_CONCURRENCY env, Promise.allSettled)
- [x] Verify all tests pass (75+), build clean, web UI loads
- [x] Prepare deployment artifacts (Dockerfile, docker-compose, README update)
- [x] Add I6: Startup connection validation (RPC + API key check on boot)
- [x] Add T8: Config module tests in `src/tests/config.test.ts` (25 tests)
- [x] Add I7: Max retry limit for failed programs (MAX_ATTEMPTS=10, permanent failure + queue removal)
- [x] Fix B5: API input validation hardening (NaN pagination, search param type safety)
