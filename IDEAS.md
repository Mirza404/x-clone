# x-clone Ideas Backlog

A playground/portfolio backlog. Two tracks: **product correctness/features** and **DevOps + AI automation**. Not a commitment, just a menu to pull from, ordered so that each item is independently shippable and commit-able.

**Status legend:** `[ ]` not started, `[~]` partially done, `[x]` done

## Related documents: read this first

**This file is the single source of truth for outstanding work.** Two sibling documents exist; neither is a to-do list, and they must not be treated as one:

| Document                                                   | What it is                                                                             | Authoritative for                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **IDEAS.md** (this file)                                   | The backlog: _what_ to do, in _what order_, and _why_                                  | Everything outstanding                                                            |
| [GAPS_PLAN.md](GAPS_PLAN.md)                               | Implementation blueprint for **D1.1-D1.4** only. Still pending, nothing in it is built | The _how_ of those four items: exact config, acceptance criteria, risks           |
| [WEBSOCKET_MESSAGING_PLAN.md](WEBSOCKET_MESSAGING_PLAN.md) | **As-built record.** The messaging system it describes is shipped                      | The _why_ behind the messaging architecture (socket auth model, transport choice) |

If a sibling document disagrees with this file about what remains to be done, **this file wins**. The leftovers from the messaging plan have been pulled into P2.9 and F5 here.

---

## Reality check: what actually exists today

Verified against the repo, not assumed. Earlier versions of this file were stale on several of these.

- **CI** (`.github/workflows/ci.yml`): format, lint, typecheck, test, build, dependency-audit, gitleaks secret-scan, concurrency + `cancel-in-progress`, composite `install-deps` action.
- **Deployment: already live.** Frontend serving at `https://x-clone-frontend-voi9.onrender.com`. This invalidates the old "A1 gives you a live URL, top priority" framing; the live URL exists. What's missing is the _automated, gated_ path to it (see D2).
- **Dockerfiles are already hardened.** Backend is multi-stage running compiled `dist/` as `USER node`; frontend uses Next `output: 'standalone'`. This is D1.1/D1.2, previously listed as outstanding. See D1 for the one line still missing.
- **Backend is deployed too.** `render.yaml` defines both services (`x-clone-backend`, `x-clone-frontend`), both on Render's **free** plan. Free instances sleep after inactivity; see the socket caveat in F5.
- Two npm projects (`backend/` Express+Mongoose, `frontend/` Next.js App Router), no workspaces.
- **Messaging is built.** `Conversation`/`Message` models, `message-controller.ts`, `useSocket.ts`, `useMessages.ts`, `useConversations.ts`, `MessageThread.tsx`. Working, but see P1.4 and F1.
- **Seeding exists.** `backend/scripts/seed.ts` (users/posts/comments/follows) and `seed-my-follows.ts` (follows + DM history for your own account).
- **`frontend/public/` does not exist.** No favicon, no logo asset. See P1.3.

### Holes in the previous version of this plan

1. It had **no product-correctness track at all**: 100% DevOps/AI while the deployed app had visible UI bugs. A portfolio project with a broken sign-in screen and 404'd avatars undermines every infrastructure item above it. Fixed: Part P is now first.
2. It treated **A1 (deploy) as unstarted** when the app is already live. Fixed in the reality check above.
3. Items had **no dependency ordering or status**, so "recommended order" and the item list could drift apart. Fixed: status markers + an explicit sequencing section at the bottom.
4. **A0.3 ("real MongoDB in CI")** was listed without checking whether the backend tests actually need a DB. They're currently unit-style. Reframed as D1.3 with that caveat.
5. The **Part C items added later were never folded into the recommended order**, so they were invisible to anyone reading the bottom of the file. Fixed.

---

## Part P: Product correctness (bugs on the live site)

**Do these first.** They're small, they're visible on the deployed URL, and several are one-line fixes with outsized impact.

### P1.1 Comment-thread page was never migrated to the design system `[ ]`

`frontend/src/app/posts/[id]/comment/[commentId]/page.tsx` is the odd one out. Every other page uses the semantic Tailwind tokens (`border-border`, `text-content`, `text-muted`), this one still has hardcoded Tailwind palette colors from before the theming work.

