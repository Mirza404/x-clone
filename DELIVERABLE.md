# X CLONE — UI REDESIGN PLAN

**Audience:** Claude Sonnet, implementing with no further access to the author of this plan.
**Goal:** Redesign the existing X (Twitter) clone. **Both a light and a dark theme must ship as working modes**, switchable at runtime and persisted. The two modes differ deliberately:
- **Light mode is an exact clone of `ui_reference/target.png`** — reproduce X.com's light theme precisely (the color values, card fills, dividers, and spacing in this document are the exact target values; do not approximate).
- **Dark mode is a complete, first-class dark theme** (X's "Lights out" black), evolved from the app's current dark look in `ui_reference/current.png` and using the dark token values in §1.3.

Every component must be verified in **both** modes before sign-off (Appendix A).
**Nature of this document:** Complete and self-contained. Where a detail was ambiguous, a default decision was made and marked `ASSUMPTION:`. Do not deviate from those defaults unless a token or file referenced here does not exist, in which case follow the closest equivalent and keep the visual result identical to `target.png`.

Work through the numbered sections in order. Section 2 (tokens) must land before any screen work; Section 5 gives the exact file order.

---

## 0. Context, Scope, and Assumptions

### 0.1 Stack (verified from the repo)
- **Frontend:** Next.js 16 (app router, `frontend/src/app`), React 18, TypeScript, Tailwind CSS 3.4.
- **Data:** `@tanstack/react-query` (infinite feed, mutations, optimistic like), `next-auth` (Google sign-in).
- **UI libs already installed — use these, add nothing new:** `lucide-react` (icons), `@heroicons/react`, `framer-motion` (motion), `react-hot-toast` (toasts), `@headlessui/react` (menus/dialogs), `classnames`.
- **Backend `Post` model** (`backend/src/models/Post.ts`): `content` (≤380 chars), `images` (≤8), `author` (ObjectId → User), `name` (≤20), `createdAt`, `likes` (ObjectId[]), `comments` (ObjectId[]). No repost/view/handle/verified fields exist.

### 0.2 The redesign in one paragraph
The current app is a black, single-column-feeling layout with a bare post card (avatar + name + date + reply + like) and an almost-empty right rail. The target is light-themed modern X: a three-column layout with a sticky segmented feed header, a richer composer, full-width post cards with a complete action bar and identity line (name · verified · @handle · time), and a populated right rail (rounded search, filled "Subscribe" card, "Today's News", "What's happening"). The skeleton (3-column flex, left nav, center feed, right rail, mobile bars) already exists and is **kept**; the work is a theme system plus per-component restyle and three new content modules.

### 0.3 Functional vs. visual-only (do not fabricate data)
Because the backend exposes only likes and a comments array, classify every interactive element:

| Element | Status | Behavior to implement |
|---|---|---|
| Feed (For you), infinite scroll | **Functional** | Keep existing React Query flow. |
| Like | **Functional** | Keep `LikeButton` logic; restyle only. |
| Reply | **Functional** | Navigates to `/posts/[id]` (already does). Show count = `comments.length` **only if the API returns it** (see 0.4); else icon only. |
| Compose + image upload | **Functional** | Keep `NewPostPage` logic; restyle only. |
| Delete / edit own post | **Functional** | Keep `DropDownMenu`; restyle only. |
| Auth / profile tab | **Functional** | Keep; add `@handle` line (see 0.4). |
| Repost, Bookmark, Share | **Visual-only** | Render styled buttons; on click fire `toast('Coming soon')`. No count. |
| Views | **Omit** | No data source. Do **not** render fabricated view numbers. |
| Verified badge | **Visual-only, opt-in** | Render only when `post.verified === true` (optional field, default absent). Default: not shown. |
| Following / topic tabs (Tech, Business, Crypto, `+`) | **Partial** | "For you" and "Following" render; "Following" shows an empty state (no follow graph). Topic tabs and `+` are visual affordances only (see 3.3). |
| Today's News, What's happening | **Static** | Hardcode a small data array in the component. Non-interactive links → `#`. |
| Grok / Chat floating buttons | **Visual-only** | Render; click → `toast('Coming soon')`. |
| Composer extra icons (GIF, poll, emoji, schedule, location) | **Visual-only** | Render disabled/no-op; only the image button works. |

### 0.4 Standing assumptions (each resolves an ambiguity)
- **BOTH THEMES ARE DELIVERABLES.** Build a working light theme (exact `target.png` clone) **and** a working dark theme, plus a runtime toggle and persistence (§2.5, §4.12). This is not optional and not deferred.
- **ASSUMPTION — initial theme resolution order:** (1) `localStorage.theme` if the user has chosen before; (2) else the OS `prefers-color-scheme`; (3) else light. A light-system, first-time visitor therefore sees the exact `target.png` on load.
- **ASSUMPTION — toggle location:** the theme switch lives inside the left-nav **"More"** control, upgraded from today's static `<div>` to a Headless UI `Menu` with a "Display" light/dark item. This keeps the main three columns pixel-identical to `target.png`. (A secondary switch may also sit in the right-rail footer; not required.)
- **ASSUMPTION — Keep the current nav items** (Home, Explore, Notifications, Messages, Bookmarks, Jobs, Communities, Premium, Verified Orgs, Profile, More). They map to real routes in `(navPages)`. The target screenshot shows a different X build (Follow, Chat, Grok, Creator Studio); do **not** rename routes. Match the target's *styling*, not its item list.
- **ASSUMPTION — `@handle`:** the User/session objects carry no handle. Derive a display handle client-side as `@` + `name` lowercased with spaces removed (e.g. "Mirza Abdulahović" → `@mirzaabdulahović`). Centralize in one helper (`frontend/src/app/utils/handle.ts`) so it can later be swapped for a real field. Render it muted next to the name.
- **ASSUMPTION — reply count:** expose `commentCount` on the feed payload if trivial (backend already stores `comments[]`); if the fetch shape cannot be changed safely, render the reply icon with no number. Do not invent a number.
- **ASSUMPTION — "Following" tab** reuses the same query but renders the empty state from 6.2 (there is no follow graph). Persist the active tab in component state only (no routing param) for now.
- **ASSUMPTION — right-rail content** (news items, trends) is illustrative static data placed in the component file; wording/values are placeholders, clearly generic, not impersonating real outlets.

---

## 1. Design Direction

Every choice below is tied to `target.png`.

### 1.1 Layout philosophy
- **Three fixed columns, centered, on a light canvas.** Left nav `275px`, center `600px`, right rail `350px`, matching the existing `max-w-[1265px]` shell in `layout.tsx`. Keep it.
- **Content-forward, low-chrome.** Borders are hairline dividers, not boxes. The center column is separated from the rails by vertical `1px` dividers (target shows the feed column bounded by faint vertical rules). Cards appear only in the right rail and are filled surfaces with **no border** (target: `#f7f9f9` fill, rounded, borderless) — the opposite of the current bordered dark card.
- **Sticky, not scrolling-away chrome.** Left nav, right rail, and the feed's tab header are sticky to the top of the viewport; only the feed scrolls.
- **Generous tap/reading rhythm.** Post cells have `16px` padding; the identity line, body, and action bar stack with consistent vertical gaps.

### 1.2 Spacing system
Use Tailwind's default 4px scale. Canonical values for this app:
- Cell/card padding: `16px` (`p-4`).
- Avatar → content gap: `12px` (`gap-3`).
- Vertical stack gap inside a post: `4px` name line, `4px` to body, `12px` body→media, `12px` media→action bar (`mt-3`).
- Right-rail card padding: `16px`; gap between rail modules: `16px` (`gap-4`).
- Nav item vertical padding: `12px`; icon→label gap `16px` (already `gap-4`).
- Action-bar buttons are evenly distributed across a `max-width: 425px` sub-row (target spacing).

### 1.3 Color palette
Two themes via CSS variables; both ship. Light is the default first-paint (§0.4). Brand accent colors are theme-independent. **The light values below are the exact X light-theme values — match them precisely to clone `target.png`. The dark values are the exact X "Lights out" values — dark mode must look equally finished, not a dimmed afterthought.**

**Light (`:root`, default) — exact `target.png` values:**
| Token | Value | Use |
|---|---|---|
| bg | `#ffffff` | page background |
| surface | `#f7f9f9` | rail cards (Subscribe, News, Trends) |
| input | `#eff3f4` | search field fill, hover-fill chips |
| border | `#eff3f4` | dividers between posts, column rules |
| border-strong | `#cfd9de` | focused inputs, stronger separators |
| text | `#0f1419` | primary text |
| text-secondary | `#536471` | handles, timestamps, meta, muted icons |
| hover | `rgba(15,20,25,0.03)` | nav/post hover wash |
| btn / btn-hover / btn-fg | `#0f1419` / `#272c30` / `#ffffff` | the black "Post" / "Start" buttons |

**Dark (`.dark`, retained):**
| Token | Value |
|---|---|
| bg | `#000000` |
| surface | `#16181c` |
| input | `#202327` |
| border | `#2f3336` |
| border-strong | `#3e4144` |
| text | `#e7e9ea` |
| text-secondary | `#71767b` |
| hover | `rgba(255,255,255,0.03)` |
| btn / btn-hover / btn-fg | `#eff3f4` / `#d7dbdc` / `#0f1419` |

**Brand (both themes):** blue `#1d9bf0`, blue-hover `#1a8cd8`, blue-bg `rgba(29,155,240,0.1)`; like `#f91880`, like-bg `rgba(249,24,128,0.1)`; repost/green `#00ba7c`, repost-bg `rgba(0,186,124,0.1)`.

Note the two button systems: the **black pill "Post"** button uses `btn` tokens; the **blue "Subscribe"** button uses brand blue. Do not merge them.

### 1.4 Typography
- Keep the loaded **Geist** variable font (`--font-geist-sans`). No new fonts.
- Scale (matches target): display/section headings `20px/700` (`text-xl font-bold`); nav labels `20px/400`, active `700`; post author name `15px/700`; handle, timestamp, meta `15px/400` muted; post body `15px/400`, line-height `20px`; right-rail card title `20px/800`; trend primary `15px/700`, trend meta `13px/400` muted; buttons `15px/700`.
- Body text uses `text-[15px] leading-5` (already the convention in `PostItem`). Keep it consistent everywhere.

### 1.5 Radius, borders, elevation
- Radius: pills (buttons, search, chips) fully rounded (`rounded-full`); cards `rounded-2xl` (`16px`); media inside posts `rounded-2xl` with `1px` border.
- Borders: hairline `1px` in `border` token. Rail cards are **borderless** filled surfaces. Post cells use a `border-b` divider only.
- Elevation: no drop shadows on cards (flat, target-accurate). Only floating action buttons and open menus/dialogs use a soft shadow (`shadow-lg` + `1px` border).

### 1.6 Motion
- Hover color/background transitions `~180ms ease` (existing `.post-hover` convention — extend it).
- Like animation: keep the existing `framer-motion` scale/opacity pop.
- Respect `prefers-reduced-motion` (see 6.6).

### 1.7 Iconography
- One icon library in the UI shell: **lucide-react** (already primary). Keep the inline X-logo SVG in `NavMenu`. Sizing: nav icons `26px`, action-bar icons `18–19px`, composer toolbar icons `20px`, rail chevrons/close `20px`. Icons inherit `currentColor`.

---

## 2. Design Tokens — INTRODUCE FIRST (blocking step)

This section is implementation step 0. Landing it first means every later screen edit consumes tokens instead of hardcoded colors, so steps never conflict.

### 2.1 `frontend/src/app/globals.css`
Replace the `:root` block and add a `.dark` block. Keep the `@tailwind` lines and `.post-hover` (repointed to the token).

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg: #ffffff;
  --color-surface: #f7f9f9;
  --color-input: #eff3f4;
  --color-border: #eff3f4;
  --color-border-strong: #cfd9de;
  --color-text: #0f1419;
  --color-text-secondary: #536471;
  --color-hover: rgba(15, 20, 25, 0.03);
  --color-btn: #0f1419;
  --color-btn-hover: #272c30;
  --color-btn-fg: #ffffff;

  /* legacy aliases kept so existing classes theme automatically */
  --background: var(--color-bg);
  --foreground: var(--color-text);
}

