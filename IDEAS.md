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

### F3. Comments at feature parity with posts `[x]`

**Shipped:** `images: [String]` added to `CommentSchema` mirroring `PostSchema`'s constraints (max 8, optional), plus the backend `LeanComment` and frontend `Comment` types. `FileUpload` is wired into `NewComment.tsx` and `NewReply.tsx` with the same select-preview-remove flow as `NewPostModal`, uploading through the existing `uploadImages` (Cloudinary) path before the comment/reply mutation fires. `comment-controller.ts`'s `createComment` accepts and persists `images`; `findCommentsByPost`/`findCommentById` return it for both top-level comments and replies. `CommentItem.tsx`/`ReplyItem.tsx` render the images in a simple 1-2 column grid (not a full carousel like `PostItem` — comments don't need the swipe affordance for parity, just the ability to attach and see images).

**Decided:** kept replies 2-level, per the note in the original entry — `comment-tree.ts`'s `collectCommentThreadIds`, the thread page, and pagination all still assume 2 levels, unchanged.

### F4. Placeholder pages `[x]`

**Shipped:** `bookmarks`, `communities`, `notifications`, `jobs`, `premium`, `verifiedorgs` all render a themed `EmptyState` ("Coming Soon" + a one-line explanation) instead of a plain-text stub. `explore` has the full F2 search-results view, plus its own `EmptyState` ("Search X Clone") for the no-query case. This shipped alongside the `(feed)` route-group move (`fix: correct EmptyState import path after (feed) route group move`) but this file wasn't updated at the time.

### F7. Signed Cloudinary uploads and owned media references `[~]`

Replace the public unsigned `x_clone` upload-preset flow with authenticated,
browser-direct signed uploads. The Cloudinary cloud name remains the public,
stable value `dhumjqe9v`; credentials must live only in server runtime
configuration.

- Add backend-only `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
  `CLOUDINARY_API_SECRET` settings. Never expose the API secret through a
  `NEXT_PUBLIC_*` variable or a client bundle.
- Add an authenticated, rate-limited endpoint that signs a short-lived,
  server-controlled upload contract. Lock resource type, allowed formats, size,
  transformations, and a user-scoped folder or equivalent ownership metadata.
- Keep file transfer browser-to-Cloudinary, but make `uploadImages` request a
  signature first and upload with the returned timestamp, signature, API key,
  cloud name, and signed parameters.
- Return and retain verifiable Cloudinary asset metadata instead of trusting an
  arbitrary URL. Validate the Cloudinary response signature, exact tenant,
  canonical HTTPS delivery URL, user ownership, availability contract, URL
  length, and the eight-image limit before accepting new message references.
- Cover posts, comments, replies, and messages because they all share
  `uploadImages`; add backend/frontend regression coverage for authentication,
  tampering, expiry/failure, and ownership rejection.
- Roll out without downtime: deploy backend secrets and signing support first,
  then the signed client, verify production uploads, and only then disable the
  old unsigned `x_clone` preset. Signed uploads do not make delivery URLs
  private; signed/private delivery is a separate decision.

**Implemented 2026-08-16; production cutover remains:** the backend now owns
signature creation and completion under `x_clone/users/<userId>/<uuid>`, proves
the Cloudinary response against authoritative Admin API metadata, enforces the
exact `dhumjqe9v` tenant, allowed formats, 5 MiB size, canonical URL, URL length,
and ownership registry, and validates media at post/comment/reply/message write
boundaries. The browser still transfers files directly to Cloudinary, but no
longer reads a Cloudinary API secret or relies on the public cloud-name variable.

The `x_clone_signed` preset is signed-only with overwrite disabled and the
allowed format list. Cloudinary did not retain a preset-level maximum file-size
setting, so the client rejects resized files over 5 MiB and completion checks the
authoritative byte count, deleting an oversized asset before rejecting it.

**Observed cutover runbook:**

1. Configure backend `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
   `CLOUDINARY_API_SECRET` in Render. Set the manually managed
   `MEDIA_ALLOW_UNREGISTERED_CLOUDINARY=true` bridge immediately before the
   backend deployment.
2. Deploy the backend, then the signed frontend, and verify a production upload
   through signature, completion, persistence, and delivery.
3. Set `MEDIA_ALLOW_UNREGISTERED_CLOUDINARY=false` and disable the old unsigned
   `x_clone` preset. Retest new uploads and edits containing pre-migration media.
4. After old frontend builds can no longer be served, remove the obsolete
   frontend `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` build setting and Docker wiring.

The bridge is `sync: false` in `render.yaml`, never a committed `true`, so a later
Blueprint sync cannot silently reopen cross-user reuse of unregistered legacy
URLs. Mark F7 complete only after steps 2 and 3 are verified in production.

---

## Part D: DevOps / CI-CD

D1 (Dockerfile hardening, real Mongo in CI, coverage gate) is fully shipped — see the reality check above. Numbering below continues from D2 to keep history/links stable.

### D2. Automate the deploy that already exists `[x]`

**Shipped:** `ci.yml`'s `deploy` job (`needs: [checks, test, build, secret-scan]`, gated on push to `main`) builds both Dockerfiles and pushes to GHCR (`ghcr.io/<owner>/x-clone-backend`/`x-clone-frontend`, tagged `latest` + commit SHA), then calls Render's REST API (`POST /v1/services/{id}/deploys`) per service to trigger the actual deploy. `render.yaml` sets `autoDeploy: false` on both services so Render's own on-push auto-build (previously ungated) is no longer the deploy path — the CI job is. (Render's per-service Deploy Hook URL, the simpler option, wasn't exposed in this account's dashboard — API key + service ID used instead.)