- **L50** `<div className="border border-gray-600">`: hardcoded gray. This is the "ugly black outline" around the whole thread. Should be `border-border` or, to match the feed, no outer border at all.
- **L71** `<div key={reply.id} className="border-t border-gray-600">`: same problem per reply.
- **L51** `max-w-2xl mx-auto mt-0 space-y-4`: centers and gaps the content, while the rest of the app is full-bleed with flush borders. The `space-y-4` is what creates the floating-card look.
- **L60** `<h2 className="text-xl font-bold p-4 pt-0 pb-0">Replies</h2>`: no `text-content`, so it doesn't follow the theme. Compare the "Comments" heading in `NewComment.tsx`, which has `border-b border-border p-4 text-xl font-bold text-content`.
- **L45-47** error state is a bare unstyled `<div>Something went wrong loading the comment.</div>`.
- **Missing sticky back header.** `posts/[id]/page.tsx` L34-44 has a proper sticky header with an `ArrowLeft` back button; the comment thread has no way back and no title.
- **Missing `AuthWall`.** Unauthenticated users see the reply composer and only find out on submit.

**Fix:** rewrite the page to mirror `posts/[id]/page.tsx` structurally: sticky header with back arrow, full-bleed items, `border-border` dividers, themed headings.

### P1.2 Theme does not persist; flips mid-session `[ ]`

Two cooperating defects across `frontend/src/app/layout.tsx` L45-47 and `frontend/src/app/utils/ThemeProvider.tsx` L39-51.

- The inline `theme-init` script reads `localStorage.theme`; when absent it falls back to `prefers-color-scheme`, but it **never writes the resolved value back**. So a user who has never clicked the toggle has no persisted theme, ever.
- `ThemeProvider` L42-50 then registers a **live** `matchMedia('(prefers-color-scheme: dark)')` change listener that flips the app whenever the OS preference changes. Windows' automatic night mode will therefore flip the site out from under you mid-session, which matches the reported "it went light to dark when I clicked a comment."

**Fix:** treat system preference as an _initial default only_. On first resolve, persist it to `localStorage` immediately (in the inline script, so it happens before paint). Then the live `matchMedia` listener becomes dead code and should be removed, or kept only behind an explicit "follow system" mode the user opts into. Decide which; the simpler option is removal.

### P1.3 `frontend/public/` does not exist: every fallback asset 404s `[ ]`

The directory is missing entirely.

- `Avatar.tsx` L27 falls back to `src={src || '/Logo.png'}`, which 404s and renders the browser's broken-image icon plus alt text. **This is the "Unknown" text in the messages list.** It's not a text bug, it's a broken `<img>` rendering its alt.
- `layout.tsx` L44 `<link rel="icon" href="/favicon.ico" />` 404s too.

**Fix:** create `frontend/public/` with a real `favicon.ico` and a default avatar. Consider making the Avatar fallback an inline SVG component instead of a network request, so it can never 404 again.

> **Creating `frontend/public/` is not sufficient: it will still 404 in production.** `frontend/Dockerfile` copies `.next/standalone` and `.next/static` into the runner but has **no `COPY --from=builder /app/public ./public`** line. Next.js serves `public/` automatically in `npm run dev`, so this fix will look correct locally, pass review, deploy, and _still_ 404 on Render. Add the `COPY` line in the same commit. (This is the sole remaining piece of D1.2.)

### P1.4 Conversations show "Unknown user", orphaned by the seed wipe `[ ]`

`ConversationListItem.tsx` L21 renders `participant?.name ?? 'Unknown user'`. The backend (`message-controller.ts` L61-69) returns `name: otherUser?.name ?? null` when its lookup into the users collection misses.

**Root cause:** `seed.ts`'s `wipeSeedData()` (L157-187) deletes seed users, their posts, their comments and their follows, but **never touches `Conversation` or `Message`**. `seed-my-follows.ts` creates DM history against those same seed users. So every wipe orphans the conversations, leaving them pointing at user IDs that no longer exist.

**Fix, both sides:**

- `wipeSeedData()` must also delete `Message` documents and `Conversation` documents whose `participants` include a wiped user ID.
- Independently, the frontend should degrade gracefully rather than showing a broken row, but the real fix is the wipe, since these rows are unrecoverable garbage.

### P1.5 Seed flag ergonomics: `--wipe` keeps getting swallowed `[ ]`

`npm run seed -- --wipe` under Windows PowerShell has repeatedly failed to forward the flag (npm warns `Unknown cli config "--wipe"`), silently producing a _duplicate_ seed batch instead of a reset. This has already caused several thousand redundant documents in the dev database.

