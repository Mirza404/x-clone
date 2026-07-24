# Current Gaps — Implementation Plan

Scope-and-design document for the four "A0" quick wins from [IDEAS.md](IDEAS.md). **No code implemented here** — this is the blueprint. Everything else in IDEAS.md is deferred.

The four gaps:

1. Harden the backend Dockerfile (multi-stage, compiled JS, non-root).
2. Frontend runtime image via Next.js `standalone` output.
3. Real MongoDB service container in CI.
4. Coverage collection + threshold gate.

---

## 0. Current State (verified)

| Thing                      | Today                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend build              | No build step. `start` = `ts-node ./src/index.ts`. `tsconfig.json` has no `outDir`/`rootDir` (all defaults), `target: es2016`, `module: commonjs`. |
| Backend Dockerfile         | Single stage, `node:20-alpine`, `npm ci`, `COPY . .`, runs `npm start` (ts-node) as **root**.                                                      |
| Backend tests              | `node --test -r ts-node/register` over `src/**/*.test.ts` via `scripts/run-tests.js`. No coverage, no DB service.                                  |
| Frontend Dockerfile        | 3-stage (`deps`/`builder`/`runner`), but `runner` copies full `.next` + full `node_modules` and runs `npm start`. Not using `standalone`.          |
| Frontend `next.config.mjs` | Empty config (`{}`).                                                                                                                               |
| Frontend tests             | Jest + `next/jest`, `coverageProvider: 'v8'` already set, jsdom, `@/` alias. No threshold.                                                         |
| `.dockerignore`            | Both exist but thin (backend: node_modules, npm-debug.log, .env, .env.example).                                                                    |
| CI                         | 8 jobs; `test` job runs `npm test` with **no Mongo**; no coverage anywhere.                                                                        |

---

## Gap 1 — Harden the backend Dockerfile

### Goal

Ship compiled JavaScript on a slim, non-root runtime image. Remove the dev toolchain (`ts-node`, TypeScript, dev deps) from what actually runs.

### Steps

1. **Add a build to the backend.**
   - Set in `backend/tsconfig.json`: `"outDir": "./dist"`, `"rootDir": "./src"`. Confirm `noEmit` stays off for build (the `typecheck` script keeps `--noEmit` separately).
   - Add scripts to `backend/package.json`:
     - `"build": "tsc -p tsconfig.json"`
     - change `"start"` → `"node dist/index.js"` (prod). Keep `"dev": "nodemon"` (ts-node) for local.
   - Note: `scripts/`, `*.test.ts` should not ship. Either exclude tests via `tsconfig` `"exclude": ["**/*.test.ts", "scripts"]` or a separate `tsconfig.build.json`. Recommend a `tsconfig.build.json` that `extends` the base and adds the excludes, so `typecheck` still sees everything.
   - Env loading caveat: `db/connection.ts` resolves `../../backend/.env` from `__dirname`. Under `dist/` the relative depth changes — verify the `.env` path resolves in the container (or rely on Docker `env_file`/env vars and drop the file lookup in prod). Flag to test.

2. **Rewrite `backend/Dockerfile` as multi-stage:**

   ```
   deps    → npm ci (all deps, needed to build)
   build   → COPY src + tsconfig, RUN npm run build → dist/
   runner  → npm ci --omit=dev, COPY --from=build /app/dist, USER node, CMD ["node","dist/index.js"]
   ```

   - `runner` base `node:20-alpine`, `WORKDIR /app`, `EXPOSE 3001`.
   - Non-root: `USER node` (built into the node image).
   - `NODE_ENV=production`.

3. **Expand `backend/.dockerignore`:** add `dist`, `.git`, `*.test.ts`, `coverage`, `.env*`, `nodemon.json`, `README*`, editor/OS cruft. Keeps build context small.

### Acceptance

- `docker build ./backend` succeeds; final image runs `node dist/index.js`, connects to Mongo, serves `:3001`.
- Image is smaller than current and contains no `ts-node`/TypeScript in the runtime layer.
- Container runs as non-root (`whoami` = `node`).

### Risks

- The `.env` path-resolution change under `dist/` (above) — must verify or the container fails to load config.
- `docker-compose.yml` uses `build: ./backend` + `env_file` — still works; confirm after the multi-stage change.

---

## Gap 2 — Frontend `standalone` runtime image

### Goal

Cut the frontend runtime image by shipping only Next's traced output instead of full `node_modules`.

### Steps

1. **Enable standalone output** in `frontend/next.config.mjs`:

   ```js
   const nextConfig = { output: 'standalone' };
   ```

   Produces `.next/standalone` (minimal server + only required node_modules) + `.next/static`.

2. **Rewrite the `runner` stage** of `frontend/Dockerfile`:
   - `COPY --from=builder /app/.next/standalone ./`
   - `COPY --from=builder /app/.next/static ./.next/static`
   - `COPY --from=builder /app/public ./public` (if a `public/` dir exists — verify).
   - `CMD ["node", "server.js"]` (standalone emits `server.js`; replaces `npm start`).
   - Add `USER node`, keep `EXPOSE 3000`, `NODE_ENV=production`.

