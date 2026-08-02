# Backend conventions

Enforcement: `no-restricted-syntax` in `backend/eslint.config.js` flags any `===`/`!==` comparison whose operand calls `.toString()`, outside `src/utils/object-id.ts` and `*.test.ts` files. Backed by the same `.claude/hooks/lint-edited-file.sh` PostToolUse hook as [typescript.md](typescript.md).

## Compare ObjectId-like values with the helper, not raw `.toString()`

Mongoose `ObjectId` values and their string form (`req.userId`, route params, etc.) can't be compared with `===` directly — you need `.toString()` on at least one side. Use `equalsObjectId(a, b)` for a single comparison or `hasObjectId(values, id)` for array membership, both from `backend/src/utils/object-id.ts`, instead of writing `a.toString() === b` or `a.toString() === b.toString()` inline.

**Why:** this codebase had repeated bugs from raw `.toString()` comparisons: comparing the wrong pair of values, forgetting `.toString()` on one side, or `===` against `undefined` silently returning false instead of erroring. Centralizing the comparison in one helper makes the intent explicit and the behavior consistent everywhere it's used.

**How to apply:** if `req.userId` might be `undefined` (unauthenticated request not yet rejected), pass `req.userId ?? ''` — `equalsObjectId` requires a string, and an empty string can never match a real ObjectId, so the comparison still correctly fails closed.
