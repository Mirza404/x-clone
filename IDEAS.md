# x-clone — Ideas Backlog

A playground/portfolio backlog. Two tracks: **product correctness/features** and **DevOps + AI automation**. Not a commitment — a menu to pull from, ordered so that each item is independently shippable and commit-able.

**Status legend:** `[ ]` not started · `[~]` partially done · `[x]` done

---

## Reality check — what actually exists today

Verified against the repo, not assumed. Earlier versions of this file were stale on several of these.

- **CI** (`.github/workflows/ci.yml`): format, lint, typecheck, test, build, dependency-audit, gitleaks secret-scan, concurrency + `cancel-in-progress`, composite `install-deps` action.
- **Deployment: already live.** Frontend serving at `https://x-clone-frontend-voi9.onrender.com`. This invalidates the old "A1 gives you a live URL — top priority" framing; the live URL exists. What's missing is the _automated, gated_ path to it (see D2).
- **Dockerfiles** for backend + frontend, plus `docker-compose.yml`.
- Two npm projects (`backend/` Express+Mongoose, `frontend/` Next.js App Router), no workspaces.
- **Messaging is built** — `Conversation`/`Message` models, `message-controller.ts`, `useSocket.ts`, `useMessages.ts`, `useConversations.ts`, `MessageThread.tsx`. Working, but see P1.4 and F1.
- **Seeding exists** — `backend/scripts/seed.ts` (users/posts/comments/follows) and `seed-my-follows.ts` (follows + DM history for your own account).
- **`frontend/public/` does not exist.** No favicon, no logo asset. See P1.3.

### Holes in the previous version of this plan

1. It had **no product-correctness track at all** — 100% DevOps/AI while the deployed app had visible UI bugs. A portfolio project with a broken sign-in screen and 404'd avatars undermines every infrastructure item above it. Fixed: Part P is now first.
2. It treated **A1 (deploy) as unstarted** when the app is already live. Fixed in the reality check above.
3. Items had **no dependency ordering or status**, so "recommended order" and the item list could drift apart. Fixed: status markers + an explicit sequencing section at the bottom.
4. **A0.3 ("real MongoDB in CI")** was listed without checking whether the backend tests actually need a DB — they're currently unit-style. Reframed as D1.3 with that caveat.
5. The **Part C items added later were never folded into the recommended order**, so they were invisible to anyone reading the bottom of the file. Fixed.

---

## Part P — Product correctness (bugs on the live site)

**Do these first.** They're small, they're visible on the deployed URL, and several are one-line fixes with outsized impact.

### P1.1 Comment-thread page was never migrated to the design system `[ ]`

`frontend/src/app/posts/[id]/comment/[commentId]/page.tsx` is the odd one out — every other page uses the semantic Tailwind tokens (`border-border`, `text-content`, `text-muted`), this one still has hardcoded Tailwind palette colors from before the theming work.

- **L50** `<div className="border border-gray-600">` — hardcoded gray. This is the "ugly black outline" around the whole thread. Should be `border-border` or, to match the feed, no outer border at all.
- **L71** `<div key={reply.id} className="border-t border-gray-600">` — same problem per reply.
- **L51** `max-w-2xl mx-auto mt-0 space-y-4` — centers and gaps the content, while the rest of the app is full-bleed with flush borders. The `space-y-4` is what creates the floating-card look.
- **L60** `<h2 className="text-xl font-bold p-4 pt-0 pb-0">Replies</h2>` — no `text-content`, so it doesn't follow the theme. Compare the "Comments" heading in `NewComment.tsx`, which has `border-b border-border p-4 text-xl font-bold text-content`.
- **L45–47** error state is a bare unstyled `<div>Something went wrong loading the comment.</div>`.
- **Missing sticky back header.** `posts/[id]/page.tsx` L34–44 has a proper sticky header with an `ArrowLeft` back button; the comment thread has no way back and no title.
- **Missing `AuthWall`.** Unauthenticated users see the reply composer and only find out on submit.