**Fix options (pick one):**

- Add an explicit `"seed:wipe": "ts-node scripts/seed.ts --wipe"` script. No flag forwarding, nothing to swallow. Simplest, recommended.
- Or invert the default: wipe unless `--append` is passed. Safer against accidental accumulation, but changes existing behaviour.

Either way: have the script **log loudly** what mode it's in on the first line of output, so a swallowed flag is obvious instead of silent. Also document the incantation in `README.md`.

---

## Part P2: Same-class defects found on a systematic sweep

P1.1 (comment thread never migrated to the design system) was not a one-off. A targeted scan for that _class_ of problem turned up the following. Ordered by user-visible impact.

### P2.1 Two more pages hardcoded to dark-only, worse than P1.1 `[ ]`

P1.1's page uses hardcoded grays but is at least readable. These two are pinned to a **black background with white text**, so in light mode they render as a black box in an otherwise white app, and the textarea text is white-on-white while typing.

**`frontend/src/app/posts/[id]/editPost/page.tsx`**

- L93 `bg-black bg-opacity-50 ... border border-gray-700`
- L117 textarea: `text-white bg-black` <- **white text on white page in light mode**
- L104/L195 `text-gray-400` / `text-gray-500`
- L143, L174 `bg-black bg-opacity-75 text-gray-400 hover:text-white`
- L194 `border-t border-gray-700`
- L202 `bg-black text-white border-gray-700 hover:bg-gray-300 hover:text-black`
- L209 `bg-white font-bold text-black hover:bg-gray-300`
- Also L93 `w-[598px]`: a hardcoded pixel width that won't survive the F1 layout refactor.

**`frontend/src/app/posts/[id]/comment/[commentId]/edit/EditCommentClient.tsx`**: same treatment, L134, L146, L159 (`text-white`), L167, L169, L178, L186.

**Fix:** migrate both to semantic tokens exactly as P1.1 does. These three pages (P1.1 + these two) are the complete set of un-migrated routes; everything else already uses `text-content`/`bg-bg`/`border-border`. Worth doing as one commit per page.

### P2.2 `window.location.href` forces full page reloads in four places `[ ]`

Four sites do a hard browser navigation instead of `router.push`:

- `posts/[id]/comment/[commentId]/page.tsx` L56, L76 (edit links)
- `utils/postMutations.ts` L66, L71

Each one throws away the entire React Query cache, the socket connection, and all React state, then re-downloads the app. **This is also the third contributor to the P1.2 theme flip:** a full reload re-runs the `theme-init` script, which (per P1.2) has no persisted value to read and so re-derives the theme from the OS. Fixing P1.2 removes the flip; fixing this removes the reload.

**Worse: `postMutations.ts` L71 navigates away on _failure_.** The `onError` handler fires `window.location.href = '/posts'`, so a delete that fails shows an error toast and _then_ yanks the user off the page they were on. Errors should leave the user where they are.

**Fix:** use `router.push`/`router.replace` throughout; delete the `onError` navigation entirely.

### P2.3 `Comment` is the only model with no indexes `[x]`

Every other model got indexed; `Comment` was overlooked:

| Model          | Indexes                                              |
| -------------- | ---------------------------------------------------- |
| `Post`         | `{ author: 1, createdAt: -1 }`                       |
| `Follow`       | `{ follower, following }` unique, `{ following: 1 }` |
| `Message`      | `{ conversation: 1, createdAt: -1 }`                 |
| `Conversation` | `{ participants: 1 }`, `{ lastMessageAt: -1 }`       |
| **`Comment`**  | **none**                                             |

Meanwhile `findCommentsByPost` queries `{ _id: { $in: post.comments }, parentComment: null }` with `.sort({ createdAt: -1 })` and a `countDocuments` on the same filter: a collection scan on every post view, on a collection that just grew past 1000 documents from the duplicate seeding.

**Fix:** add `CommentSchema.index({ postId: 1, createdAt: -1 })` and `CommentSchema.index({ parentComment: 1 })`.

### P2.4 Duplicate fetchers make a prefetch silently useless `[ ]`

`utils/fetchInfo.ts` has two functions hitting the **identical endpoint** `GET /api/post/:postId/comment/:commentId`:

- L46 `getComment()` returns `data[0] ?? null`, swallows errors
- L114 `getCommentById()` returns the raw array, rethrows