3. **Env at build vs run.** The Dockerfile already passes a placeholder `MONGODB_URL` at build. `NEXT_PUBLIC_*` vars are inlined at **build** time — confirm which public vars the runtime needs baked in (e.g. `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`) and pass them as build args, matching the CI `build` job's env list. Server-only vars stay runtime.

4. **`.dockerignore`:** already ignores `.next` — good (forces a clean build). Add `coverage`, `.git`.

### Acceptance

- `docker build ./frontend` succeeds; runner starts via `node server.js` and serves `:3000`.
- Runner image no longer copies full `node_modules`; measurably smaller.
- App renders and can reach the backend URL.

### Risks

- Missing `public/` copy → 404 on static assets. Verify the dir.
- A `NEXT_PUBLIC_*` var not present at build time → wrong/blank value at runtime. Keep the build-arg list in sync with CI.

---

## Gap 3 — Real MongoDB in CI

### Goal

Run backend tests (and any future integration tests) against a real MongoDB, not only mocks.

### Steps

1. **Add a service container to the `test` job** in `.github/workflows/ci.yml`:

   ```yaml
   services:
     mongo:
       image: mongo:7
       ports: ['27017:27017']
       options: >-
         --health-cmd "mongosh --eval 'db.runCommand({ ping: 1 })'"
         --health-interval 10s --health-timeout 5s --health-retries 5
   env:
     MONGODB_URL: 'mongodb://localhost:27017/xclone-ci'
   ```

   (mongo:7 ships `mongosh` for the healthcheck.)

2. **Make the backend test setup honor `MONGODB_URL`.** Confirm the test suite either connects to `process.env.MONGODB_URL` or is fully mocked. For real-DB integration tests:
   - Connect in a setup hook, use a throwaway DB name, and clean collections between tests.
   - Keep existing unit tests mock-based; add integration tests as a separate concern (don't force everything onto the DB).

3. **Decide scope for v1 of this gap:** minimum = make the DB _available_ in CI and point the suite at it so nothing silently mocks what should be real. Stretch = add a first real integration test (e.g. a controller round-trip) to prove the wiring.

### Acceptance

- CI `test` job has a healthy `mongo` service; tests run green against it.
- At least the connection path is exercised against a real DB (no infinite hang / connection error).

### Risks

- Tests that assume no DB may need isolation (unique DB per run, cleanup) to avoid cross-test bleed.
- Startup race — rely on the service `health-cmd`, not a fixed sleep.

---

## Gap 4 — Coverage collection + threshold gate

### Goal

Measure test coverage on both projects, fail CI below a threshold, publish the report.

### Steps

**Frontend (Jest — easy, `v8` provider already set):**

1. Add to `frontend/jest.config.ts`:
   ```ts
   collectCoverage: true,
   collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.test.{ts,tsx}'],
   coverageThreshold: { global: { lines: <N>, functions: <N>, branches: <N>, statements: <N> } },
   ```
   Start `<N>` at the current measured level (baseline, no drop), ratchet up over time.
2. `test:ci` already runs jest — coverage rides along. Add `--coverage` explicitly if not auto.

**Backend (`node --test`):**

1. Node 20 supports `--experimental-test-coverage`. Update `scripts/run-tests.js` to pass it, or add a `test:coverage` variant.
2. Alternative if the experimental reporter is noisy on Node 20: wrap with **`c8`** (`c8 node --test ...`) for lcov output + threshold flags (`--lines`, `--check-coverage`). Recommend `c8` for a stable threshold gate + lcov artifact.

**CI wiring:**

1. In the `test` job, after tests, **upload coverage artifacts** (`actions/upload-artifact`) — lcov/HTML for both projects.
2. Optional: PR coverage comment (e.g. a coverage-report action) or Codecov/Coveralls integration (free for public repos).
3. Threshold failure = job failure (the gate).

### Acceptance

- CI produces coverage for backend + frontend, uploaded as artifacts.
- Coverage below threshold fails the build.
- Thresholds seeded at current levels so the gate doesn't block day one.

### Risks

- Backend experimental coverage flag behavior differs Node 20 vs 22 (the test runner already documents a Node-version glob quirk) — `c8` sidesteps this.
- Setting thresholds too high initially blocks all PRs — baseline first, ratchet later.

---

## Suggested order

1. **Gap 1 (backend Dockerfile)** — introduces the backend build (`dist/`), which several later ideas (real CD) depend on. Highest structural value.
2. **Gap 2 (frontend standalone)** — small, isolated, visible image-size win.
3. **Gap 4 (coverage)** — independent; frontend half is trivial, backend half needs the `c8`/flag decision.
4. **Gap 3 (Mongo in CI)** — most test-suite refactor risk; do after the build/image work is stable.

Each gap is independently shippable and commit-able. No gap depends on another except that Gap 1's `dist/` build is a prerequisite for the deferred CD work in IDEAS.md.

---

## Cross-cutting checks (before calling any gap done)

- Root `npm run check` (`format:check && lint && typecheck && build && test`) stays green.
- Prettier `3.6.2` parity across root/backend/frontend (known drift risk) — new config files must pass `format:check`.
- No new high-severity `npm audit` findings (`deps:check`) — relevant if `c8` is added.
- `docker-compose up` still brings both services up after Dockerfile changes.