**Fix:** rewrite the page to mirror `posts/[id]/page.tsx` structurally — sticky header with back arrow, full-bleed items, `border-border` dividers, themed headings.

### P1.2 Theme does not persist; flips mid-session `[ ]`

Two cooperating defects across `frontend/src/app/layout.tsx` L45–47 and `frontend/src/app/utils/ThemeProvider.tsx` L39–51.

- The inline `theme-init` script reads `localStorage.theme`; when absent it falls back to `prefers-color-scheme` — but **never writes the resolved value back**. So a user who has never clicked the toggle has no persisted theme, ever.
- `ThemeProvider` L42–50 then registers a **live** `matchMedia('(prefers-color-scheme: dark)')` change listener that flips the app whenever the OS preference changes. Windows' automatic night mode will therefore flip the site out from under you mid-session — which matches the reported "it went light → dark when I clicked a comment."

**Fix:** treat system preference as an _initial default only_. On first resolve, persist it to `localStorage` immediately (in the inline script, so it happens before paint). Then the live `matchMedia` listener becomes dead code and should be removed — or kept only behind an explicit "follow system" mode the user opts into. Decide which; the simpler option is removal.

### P1.3 `frontend/public/` does not exist — every fallback asset 404s `[ ]`

The directory is missing entirely.

- `Avatar.tsx` L27 falls back to `src={src || '/Logo.png'}` → 404 → the browser's broken-image icon plus alt text. **This is the "Unknown" text in the messages list** — it's not a text bug, it's a broken `<img>` rendering its alt.
- `layout.tsx` L44 `<link rel="icon" href="/favicon.ico" />` → also 404.

**Fix:** create `frontend/public/` with a real `favicon.ico` and a default avatar. Consider making the Avatar fallback an inline SVG component instead of a network request, so it can never 404 again. Verify the Dockerfile copies `public/` into the runtime image.

### P1.4 Conversations show "Unknown user" — orphaned by the seed wipe `[ ]`

`ConversationListItem.tsx` L21 renders `participant?.name ?? 'Unknown user'`. The backend (`message-controller.ts` L61–69) returns `name: otherUser?.name ?? null` when its lookup into the users collection misses.

**Root cause:** `seed.ts`'s `wipeSeedData()` (L157–187) deletes seed users, their posts, their comments and their follows — but **never touches `Conversation` or `Message`**. `seed-my-follows.ts` creates DM history against those same seed users. So every wipe orphans the conversations, leaving them pointing at user IDs that no longer exist.

**Fix, both sides:**

- `wipeSeedData()` must also delete `Message` documents and `Conversation` documents whose `participants` include a wiped user ID.
- Independently, the frontend should degrade gracefully rather than showing a broken row — but the real fix is the wipe, since these rows are unrecoverable garbage.

### P1.5 Seed flag ergonomics — `--wipe` keeps getting swallowed `[ ]`

`npm run seed -- --wipe` under Windows PowerShell has repeatedly failed to forward the flag (npm warns `Unknown cli config "--wipe"`), silently producing a _duplicate_ seed batch instead of a reset. This has already caused several thousand redundant documents in the dev database.

**Fix options (pick one):**

- Add an explicit `"seed:wipe": "ts-node scripts/seed.ts --wipe"` script — no flag forwarding, nothing to swallow. Simplest, recommended.
- Or invert the default: wipe unless `--append` is passed. Safer against accidental accumulation, but changes existing behaviour.

Either way: have the script **log loudly** what mode it's in on the first line of output, so a swallowed flag is obvious instead of silent. Also document the incantation in `README.md`.

---

## Part P2 — Same-class defects found on a systematic sweep

P1.1 (comment thread never migrated to the design system) was not a one-off. A targeted scan for that _class_ of problem turned up the following. Ordered by user-visible impact.

### P2.1 Two more pages hardcoded to dark-only — worse than P1.1 `[ ]`

