# x-clone Ideas Backlog

A playground/portfolio backlog. Two tracks: **product correctness/features** and **DevOps + AI automation**. Not a commitment, just a menu to pull from, ordered so that each item is independently shippable and commit-able.

**Status legend:** `[ ]` not started, `[~]` partially done, `[x]` done

## Related documents: read this first

**This file is the single source of truth for outstanding work.**
[WEBSOCKET_MESSAGING_PLAN.md](WEBSOCKET_MESSAGING_PLAN.md) is an **as-built record** (not a to-do list): the messaging system it describes is shipped, and it's kept only for the architectural rationale (socket auth model, transport choice) that the code itself doesn't explain. If it disagrees with this file about what remains to be done, this file wins.

---

## Reality check: what actually exists today (verified 2026-07-29)

- **CI** (`.github/workflows/ci.yml`): format, lint, typecheck, test, build, dependency-audit, gitleaks secret-scan, a real `mongo:7` service container, coverage upload for both projects, concurrency + `cancel-in-progress`, composite `install-deps` action.
- **Deployment: already live.** Frontend serving at `https://x-clone-frontend-voi9.onrender.com`. Backend deployed too via `render.yaml`, both on Render's **free** plan (sleeps after inactivity; see the socket caveat in F5).
- **Dockerfiles hardened, both sides.** Backend multi-stage running compiled `dist/` as `USER node`. Frontend uses Next `output: 'standalone'`, and the runner copies `public/` (favicon ships, and `Avatar.tsx` renders an inline SVG fallback rather than fetching one, so it can never 404).
- **Coverage gate is live.** `backend/.c8rc.json` thresholds ratcheted to measured levels (lines 85 / functions 95 / branches 75 / statements 85); frontend Jest has a coverage threshold too.
- **Messaging is built and hardened.** `Conversation`/`Message` models, `message-controller.ts`, `useSocket.ts`, `useMessages.ts`, `useConversations.ts`, `MessageThread.tsx`, graceful `SIGTERM`/`SIGINT` shutdown (`io.close()` → `server.close()` → Mongo disconnect). Seed wipe cleans up orphaned conversations/messages; `npm run seed:wipe` is an explicit script.
- **Design system fully migrated.** No page left on hardcoded `bg-black`/`text-white`/`border-gray-*`; theme (light/dark) persists via `localStorage`, no mid-session flip.
- Two npm projects (`backend/` Express+Mongoose, `frontend/` Next.js App Router), no workspaces.

Everything that was Part P / P2 / D1 in earlier drafts of this file (the product-correctness sweep and the four D1 DevOps gaps) is now done and has been removed from this file to keep it focused on what's actually outstanding: **Part F** (product features), **Part D** from D2 on (pipeline beyond the base Dockerfiles/CI), and **Part AI**.

---

## Part F: Product features

### F1. Messages as its own full-bleed view `[x]`

Messaging used to be crammed into the 600px center column, because `(navPages)/messages/page.tsx` rendered inside the root layout's shared three-column shell alongside every other route.