.dark {
  --color-bg: #000000;
  --color-surface: #16181c;
  --color-input: #202327;
  --color-border: #2f3336;
  --color-border-strong: #3e4144;
  --color-text: #e7e9ea;
  --color-text-secondary: #71767b;
  --color-hover: rgba(255, 255, 255, 0.03);
  --color-btn: #eff3f4;
  --color-btn-hover: #d7dbdc;
  --color-btn-fg: #0f1419;
}

body {
  color: var(--color-text);
  background: var(--color-bg);
  font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, sans-serif;
}

@layer utilities {
  .text-balance { text-wrap: balance; }
}

.post-hover { transition: background-color 180ms ease-in-out; }
.post-hover:hover { background-color: var(--color-hover); }
```

### 2.2 `frontend/tailwind.config.ts`
**Repoint the existing `x.*` palette to the CSS variables** (so all current `bg-x-black`, `text-x-text`, `border-x-border`, `bg-x-surface`, `bg-x-hover` usages become theme-aware with zero component edits), and add the few new semantic names.

```ts
colors: {
  background: 'var(--color-bg)',
  foreground: 'var(--color-text)',

  // semantic (prefer these in new/edited code)
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  input: 'var(--color-input)',
  border: 'var(--color-border)',
  'border-strong': 'var(--color-border-strong)',
  content: 'var(--color-text)',
  muted: 'var(--color-text-secondary)',
  hover: 'var(--color-hover)',
  btn: {
    DEFAULT: 'var(--color-btn)',
    hover: 'var(--color-btn-hover)',
    fg: 'var(--color-btn-fg)',
  },

  // brand (theme-independent)
  primary: '#1d9bf0',
  'primary-hover': '#1a8cd8',
  'primary-bg': 'rgba(29,155,240,0.1)',
  like: '#f91880',
  'like-bg': 'rgba(249,24,128,0.1)',
  repost: '#00ba7c',
  'repost-bg': 'rgba(0,186,124,0.1)',

  // existing tokens repointed to variables (back-compat)
  x: {
    black: 'var(--color-bg)',
    surface: 'var(--color-input)',   // was the search/box fill
    border: 'var(--color-border)',
    hover: 'var(--color-hover)',
    text: 'var(--color-text)',
    'text-secondary': 'var(--color-text-secondary)',
    blue: '#1d9bf0',
    'blue-hover': '#1a8cd8',
    'blue-bg': 'rgba(29,155,240,0.1)',
    like: '#f91880',
    'like-bg': 'rgba(249,24,128,0.1)',
    green: '#00ba7c',
    'green-bg': 'rgba(0,186,124,0.1)',
  },
},
```

### 2.3 Conventions to enforce from here on
- New/edited components use **semantic** names (`bg-bg`, `bg-surface`, `text-content`, `text-muted`, `border-border`, `bg-btn text-btn-fg`).
- **Never** use raw Tailwind grays/black/white for chrome again (`bg-black`, `text-white`, `border-gray-800`, `text-gray-500`, `text-red-500`, `hover:bg-gray-800`). These exist today in `NewPostPage`, `LikeButton`, `FileUpload` and must be migrated (see 2.4). `text-white` is allowed only on colored buttons (blue/black), where the foreground is intentionally fixed.

### 2.4 Hardcoded-color migration checklist (do during each file's step)
- `frontend/src/app/newPost/page.tsx`: `bg-black`→`bg-bg`; `text-white`→`text-content`; `border-gray-800`→`border-border`; Post button `bg-white text-black hover:bg-gray-300`→`bg-btn text-btn-fg hover:bg-btn-hover`.
- `frontend/src/app/components/ui/LikeButton.tsx`: `text-red-500`→`text-like`; `text-gray-500`→`text-muted`; `group-hover:text-red-500`→`group-hover:text-like`.
- `frontend/src/app/utils/FileUpload.tsx`: `hover:bg-gray-800`→`hover:bg-hover`; icon color → `text-primary`.
- `frontend/src/app/page.tsx`: spinner `border-t-blue-500 border-gray-300`→`border-t-primary border-border` (cosmetic).

### 2.5 Theme application, persistence, and no-flash (build with the tokens)
The tokens in §2.1 are inert until something adds/removes the `.dark` class on `<html>`. Ship the full mechanism:

1. **No-flash inline script** — in `layout.tsx` `<head>`, before any paint, run a tiny synchronous script that resolves the theme (localStorage → `prefers-color-scheme` → light) and toggles the class. This prevents a light/dark flicker on load and must run for SSR:
   ```tsx
   <script
     dangerouslySetInnerHTML={{
       __html: `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})();`,
     }}
   />
   ```
   Add `suppressHydrationWarning` to the `<html>` element (the class is set client-side before React hydrates).
2. **`ThemeProvider`** — a small client context (`frontend/src/app/utils/ThemeProvider.tsx`) exposing `{ theme: 'light' | 'dark', toggleTheme(), setTheme() }`. On mount it reads the resolved theme; `setTheme` writes `localStorage.theme` and toggles the `.dark` class on `document.documentElement`. Wrap `children` in `layout.tsx` (inside `QueryProvider`/`SessionProvider`).
3. **Persistence** — explicit user choice is saved to `localStorage.theme`; it always wins over system preference on subsequent visits.
4. **System-change listener (optional):** if the user has never chosen, follow live OS changes via a `matchMedia('(prefers-color-scheme: dark)')` `change` listener. Once they toggle manually, stop following.
5. **No JS reads of color values.** Components never branch on `theme` to pick a color — they use semantic token classes, which resolve per active class. `theme` is only for the toggle UI and the no-flash script.

---

## 3. Screen-by-Screen Breakdown

For each: **Keep / Change / New**. File paths are exact.

### 3.1 App shell — `frontend/src/app/layout.tsx`
- **Keep:** the centered `max-w-[1265px]` three-column flex; left `275px`, center `598px`→**widen to `600px`** (`w-full md:w-[600px]`), right `350px`; the mobile components mounting.
- **Change:** on `<html lang="en">` add `suppressHydrationWarning`; do **not** hardcode `className="light"`/`"dark"` (the no-flash script and `ThemeProvider` own the class). Add the no-flash inline `<script>` from §2.5 in `<head>`. Wrap `children` with `<ThemeProvider>` (inside the existing providers). Add a `1px` vertical divider on both edges of the center `<main>` so the feed column reads as bounded (target): give `<main>` `border-x border-border`. Remove any reliance on `bg-black`; the shell paints from tokens.
- **New:** mount the floating action buttons (3.9) here, after the mobile nav, so they overlay all pages: `<FloatingActions />` (desktop only). Theme resolution is handled by §2.5; no per-page theme code.

### 3.2 Left navigation — `NavMenu.tsx` + `ProfileTab.tsx`
- **Keep:** the `NAV_ITEMS` array and routes, the inline X-logo link, the sticky column, `ProfileTab` at the bottom.
- **Change:**
  - Active state: current uses only `font-bold`. Add a filled/active icon treatment — keep the same lucide icons but set active color to `text-content` and inactive to `text-content` as well (target keeps labels dark); the discriminator is weight (`font-bold`) plus a subtle active dot is out of scope. Minimum: active = `font-bold` + `strokeWidth 2.5` (already), inactive `font-normal`.
  - Hover: each item already `hover:bg-x-hover` → now themed. Keep.
  - **Post button:** currently blue full-width. Target's primary compose button in this build is blue for the clone's identity — **keep it blue** (`bg-primary hover:bg-primary-hover text-white`) to stay consistent with the clone's existing brand, OR switch to black `bg-btn`. **ASSUMPTION: keep it blue** (the clone has always used blue; the black button in target is a newer X build). Restyle only spacing to `h-[52px] rounded-full text-[17px] font-bold`.
  - **"More" control → menu:** replace the static "More" `<div>` with a Headless UI `Menu` (or `Popover`) whose trigger keeps the current `MoreHorizontal` icon + "More" label styled like a nav row. Its panel contains a **Display** item that mounts the `ThemeToggle` (§4.12) for switching light/dark. This is the primary home of the theme switch (§0.4).
- **`ProfileTab` changes:** add the `@handle` line under the name (from the 0.4 helper), muted `13px`. Structure becomes: avatar `40px` | (name `15px/700` truncate) over (`@handle` `13px` muted) | `MoreHorizontal`. Keep the hover "Sign Out" swap but move it to only swap the name line, not the handle. Keep loading spinner and signed-out "Sign In" button (restyle to `bg-primary`).

### 3.3 Feed header + tabs — NEW `frontend/src/app/components/feed/FeedTabs.tsx`
The current desktop feed has no tab header (only mobile `MobileTabs` exists). Target shows a sticky segmented header above the composer.
- **New component `FeedTabs`:** sticky (`sticky top-0 z-20`), `bg-bg/85 backdrop-blur`, `border-b border-border`. Renders tabs: **For you** and **Following** (functional selection), then visual-only **Tech, Business, Crypto** and a `+` icon button (target). Each tab: `flex-1` centered, `15px`, active `font-bold text-content` with a `4px` rounded blue underline indicator (`bg-primary`, width ~`56px`, centered) — reuse the exact indicator pattern already in `MobileTabs`. Inactive `text-muted`, `hover:bg-hover`.
- **State:** `activeTab` lifted to the page (`posts/page.tsx`) so the feed can react. For now both tabs render `PostListInfinite`; "Following" shows the empty state (6.2) instead of the list. Topic tabs and `+` fire `toast('Coming soon')`.
- **Wire-in:** render `<FeedTabs />` at the top of `posts/page.tsx`, above the composer.

### 3.4 Composer — `frontend/src/app/newPost/page.tsx`
- **Keep:** all logic (session fetch, `useMutation`, image upload via `FileUpload`, auto-grow textarea, `useEnterSubmit`, `LoadingBar`, image preview grid).
- **Change (visual):**
  - Container: `border-b border-border` only (drop the extra `border-x border-t` and `bg-black`; use `bg-bg`). Padding `px-4 pt-3 pb-2`.
  - Avatar `40px` (keep).
  - Textarea: `text-xl`, placeholder "What's happening?" (target wording; current is "What is happening?!"). `bg-transparent text-content placeholder-muted`.
  - **Toolbar icon row** (target shows a row of accent-blue icons): left cluster of icon buttons — image (functional, existing `FileUpload`), then GIF, poll, emoji, schedule, location as visual-only `IconButton`s (`text-primary hover:bg-primary-bg`, `20px`, disabled/no-op). Right side: the Post button.
  - **Post button:** pill `rounded-full h-9 px-4 text-[15px] font-bold`. Enabled `bg-primary text-white hover:bg-primary-hover`; disabled `bg-primary opacity-50 cursor-not-allowed`. (Current uses white/black; switch to blue to match the nav Post button and the clone brand — **ASSUMPTION**.)
- **New:** none. This component already renders inside `posts/page.tsx`; keep that composition.

### 3.5 Feed list — `frontend/src/app/components/posts/PostListInfinite.tsx`
- **Keep:** infinite query, `useInView` sentinel, page mapping.
- **Change:** replace the plain `LoadCircle` first-load state with **skeleton rows** (6.3) — render 5 `PostSkeleton` items while `status === 'pending'`. Keep the sentinel row but restyle: spinner while fetching, nothing (no "Load More" text) when more exist, and the empty end message only when truly empty vs. end-of-list (6.1/6.2). Divider under sentinel → `border-border`.

### 3.6 Post card — `frontend/src/app/components/posts/PostItem.tsx`
This is the highest-visibility change. Target card = identity line + body + media + full action bar.
- **Keep:** clickable cell → post detail, avatar, image carousel logic, "Show more" truncation, owner dropdown (`DropDownMenu`), `LikeButton` mount.
- **Change / New structure:**
  - Cell: `post-hover flex gap-3 border-b border-border p-4`. Avatar `48px` (keep).
  - **Identity line (new):** `name` (`15px/700 text-content hover:underline`) → optional `VerifiedBadge` (4.7) → `@handle` (muted, from helper) → `·` → relative timestamp. Change the date format from long month/day to X-style relative ("2h", "3d", or "Jul 16" if older than a week) via a new `frontend/src/app/utils/relativeTime.ts` helper. Right-aligned `MoreHorizontal` stays but moves into the identity row (target places the "…" at the top-right of the card).
  - Body: keep `text-[15px] leading-5`; change `break-all` → `break-words` (avoid mid-word breaks); keep media block.
  - **Action bar (new, replaces the current reply+like only):** a single row, `max-w-[425px]`, `justify-between`, using the shared `ActionButton` (4.5):
    1. **Reply** — `MessageCircle`, blue hover, count = `commentCount` if present (0.4). Click → `/posts/[id]` (keep existing handler).
    2. **Repost** — `Repeat2`, green hover, visual-only → `toast('Coming soon')`.
    3. **Like** — existing `LikeButton`, restyled to like-pink tokens (2.4). Keep its count.
    4. **Bookmark** — `Bookmark`, blue hover, visual-only.
    5. **Share** — `Share` (or `Upload`), blue hover, visual-only.
  - Remove the standalone absolute-positioned "…" wrapper; fold it into the identity row.

### 3.7 Post detail & comments — `frontend/src/app/posts/[id]/page.tsx`, `components/comments/*`
- **Keep:** all data/logic.
- **Change:** inherit the new tokens automatically. Restyle the reply composer (`NewComment.tsx`) to match 3.4's toolbar/button; restyle `CommentItem`/`ReplyItem` identity lines to match 3.6 (name · @handle · time). No structural change; this is token + identity-line reuse. Add a sticky detail header ("Post" title + back arrow) if not present, using `bg-bg/85 backdrop-blur border-b border-border`.

### 3.8 Right sidebar — `frontend/src/app/components/ui/SideBar.tsx`
Current: search + one bordered "Subscribe" card + footer. Target: rounded search, filled Subscribe card, "Today's News", "What's happening", footer.
- **Keep:** the sticky column and footer links.
- **Change:**
  - **Search:** fill `bg-input`, `rounded-full`, icon muted, focus ring `border-strong` + `bg-bg`. (Already close; swap `bg-x-surface`→`bg-input`.)
  - **Subscribe card:** change from `border border-x-border` to **borderless filled** `bg-surface rounded-2xl p-4`. Title `20px/800`, body muted `15px`, blue Subscribe button (keep). Copy → target: "Subscribe to Premium" / "Get rid of ads, see your analytics, boost your replies and unlock 20+ features."
- **New modules (create as small components in `components/rail/`):**
  - **`TodaysNews.tsx`** — `bg-surface rounded-2xl`. Header row: "Today's News" (`20px/800`) + a close `X` icon button (visual-only). 3 items; each item: small `40px` rounded thumbnail placeholder (`bg-input`), headline (`15px/700`, 2-line clamp), meta line muted `13px` ("2 days ago · Sports · 34.9K posts"). Items link to `#`.
  - **`WhatsHappening.tsx`** — `bg-surface rounded-2xl`. Header "What's happening" (`20px/800`). 4–5 trend rows: category/context muted `13px` over trend title `15px/700`, trailing `MoreHorizontal` visual-only. "Show more" link at the bottom (`text-primary`, `#`).
  - Order in `SideBar`: Search → Subscribe → TodaysNews → WhatsHappening → footer. Add `gap-4`.
- **Footer:** keep; ensure links use `text-muted hover:underline`. Keep the "Developed by Mirza Abdulahović" credit.

### 3.9 Floating action buttons — NEW `frontend/src/app/components/ui/FloatingActions.tsx`
- Target shows two circular FABs bottom-right (Grok, Messages/Chat). Render `fixed bottom-4 right-4 z-40 hidden md:flex flex-col gap-3`. Each: `48px` circle, `bg-bg border border-border-strong shadow-lg`, icon `text-content`, `hover:bg-hover`. Click → `toast('Coming soon')`. Mount in `layout.tsx` (3.1).

### 3.10 Mobile — `components/mobile/*`
- **Keep:** `MobileHeader` (sticky top), `MobileTabs` (For you/Following), `MobileNavBar` (bottom), `MobilePostButton` (FAB), `MobileNewPost`.
- **Change:** token migration only (they already use `x.*` tokens → now themed). Verify `MobileHeader`'s `bg-x-black/80 backdrop-blur` reads correctly in light (becomes `bg-bg/80`). Ensure the bottom nav bar and the mobile Post FAB don't overlap the new desktop `FloatingActions` (guard `FloatingActions` with `hidden md:flex`; `MobilePostButton` with `md:hidden`). Left nav and right rail already `hidden md:block` — keep.

---

## 4. Component-Level Specs

Build these as small shared components (or documented class recipes) **before** the screens that use them. States are default / hover / active(pressed) / disabled. All sizes in px.

### 4.1 Button (`components/ui/Button.tsx`)
Variants:
- **primary-blue** (compose, subscribe, sign-in): `bg-primary text-white`, hover `bg-primary-hover`, active `brightness-95`, disabled `bg-primary opacity-50 cursor-not-allowed`.
- **primary-black** (right-rail/inline "black" CTA, optional): `bg-btn text-btn-fg`, hover `bg-btn-hover`, disabled `opacity-50`.
- **secondary-outline** (e.g. "Following" toggles if added later): `bg-transparent border border-border-strong text-content`, hover `bg-hover`, disabled `opacity-50`.
- **ghost:** `bg-transparent text-content`, hover `bg-hover`.
Sizes: sm `h-8 px-4 text-[14px]`, md `h-9 px-4 text-[15px]` (default), lg `h-[52px] px-6 text-[17px]`. All `rounded-full font-bold`, `transition-colors`, focus-visible ring `ring-2 ring-primary/50`.

### 4.2 IconButton (`components/ui/IconButton.tsx`)
Circular hit area for toolbar/nav/rail icons. `inline-flex items-center justify-center rounded-full`, hit area `36px` (`p-2` around a `20px` icon). Default `text-muted`; hover `bg-hover text-content` (or a tinted variant: `accent="blue"` → `hover:bg-primary-bg hover:text-primary`; `accent="none"` default). Disabled `opacity-50 cursor-not-allowed pointer-events-none`. `aria-label` required.

### 4.3 Avatar (`components/ui/Avatar.tsx`)
Round image with fallback. Sizes: `sm 32`, `md 40` (composer/nav), `lg 48` (post card). Props: `src`, `alt`, `size`. Fallback to `/Logo.png` (existing convention) on empty/error; always `referrerPolicy="no-referrer"` (Google images). `rounded-full object-cover flex-shrink-0`.

### 4.4 Card / RailCard (`components/ui/Card.tsx`)
`bg-surface rounded-2xl` (borderless), padding `p-4`, `text-content`. Optional header row with title (`text-xl font-extrabold`) and optional trailing `IconButton`. Used by Subscribe, TodaysNews, WhatsHappening.

### 4.5 ActionButton (post action bar) (`components/ui/ActionButton.tsx`)
A group: icon in a circular hover-tinted pad + optional count. States:
- default: icon `text-muted`, no bg.
- hover: pad `bg-<accent>-bg`, icon+count `text-<accent>` (`reply`/`bookmark`/`share` → blue; `repost` → green; `like` → pink). Transition `180ms`.
- active/on (like, bookmark when toggled): filled icon + accent text persist.
- disabled: n/a (visual-only ones still hover but no state change).
Sizing: icon `18–19px` in a `p-2` pad; count `text-[13px]` with `4px` left gap; count hidden when `0`. Reuse the existing pattern already in `PostItem` for reply/like — generalize it.

### 4.6 Tab (used by FeedTabs / MobileTabs)
`relative flex-1 py-4 text-center text-[15px]`. Active: `font-bold text-content` + absolute bottom indicator `h-1 w-14 rounded-full bg-primary` centered. Inactive: `font-normal text-muted`, hover `bg-hover`. (Identical to the existing `MobileTabs` indicator — extract and share.)

### 4.7 VerifiedBadge (`components/ui/VerifiedBadge.tsx`)
`BadgeCheck` (lucide, already imported elsewhere) at `16–18px`, `text-primary`, inline after the name. Rendered only when `post.verified === true` (0.3). `aria-label="Verified account"`.

### 4.8 SearchInput
`relative`; icon `Search` `20px` muted absolute-left; input `w-full rounded-full bg-input py-3 pl-12 pr-4 text-content placeholder-muted outline-none focus:bg-bg focus:border focus:border-strong`. (Evolve the existing markup in `SideBar`.)

### 4.9 Divider
Horizontal: `border-b border-border`. Vertical column rules: `border-x border-border` on the center `<main>`.

### 4.10 EmptyState (`components/ui/EmptyState.tsx`)
Centered block, `py-16 px-8 text-center`: title `text-2xl font-extrabold text-content`, subtitle `text-[15px] text-muted mt-1`, optional action button (4.1). Used by empty feed and "Following".

### 4.11 Skeleton (`components/ui/PostSkeleton.tsx`)
Mirrors the post cell layout with `animate-pulse` blocks in `bg-input`: `48px` circle avatar; two text bars (`w-40 h-3`, then `w-full`/`w-3/4 h-3`); optional media rectangle; keep `border-b border-border p-4 gap-3`.

### 4.12 ThemeToggle (`components/ui/ThemeToggle.tsx`)
Consumes `ThemeProvider` (§2.5). Renders inside the "More" menu (§3.2) as a row: a `Sun`/`Moon` lucide icon (`20px`) + label ("Light mode" / "Dark mode" — the label names the mode it switches *to*) + a state indicator. Click calls `toggleTheme()`, which flips the `.dark` class and writes `localStorage.theme`. States: default `text-content`, hover `bg-hover`, focus ring; the currently active mode shows a check or highlighted state. Must be a client component; render nothing theme-dependent until mounted to avoid hydration mismatch (guard the icon with a mounted flag, defaulting to the SSR-resolved theme). `aria-label` reflects the target mode.

Execute in this order. Steps 0–1 are blocking (tokens); after that, shared components precede the screens that consume them. Run `npm run typecheck` (from `frontend/`) after each group.

**Group A — Tokens & theming (blocking, do first)**
0. `frontend/src/app/globals.css` — new `:root` (light) + `.dark` variables, repointed `.post-hover`, `body` (§2.1).
1. `frontend/tailwind.config.ts` — semantic color map + repointed `x.*` (§2.2).
1b. `frontend/src/app/utils/ThemeProvider.tsx` — NEW theme context, persistence, system fallback (§2.5).
1c. `frontend/src/app/layout.tsx` (theme wiring only) — no-flash `<script>` in `<head>`, `suppressHydrationWarning` on `<html>`, wrap `children` in `ThemeProvider` (§2.5). Remaining layout changes land in step 11.
   *After this group, the app renders the resolved theme (light by default), both themes are switchable via the class, and there is no load flicker. Verify light matches `target.png` and dark is complete before continuing.*

**Group B — Shared primitives (create before screens)**
2. `components/ui/Button.tsx` (4.1)
3. `components/ui/IconButton.tsx` (4.2)
4. `components/ui/Avatar.tsx` (4.3)
5. `components/ui/Card.tsx` (4.4)
6. `components/ui/ActionButton.tsx` (4.5)
7. `components/ui/Tab.tsx` (4.6) — refactor `MobileTabs` to use it.
8. `components/ui/VerifiedBadge.tsx` (4.7)
9. `components/ui/EmptyState.tsx` (4.10) and `components/ui/PostSkeleton.tsx` (4.11)
10. `utils/handle.ts` (`@handle` helper, 0.4) and `utils/relativeTime.ts` (3.6).
10b. `components/ui/ThemeToggle.tsx` (4.12) — consumes `ThemeProvider` from step 1b.

**Group C — Chrome / shell**
11. `layout.tsx` — center width `600px`, `border-x border-border` on `<main>`, mount `<FloatingActions />` (3.1).
12. `components/ui/FloatingActions.tsx` — NEW (3.9).
13. `components/ui/NavMenu.tsx` — active weights, Post button restyle, and upgrade "More" to a Headless UI `Menu` hosting the `ThemeToggle` (3.2, 4.12).
14. `components/ui/ProfileTab.tsx` — add `@handle` line (3.2).

**Group D — Feed**
15. `components/feed/FeedTabs.tsx` — NEW (3.3).
16. `posts/page.tsx` — mount `FeedTabs`, lift `activeTab`, branch Following→EmptyState (3.3, 6.2).
17. `newPost/page.tsx` — token migration + toolbar icon row + blue Post button (3.4, 2.4).
18. `utils/FileUpload.tsx` — token migration, wrap as `IconButton` (2.4).
19. `components/posts/PostListInfinite.tsx` — skeletons + end/empty states (3.5, 6.1).
20. `components/posts/PostItem.tsx` — identity line (name·badge·handle·time), relative time, full action bar via `ActionButton` (3.6).
21. `components/ui/LikeButton.tsx` — token migration to like/muted (2.4).

**Group E — Right rail**
22. `components/ui/SideBar.tsx` — SearchInput, filled Subscribe card, insert news+trends, order/gap (3.8).
23. `components/rail/TodaysNews.tsx` — NEW static module (3.8).
24. `components/rail/WhatsHappening.tsx` — NEW static module (3.8).

**Group F — Detail, comments, mobile**
25. `posts/[id]/page.tsx` — sticky detail header, token pass (3.7).
26. `components/comments/NewComment.tsx`, `CommentItem.tsx`, `ReplyItem.tsx`, `NewReply.tsx`, `CommentListInfinite.tsx` — identity line + composer restyle reuse (3.7).
27. `components/mobile/*` — verify token theming, guard overlaps (3.10).
28. `page.tsx` (root spinner) — token cosmetic (2.4).

**Group G — QA**
29. Run `npm run typecheck && npm run lint && npm run build` from `frontend/`. Existing tests (`*.test.tsx`) must still pass: `PostItem.test.tsx`, `LikeButton.test.tsx`, `ProfileTab.test.tsx`, `PostListInfinite.test.tsx` — if a test asserts old copy/classes (e.g. placeholder text "What is happening?!"), update the assertion to the new value in the same step, not the component back.
30. Walk the Appendix A checklist against `target.png`.

**Shared-token dependency rule:** nothing in Groups C–F may introduce a new raw color. If a needed shade is missing, add it as a token in Group A and reference it — do not inline a hex.

---

## 6. Edge Cases & Responsive Behavior

### 6.1 Breakpoints
- Single breakpoint in use: Tailwind `md` (`768px`). `< md` = mobile (left nav + right rail hidden; mobile header/tabs/bottom-nav/FAB shown). `≥ md` = full three columns. Keep this; do not add new breakpoints. The center column is fluid below `md` (`w-full`) and fixed `600px` at/above `md`.
- Right rail (`350px`) can be hidden earlier on narrow desktops if it causes overflow: wrap it `hidden lg:block`? **ASSUMPTION: leave at `md:block`** (matches current shell); the `max-w-[1265px]` container prevents overflow at `md`.

### 6.2 Empty states (`EmptyState`, 4.10)
- **Empty "For you" feed** (no posts at all): title "Welcome to X Clone", subtitle "When posts arrive, they'll show up here.", plus the composer stays visible above it.
- **"Following" tab** (no follow graph): title "You're not following anyone yet", subtitle "Posts from accounts you follow will appear here." No action button (follow isn't implemented).
- Distinguish from **end-of-list**: when the feed has items but no more pages, keep the existing "Nothing more to load." line (muted, centered) at the sentinel — do **not** show a full EmptyState.

### 6.3 Loading states
- **First feed load:** 5× `PostSkeleton` (4.11) instead of a bare spinner.
- **Next page:** small `LoadCircle` spinner at the sentinel (keep).
- **Rail modules:** static data → render immediately, no skeleton.
- **Composer submit:** keep the `LoadingBar` progress; disable the Post button and toolbar while `loading` (existing behavior — preserve).
- **Auth loading:** keep `ProfileTab`'s spinner; keep root `page.tsx` spinner (retokened).

### 6.4 Error states
- Feed error: replace `<div>Error happened</div>` with an inline block — muted message "Something went wrong." + a "Retry" ghost button calling `refetch()`. Keep it inside the feed column, not full-screen.
- Composer/like errors: keep the existing `react-hot-toast` error toasts.

### 6.5 Content edge cases
- **Long post body:** keep the 300-char "Show more" truncation; switch `break-all`→`break-words`; body is `whitespace-pre-wrap` (keep). Note the backend caps content at 380 chars.
- **Long name / handle:** `truncate` the name; handle can wrap off with `min-w-0` on the identity row so the timestamp never pushes out of the cell.
- **Missing avatar:** `Avatar` fallback to `/Logo.png` (keep existing pattern).
- **Missing handle field:** derived handle always resolves (0.4); if `name` is empty, render no handle rather than `@`.
- **Images:** 1 image = full-width `rounded-2xl` capped at `max-h-[512px]`; 2–8 use the existing carousel with chevrons + dot indicators (keep). Verify carousel controls have `≥44px` touch targets on mobile.
- **Counts:** hide any count that is `0` or unavailable (like already does this; apply to reply).

### 6.6 Accessibility & motion
- Respect reduced motion: gate `framer-motion` like-pop and any transitions behind `prefers-reduced-motion` (framer-motion's `useReducedMotion` or a CSS `@media (prefers-reduced-motion: reduce){ *{transition:none!important} }` guard in `globals.css`).
- Every icon-only button (`IconButton`, action bar, FABs, rail close) needs an `aria-label`. Tabs use `role="tab"`/`aria-selected`.
- Maintain contrast: `text-muted` on `bg-bg`/`bg-surface` meets AA at these values; do not lighten further.
- Focus-visible ring (`ring-2 ring-primary/50`) on all interactive elements.

### 6.7 Theming safety (both modes)
- **Both modes must be complete.** Every screen and component is checked in light **and** dark; there is no "primary" mode that gets more polish. Light must match `target.png` exactly; dark must look equally finished.
- Because tokens are CSS variables, no component reads a theme value in JS to pick a color. If an inline style needs a color, read the CSS variable, don't hardcode. `theme` from `ThemeProvider` is used only by the toggle UI and the no-flash script.
- Do not ship a half-migrated state where some chrome is still `bg-black` / `text-white` / `border-gray-*`: complete the §2.4 migration list, or those elements will look correct in dark and broken in light (and vice-versa).
- **No FOUC:** the §2.5 inline script must set the class before paint; verify a hard refresh in each mode shows no light/dark flash.
- **Persistence + system:** a chosen theme survives reload (localStorage); a never-chosen visitor follows OS preference. Verify both paths.
- Contrast holds in both palettes (`text-muted` on `bg`/`surface` meets AA in light and dark at the given values); do not tweak one mode's token in a way that breaks the other.

---

## Appendix A — `target.png` acceptance checklist
Verify each after Group G, **in both light and dark mode**:
- [ ] **Light mode** matches `target.png` exactly: white page, near-black text, hairline light-gray dividers, `#f7f9f9` rail cards, `#eff3f4` search fill.
- [ ] **Dark mode** is complete: black `#000` page, `#16181c` cards, `#e7e9ea` text, `#2f3336` dividers; no light-mode remnant (`bg-white`, black text on black, etc.) on any screen.
- [ ] Theme switch in the left-nav "More" menu flips modes instantly; the choice **persists across reload**; a never-chosen visitor follows OS `prefers-color-scheme`; a hard refresh in each mode shows **no flash**.
- [ ] Left nav labels dark, active item bold; blue "Post" pill; profile row shows name **and** `@handle`.
- [ ] Sticky segmented feed header (For you / Following + topic tabs + `+`) with blue underline on the active tab.
- [ ] Composer: avatar, "What's happening?" placeholder, blue icon toolbar row, blue "Post" pill (disabled until text entered).
- [ ] Post card: avatar 48px; identity line name · (badge) · `@handle` · relative time; "…" top-right; body; media; action bar of 5 items (reply, repost, like, bookmark, share) with tinted hovers; like + reply functional, rest toast "Coming soon".
- [ ] Right rail: rounded filled search; borderless filled "Subscribe to Premium" card; "Today's News" card with thumbnail + headline + meta; "What's happening" trends card; footer with credit.
- [ ] Two circular floating buttons bottom-right (desktop).
- [ ] Mobile (`<768px`): rails hidden, mobile header + tabs + bottom nav + Post FAB present, correct in both themes.
- [ ] `npm run build`, `typecheck`, `lint`, and existing Jest tests pass.
- [ ] No remaining raw `bg-black` / `text-white` (non-button) / `border-gray-*` / `text-red-500` / `text-gray-500` in the shell.
