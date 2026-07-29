# Handoff: Batch B (backend correctness sweep)

Written for a **separate chat working in a git worktree**, running in parallel
with Batch A (frontend) in the main tree. Read this whole file before touching
code.

> This file lives in the **main** tree at `c:\CODEEEE\x-clone\HANDOFF_BATCH_B.md`
> and is untracked, so it will **not** appear inside your worktree. Read it by
> absolute path.

---

## 0. Ground rules

- **The user commits.** Do the code changes; do not run `git commit`,
  `git add`, or stage anything unless explicitly told to. The user commits
  both batches.
- A `PreToolUse` hook (`.claude/hooks/block-dangerous-git.sh`) hard-blocks
  `git push`, `rebase`, `merge`, `reset --hard`, `clean -f`, `branch -D`,
  `--no-verify`. Don't try to route around it.
- A `PostToolUse` hook (`.claude/hooks/lint-edited-file.sh`) runs ESLint on
  every `.ts`/`.tsx` you write and **blocks on error**. It needs
  `node_modules` inside the worktree; see §1.
- Repo rules: [.claude/rules/typescript.md](.claude/rules/typescript.md)
  (no `any`, no `console.log`/`console.debug`; `info`/`warn`/`error` are
  fine) and [.claude/rules/git-workflow.md](.claude/rules/git-workflow.md)
  (granular commits, docs updated in the same change).

---

## 1. Worktree setup: do this first

Run from the main tree (`c:\CODEEEE\x-clone`). PowerShell has no `&&`; each
line is separate.

```powershell
git worktree add -b batch-b ../x-clone-batch-b main
cd ../x-clone-batch-b/backend
npm install
```

Then copy the env file. `.env` is gitignored, so the worktree has none:

```powershell
Copy-Item ..\..\x-clone\backend\.env .\.env
```

`npm install` in `backend/` is **mandatory**, not optional: the lint hook
resolves ESLint from `<worktree>/backend/node_modules/.bin/eslint`, falling
back to `<worktree>/node_modules/.bin/eslint`. With neither present the hook
silently no-ops and you lose the guardrail.

Only install root/`frontend/` if you intend to run the root fan-out scripts
(`npm run check`). Batch B is backend-only, so `cd backend` + the per-project
scripts in §4 are enough.

Verify isolation before starting:

```powershell
git worktree list
git status
```

You should be on branch `batch-b`, clean.

---

## 2. Scope: what is and isn't yours

Source of truth is [IDEAS.md](IDEAS.md). Batch B = **IDEAS.md Phase 1b**,
minus one item. Seven items, all backend, listed in order in §3.

### Do NOT touch these: Batch A owns them

`frontend/**` entirely, plus `frontend/Dockerfile` and `frontend/.gitignore`.

### P2.4 has been moved OUT of Batch B

IDEAS.md lists **P2.4** (duplicate comment fetchers) in Phase 1b and claims
"Phase 1a and 1b share no files." **That claim is wrong.** P2.4 touches
`frontend/src/app/utils/fetchInfo.ts`, `components/comments/CommentItem.tsx`,
`posts/[id]/comment/[commentId]/page.tsx` and `.../edit/EditCommentClient.tsx`.
The last two are Batch A files. P2.4 was reassigned to Batch A. **Skip it.**

With P2.4 removed, Batch B touches only `backend/**` plus `README.md`, and the
two batches are genuinely disjoint.

### IDEAS.md and GAPS_PLAN.md are stale on D1.3 / D1.4

Both docs list "real MongoDB in CI" (D1.3) and "coverage gate" (D1.4) as
`[ ]` not started. **Both are shipped.** Verified:
`.github/workflows/ci.yml` has a `mongo:7` service with a healthcheck and
`MONGODB_URL: mongodb://localhost:27017/xclone-ci`, uploads backend +
frontend lcov artifacts; `backend/.c8rc.json` exists with thresholds.
Not your job to fix the docs, but don't re-implement them, and don't trust a
`[ ]` in those files without checking the code first; that failure mode has
recurred.

---

## 3. The seven items