P1.1's page uses hardcoded grays but is at least readable. These two are pinned to a **black background with white text**, so in light mode they render as a black box in an otherwise white app, and the textarea text is white-on-white while typing.

**`frontend/src/app/posts/[id]/editPost/page.tsx`**

- L93 `bg-black bg-opacity-50 … border border-gray-700`
- L117 textarea: `text-white bg-black` ← **white text on white page in light mode**
- L104/L195 `text-gray-400` / `text-gray-500`
- L143, L174 `bg-black bg-opacity-75 text-gray-400 hover:text-white`
- L194 `border-t border-gray-700`
- L202 `bg-black text-white border-gray-700 hover:bg-gray-300 hover:text-black`
- L209 `bg-white font-bold text-black hover:bg-gray-300`
- Also L93 `w-[598px]` — a hardcoded pixel width that won't survive the F1 layout refactor.

**`frontend/src/app/posts/[id]/comment/[commentId]/edit/EditCommentClient.tsx`** — same treatment, L134, L146, L159 (`text-white`), L167, L169, L178, L186.

**Fix:** migrate both to semantic tokens exactly as P1.1 does. These three pages (P1.1 + these two) are the complete set of un-migrated routes — everything else already uses `text-content`/`bg-bg`/`border-border`. Worth doing as one commit per page.

### P2.2 `window.location.href` forces full page reloads in four places `[ ]`

Four sites do a hard browser navigation instead of `router.push`:

- `posts/[id]/comment/[commentId]/page.tsx` L56, L76 (edit links)
- `utils/postMutations.ts` L66, L71

Each one throws away the entire React Query cache, the socket connection, and all React state — then re-downloads the app. **This is also the third contributor to the P1.2 theme flip:** a full reload re-runs the `theme-init` script, which (per P1.2) has no persisted value to read and so re-derives the theme from the OS. Fixing P1.2 removes the flip; fixing this removes the reload.

**Worse — `postMutations.ts` L71 navigates away on _failure_.** The `onError` handler fires `window.location.href = '/posts'`, so a delete that fails shows an error toast and _then_ yanks the user off the page they were on. Errors should leave the user where they are.

**Fix:** use `router.push`/`router.replace` throughout; delete the `onError` navigation entirely.

### P2.3 `Comment` is the only model with no indexes `[ ]`

Every other model got indexed; `Comment` was overlooked:

| Model          | Indexes                                              |
| -------------- | ---------------------------------------------------- |
| `Post`         | `{ author: 1, createdAt: -1 }`                       |
| `Follow`       | `{ follower, following }` unique, `{ following: 1 }` |
| `Message`      | `{ conversation: 1, createdAt: -1 }`                 |
| `Conversation` | `{ participants: 1 }`, `{ lastMessageAt: -1 }`       |
| **`Comment`**  | **none**                                             |

Meanwhile `findCommentsByPost` queries `{ _id: { $in: post.comments }, parentComment: null }` with `.sort({ createdAt: -1 })` and a `countDocuments` on the same filter — a collection scan on every post view, on a collection that just grew past 1000 documents from the duplicate seeding.

**Fix:** add `CommentSchema.index({ postId: 1, createdAt: -1 })` and `CommentSchema.index({ parentComment: 1 })`.

### P2.4 Duplicate fetchers make a prefetch silently useless `[ ]`

`utils/fetchInfo.ts` has two functions hitting the **identical endpoint** `GET /api/post/:postId/comment/:commentId`:

- L46 `getComment()` → returns `data[0] ?? null`, swallows errors
- L114 `getCommentById()` → returns the raw array, rethrows

They're used with **different cache keys**, which is the actual bug:

- `CommentItem.tsx` L43–48 prefetches into `['comment', comment.id]`
- `posts/[id]/comment/[commentId]/page.tsx` L24 reads from `['comment-thread', postId, commentId]`

So the prefetch on every rendered comment costs a network request per comment and **is never read** — navigating into a thread refetches from scratch. This is the same species of defect as the unscoped `invalidateQueries()`: cache keys that don't line up with intent.