They're used with **different cache keys**, which is the actual bug:

- `CommentItem.tsx` L43-48 prefetches into `['comment', comment.id]`
- `posts/[id]/comment/[commentId]/page.tsx` L24 reads from `['comment-thread', postId, commentId]`

So the prefetch on every rendered comment costs a network request per comment and **is never read**. Navigating into a thread refetches from scratch. This is the same species of defect as the unscoped `invalidateQueries()`: cache keys that don't line up with intent.

**Fix:** collapse to one fetcher and one key shape. Pick `getCommentById`'s error behaviour (rethrow, so React Query can show an error state) and `getComment`'s return shape (unwrapped).

### P2.5 `name: maxLength: 20` will reject real Google display names `[x]`

`Post.ts` L21-25 and `Comment.ts` L15-18 both cap the denormalized author `name` at 20 characters. Names come from Google OAuth profiles, which routinely exceed that: "Christopher Alexander Smith" is 27. When they do, `newComment.save()` / post creation throws a Mongoose `ValidationError` and the user gets a 500 with no useful message.

Nobody has hit it yet because every account so far (yours + seeded "First Last" pairs) happens to fit.

**Fix:** raise the cap to something realistic (50+), or drop the denormalized `name` entirely and always resolve it from the users collection, which is what the controllers already do for `authorImage`. The second option is cleaner and kills a whole class of stale-name bugs, but it's a bigger change.

### P2.6 `allComments` is dead code, with tests `[ ]`

`comment-controller.ts` L12-93 defines and L515 exports `allComments`, and `comment-controller.test.ts` L367-403 tests it. **It is not wired to any route**. `comment-routes.ts` never references it.

Doubly bad: it inflates apparent test coverage with tests for code that can't run in production. Delete the handler and its tests, or route it if there's a use for a global comment feed.

### P2.7 `writeLimiter` applied inconsistently `[x]`

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

**Implemented policy:** every authenticated HTTP mutation in `backend/src/routes` uses the 60-per-15-minute `writeLimiter`, including create, edit, delete, like/follow, conversation creation, and read-state writes.

### P2.8 Unstyled error states `[ ]`

Two bare unstyled returns that ignore the theme entirely:

- `posts/[id]/comment/[commentId]/page.tsx` L46
- `edit/EditCommentClient.tsx` L126

Both `return <div>Something went wrong loading the comment.</div>`. There's an `EmptyState` component already; use it, or add an `ErrorState` sibling.

### P2.9 No graceful shutdown: sockets and Mongo are killed abruptly `[ ]`

`WEBSOCKET_MESSAGING_PLAN.md` §8 specified "on `SIGTERM`, `io.close()` before `server.close()`". It was never implemented: there is **no `SIGTERM` or `SIGINT` handler anywhere in the backend**, and no `io.close()` call.

This matters more than it looks, because **the app is deployed on Render, which sends `SIGTERM` on every deploy.** Right now each redeploy severs live WebSocket connections mid-frame and drops the Mongo connection without closing it, instead of draining. Users in a conversation see a hard disconnect rather than Socket.IO's normal reconnect path.

**Fix:** add a shutdown handler in `backend/src/index.ts`: `io.close()`, then `server.close()`, then `mongoose.connection.close()`, with a timeout so a hung connection can't block the exit past the platform's kill deadline.

### Clean: checked and found no problems

Recording these so the next sweep doesn't redo them:

- **No `console.log`/`console.debug` anywhere** in either project. The rule is holding.
- **No unscoped `invalidateQueries()`** remaining. The `LikeButton` one was the only instance and it's fixed.
- **No hardcoded `localhost` / `http://` URLs** in frontend source (all hits were SVG `xmlns`).
- **Auth guards are complete.** Every mutating route has `requireAuth`, and `post-controller` checks author ownership on both update (L283) and delete (L241), as does `comment-controller`.
- **`SideBar.tsx` L13-17 is the only dead input** in the codebase; every other `<input>`/`<textarea>` is properly controlled.

---

## Part F: Product features

### F1. Messages as its own full-bleed view `[ ]`

Messaging is currently crammed into the 600px center column, because `(navPages)/messages/page.tsx` renders inside the root layout's `<main className="w-full md:w-[600px] ...">` (`layout.tsx` L69). A two-pane conversation list + thread does not fit there.

