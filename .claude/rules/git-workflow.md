# Git workflow

**This file is judgment-based and intentionally has no enforcing hook.** A script can check proxies (commit count, diff size, whether some file under `docs/` changed) but not whether a commit is actually a coherent unit of work or whether a change was significant enough to need a doc update — that requires understanding what changed and why, which is exactly what these rules ask you to do. Don't mistake the absence of a hook here for an oversight.

## Keep commits granular

One commit = one logical change. Don't bundle an unrelated fix, a dependency bump, and a feature into the same commit because they happened to land in the same session — split them, even if it means more commits for one piece of work.

**Why:** granular commits make `git log`/`git blame` actually useful for finding when and why something changed, and make a bad change revertable without taking good changes down with it.

## Update docs on every major change

If a change alters how the project is set up, run, or structured (new required env var, new script, changed architecture, new rule/convention), update the relevant doc in the same commit — `README.md`, `CLAUDE.md`, or the specific `.claude/rules/*.md` file. Don't leave it for a later "docs" pass.

**Why:** docs that drift from the code stop getting trusted, and then stop getting read at all. A doc update landing in the same commit as the change it describes is the only way it reliably happens.

**What counts as "major"** is a judgment call — a new API route or a changed env var qualifies; a variable rename or a formatting fix doesn't. When unsure, err toward updating.