**Fix:** collapse to one fetcher and one key shape. Pick `getCommentById`'s error behaviour (rethrow, so React Query can show an error state) and `getComment`'s return shape (unwrapped).

### P2.5 `name: maxLength: 20` will reject real Google display names `[ ]`

`Post.ts` L21–25 and `Comment.ts` L15–18 both cap the denormalized author `name` at 20 characters. Names come from Google OAuth profiles, which routinely exceed that — "Christopher Alexander Smith" is 27. When they do, `newComment.save()` / post creation throws a Mongoose `ValidationError` and the user gets a 500 with no useful message.

Nobody has hit it yet because every account so far (yours + seeded "First Last" pairs) happens to fit.

**Fix:** raise the cap to something realistic (50+), or drop the denormalized `name` entirely and always resolve it from the users collection — which is what the controllers already do for `authorImage`. The second option is cleaner and kills a whole class of stale-name bugs, but it's a bigger change.

### P2.6 `allComments` is dead code — with tests `[ ]`

`comment-controller.ts` L12–93 defines and L515 exports `allComments`, and `comment-controller.test.ts` L367–403 tests it. **It is not wired to any route** — `comment-routes.ts` never references it.

Doubly bad: it inflates apparent test coverage with tests for code that can't run in production. Delete the handler and its tests, or route it if there's a use for a global comment feed.

### P2.7 `writeLimiter` applied inconsistently `[ ]`

Rate limiting is on some write paths and not others:

| Route                                   | Limited? |
| --------------------------------------- | -------- |
| `POST /post/new`                        | yes      |
| `POST /message/conversations`           | yes      |
| `POST /post/:postId/comment/new`        | **no**   |
| `PATCH /post/edit`                      | **no**   |
| `PATCH /comment/edit/:commentId`        | **no**   |
| `POST /post/like`, `POST /comment/like` | **no**   |

Comment creation and the like toggle are the easiest endpoints to hammer on a public site. Decide the policy deliberately and apply it uniformly, rather than leaving the current pattern, which looks like whichever routes happened to be written after the limiter existed.

### P2.8 Unstyled error states `[ ]`

Two bare unstyled returns that ignore the theme entirely:

- `posts/[id]/comment/[commentId]/page.tsx` L46
- `edit/EditCommentClient.tsx` L126

Both `return <div>Something went wrong loading the comment.</div>`. There's an `EmptyState` component already — use it, or add an `ErrorState` sibling.

### Clean — checked and found no problems

Recording these so the next sweep doesn't redo them:

- **No `console.log`/`console.debug` anywhere** in either project. The rule is holding.
- **No unscoped `invalidateQueries()`** remaining — the `LikeButton` one was the only instance and it's fixed.
- **No hardcoded `localhost` / `http://` URLs** in frontend source (all hits were SVG `xmlns`).
- **Auth guards are complete** — every mutating route has `requireAuth`, and `post-controller` checks author ownership on both update (L283) and delete (L241), as does `comment-controller`.
- **`SideBar.tsx` L13–17 is the only dead input** in the codebase; every other `<input>`/`<textarea>` is properly controlled.

---

## Part F — Product features

### F1. Messages as its own full-bleed view `[ ]`

Messaging is currently crammed into the 600px center column, because `(navPages)/messages/page.tsx` renders inside the root layout's `<main className="w-full md:w-[600px] …">` (`layout.tsx` L69). A two-pane conversation list + thread does not fit there.

**Target:** messages becomes a distinct top-level view that does **not** render the persistent left `NavMenu` (layout.tsx L64–66) or the right `SideBar` (L81–83), and uses the full viewport width.

**Approach — this is the main design decision to make first:**

