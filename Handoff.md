# Handoff — X Clone UI Redesign

Plan: `DELIVERABLE.md` (repo root). Groups A-G, steps numbered inside each group.

## Status: Groups A-G done. Redesign complete.

All committed to `main`, one granular commit per file/logical unit (repo convention — check `git log --oneline` for style). Last commit: `829e53c`.

### Done
- **Group A** (tokens/theming): globals.css, tailwind.config.ts, ThemeProvider, layout.tsx no-flash script + wrap.
- **Group B** (primitives): Button, IconButton, Avatar, Card, ActionButton, Tab, VerifiedBadge, EmptyState, PostSkeleton, handle.ts, relativeTime.ts, ThemeToggle.
- **Group C** (shell): layout.tsx width/border/FAB mount, FloatingActions, NavMenu (Headless UI "More" menu + ThemeToggle), ProfileTab (@handle line).
- **Group D** (feed): FeedTabs (new), posts/page.tsx, newPost/page.tsx, FileUpload, PostListInfinite (skeletons/empty/retry), PostItem (identity line + 5-item action bar), LikeButton.
- **Group E** (right rail): SideBar, TodaysNews, WhatsHappening.
- **Group F** (detail/comments/mobile): posts/[id]/page.tsx (sticky header), CommentItem, ReplyItem, NewComment, NewReply, CommentListInfinite, mobile/* token pass, root page.tsx spinner.
- Bonus sweep: DropDownMenu retoken (raw bg-black/gray/red found during review, not in original 2.4 checklist but required by Appendix A "no raw colors" check).

### QA run so far (Group G, step 29)
- `npm run typecheck` — clean.
- `npm run lint` — clean (fixed `react-hooks/set-state-in-effect` in ThemeProvider.tsx and ThemeToggle.tsx — removed a redundant effect-based re-sync and an unnecessary mount guard; see commit `a6ce5cb`).
- `npm test` — 31/31 pass (fixed Avatar not forwarding `onLoad`/`onError` — composer avatars needed it to clear loading state; also updated `PostListInfinite.test.tsx` assertions that targeted pre-redesign copy/behavior — old spinner role, "Error happened" text, "Load More" label — per DELIVERABLE.md's explicit instruction to update stale assertions rather than revert components).
- `npm run build` — was failing on **every** static page (`/bookmarks`, `/_not-found`, etc.) with "Event handlers cannot be passed to Client Component props." Root cause: `TodaysNews.tsx` has an `onClick` on its dismiss button but no `'use client'` directive, and its ancestor chain (`SideBar` → `layout.tsx`) has no client boundary above it, so it rendered as a Server Component and couldn't serialize the handler. Fixed by adding `'use client'` (commit `44327ab`). Verified against a throwaway `git worktree` at the pre-redesign commit (`e3a5c5f`) to confirm this was a regression, not pre-existing — baseline built clean. **Build passes clean now.**
- Dev server smoke check: `npm run dev`, `curl localhost:3000/` and `/posts` both returned 200, no errors in log.

### NOT done yet
- Nothing — Group G step 30 (Appendix A manual walk) is done, see below. One residual open item: whether `/posts` should actually redirect guests to sign-in (see "Known pre-existing issue" below) is a product-scope question, not a task item.
- A `git worktree` at `/c/CODEEEE/x-clone-baseline-check` was created for the regression-check and removed afterward (`git worktree remove --force`) — confirm `git worktree list` is clean if anything looks odd.
- A background `npm run dev` process may still be running on port 3000, and a backend `npm run dev` on port 3001 (PID 4840) — check for stray `node` processes before starting new dev servers.

### Notes / decisions made along the way (not spelled out in DELIVERABLE.md)
- Composer "Post" buttons: plan flags the blue-vs-black choice as an ASSUMPTION in a couple spots; went with **blue** everywhere (nav Post pill, desktop composer, mobile composer, comment/reply composers) for consistency, matching the plan's own stated assumption in §3.2.
- `ActionButton`/`IconButton` accent hover pads are excluded when a like/bookmark/etc is in its "active" state (no double-tinting) — not explicitly speced, small judgment call for visual cleanliness.
- Headless UI `Menu.Items` panel for "More" is unmounted while closed (Headless UI default), which is why `ThemeToggle` didn't need a hydration-mismatch mount guard despite the plan's step 4.12 suggesting one — it never renders during SSR.

## Appendix A manual walk — done (this chat)

Used Playwright directly (no `chromium-cli`/browser MCP available in this
environment; installed `playwright` into the scratchpad and drove headless
Chromium with a small script). Backend was already running on `:3001`
(PID 4840) but **MongoDB Atlas is unreachable from this sandbox** (DNS
fails: `curl cluster0.vexrhsl.mongodb.net` → exit 6, `/api/post/` → 500
"Database not connected"). Google OAuth is equally unreachable, so no
authenticated session was obtainable either. Net effect: **the live feed
with real posts could not be visually verified** — that requires a real
network. Everything else was checked and passes:

- Light mode (`bg`/`surface`/`input` tokens) and dark mode (`#000`/`#16181c`/`#e7e9ea`) both render correctly on desktop and mobile — checked via `/bookmarks` (see below for why not `/posts`).
- Theme switch: opened "More" menu, clicked "Dark mode" toggle programmatically — `<html>` gained `.dark`, `localStorage.theme` set, reload preserved it. Confirmed via script, not just visual.
- No-FOUC + OS-preference fallback: fresh context (no `localStorage.theme`) with `colorScheme: 'dark'` → `.dark` class present at `domcontentloaded` (before paint); `colorScheme: 'light'` → absent. Both correct.
- FloatingActions (Grok/Chat): clicked, `toast('Coming soon')` fires, no overlap with right rail or FAB.
- Mobile (`<768px`): bottom nav + Post FAB present in both themes, no overlap with content.
- `npm run typecheck` / `lint` / `test` (31/31) / `build` all still pass after fixes below.

### Bugs found and fixed (commits `8af2ead`, `3721eb5`)
- **`posts/page.tsx` had a dead duplicate `useQuery(['posts'])`** whose data was never used — only its `isLoading`/`isError` guards, which blocked the *entire* page (hid `FeedTabs` and the composer behind a spinner) and rendered a raw unstyled `<pre>Error</pre>` on failure, bypassing the properly-themed retry UI `PostListInfinite` already has. Removed the dead query entirely. **This is why earlier screenshots looked broken/stuck** — not a Group A-F styling bug, a pre-existing dead-code landmine that got exposed once the DB became unreachable.
- **Lint regression**: `PostListInfinite.test.tsx` used `container.querySelectorAll` (testing-library/no-container, no-node-access) — added `data-testid="post-skeleton"` to `PostSkeleton` and switched the test to `getAllByTestId`. Not caught in the Handoff's earlier "lint clean" note; must have been introduced in the step-29 test-update commit and untested since (`rtk`-wrapped lint output truncates by default, easy to miss).

### Known pre-existing issue — NOT fixed (out of scope)
- **`/posts` unconditionally redirects guests to `/api/auth/signin`.** `NewPostPage` (mounted inside `/posts`) has a mount-time effect: if `getSession()` returns nothing, `router.push('/api/auth/signin')` — this fires for *any* unauthenticated visitor, not just people trying to compose, so browsing the feed as a guest is currently impossible. Confirmed via `git show e3a5c5f:frontend/src/app/newPost/page.tsx` that this exact logic predates the redesign (baseline commit, untouched by Groups A-F which were restyle-only per DELIVERABLE.md's explicit scope). Flagging for a follow-up decision — is guest feed-browsing actually wanted? — but did not touch it since it's a functional/logic change, not styling, and outside this task's mandate.
- Also noticed: `MobileHeader` always renders the static label "Home" and `MobileTabs` (For you/Following) mount globally in `layout.tsx` regardless of route — so they show on `/bookmarks`, `/jobs`, etc. too, not just the feed. Also pre-existing (same baseline commit had the hardcoded "Home" string), also out of scope for a restyle-only pass.

### Environment notes for whoever picks this up next
- Backend dev server was already running on `:3001` before this session (PID 4840) — don't spawn a second one, it'll `EADDRINUSE`.
- No outbound network to MongoDB Atlas or Google OAuth in this sandbox. To actually eyeball the real feed (post cards, identity line, action bar, verified badge, image carousel) or click-test like/reply/delete, this needs to run somewhere with real internet access and either seeded local Mongo or a reachable Atlas cluster.
- Playwright (not `chromium-cli`) was installed ad hoc into the scratchpad dir for this session's screenshots; nothing was added to the repo's own dependencies.