Required repo secrets (Settings → Secrets and variables → Actions): `RENDER_API_KEY` (Render dashboard → Account Settings → API Keys), `RENDER_BACKEND_SERVICE_ID` and `RENDER_FRONTEND_SERVICE_ID` (the `srv-xxxxx` id in each service's dashboard URL), `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (same value already set in Render's frontend env, needed here too since Next bakes `NEXT_PUBLIC_*` into the build).

**Rollback:** Render dashboard → service → Deploys → pick a prior deploy → Rollback. The GHCR SHA-tagged images are a secondary, off-platform rollback path if ever needed.

GHCR images aren't currently consumed by Render (Render still builds from the Dockerfile itself on hook trigger, doesn't pull the pushed image) — pushing them is the "reproducible artifact" half of the story and sets up D9/D10 if pursued later. Wiring Render to actually deploy the built image (vs. rebuilding) isn't natively supported by Render's Docker runtime, so this is a known, accepted gap.

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

### F6. "Backend is waking up" state for cold starts `[x]`

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

**Decided 2026-08-04: skip the uptime pinger, ship the UI work.** The pinger's only job is keeping Render's free instance from sleeping, which wasn't wanted here — so the sleep/wake cycle stays as real behavior and this UI is what makes it legible instead of looking broken.

**Shipped:** `useBackendWaking()` (`frontend/src/app/hooks/useBackendWaking.ts`) derives `'ok' | 'waking' | 'unreachable'` from `useSocketContext().connected` while `status === 'authenticated'`, on a 2s grace period (never flags on the first tick) and a 60s cutoff to `'unreachable'`. Built without a ref-based "adjust state on prop change" pattern — this repo's stricter `eslint-plugin-react-hooks` config (`react-hooks/refs`, `react-hooks/set-state-in-effect`) forbids mutating refs during render, so both the hook and `BackendWakingBanner` key their effect on the derived boolean and only ever call `setState` from inside the timer/timeout callback, never synchronously in the effect body. `messages/page.tsx` blocks on `'waking'`/`'unreachable'` with `EmptyState` (spinner, then a manual retry past 60s) since the view is unusable without a socket; `BackendWakingBanner.tsx` is a dismissible, non-blocking banner mounted in `(feed)/layout.tsx` so it covers every feed route. `apiClient.ts`'s axios instance got a 15s `timeout` so REST calls fail loudly instead of hanging through a cold start.

### F5. Messaging follow-ups carried over from the as-built record `[x]`

Inherited from `WEBSOCKET_MESSAGING_PLAN.md`, which is now a design-rationale record rather than a to-do list. These are the parts of it that never shipped.

**Product decisions (the plan's §13) — confirmed 2026-08-04, no code changes:**

1. **Who can DM whom?** Confirmed: leave open. `createConversation` still only guards `recipientId !== userId` — anyone can DM anyone. No moderation/report system exists yet to back a stricter model, and this matches most X-clone demos.
2. **Message length cap:** Confirmed: keep 2000 chars as already shipped.
3. **Presence scope:** Confirmed: keep broadcasting to conversation partners only, not followers. Cheaper to compute and less exposure of activity to non-contacts; broadening it is exactly what the deferred Redis/horizontal-scaling section below is for.

**Media in messages: shipped.** `Message.images: [String]` added (mirrors `Post`/`Comment`, max 8, optional). `MessageSendPayload` and the `message:send` socket handler (`backend/src/socket/handlers.ts`) accept and validate `images` (rejects >8 without touching the DB), `handleMessageSend` persists them. `getConversationMessages` normalizes missing `images` to `[]` for messages that predate this field. `MessageComposer.tsx` got the same `FileUpload`-select-preview-remove flow as `NewComment`/`NewReply`, uploading via the existing `uploadImages` (Cloudinary) path before `message:send` fires; `MessageBubble.tsx` renders the images in a 1-2 column grid. Content is still required (image-only messages aren't supported), consistent with F3's comments.

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

**Part F1-F6 is shipped.** F7 is the remaining product/security item. Other open
work is Part D (pipeline, from D3 on) and Part AI.

**Deliberately deprioritized:** D9 (Terraform), D10 (Kubernetes), D11 (load testing). All three are legitimate but only pay off on a project with real traffic or real infrastructure sprawl. Reach for them when the earlier phases are done, not before.