- The chrome (NavMenu/SideBar) currently lives in the **root** `layout.tsx`, so every route gets it. To let one route opt out, that chrome has to move down into a route-group layout.
- Concretely: introduce a route group (e.g. `(feed)/layout.tsx`) that owns the NavMenu + SideBar + 600px main column, move the existing feed routes under it, and leave the root layout holding only providers (`ThemeProvider`, `QueryProvider`, `SessionProvider`, `SocketProvider`, `PostModalProvider`, `CustomToaster`) plus `<html>`/`<body>`.
- Messages then lives outside that group with its own layout — probably a slim icon-rail nav instead of nothing at all, so users aren't stranded with no navigation.
- **Watch out:** the mobile chrome (`MobileHeader`, `MobileNavBar`, `MobileTabs`, `MobilePostButton`) is also in the root layout and will need the same treatment. `FloatingActions` too.
- **Watch out:** provider order matters — `SocketProvider` must stay above messages, and it currently sits inside the root layout, which is where it should remain.

This is a structural refactor touching every route. Do it in its own commit, before the visual work.

### F2. Search — posts and messages `[ ]`

Currently entirely non-functional:

- `SideBar.tsx` L13–17 is a **dead uncontrolled input** — no state, no handler, no submit, no results view.
- `(navPages)/explore/page.tsx` is a 7-line stub returning `<div>Explore Page</div>`.
- **There is no search route on the backend at all.**

**Scope:**

1. **Backend:** add a search endpoint for posts. Start with a case-insensitive regex or a Mongo text index on `Post.content` + author `name`; paginate it the same way `findCommentsByPost` does. A text index is the better default — regex on a growing collection won't hold up. (Note: this is also the natural seam for the semantic/vector search in AI1.1 later — build the plumbing so it can be swapped.)
2. **Frontend, posts:** wire the SideBar input to a real `/explore?q=` route, build the results page, reuse `PostItem`. Debounce input; use React Query with the query string in the key.
3. **Frontend, messages:** add a search field in the messages view, directly above the conversation list. Simplest useful version is client-side filtering of the already-loaded conversation summaries by participant name — no backend needed. Searching _message contents_ is a second, larger step that does need an endpoint.