**Target:** messages becomes a distinct top-level view that does **not** render the persistent left `NavMenu` (layout.tsx L64-66) or the right `SideBar` (L81-83), and uses the full viewport width.

**Approach, the main design decision to make first:**

- The chrome (NavMenu/SideBar) currently lives in the **root** `layout.tsx`, so every route gets it. To let one route opt out, that chrome has to move down into a route-group layout.
- Concretely: introduce a route group (e.g. `(feed)/layout.tsx`) that owns the NavMenu + SideBar + 600px main column, move the existing feed routes under it, and leave the root layout holding only providers (`ThemeProvider`, `QueryProvider`, `SessionProvider`, `SocketProvider`, `PostModalProvider`, `CustomToaster`) plus `<html>`/`<body>`.
- Messages then lives outside that group with its own layout, probably a slim icon-rail nav instead of nothing at all, so users aren't stranded with no navigation.
- **Watch out:** the mobile chrome (`MobileHeader`, `MobileNavBar`, `MobileTabs`, `MobilePostButton`) is also in the root layout and will need the same treatment. `FloatingActions` too.
- **Watch out:** provider order matters: `SocketProvider` must stay above messages, and it currently sits inside the root layout, which is where it should remain.

This is a structural refactor touching every route. Do it in its own commit, before the visual work.

### F2. Search: posts and messages `[ ]`

Currently entirely non-functional:

- `SideBar.tsx` L13-17 is a **dead uncontrolled input**: no state, no handler, no submit, no results view.
- `(navPages)/explore/page.tsx` is a 7-line stub returning `<div>Explore Page</div>`.
- **There is no search route on the backend at all.**

**Scope:**

1. **Backend:** add a search endpoint for posts. Start with a case-insensitive regex or a Mongo text index on `Post.content` + author `name`; paginate it the same way `findCommentsByPost` does. A text index is the better default; regex on a growing collection won't hold up. (Note: this is also the natural seam for the semantic/vector search in AI1.1 later; build the plumbing so it can be swapped.)
2. **Frontend, posts:** wire the SideBar input to a real `/explore?q=` route, build the results page, reuse `PostItem`. Debounce input; use React Query with the query string in the key.
3. **Frontend, messages:** add a search field in the messages view, directly above the conversation list. Simplest useful version is client-side filtering of the already-loaded conversation summaries by participant name, no backend needed. Searching _message contents_ is a second, larger step that does need an endpoint.

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

## Part D: DevOps / CI-CD

### D1. Gaps in what exists today `[~]`

> **Corrected 2026-07-27.** D1.1 and D1.2 were listed as outstanding in every prior version of this file. **Both are already built.** The claim was inherited from an older draft and never re-verified against the repo. Verified now, file by file.

1. **Harden the backend Dockerfile.** `[x]` **Done.** `backend/Dockerfile` is multi-stage (`deps` to `build` to `runner`), builds via `tsconfig.build.json`, runs `node dist/index.js`, and sets `USER node`. `package.json` has `"build": "tsc -p tsconfig.build.json"` and `"start": "node dist/index.js"`. `.dockerignore` covers `dist`, `.git`, `*.test.ts`, `coverage`, `nodemon.json`, `README*`, editor cruft. Nothing left here.
2. **Frontend runtime image.** `[~]` **Nearly done.** `next.config.mjs` has `output: 'standalone'`; the Dockerfile copies `.next/standalone` + `.next/static` and sets `USER node`. **One line missing:** there is no `COPY --from=builder /app/public ./public`, because `frontend/public/` doesn't exist yet. **This is a trap for P1.3**; see the warning there. That's the only remaining work in this item.
3. **Real MongoDB in CI.** `[ ]` The `test` job has no DB service. **Caveat the old plan missed:** the backend tests are currently unit-style, so adding a `mongo` service container is only worth it _together with_ writing integration tests that actually use it. Don't add the service in isolation; that's infrastructure with no consumer.
4. **Coverage gate.** `[ ]` Collect coverage (backend runner + frontend Jest), enforce a threshold, upload as an artifact and/or comment on the PR. `frontend/jest.config.ts` already sets `coverageProvider: 'v8'`, so the frontend half is close to free.

**Process note:** items 1 and 2 were done in the repo while this file still listed them as pending. Before starting any D-item, verify its "current state" claim against the code. This file has been wrong about that before.

### D2. Automate the deploy that already exists `[~]`

