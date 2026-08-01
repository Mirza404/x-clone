# React list keys

Enforcement: `react/no-array-index-key` is `"error"` in `frontend/eslint.config.mjs`, backed by the same `.claude/hooks/lint-edited-file.sh` PostToolUse hook as [.claude/rules/typescript.md](typescript.md). It blocks on any `key={index}` (or `key={i}`, `key={idx}`, etc.) the moment you write it.

## Default: no index as key

Use a stable, unique value from the data itself: an id, a URL, a comment id — something that stays attached to the same logical item even if the array's order or length changes.

**Why:** index is the item's position, not its identity. If the array can reorder, insert, or remove an item (user deletes a selected file, a list gets filtered, pagination prepends), React matches the wrong DOM node to the wrong item after the array's index-to-item mapping is no longer 1:1. This shipped a real bug: [NewPostModal.tsx](../../frontend/src/app/components/posts/NewPostModal.tsx) keyed selected-file previews by index, and removing a file mid-list scrambled the remaining previews. Fixed by tagging each `File` with a `crypto.randomUUID()` at selection time and keying on that.

## Exception: fully static lists

Index is fine only when the list can never reorder, grow, shrink, or have items removed independently — the array's shape is fixed for the component's lifetime. The canonical case is a skeleton/placeholder loop: `Array.from({ length: N }).map((_, i) => <Skeleton key={i} />)`. There's no per-item data to key by and no way for the position-to-item mapping to break.

When you hit this case, don't just add the key silently — make the rule aware you considered it:

```tsx
{Array.from({ length: 5 }).map((_, i) => (
  // eslint-disable-next-line react/no-array-index-key -- fixed-length static placeholder list, never reorders/mutates
  <PostSkeleton key={i} />
))}
```

The comment is the point: it forces a one-line justification at the call site instead of a silent exception, and gives the next person (or Claude) something to challenge if the list stops being static.

## Judgment call: is this list really static?

The hook can't know whether an array can reorder — that requires understanding whether user actions mutate it. If a `key={index}` shows up and you're not certain the list is static for its entire lifetime, don't reach for `eslint-disable`. Find the stable identity instead (an id field, a URL, a generated id at creation time as in `NewPostModal`). Menus and dropdown option lists built from a hardcoded, never-mutated array are static in this sense (their content ships in the bundle, not from user action) — but a list built from user-added items, fetched data, or anything with a delete/reorder affordance is not.