Depends on F1 for the messages half (the search bar's placement assumes the new layout).

### F3. Comments at feature parity with posts `[ ]`

Comments currently support text + likes + one level of replies. Posts support images (`Post.images: string[]`); the `Comment` schema (`backend/src/models/Comment.ts`) has **no `images` field at all**.

- Add `images: [String]` to `CommentSchema`, mirroring `PostSchema`'s constraints.
- Wire the existing upload path (`FileUpload` component, used by `NewPostModal`/`MobileNewPost`/`EditPostPage`) into `NewComment.tsx` and `NewReply.tsx`.
- `comment-controller.ts`'s `createComment` must accept and persist `images`.
- Add the field to both the backend `LeanComment` type and the frontend `Comment` type.
- **Decide:** keep replies 2-level (`comment-tree.ts` currently assumes this) or go fully recursive. 2-level is almost certainly enough for parity; recursive is a much bigger lift and changes `collectCommentThreadIds`, the thread page, and pagination.

### F4. Placeholder pages `[ ]`

`bookmarks`, `communities`, `notifications`, `explore`, and others are all one-line stubs returning plain text. On a live portfolio site these are dead ends a visitor will click. Either implement, or render a consistent themed "Coming soon" empty state (there's already an `EmptyState` component) so they look intentional rather than unfinished.

---

## Part D — DevOps / CI-CD

### D1. Gaps in what exists today `[ ]`

1. **Harden the backend Dockerfile.** Currently runs `ts-node` in prod, no build step, single stage, root user, no `.dockerignore`. Add a `tsc` build stage, run compiled JS (`node dist/index.js`), go multi-stage (`deps` → `build` → slim `runner`), add `USER node` and a `.dockerignore`. Story: "cut image size X→Y, removed the dev toolchain from the runtime."
2. **Frontend runtime image.** Add `output: 'standalone'` to `next.config.mjs`, copy only `.next/standalone` + `.next/static` + `public/` into the runner. Much smaller image. (Pairs with P1.3 — make sure `public/` exists _and_ gets copied.)
3. **Real MongoDB in CI.** The `test` job has no DB service. **Caveat the old plan missed:** the backend tests are currently unit-style, so adding a `mongo` service container is only worth it _together with_ writing integration tests that actually use it. Don't add the service in isolation — that's infrastructure with no consumer.
4. **Coverage gate.** Collect coverage (backend runner + frontend Jest), enforce a threshold, upload as an artifact and/or comment on the PR.

### D2. Automate the deploy that already exists `[~]`

The site is live on Render, but reframe the goal: the win here is no longer "get a URL," it's **a gated, reproducible pipeline to it.**

- On merge to `main`: build backend + frontend images, push to **GHCR** (`ghcr.io/<user>/x-clone-*`).
- Deploy job **gated on `test` + `build` passing** — the interesting part, and the part a reviewer looks for.
- Document the rollback path. A deploy story without a rollback story is half a story.
- Depends on D1.1/D1.2 (you want to be shipping the hardened images, not the current ones).

### D3. Preview environments per pull request `[ ]`

- Ephemeral deploy per PR; bot comments the preview URL. Auto-teardown on close/merge.
- **Render has native PR previews** — check whether that's sufficient before building this by hand. Using the platform feature and writing up _why_ is a perfectly good answer.
- Depends on D2.

### D4. End-to-end tests in CI (Playwright) `[ ]`

- Boot both services via `docker-compose` in CI.
- Smoke flow: sign in (mock provider) → create post → comment → send a DM.
- Headless; upload the Playwright trace as an artifact on failure.
- **Do this after Part P.** E2E tests written against currently-buggy UI will need rewriting once the bugs are fixed.

### D5. Reusable workflow / matrix refactor `[ ]`

The `format`/`lint`/`typecheck`/`test` jobs all repeat `checkout + install-deps + run <x>`. Collapse into a matrix or a reusable workflow. Signal: you refactor pipelines, not just author them.

### D6. Release automation `[ ]`

Conventional commits (already the convention here) → `release-please` or `semantic-release`. Auto CHANGELOG, version tags, GitHub Releases.

### D7. Dependency automation `[ ]`

**Renovate** or **Dependabot**; auto-merge patch/minor once CI is green. Pairs with the existing `dependency-audit` job. Watch: prettier version parity across root/backend/frontend is a known drift risk — pin all three together.

### D8. Observability `[ ]`

- Replace `morgan` with structured logging (**pino**).
- **OpenTelemetry** traces from Express.
- `/healthz` (liveness) + `/readyz` (readiness, checks Mongo).
- Ship to **Grafana Cloud** free tier; build one dashboard.
- Story: "I can debug prod." Most valuable _after_ D2, when there's a real pipeline producing deploys worth observing.

### D9. Infrastructure as Code (Terraform) `[ ]`

Terraform for the Mongo Atlas cluster + host + DNS. Even a small module is a strong signal. State in a remote backend.

### D10. Kubernetes — stretch, label it "learning" `[ ]`

Local `kind`/minikube manifests or a Helm chart for the two services + Mongo. Overkill for the app size — frame it explicitly as a learning exercise, not production.

### D11. Load testing `[ ]`

**k6** script hitting the messaging + feed endpoints. Run nightly in CI; publish results as an artifact / trend.

---

## Part AI — AI automation

### AI1. In-app AI features `[ ]`

1. **Semantic search + RAG on posts** — _best infra fit, top AI pick._ Embed each post on create; store vectors in **Mongo Atlas Vector Search** (already on Atlas → zero new infra). "Search by meaning" + "related posts". Needs a backfill job for existing posts. **Build F2's search endpoint first** and treat this as swapping the retrieval strategy behind it, not a parallel system.
2. **AI compose / reply assist** — "improve this post", tone rewrite, autocomplete, with **streamed** tokens to the UI. Pairs naturally with messaging (smart replies in DMs).
3. **Automated content moderation** — run new posts + DMs through a moderation model; flag or hold for review. Real trust-and-safety signal.
4. **AI feed ranking** — rank the timeline by embedding similarity to a user's interest profile instead of pure `createdAt`.
5. **Thread / conversation summarizer** — "summarize this comment tree / this DM thread".
6. **Notification / digest agent** — weekly agent summarizing your activity, drafting candidate posts.

### AI2. Local Ollama echo-bot for WebSocket testing `[ ]`

There's currently no easy way to manually verify the messaging WebSocket round-trip end to end (`useSocket.ts`, `MessageThread.tsx`) — it needs two accounts in two browser sessions. Instead, run a tiny local model as a second "user."

- Small Node script: connects as a seeded user over the same socket auth the frontend uses, listens for incoming DMs, calls a local Ollama model (e.g. `llama3.2:1b` — fast, tiny) for a reply, sends it back.
- Gives a live, self-testing conversation partner for local dev.
- **Not a CI job** — it needs Ollama running locally. If you want socket coverage in CI, that's D4's job with a scripted fake client, not a model.
- Nice side effect: it exercises the same socket path a real second user would, so it catches presence/unread/ordering bugs that a single-session test can't.

### AI3. AI in the DevOps loop `[ ]`

1. **AI PR reviewer in CI** — a GitHub Action runs an LLM over the diff and posts review comments.
2. **AI-generated PR descriptions / changelogs** from commit history.
3. **Flaky-test / failure triage bot** — on red CI, an LLM reads the logs and comments probable cause + suggested fix.
4. **AI issue auto-labeler / triage** via LLM classification.
5. **Semantic release notes** — LLM turns merged PRs into a readable changelog.

---

## Sequencing

Dependencies are real; the ordering below respects them.

**Phase 1a — visible breakage on the live site.** Small, independent, one commit each.

> P1.3 (missing `public/`) → P1.2 (theme persistence) → P2.2 (`window.location.href` reloads) → P1.1 + P2.1 (the three un-migrated pages, one commit per page) → P2.8 (error states)

`P1.3` goes first: smallest fix, widest visual blast radius, and P1.4's broken avatars won't _look_ fixed until it lands. `P1.2` and `P2.2` are adjacent — both feed the theme flip — but they're separate concerns, so separate commits.

**Phase 1b — data and API correctness.** No visible symptom today, all cheap.

> P2.3 (Comment indexes) → P2.5 (`maxLength: 20`) → P2.4 (duplicate fetchers / dead prefetch) → P1.4 + P1.5 (seed wipe + flag ergonomics) → P2.6 (delete dead `allComments`) → P2.7 (rate-limit policy)

**Parallelizable.** Phase 1a and 1b share no files. If you're dispatching agents, these are two independent workstreams — but keep P1.1/P2.1 (three separate page migrations) on one agent, since they're the same refactor applied three times and consistency matters more than speed.

**Phase 2 — the layout refactor.** One structural commit, then features on top.

> F1 (messages as its own view) → F2 (search, posts then messages) → F4 (placeholder pages) → F3 (comment/post parity)

F1 is the riskiest item in this plan — it touches the root layout and therefore every route. Do it alone, verify each route renders, then build on it.

**Phase 3 — pipeline.**

> D1.1 + D1.2 (Dockerfiles) → D2 (gated deploy to the existing Render app) → D4 (E2E, now that the UI is stable) → D3 (PR previews) → D1.4 (coverage gate)

**Phase 4 — the differentiators.** Pick by interest; these are the resume centerpieces.

> AI1.1 (semantic search, reusing F2's endpoint) → AI3.1 (AI PR reviewer) → D8 (observability) → AI2 (Ollama socket bot, any time — it's independent and fun)

**Deliberately deprioritized:** D9 (Terraform), D10 (Kubernetes), D11 (load testing). All three are legitimate but only pay off on a project with real traffic or real infrastructure sprawl. Reach for them when the earlier phases are done, not before.
