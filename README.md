# Guitar AI

*"Practice like someone's listening."*

An AI-powered guitar teacher: real microphone-driven feedback, AI-generated
song arrangements and original compositions, a rhythm game, a five-level
curriculum, and a practice system that adapts to what you actually struggled
with last time.

Built with Next.js 16 (App Router) and deployed on Vercel as a real, live web
app — not a localhost demo.

The full product specification — UX flows, AI architecture, data model,
monetization, hardest technical problems, MVP vs. full-version scope, and
brand identity — lives in **[`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md)**.

## What's actually working right now

- **Learning Path** (`/learning-path`) — three parallel, pick-your-own paths
  from the home screen: **Chords**, **Notes** (standard notation), and
  **Tabs**. Each is 20 levels × 10 parts × 5 lessons — 1,000 real, distinct
  lessons per path, procedurally assembled from a small set of pedagogical
  "archetypes" (introduce, drill, transition, strum/rhythm focus, speed ramp,
  mixed review, timed checkpoint, freeplay) rather than 3,000 hand-typed
  paragraphs — the same approach large gamified skill trees use to stay
  tractable. Every lesson has a **Lesson Player**: a real browser
  text-to-speech "AI teacher" narrating the instructions (Web Speech API),
  the relevant chord diagram / music staff / ASCII tab, and a live
  microphone check (pitch detection for notes/tabs, chroma chord-matching for
  chords) that listens and tells you when you've got it right.
- **Learn a Song** (`/learn-song`) — a curated library of **50 real,
  well-known songs** across genres and decades (Wonderwall, Fast Car, Hotel
  California, Someone You Loved, and many more) with verified chords, capo,
  and strum pattern — chords only, never lyrics or a note-for-note
  transcription, since chord progressions are functional building blocks
  rather than independently copyrightable expression. Underneath that, a set
  of **original songs with full lyrics** you can Play (karaoke-style: lyrics
  scroll in sync with the chords, and the app listens live and marks each
  line as you nail the chord). Describing a vibe still generates a fresh
  *original* arrangement on demand.
- **Live Coach** (`/live-coach`) — real mic input, in-browser autocorrelation
  pitch detection (tuner mode) and chroma-based chord matching (chord-check
  mode), with short, rule-based coaching feedback. No audio is uploaded.
- **Fix My Playing** (`/fix-my-playing`) — play a full built-in practice song
  along with a click track; the app measures your actual chord accuracy and
  strum timing via real signal processing, ranks your biggest issues, and
  builds a targeted 10–20 minute practice routine.
- **Guitar Game** (`/game`) — a rhythm game where chords scroll toward a hit
  line and your real strums (mic onset + chord detection) are judged for
  timing and accuracy, with streaks and personal records.
- **Create Music** (`/create-music`) — describe a song idea and get a fully
  original composition: chords, melody description, strumming pattern, tab,
  and practice instructions.
- **Practice** (`/practice`) — pick 5–45 minutes and get a generated session
  that prioritizes your stored weak spots, with a live countdown.
- **Progress** (`/progress`) — streak, total practice time, per-path level
  and lessons completed, average accuracy, strongest/weakest areas.
- **Onboarding** (`/onboarding`) — a 7-step wizard (guitar type, skill level,
  genres, goals, practice time, focus) that personalizes everything above,
  including which level each of the three paths starts unlocked at.

All progress is stored locally (`localStorage`, via a persisted Zustand
store) — no account or database required to use the app.

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
the running deployment picks it up. The key is only ever read server-side
inside the API routes, so it is never shipped to the browser.

**Without the key the app still deploys and works** — song arrangements and
compositions fall back to a deterministic, music-theory-based generator, and
the Fix My Playing summary falls back to a template. Add the key to get real
Claude-generated arrangements, compositions, and coaching summaries.

## Local development

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local   # optional
npm run dev
```

Live Coach, Fix My Playing, and Guitar Game all request microphone access —
your browser will prompt for permission the first time you use them.

## How it's put together

```
app/
  page.tsx                        home dashboard (3 paths + Popular Songs)
  onboarding/                     7-step personalization wizard
  practice/                       duration picker + generated session
  learning-path/                  path picker -> levels -> parts (Lesson Player)
    [path]/page.tsx                 20-level list for chords|notes|tabs
    [path]/[level]/page.tsx         10 parts x 5 lessons, inline Lesson Player
  live-coach/                     real-time mic tuner + chord check
  learn-song/                     50-song real library + original Play Song mode
  fix-my-playing/                 record + real DSP analysis + report
  game/                           mic-driven rhythm game
  create-music/                   AI composition generator
  progress/                       dashboard
  api/ai/song-arrangement/        Claude JSON-mode route (+ fallback)
  api/ai/compose/                 Claude JSON-mode route (+ fallback)
  api/ai/fix-report/              Claude summary route (+ fallback)
components/                       Nav, ChordDiagram, NoteStaff, TabViewer,
                                   StrumPattern, LessonPlayer, PlaySong,
                                   StatCard, ProgressRing, FeatureTile,
                                   OnboardingGate
lib/
  types.ts                        shared types
  store.ts                        Zustand store, persisted to localStorage
  chords.ts                       27 chord shapes/diagrams + chroma templates
  curriculum.ts                   procedural 3-path x 20x10x5 lesson generator
  notation.ts                     guitar <-> standard-notation staff mapping
  songs.ts                        built-in original songs (with full lyrics)
  popularSongs.ts                 50 real, verified song chord charts
  lyrics.ts                       lyric-line timeline builder for Play Song
  levels.ts / routine.ts          practice-session exercise bank (used by /practice)
  ai.ts / fallback.ts             Anthropic wrapper + offline generators
  audio/
    pitch.ts                      autocorrelation pitch detection
    chroma.ts                     chroma vector + chord template matching
    onset.ts                      spectral-flux onset + beat-grid scoring
    metronome.ts                  lookahead Web Audio metronome
    analysis.ts                   chord timeline + Fix My Playing scoring
docs/
  PRODUCT_SPEC.md                 full product spec (all 18 requested points)
```
