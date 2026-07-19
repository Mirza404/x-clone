# x-clone

Two npm projects, no workspaces: `backend/` (Express + TypeScript + MongoDB/Mongoose) and `frontend/` (Next.js App Router + React Query). Root `package.json` only holds shared lint/format tooling and fan-out scripts — install and run each project from its own directory. See [README.md](README.md) for the product/architecture narrative.

## Commands

Run from repo root unless noted:

- `npm run lint` / `npm run typecheck` / `npm test` / `npm run build` — fan out to both projects
- `npm run format` — prettier write, whole repo
- `npm run check` — everything CI runs, in one shot
- Per-project dev servers: `cd backend && npm run dev` (port 3001), `cd frontend && npm run dev` (port 3000)

## Rules

Standards for this repo live in `.claude/rules/`, one file per concern:

- [.claude/rules/typescript.md](.claude/rules/typescript.md) — type/lint rules, hook-enforced
- [.claude/rules/git-workflow.md](.claude/rules/git-workflow.md) — commit and doc-update conventions, judgment-based

Read the relevant rule file before touching code in that area. Deterministic rules are backed by a `PostToolUse` hook (`.claude/hooks/lint-edited-file.sh`) that lints edited `.ts`/`.tsx` files immediately — a rule doc without a hook means it's judgment-based on purpose, not an oversight.
