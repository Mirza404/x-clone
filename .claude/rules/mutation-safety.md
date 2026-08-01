# Mutation safety

**This file is judgment-based and intentionally has no enforcing hook**, same reasoning as [git-workflow.md](git-workflow.md): whether a route "mutates" and whether a UI control "guards against" bad states isn't a static pattern a lint rule can check without heavy custom tooling — it requires reading what the code does. Don't mistake the absence of a hook here for an oversight.

## Every mutating route needs `writeLimiter`

Every `POST`/`PATCH`/`PUT`/`DELETE` route in `backend/src/routes/*.ts` that writes to storage must include `writeLimiter` (from `backend/src/middleware/rate-limit.ts`) alongside `requireAuth`, in addition to the blanket `apiLimiter` mounted on `/api` in `app.ts`.

**Why:** this was missed repeatedly and fixed incrementally, route by route, instead of being caught up front: `fix: incorporate writeLimiter`, `fix: incorporate writeLimiter to post routes`, `fix: Add limiter to user routes`, `fix: incorporate writeLimiter to WS`. A single missed mutation is an open door for abuse on a free-tier host with no budget to absorb it.

**How to apply:** when adding a new mutating route, add `writeLimiter` in the same commit — don't leave it for a follow-up fix.

## Every mutation-triggering UI control must guard against unauthenticated and duplicate/rapid-fire submission

Any UI control that fires a mutation (like, reply, new-post, follow, etc.) must:
- Check auth state before firing (`useSession()` status, or equivalent) and show feedback (e.g. a toast) instead of firing a request that's guaranteed to 401.
- Disable itself, or otherwise no-op, while a mutation is in flight (`mutation.isPending`) so repeated clicks don't queue overlapping requests.
- Inside a `<form>`, give submit buttons an explicit `type="button"` or `type="submit"` — an unset `type` on a button inside a form fires both the `onClick` handler and the form's native submit, double-submitting.

`LikeButton.tsx` (`frontend/src/app/components/ui/LikeButton.tsx`) is the reference implementation: it checks `status !== 'authenticated'` before mutating and guards on `likeMutation.isPending` both in the click handler and via `disabled`.

**Why:** both failure modes shipped as real bugs, fixed after the fact: `fix: guard LikeButton against unauthenticated and rapid-fire clicks` (no auth check meant guests hit a guaranteed 401 on every click, and the button wasn't disabled in flight, so repeated clicks queued overlapping optimistic toggle/revert cycles) and `fix: guard reply/new-post forms and stop duplicate submissions` (a missing `type` on a post button inside a `<form>` double-fired reply/post submission, plus `NewReply` had no auth check).

**How to apply:** when adding a new mutation-triggering control, check all three: auth guard, in-flight guard, and (if inside a `<form>`) explicit button `type`.
