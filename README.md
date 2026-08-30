# Inkwell

A distraction-free novel writing app. Organize a book into chapters and
scenes, keep a codex of characters and places, track a daily word-count goal
and streak, and lean on an AI writing partner when you want one — continue a
passage, rewrite a selection, or brainstorm what happens next.

Built with Next.js 16 (App Router) and deployed on Vercel. Not a localhost
toy — it runs as a real web app on a public URL, with server API routes for
the AI features.

## What it does

- **Books, chapters, scenes** — organize a manuscript into a tree you can
  reorder, rename, and drill into. Each scene autosaves as you type.
- **Distraction-free editor** — a clean manuscript page with a serif, sans,
  or mono font, three page widths, and a focus mode that hides everything
  but the page. Optional typewriter scrolling keeps your current line
  centered.
- **Story codex** — track characters, locations, items, and notes per book.
  The AI assistant reads this so its suggestions actually fit your story.
- **Word-count goals and streaks** — set a daily word target; the dashboard
  shows today's progress, your current streak, total words across every
  book, and the last seven days as a small bar chart.
- **AI writing partner** — *Continue writing* drafts the next few sentences
  from where a scene leaves off, *Rewrite* reworks a selection to a preset
  or custom instruction, and *Brainstorm* answers open questions about plot
  or character, all scoped to that book's synopsis and codex. Nothing is
  inserted without you clicking Insert.
- **Export** — download a whole book as plain text or Markdown at any time.
- **Installable app** — add it to your phone's home screen or your desktop
  (Chrome/Edge show an in-app Install button; iOS uses Share → Add to Home
  Screen). Once installed it opens in its own window with no browser chrome,
  and a service worker caches the app shell so writing keeps working offline
  — your books already live in `localStorage`, so only the AI calls need a
  connection.

## Deploy to Vercel

### Option A — from the Vercel dashboard

1. Push this branch to GitHub (already done if you're reading this in the repo).
2. Go to [vercel.com/new](https://vercel.com/new) and import this repository.
3. Vercel auto-detects Next.js — leave the build settings alone.
4. Add the environment variable below (optional), then click **Deploy**.

### Option B — from the CLI

```bash
npm i -g vercel
vercel          # first deploy, answer the prompts
vercel --prod   # promote to your production URL
```

### Environment variable

| Name | Required | Where to get it |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Recommended | [console.anthropic.com](https://console.anthropic.com/settings/keys) |

Add it under **Project → Settings → Environment Variables**, then redeploy so
the running deployment picks it up.

The key is only ever read server-side inside the API routes, so it is never
shipped to the browser.

**Without the key the app still deploys and works** — every writing feature
works fully offline, including autosave, the codex, exports, and word-count
tracking. Only the AI assistant panel falls back to canned suggestions
instead of calling Claude. Add the key to get real generated responses.

## Local development

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

## How it's put together

```
app/
  page.tsx                    dashboard: streak, goals, your books
  book/[id]/page.tsx          the writing workspace for one book
  api/ai/continue/            drafts the next few sentences of a scene
  api/ai/rewrite/             rewrites a selected passage
  api/ai/brainstorm/          answers open questions about the story
components/
  BookWorkspace.tsx           top bar + chapter tree + editor + side panel
  ChapterTree.tsx             chapters/scenes: add, rename, reorder, delete
  Editor.tsx                  the manuscript textarea, autosave, notes
  CodexPanel.tsx               characters / locations / items / notes
  AssistantPanel.tsx          the AI panel: continue, rewrite, brainstorm
  SettingsModal.tsx           theme, font, page width, daily goal
lib/
  store.ts                    zustand store, persisted to localStorage
  types.ts                    Book / Chapter / Scene / CodexEntry
  words.ts                    word counts, streaks, weekly history
  ai.ts                       Anthropic client wrapper
  fallback.ts                 offline responses when no API key is set
  exportBook.ts               .txt / .md export
  installPrompt.ts            install-prompt state (Chrome/Edge "Install" flow)
public/
  sw.js                       service worker: offline app shell + asset caching
```

There is no database and no user accounts — every book, its chapters and
scenes, your codex entries, and your writing history live in your browser's
`localStorage`. Clearing site data resets the app.

Three themes (paper, sepia, ink) are implemented as CSS custom properties
switched by a `data-theme` attribute, applied before first paint so there's
no flash of the wrong theme.
