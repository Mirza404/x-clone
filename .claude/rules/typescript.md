# TypeScript & lint rules

Enforcement: `@typescript-eslint/no-explicit-any` and `no-console` are `"error"` in both `backend/eslint.config.js` and `frontend/eslint.config.mjs`, and `.claude/hooks/lint-edited-file.sh` (PostToolUse on Write/Edit) lints the file you just touched and blocks immediately on violation. CI's `npm run lint` is the backstop for anything edited outside Claude Code.

## No `any`, implicit or explicit

Don't write `: any`, `<any>`, or `as any`. Both tsconfigs already have `strict: true`, so _implicit_ `any` (an untyped parameter, an unannotated destructure) is a compiler error already — the eslint rule closes the remaining gap, which is _explicit_ `any` used to silence the compiler.

**Why:** `any` doesn't mean "figure out the type later," it means "stop type-checking this value" — it propagates through every place the value flows and defeats the reason both projects turned `strict` on. If the real type is genuinely unknown (e.g. a JSON payload from an external API), use `unknown` and narrow it, not `any`.

If you hit a case where `any` looks like the only option, that's a signal to stop and either write the narrower type or ask — don't reach for `any` to get the hook to pass.

## No stray `console.log`/`console.debug`

`console.info`, `console.warn`, and `console.error` are allowed; `console.log` and `console.debug` are not.

**Why:** this backend has no logger, so `console.log` is the easiest thing to leave behind after debugging (this repo had several before this rule existed). Restricting to `info`/`warn`/`error` keeps console output meaningful without requiring a logging library that this project's scale doesn't justify yet.
