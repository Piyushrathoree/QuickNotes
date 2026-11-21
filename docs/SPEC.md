# Quick Notes — Product & Build Spec (v1)

> **Auth update (2026-11-21, final): email + password, no verification.** `/login` = sign in / create account (email, password, optional name); success → `/dashboard` (protected; guests are redirected to `/login`; `/login` redirects signed-in users to `/dashboard`). `/forgot-password` → emailed reset link (Gmail SMTP via nodemailer, `GMAIL_USER` + `GMAIL_APP_PASSWORD`; dev prints the link) → `/reset-password?token=…`. Signed-in users change their password in the account menu with the current password OR an emailed reset link. Sign-out returns to `/`. Guests still use `/`. No social providers, no email verification.
>
> **Scope change (2026-11-21) — this block overrides anything below it.**
> v1 = notes.io's layout and simplicity, with our own look. Plain notepad, no Markdown features.
> - **Layout (notes.io structure):** one slim top bar (wordmark left; actions right) sitting directly on top of ONE big full-width writing pad that fills the rest of the viewport. A tiny counter in the pad's bottom-right corner (characters / size + save state). Nothing else.
> - **Pad:** a plain auto-growing `<textarea>` with faint horizontal ruled lines aligned to the text line-height (a notepad feel, drawn with CSS), left margin rule, placeholder "Write a note in this area…". No CodeMirror, no syntax styling, no preview.
> - **Top bar right actions:** guest → "Sign in". Signed in → "New" · "My notes" (opens a popover/sheet list of notes with title + relative time, click to open, trash with undo toast) · avatar menu (theme system/light/dark, sign out).
> - Guest = single note in localStorage. Signed in = many notes synced to Neon (store/API unchanged).
> - **Our look (not notes.io's skin):** no wood texture, no yellow paper, no notes.io logo/branding. Neutral zinc palette with one blue accent; pad = white (light) / `#141416` (dark) rounded 14px card with hairline border on a `#F4F4F5` / `#09090B` canvas; ruled lines very faint; Geist Sans 16px/1.75; Phosphor icons (regular, 18px); buttons 10px radius; calm 150ms motion.
>
>
> **Design update (2026-11-21 #2) — overrides the "Our look" bullet above.** Claude.ai-inspired design language (palette, softness, layout), but our own product: no Claude/Anthropic name, logo, or spark mark.
> - **Layout:** claude.ai-style collapsible left sidebar in BOTH modes (guest too): top "New note" button, then a "Notes" list (title + relative time, hover shows trash), bottom = account row (guest: "Sign in with email" card linking to /login; signed in: avatar + name → menu). Main area: the ruled writing pad (rules + text sizing unchanged — user likes them). Sidebar collapses to a slim icon rail; Sheet on mobile.
> - **Guest = many notes in localStorage** (was single). Signed in = many notes in Neon. On sign-in, ALL guest notes migrate once (idempotent by note id).
> - **Fonts (pref, 3 options, default Draw):** Draw = Shantell Sans (tldraw-like handwritten), Sans = IBM Plex Sans, Serif = IBM Plex Serif. UI chrome font stays a clean sans. Picker in the account/appearance menu.
> - **Palette (warm tinted, easy on eyes):** Light — app bg `#F5F4ED`, sidebar `#EFEEE6`, pad `#FAF9F5`, text `#141413`, secondary `#3D3D3A`, muted `#73726C`, border `rgba(31,30,29,0.12)`, rules `rgba(31,30,29,0.07)`, accent `#C96442` (hover `#B5573A`), accent-soft `#F3E3DA`. Dark — app bg `#262624`, sidebar `#1F1E1D`, pad `#30302E`, text `#F5F4ED`, secondary `#C2C0B6`, muted `#9C9A92`, border `rgba(222,220,209,0.12)`, rules `rgba(222,220,209,0.06)`, accent `#D97757`, accent-soft `#3A2C26`.
> - **Shape:** soft, claude-like: pad radius 20px with 1px hairline border + very soft shadow; buttons 10px; list items 8px; menus 14px with soft shadow; avoid harsh 1px dark borders.
> - **Icons:** Hugeicons (`@hugeicons/react` + `@hugeicons/core-free-icons`, stroke-rounded, 18px, strokeWidth 1.5).
>
> **Update #3 (2026-11-21): live Markdown is IN v1** — no preview pane/toggle. The note body is a CodeMirror 6 editor that converts Markdown as you type (live-preview style): `- ` / `* ` → bullet (continues on Enter, empty bullet exits), `1. ` numbered lists, `- [ ] ` checkboxes, `# `/`##`/`###` bigger+bolder headings (markers hidden off-line), `---` + Enter → horizontal rule, ```` ```lang ```` + Enter → fenced code block with syntax highlighting and copy button, inline `code`, **bold**, *italic*, links. Storage stays plain Markdown text; every line stays on the 28px ruled grid. The title is still the separate field above.
>
> ## Later (planned, not in v1)
> 1. Side-by-side Markdown preview (Write | Preview toggle) — not needed now that live Markdown exists; revisit only if asked.
> 2. ⌘K command palette (search notes, new note, theme).
> 3. Share links (`/s/abc123`, read-only) — notes.io's "Short" button.
> 4. Text ↔ Markdown converter.

A notes.io-inspired notes app: open the URL and start typing. Super simple, super beautiful, better UX.
There is **no landing page** — `/` is the editor.

## Stack
- Next.js 16 (App Router, `src/` dir), TypeScript strict, Tailwind CSS v4
- Auth: **Better Auth** (`better-auth`) with `emailAndPassword` only (no verification, no social providers; reset mail via Gmail SMTP, dev prints the link to the console), Drizzle adapter (Postgres) for sessions, `nextCookies()` plugin. Server instance `src/lib/auth.ts`, client `src/lib/auth-client.ts` (`createAuthClient` from `better-auth/react`), handler `src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`. Session read server-side with `auth.api.getSession({ headers: await headers() })`. A Better Auth MCP server (`better-auth`) is configured in Codex — use it to check current APIs instead of guessing.
- DB: Neon Postgres via `@neondatabase/serverless` + Drizzle ORM (`drizzle-orm/neon-http`), `drizzle-kit` for migrations
- Markdown: `react-markdown` + `remark-gfm` (no raw HTML rendering)
- UI kit: **shadcn/ui** (Radix primitives, Tailwind v4, "new-york" style, themed from our design tokens — restyle, never ship default shadcn look), `lucide-react` icons, `motion` for animation, `sonner` for toasts (undo delete), shadcn `Command` (cmdk) for the ⌘K switcher. Components live in `src/components/ui/**` (owned by the UI-kit setup step; feature builders may use but not restyle them globally).
- Deploy: Vercel. Package manager: pnpm.

## Two modes
### Guest (not signed in) — single note
- Exactly ONE note, stored in `localStorage` under key `notes:guest:v1` as JSON `{ content: string, updatedAt: number }`.
- Autosaves on input (debounced ~300ms). No save button.
- No sidebar. Just the page.

### Signed in (email + password) — many notes
- Notes live in Neon. Collapsible left sidebar listing notes (title = first line of content, else "Untitled"), sorted by `updatedAt` desc.
- New note button, delete note (with undo toast, soft feel), ⌘K / Ctrl+K quick switcher.
- Autosave to server debounced (~800ms) with optimistic UI; a tiny save-state indicator ("Saved" / "Saving…" / "Offline").
- Last-opened note restored on load.
- **Migration on first sign-in:** if the guest note has non-empty content, it is created as a note in the account once (idempotent — use a client-generated UUID stored next to the guest note so retries don't duplicate), then the guest note is cleared.
- Conflict policy: last write wins on `updatedAt`.

## Layout
- Top-right: profile area. Guest → subtle "Sign in" button. Signed in → avatar with a small menu (email, sign out).
- **Directly below the profile:** the Markdown button (icon toggle). Toggling opens a side-by-side split: editor left, rendered Markdown preview right. Preference persisted in localStorage (`notes:ui:v1`). On narrow screens (<768px) it toggles between edit and preview instead of splitting.
- Editor: **CodeMirror 6** (`@uiw/react-codemirror` + `@codemirror/lang-markdown` + `@codemirror/language-data`), themed to feel like paper, not code: serif font, no gutters/line numbers, no active-line box, soft caret in accent colour, generous line-height, centered column max ~720px when preview is closed, full height.
  - Markdown-aware: headings rendered larger/bolder inline, emphasis/links/code subtly styled, syntax markers (`#`, `**`, `` ` ``) dimmed.
  - Writing ergonomics: list/quote continuation on Enter, Tab/Shift-Tab indent lists, auto-close brackets & backticks, ⌘B / ⌘I / ⌘K-link shortcuts that wrap selection, ⌘F search panel styled to match, full undo history, line wrapping, spellcheck on.
  - Placeholder on empty note ("Start writing…").
  - Scroll-sync between editor and preview when split is open.
- Chrome fades to low opacity while typing and returns on mouse move.
- Footer-ish corner: word/character count, very subtle.

## Design direction
- Calm, paper-like, generous white space. Not generic SaaS.
- Writing font: a serif (Newsreader via `next/font/google`). UI font: Inter or Geist Sans.
- Light: warm off-white paper (`#FBFAF7`-ish), ink text (`#1C1B19`-ish), one warm accent (amber/terracotta).
- Dark: deep warm charcoal, not pure black; designed, not inverted. Follows system, with manual override.
- Motion: subtle, 150–250ms ease-out; preview panel slides in. Respect `prefers-reduced-motion`.
- All colors/spacing/radii as CSS variables (design tokens) in `src/app/globals.css`.
- Accessible: visible focus rings, labelled icon buttons, keyboard reachable everything.

## Data model (Drizzle, `src/db/schema.ts`)
- Better Auth core tables `user`, `session`, `account`, `verification` exactly as Better Auth's schema generator produces for Drizzle/Postgres (generate it with the Better Auth CLI, don't hand-invent columns).
- `notes`: `id` (uuid pk, client-generated allowed), `userId` (text fk user.id, cascade), `content` (text), `createdAt`, `updatedAt` (timestamptz), `deletedAt` (nullable, soft delete). Index on (`userId`, `updatedAt`).

## API (Route Handlers under `/api/notes`, all require a Better Auth session, all scoped to `session.user.id`)
- `GET /api/notes` → list (id, content preview/title, updatedAt)
- `GET /api/notes/[id]` → full note
- `PUT /api/notes/[id]` → upsert `{ content, updatedAt }` (last write wins)
- `DELETE /api/notes/[id]` → soft delete
- Validate bodies with `zod`. Never trust client userId.

## Env vars (`.env.example`)
`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` (both optional in dev)

## Module ownership (so parallel builders don't collide)
| Area | Owns |
|---|---|
| Scaffold | config files, `package.json`, `globals.css` tokens, `src/app/layout.tsx`, `src/lib/types.ts`, stub files below |
| Editor UI | `src/components/**`, `src/app/page.tsx` |
| Local store | `src/lib/store/**` (guest storage, UI prefs, client note store interface + hooks) |
| Auth + DB + API | `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/db/**`, `src/app/api/**`, `drizzle.config.ts`, `src/lib/sync/**` |

Shared contracts live in `src/lib/types.ts` and are set by the scaffold; feature builders must not change them without noting it.

## Out of scope for v1
Share links, tags, folders, collaboration, rich-text editor, images.
