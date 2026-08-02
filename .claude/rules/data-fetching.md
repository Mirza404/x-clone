# Data-fetching return shapes

**This file is judgment-based and intentionally has no enforcing hook.** `axios.get()` types its response `data` as `any` unless you pass a generic, so accessing the wrong key (`response.data.comment` on a payload that's actually an array) type-checks fine and only fails at runtime. A lint rule can't know what shape a given endpoint actually returns — that requires reading the controller on the other end.

## Annotate the return type of fetcher functions used by React Query

Every function in `frontend/src/app/utils/fetchInfo.ts` (or similar) that's passed as a `queryFn`/used in `prefetchQuery` should have an explicit return type, and should read `response.data` through a type assertion or generic (`axios.get<T>(...)`) that matches what the backend controller actually sends — not left as inferred `any`.

**Why:** `getComment` read `response.data.comment` when the backend's `findCommentById` actually returns a bare array (`[commentWithUserData]`). Because the return type wasn't annotated, `response.data.comment` type-checked as `any` and silently resolved to `undefined`, which React Query does not allow a `queryFn` to resolve — it crashed on every comment (`fix: getComment returning undefined, crashing React Query`). An explicit `Promise<Comment | null>` return type, checked against how the value is actually built (`response.data[0] ?? null`), would have caught the mismatch as a compile error instead of a runtime crash.

**How to apply:** when adding or editing a fetcher, check the return type against the actual backend response shape (read the controller, don't assume), and prefer a typed access (`(response.data as Comment[])[0]`) over an untyped chain of property access.
