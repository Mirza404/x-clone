# x-clone — Ideas Backlog

A playground/portfolio backlog focused on **DevOps / CI-CD** and **AI automation**. Each item notes portfolio value and how it fits this repo. Not a commitment — a menu to pull from.

Existing baseline (already in the repo, don't rebuild):

- CI (`.github/workflows/ci.yml`): format, lint, typecheck, test, build, dependency-audit, gitleaks secret-scan, concurrency + `cancel-in-progress`, composite `install-deps` action.
- Dockerfiles for backend + frontend, `docker-compose.yml`.
- Two npm projects (`backend/` Express+Mongoose, `frontend/` Next.js 16), no workspaces.

---

## Part A — DevOps / CI-CD

### A0. Gaps in what exists today (quick, high-value fixes)

1. **Harden the backend Dockerfile.** Currently runs `ts-node` in prod, no build step, single stage, root user, no `.dockerignore`.
   - Add a `tsc` build stage; run compiled JS (`node dist/index.js`) not `ts-node`.
   - Multi-stage: `deps` → `build` → slim `runner`.
   - Add `USER node` (non-root), `.dockerignore` (node_modules, .git, tests).
   - Story: "cut image size X→Y, removed dev toolchain from runtime."
2. **Frontend runtime image.** Add `output: 'standalone'` to `next.config` → copy only `.next/standalone` + `.next/static` into the runner. Much smaller image.
3. **Real MongoDB in CI.** The `test` job has no DB service. Add a `mongo` service container and run integration tests against a real database, not just mocks.
4. **Coverage gate.** Collect coverage (backend runner + frontend Jest), enforce a threshold, upload as artifact and/or comment on the PR.

### A1. Continuous Deployment to a real host _(top priority — gives a live URL)_

- On merge to `main`: build backend + frontend images, push to **GHCR** (`ghcr.io/<user>/x-clone-*`).
- Deploy to **Fly.io / Render / Railway** (Docker + managed Mongo friendly, low cost).
- Deploy job gated on `test` + `build` passing.
- Outcome: a live URL on the resume — the single biggest portfolio win. Unblocks A2, A3, observability, load testing.

### A2. Preview environments per pull request

- Ephemeral deploy per PR; bot comments the preview URL on the PR.
- Auto-teardown on PR close/merge.
- Signal: senior-level DevOps. Depends on A1 infra being in place.

### A3. End-to-end tests in CI (Playwright)

- Boot both services via `docker-compose` in CI.
- Smoke flow: login (mock provider) → create post → send a DM.
- Headless; upload Playwright trace as artifact on failure.

### A4. Reusable workflow / matrix refactor

- The `format`/`lint`/`typecheck`/`test` jobs repeat `checkout + install-deps + run <x>`.
- Collapse into a matrix or a reusable workflow.
- Signal: you refactor pipelines, not just author them.

### A5. Release automation

- Conventional commits (already have caveman-commit) → `release-please` or `semantic-release`.
- Auto CHANGELOG, version tags, GitHub Releases.

### A6. Dependency automation

- **Renovate** or **Dependabot**: automated dependency PRs.
- Auto-merge patch/minor once CI is green. Pairs with the existing `dependency-audit` job.
- Watch: prettier version parity across root/backend/frontend (known drift risk) — pin all three together.

### A7. Observability / production debugging

- Replace `morgan` with structured logging (**pino**).
- **OpenTelemetry** traces from Express.
- `/healthz` (liveness) + `/readyz` (readiness, checks Mongo) endpoints.
- Ship to **Grafana Cloud** free tier; build one dashboard.
- Story: "I can debug prod."

### A8. Infrastructure as Code (Terraform)

- Terraform for the Mongo Atlas cluster + host + DNS.
- Even a small module is a strong signal. State in a remote backend.

### A9. Kubernetes (stretch / labeled "learning")

- Local `kind`/minikube manifests or a Helm chart for the two services + Mongo.
- Overkill for the app size — frame explicitly as a learning exercise, not prod.

### A10. Load testing

- **k6** script hitting messaging + feed endpoints.
- Run nightly in CI; publish results as an artifact / trend.

---

## Part B — AI Automation

### B1. In-app AI features (product)

1. **Semantic search + RAG on posts** _(best infra fit — top AI pick)_
   - Embed each post on create; store vectors in **Mongo Atlas Vector Search** (already on Atlas → zero new infra).
   - "Search by meaning" + "related posts" surfaces.
   - Backfill job to embed existing posts.
2. **AI compose / reply assist**
   - "Improve this post", tone rewrite, autocomplete — **streamed** tokens to the UI.
   - Pairs naturally with the messaging feature (smart replies in DMs).
3. **Automated content moderation**
   - Run new posts + DMs through a moderation model; flag or hold for review.
   - Real trust-and-safety engineering signal.
4. **AI feed ranking**
   - Rank the timeline by embedding similarity to a user's interest profile instead of pure `createdAt`.
5. **Thread / conversation summarizer**
   - "Summarize this comment tree / this DM thread" button.
6. **Notification / digest agent**
   - Weekly agent: summarize your activity, draft candidate posts.

### B2. AI in the DevOps loop _(the automation angle)_

1. **AI PR reviewer in CI**
   - GitHub Action runs an LLM over the diff and posts review comments.
   - Can wrap the existing caveman `cavecrew-reviewer` or call the Claude API directly.
2. **AI-generated PR descriptions / changelogs** from commit history.
3. **Flaky-test / failure triage bot**
   - On red CI, an LLM reads the logs and comments probable cause + suggested fix on the PR.
4. **AI issue auto-labeler / triage** via LLM classification.
5. **Semantic release notes** — LLM turns merged PRs into a human-readable changelog.

---

## Recommended order (max learning per unit effort)

1. **A0.1 / A0.2 — Fix both Dockerfiles + `.dockerignore`.** Small, visible, prerequisite for real deploys.
2. **A1 — Continuous Deployment + live URL (GHCR images → Fly/Render).** Foundational; unblocks most of the rest.
3. **B1.1 — RAG semantic search on posts (Atlas Vector Search).** The AI centerpiece, no new infrastructure.
4. **A2 — PR preview environments.** The DevOps flex; builds on A1.
5. **B2.1 — AI PR reviewer Action.** Ties both interests (DevOps + AI) together.

Everything else is pull-when-ready. Each item is scoped to be independently shippable and commit-able.