Ordered as IDEAS.md Phase 1b orders them. Each is one commit's worth of work.
Item numbers are IDEAS.md's.

### 3.1 P2.3: `Comment` has no indexes

[backend/src/models/Comment.ts](backend/src/models/Comment.ts) is the only
model with zero `.index()` calls. `Post`, `Follow`, `Message` and
`Conversation` all have them.

`findCommentsByPost` in `comment-controller.ts` queries
`{ _id: { $in: post.comments }, parentComment: null }` with
`.sort({ createdAt: -1 })`, plus a `countDocuments` on the same filter: a
collection scan per post view.

Add:

```ts
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ parentComment: 1 });
```

before the `mongoose.model(...)` export at line 49.

### 3.2 P2.5: `maxLength: 20` on denormalized author names

[backend/src/models/Post.ts:25](backend/src/models/Post.ts#L25) and
[backend/src/models/Comment.ts:18](backend/src/models/Comment.ts#L18) both cap
the denormalized `name` at 20 chars. Google OAuth display names routinely
exceed that ("Christopher Alexander Smith" is 27), and the result is a
Mongoose `ValidationError` surfacing as an unexplained 500 on post/comment
creation. Nobody has hit it only because every account so far happens to fit.

IDEAS.md offers two fixes:

1. Raise the cap to 50+. Small, safe.
2. Drop the denormalized `name` entirely and resolve it from the users
   collection, the way the controllers already resolve `authorImage`.

**Recommendation: option 1 for this batch.** Option 2 is the better design and
kills a class of stale-name bugs, but it changes both controllers, both
models, the `LeanComment` backend type and the frontend `Comment` type; a
frontend type change would collide with Batch A. Do option 1 now; file option
2 as a follow-up in IDEAS.md.

### 3.3 P2.9: no graceful shutdown

There is **no `SIGTERM`/`SIGINT` handler and no `io.close()` anywhere** in
`backend/src`. The app is on Render, which sends `SIGTERM` on every deploy, so
each redeploy severs live WebSockets mid-frame and drops Mongo without
closing.

[backend/src/index.ts](backend/src/index.ts) is 12 lines and already has what
you need: `initSocket(server)` **returns the `Server`** (see
`backend/src/socket/index.ts:39`), but currently the return value is discarded.
Capture it.

Shape:

- `const io = initSocket(server);`
- On `SIGTERM` and `SIGINT`: `io.close()`, then `server.close()`, then
  `mongoose.connection.close()`.
- Guard against a double signal (a boolean `shuttingDown` flag).
- Add a timeout (~10s) that force-exits, so a hung socket can't hold the
  process past the platform's kill deadline.
- Use `console.info`, never `console.log`; the lint hook will block you.

`backend/src/db/connection.ts` already exports `disconnectFromDatabase`;
prefer it over calling `mongoose.connection.close()` directly.

This is ~25 lines and improves every deploy from here on, including the ones
these batches trigger. Don't defer it.

### 3.4 P1.4: seed wipe orphans conversations

`wipeSeedData()` in [backend/scripts/seed.ts:157](backend/scripts/seed.ts#L157)
deletes seed users, their posts, their comments and their follows, but
**never touches `Conversation` or `Message`**. `seed-my-follows.ts` creates DM
history against those same seed users, so every wipe leaves conversations
pointing at deleted user IDs.

That is the actual root cause of the "Unknown user" rows in the messages list
(`ConversationListItem.tsx` renders `participant?.name ?? 'Unknown user'`;
`message-controller.ts` returns `name: null` when the users lookup misses).

Fix in `wipeSeedData()`, after the user IDs are collected and before
`usersCollection.deleteMany`:

- Find `Conversation` documents whose `participants` intersect the wiped IDs.
- `Message.deleteMany({ conversation: { $in: <those ids> } })`.
- `Conversation.deleteMany({ _id: { $in: <those ids> } })`.

Update the closing `console.info` so the summary line mentions conversations
and messages too.

The frontend half of P1.4 (degrading gracefully instead of rendering a broken
row) is **not yours**; it is frontend, and the real fix is this wipe anyway.

### 3.5 P1.5: `--wipe` keeps getting swallowed

`npm run seed -- --wipe` under Windows PowerShell has repeatedly failed to
forward the flag (npm warns `Unknown cli config "--wipe"`), silently producing
a _duplicate_ seed batch instead of a reset. This has already put several
thousand redundant documents in the dev database.

Current scripts (`backend/package.json:17-18`) are only `seed` and
`seed:my-follows`.

**Recommended fix:** add an explicit script: nothing to forward, nothing to
swallow:

```json
"seed:wipe": "ts-node scripts/seed.ts --wipe"
```

IDEAS.md's alternative (invert the default: wipe unless `--append`) is safer
against accumulation but changes existing behaviour; the explicit script is
the simpler call.

Either way, **make the script log its mode loudly on the first line of
output**, so a swallowed flag is obvious rather than silent.

**Doc update required in the same change** (per the git-workflow rule): add
the seed incantations to `README.md`. `README.md` is the one non-`backend/`
file Batch B touches; Batch A does not write it, so there is no conflict.

### 3.6 P2.6: `allComments` is dead code with tests

`comment-controller.ts` defines `allComments` at line 12 and exports it at
line 515. `comment-routes.ts` never references it, so **it is not wired to any
route.** `comment-controller.test.ts` tests it at lines 367 and 377, which
inflates apparent coverage with tests for code that cannot run in production.

Delete the handler, its export, and its two tests, unless you decide a global
comment feed is actually wanted, in which case route it instead. Deleting is
the default.

**This moves the coverage number.** `backend/.c8rc.json` has thresholds
seeded at a measured baseline. Removing a large untested function will change
it, most likely upward, since `allComments` is 80 lines of mostly-uncovered
code, but its two tests go away too. Run `npm run test:coverage` after and
re-seed the thresholds to the new measured numbers if the gate trips.

### 3.7 P2.7: `writeLimiter` applied inconsistently

Only two routes have it today:

| Route                                   | Limited? |
| --------------------------------------- | -------- |
| `POST /post/new`                        | yes      |
| `POST /message/conversations`           | yes      |
| `POST /post/:postId/comment/new`        | **no**   |
| `PATCH /post/edit`                      | **no**   |
| `PATCH /comment/edit/:commentId`        | **no**   |
| `POST /post/like`, `POST /comment/like` | **no**   |

Comment creation and the like toggle are the easiest endpoints to hammer on a
public site. The current pattern looks like "whichever routes happened to be
written after the limiter existed" rather than a decision.

Pick a policy deliberately and apply it uniformly across
`backend/src/routes/*.ts`. If likes need a _different_ (looser) limit than
creates, add a second limiter in `backend/src/middleware/rate-limit.ts` rather
than leaving them unlimited, and say why in the commit message.

---

## 4. Verifying

From the worktree:

```powershell
cd backend
npx tsc --noEmit
npx eslint src
npm run test:coverage
```

`test:coverage` enforces the `.c8rc.json` gate; see the warning in §3.6.

If you installed root + frontend deps, `npm run check` at the worktree root
runs format/lint/typecheck/build/test for both projects. Not required for
backend-only work.

Nothing here needs a running Mongo except the seed scripts and
`backend/src/db/connection.test.ts` (gated on `MONGODB_URL`). If you want to
actually exercise the P1.4 wipe fix, you need the `.env` copied in §1 and a
reachable database.

---

## 5. When you're done

- Leave changes **uncommitted** unless the user says otherwise. Report what
  changed, per item.
- Suggested commit split, one per item, following the repo's conventional-
  commit style (`git log --oneline` for the house style):
  `perf:` indexes, `fix:` maxLength, `feat:` graceful shutdown,
  `fix:` seed wipe, `chore:` seed:wipe script + README, `chore:` delete
  dead allComments, `fix:` uniform rate limiting.
- Update the `[ ]` markers in `IDEAS.md` for the items you completed. That
  file is the source of truth and has drifted before, so do not skip this.
- Teardown, once merged, is the user's call:
  `git worktree remove ../x-clone-batch-b`.