The site is live on Render, but reframe the goal: the win here is no longer "get a URL," it's **a gated, reproducible pipeline to it.**

- On merge to `main`: build backend + frontend images, push to **GHCR** (`ghcr.io/<user>/x-clone-*`).
- Deploy job **gated on `test` + `build` passing**. That's the interesting part, and the part a reviewer looks for.
- Document the rollback path. A deploy story without a rollback story is half a story.
- **No longer blocked:** the old note said this depends on D1.1/D1.2 landing first. Both are built, so the hardened images already exist, so this can start immediately.

### D3. Preview environments per pull request `[ ]`

- Ephemeral deploy per PR; bot comments the preview URL. Auto-teardown on close/merge.
- **Render has native PR previews.** Check whether that's sufficient before building this by hand. Using the platform feature and writing up _why_ is a perfectly good answer.
- Depends on D2.

### D4. End-to-end tests in CI (Playwright) `[ ]`

- Boot both services via `docker-compose` in CI.
- Smoke flow: sign in (mock provider), create a post, comment, send a DM.
- Headless; upload the Playwright trace as an artifact on failure.
- **Do this after Part P.** E2E tests written against currently-buggy UI will need rewriting once the bugs are fixed.

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

1. **Semantic search + RAG on posts.** _Best infra fit, top AI pick._ Embed each post on create; store vectors in **Mongo Atlas Vector Search** (already on Atlas, so zero new infra). "Search by meaning" + "related posts". Needs a backfill job for existing posts. **Build F2's search endpoint first** and treat this as swapping the retrieval strategy behind it, not a parallel system.
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
- P2.9 (graceful shutdown) makes the sleep/wake cycle noticeably cleaner, which is a second reason to do it early.

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

**Phase 1a: visible breakage on the live site.** Small, independent, one commit each.

> P1.3 (missing `public/`), then P1.2 (theme persistence), then P2.2 (`window.location.href` reloads), then P1.1 + P2.1 (the three un-migrated pages, one commit per page), then P2.8 (error states)

`P1.3` goes first: smallest fix, widest visual blast radius, and P1.4's broken avatars won't _look_ fixed until it lands. `P1.2` and `P2.2` are adjacent (both feed the theme flip) but they're separate concerns, so separate commits.

**Phase 1b: data and API correctness.** No visible symptom today, all cheap.

> P2.3 (Comment indexes), then P2.5 (`maxLength: 20`), then P2.4 (duplicate fetchers / dead prefetch), then P2.9 (graceful shutdown), then P1.4 + P1.5 (seed wipe + flag ergonomics), then P2.6 (delete dead `allComments`), then P2.7 (rate-limit policy)

`P2.9` sits here rather than in phase 3 because it's a ~15-line fix that improves every deploy from now on, including the ones this plan's later phases will trigger.

**Parallelizable.** Phase 1a and 1b share no files. If you're dispatching agents, these are two independent workstreams, but keep P1.1/P2.1 (three separate page migrations) on one agent, since they're the same refactor applied three times and consistency matters more than speed.

**Phase 2: the layout refactor.** One structural commit, then features on top.

> F6's uptime pinger (do this first, ~10 min, removes most of the cold-start problem), then F1 (messages as its own view), then F2 (search, posts then messages), then F6's UI states, then F4 (placeholder pages), then F3 + F5.4 (image support on comments _and_ messages, same upload path, do together), then the rest of F5

F6 is deliberately split: the **pinger** is a 10-minute config change with an outsized payoff, so it goes first. The **UI states** land after F1, since where the messages blocker renders depends on the layout F1 creates.

F1 is the riskiest item in this plan: it touches the root layout and therefore every route. Do it alone, verify each route renders, then build on it.

**Phase 3: pipeline.**

> D1.1 + D1.2 (Dockerfiles), then D2 (gated deploy to the existing Render app), then D4 (E2E, now that the UI is stable), then D3 (PR previews), then D1.4 (coverage gate)

**Phase 4: the differentiators.** Pick by interest; these are the resume centerpieces.

> AI1.1 (semantic search, reusing F2's endpoint), then AI3.1 (AI PR reviewer), then D8 (observability), then AI2 (Ollama socket bot, any time, it's independent and fun)

**Deliberately deprioritized:** D9 (Terraform), D10 (Kubernetes), D11 (load testing). All three are legitimate but only pay off on a project with real traffic or real infrastructure sprawl. Reach for them when the earlier phases are done, not before.