**Shipped:** the desktop chrome (`NavMenu` + capped `600px` `<main>` + right `SideBar`) moved out of the root layout into `frontend/src/app/(feed)/layout.tsx`, which now owns every feed route (`posts`, `newPost`, and the rest of the former `(navPages)` group). `frontend/src/app/messages/` sits outside that group with its own `layout.tsx`: full-bleed content, no `SideBar`, no width cap, `NavMenu` kept (so users aren't stranded with no navigation) but its "Messages" entry was dropped — the floating chat FAB (`FloatingActions`, feed-only now) plus `MessagePopover`'s "Messages" link are the entry points instead. Root `layout.tsx` holds only `<html>`/`<body>`, the theme-init script, and providers.

### F2. Search: posts and messages `[x]`

- **Backend:** `GET /api/post/search?q=` added, case-insensitive regex over `content` and denormalized `name`, paginated like `getPostsPaginated`.
- **Frontend, posts:** `SideBar`'s search input is wired to `/explore?q=`; `explore/page.tsx` renders results reusing `PostItem` via a debounced React Query call keyed on the query string.
- **Frontend, messages:** a client-side filter box above `ConversationList` narrows the already-loaded conversation summaries by participant name. Searching message contents (a backend concern) is not built — flag as a future step if wanted.

### F3. Comments at feature parity with posts `[ ]`

Comments currently support text + likes + one level of replies. Posts support images (`Post.images: string[]`); the `Comment` schema (`backend/src/models/Comment.ts`) has **no `images` field at all**.

- Add `images: [String]` to `CommentSchema`, mirroring `PostSchema`'s constraints.
- Wire the existing upload path (`FileUpload` component, used by `NewPostModal`/`MobileNewPost`/`EditPostPage`) into `NewComment.tsx` and `NewReply.tsx`.
- `comment-controller.ts`'s `createComment` must accept and persist `images`.
- Add the field to both the backend `LeanComment` type and the frontend `Comment` type.
- **Decide:** keep replies 2-level (`comment-tree.ts` currently assumes this) or go fully recursive. 2-level is almost certainly enough for parity; recursive is a much bigger lift and changes `collectCommentThreadIds`, the thread page, and pagination.

### F4. Placeholder pages `[ ]`

`bookmarks`, `communities`, `notifications`, `explore` (partially addressed by F2's results view, but still a stub outside search results), and others are all one-line stubs returning plain text. On a live portfolio site these are dead ends a visitor will click. Either implement, or render a consistent themed "Coming soon" empty state (there's already an `EmptyState` component) so they look intentional rather than unfinished.

---

## Part D: DevOps / CI-CD

D1 (Dockerfile hardening, real Mongo in CI, coverage gate) is fully shipped — see the reality check above. Numbering below continues from D2 to keep history/links stable.

### D2. Automate the deploy that already exists `[~]`

The site is live on Render, but reframe the goal: the win here is no longer "get a URL," it's **a gated, reproducible pipeline to it.**

- On merge to `main`: build backend + frontend images, push to **GHCR** (`ghcr.io/<user>/x-clone-*`).
- Deploy job **gated on `test` + `build` passing**. That's the interesting part, and the part a reviewer looks for.
- Document the rollback path. A deploy story without a rollback story is half a story.
- The hardened images already exist (D1), so this can start immediately.

### D3. Preview environments per pull request `[ ]`

- Ephemeral deploy per PR; bot comments the preview URL. Auto-teardown on close/merge.
- **Render has native PR previews.** Check whether that's sufficient before building this by hand. Using the platform feature and writing up _why_ is a perfectly good answer.
- Depends on D2.

### D4. End-to-end tests in CI (Playwright) `[ ]`

- Boot both services via `docker-compose` in CI.
- Smoke flow: sign in (mock provider), create a post, comment, send a DM.
- Headless; upload the Playwright trace as an artifact on failure.

### D5. Reusable workflow / matrix refactor `[ ]`

The `format`/`lint`/`typecheck`/`test` jobs all repeat `checkout + install-deps + run <x>`. Collapse into a matrix or a reusable workflow. Signal: you refactor pipelines, not just author them.

### D6. Release automation `[ ]`

Conventional commits (already the convention here) feeding `release-please` or `semantic-release`. Auto CHANGELOG, version tags, GitHub Releases.

### D7. Dependency automation `[ ]`

**Renovate** or **Dependabot**; auto-merge patch/minor once CI is green. Pairs with the existing `dependency-audit` job. Watch: prettier version parity across root/backend/frontend is a known drift risk; pin all three together.

### D8. Observability `[ ]`

- Replace `morgan` with structured logging (**pino**).
- **OpenTelemetry** traces from Express.
- `/healthz` (liveness) + `/readyz` (readiness, checks Mongo).
- Ship to **Grafana Cloud** free tier; build one dashboard.
- Story: "I can debug prod." Most valuable _after_ D2, when there's a real pipeline producing deploys worth observing.

### D9. Infrastructure as Code (Terraform) `[ ]`

Terraform for the Mongo Atlas cluster + host + DNS. Even a small module is a strong signal. State in a remote backend.

### D10. Kubernetes: stretch, label it "learning" `[ ]`

Local `kind`/minikube manifests or a Helm chart for the two services + Mongo. Overkill for the app size, so frame it explicitly as a learning exercise, not production.

### D11. Load testing `[ ]`

**k6** script hitting the messaging + feed endpoints. Run nightly in CI; publish results as an artifact / trend.

---

## Part AI: AI automation

### AI1. In-app AI features `[ ]`

1. **Semantic search + RAG on posts.** _Best infra fit, top AI pick._ Embed each post on create; store vectors in **Mongo Atlas Vector Search** (already on Atlas, so zero new infra). "Search by meaning" + "related posts". Needs a backfill job for existing posts. F2's search endpoint now exists — treat this as swapping the retrieval strategy behind it, not a parallel system.
2. **AI compose / reply assist.** "Improve this post", tone rewrite, autocomplete, with **streamed** tokens to the UI. Pairs naturally with messaging (smart replies in DMs).
3. **Automated content moderation.** Run new posts + DMs through a moderation model; flag or hold for review. Real trust-and-safety signal.
4. **AI feed ranking.** Rank the timeline by embedding similarity to a user's interest profile instead of pure `createdAt`.
5. **Thread / conversation summarizer.** "Summarize this comment tree / this DM thread".
6. **Notification / digest agent.** Weekly agent summarizing your activity, drafting candidate posts.

### F6. "Backend is waking up" state for cold starts `[ ]`

Both Render services are on `plan: free`, so the backend sleeps after inactivity and cold-starts in roughly 30-60s. Today that failure mode is invisible and looks like the app is broken:

- **Messages:** the socket can't connect. `useSocket` retries silently; the thread just sits there.
- **Feed:** `getPostsPaginated` (and every other `fetchInfo` call) is a plain axios request with **no timeout**, so React Query stays `isLoading` for the whole cold start. The user watches a spinner for 30+ seconds with no explanation.

So this is **not a messages-only problem**. A blocker on `/messages` alone would leave the more-visited page equally broken, just less obviously.

**Two traps that make the naive version worse than nothing:**

1. **Don't render the waking state immediately.** `connected` is `false` for the first moments on a _warm_ backend too, and REST calls are briefly `isLoading` on every navigation. Gating purely on "not connected" would flash a scary banner on every single page load. **Only show it after a grace period of continuous failure (~2s), and never on the first tick.**
2. **Don't make it a permanent modal.** If the backend is genuinely down (not asleep), a blocking screen with no escape traps the user. After ~60s, switch from "waking up" to "can't reach the server" with a manual retry, and let them navigate away.

**Suggested shape:**

- A small shared hook, `useBackendWaking()`, that reports `'ok' | 'waking' | 'unreachable'`. Derive it from `useSocket().connected` plus elapsed time; a disconnected socket while `status === 'authenticated'` is the cleanest single signal, since the socket reconnects far more aggressively than a one-shot REST call.
- **Messages:** a blocking state is appropriate; the view is genuinely useless without a socket. Reuse `EmptyState` with a spinner: _"Waking the server up... free hosting sleeps after inactivity, this takes up to a minute."_ Being explicit about _why_ turns a bug report into a shrug.
- **Feed and elsewhere:** a dismissible top banner, **not** a blocker. The feed can still render cached posts from the Query cache while the backend wakes.
- Add a `timeout` to the axios instance in `apiClient.ts` so REST calls fail loudly instead of hanging forever; currently there is none.

**Cheap alternative worth pricing first:** an uptime pinger (cron-job.org, UptimeRobot, or a scheduled GitHub Action) hitting the backend every ~10 minutes keeps the free instance awake and makes this whole problem mostly disappear. That's ~10 minutes of setup versus a few hours of UI work. **Do the pinger first**, then decide whether the UI state is still worth building. It still is for genuine outages and for the very first request after a deploy, but it stops being urgent. Pairs naturally with D8's `/healthz` endpoint, which gives the pinger something cheap to hit.

### F5. Messaging follow-ups carried over from the as-built record `[ ]`

Inherited from `WEBSOCKET_MESSAGING_PLAN.md`, which is now a design-rationale record rather than a to-do list. These are the parts of it that never shipped.

**Unresolved product decisions** (the plan's §13, all still on v1 assumptions, never confirmed):

1. **Who can DM whom?** `createConversation` currently guards only `recipientId !== userId`, so **anyone can DM anyone**. If that's not wanted, the guard belongs in `message-controller.ts`'s get-or-create. On a public portfolio site this is also the spam surface.
2. **Message length cap:** 2000 chars, assumed and shipped. Confirm or change.
3. **Presence scope:** currently broadcast to conversation partners only, not followers. Confirm.
4. **Media in messages:** deferred; `Message` has no `images` field. Note this is the _same_ gap as F3 for comments; if you do one, do both, and share the upload path.

**Deferred infrastructure** (the plan's §9): horizontal scaling needs `@socket.io/redis-adapter` + Redis, presence moved out of the in-memory `Map` into Redis, and sticky sessions at the load balancer. Single-instance is correct for now; this is only worth doing if the app ever runs more than one backend instance. Depends on nothing; blocks nothing.

**Free-tier caveat when testing messaging on the live site.** `render.yaml` puts the backend on `plan: free`, which sleeps after inactivity and cold-starts on the next request (tens of seconds). Consequences when manually verifying sockets in production:

- The first socket connection after idle will fail or hang while the backend wakes. Socket.IO retries, so it recovers, but "it looked broken for 30 seconds" is expected, not a bug.
- Presence is an in-memory `Map` (`socket/presence.ts`), so a sleep wipes all online state.
- Graceful shutdown (shipped) makes the sleep/wake cycle noticeably cleaner, which is a second reason F6's pinger is worth doing early.

If messaging ever looks broken in production, **check whether the backend is awake before debugging the socket code.** This is the most likely explanation and costs nothing to rule out.

**F6 addresses the user-facing half of this** (telling people the server is waking rather than showing a dead spinner), and proposes an uptime pinger that removes most of the problem outright.

### AI2. Local Ollama echo-bot for WebSocket testing `[ ]`

There's currently no easy way to manually verify the messaging WebSocket round-trip end to end (`useSocket.ts`, `MessageThread.tsx`): it needs two accounts in two browser sessions. Instead, run a tiny local model as a second "user."

- Small Node script: connects as a seeded user over the same socket auth the frontend uses, listens for incoming DMs, calls a local Ollama model (e.g. `llama3.2:1b`, fast and tiny) for a reply, sends it back.
- Gives a live, self-testing conversation partner for local dev.
- **Not a CI job.** It needs Ollama running locally. If you want socket coverage in CI, that's D4's job with a scripted fake client, not a model.
- Nice side effect: it exercises the same socket path a real second user would, so it catches presence/unread/ordering bugs that a single-session test can't.

### AI3. AI in the DevOps loop `[ ]`

1. **AI PR reviewer in CI.** A GitHub Action runs an LLM over the diff and posts review comments.
2. **AI-generated PR descriptions / changelogs** from commit history.
3. **Flaky-test / failure triage bot.** On red CI, an LLM reads the logs and comments probable cause + suggested fix.
4. **AI issue auto-labeler / triage** via LLM classification.
5. **Semantic release notes.** LLM turns merged PRs into a readable changelog.

---

## Sequencing

Dependencies are real; the ordering below respects them.

**Phase 1: the layout refactor and search — done.** F1 (messages as its own view) and F2 (search, posts + messages) both shipped; see the reality check and Part F above.

**Phase 2: pipeline.**

> D2 (gated deploy to the existing Render app), then D4 (E2E, now that the UI is stable), then D3 (PR previews)

**Phase 3: the differentiators.** Pick by interest; these are the resume centerpieces.

> AI1.1 (semantic search, reusing F2's endpoint), then AI3.1 (AI PR reviewer), then D8 (observability), then AI2 (Ollama socket bot, any time, it's independent and fun)

**Also open, do whenever fits:** F6 (cold-start UX — do the uptime pinger first, it's 10 minutes), F3 + F5.4 (image support on comments _and_ messages together, same upload path), F4 (placeholder pages), F5 (remaining messaging product decisions).

**Deliberately deprioritized:** D9 (Terraform), D10 (Kubernetes), D11 (load testing). All three are legitimate but only pay off on a project with real traffic or real infrastructure sprawl. Reach for them when the earlier phases are done, not before.
