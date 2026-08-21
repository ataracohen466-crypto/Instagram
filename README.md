# TutorAI

An AI tutor and exam-prep coach. Upload your own notes and TutorAI turns them
into summaries, flashcards, quizzes and full timed practice tests — then reads
your results, works out which topics you're actually weak on, and rebuilds your
study plan around them.

Built with Next.js 16 (App Router) and deployed on Vercel. Not a localhost toy —
it runs as a real web app on a public URL.

The product principle: **every feature reads from and writes to one learning
profile.** A test result changes topic mastery; mastery changes what Practice
serves you next; that changes tomorrow's plan. It isn't a chatbot with buttons
around it.

## What it does

- **AI tutor** — step-by-step teaching in any subject, unlimited follow-ups,
  voice in and out. When you're learning a *process*, it nudges with guiding
  questions instead of dumping the answer; when you just need a fact, it tells
  you.
- **Summarise anything** — type, paste, photograph a page (read by Claude's
  vision) or drop in a PDF (parsed in your browser). Get key concepts,
  vocabulary, formulas, dates, people, cause-and-effect and a "things you MUST
  know" list, at four lengths: quick review, normal, detailed, exam cram.
- **[STUDY THIS]** — one button on any note runs the whole pipeline: summary →
  flashcards → quiz → study guide → refreshed study plan.
- **Full practice tests** — choose subject, unit, difficulty, question count,
  question types and time limit. Multiple choice, short answer, true/false,
  fill-in-the-blank, matching and essay. Graded with per-question explanations.
- **Exam simulator** — countdown timer, question navigator grid, flag for
  review, an unanswered-question check before you submit.
- **Score report** — score, strong areas, weak areas, every missed question with
  *why you got it wrong*, and a button that generates targeted practice from
  exactly those topics.
- **Mastery tracking** — every topic is 🟢 mastered, 🟡 learning or 🔴 needs
  review, updated from tests, quizzes, flashcard grades and teach-it-back
  scores.
- **Adaptive study plan** — set an exam date and available minutes per day; the
  plan weights the days toward your weakest topics and rebuilds itself every
  time new results come in.
- **Cram mode** — "my test is tomorrow." Ranks everything you've uploaded by
  what matters most and what you're worst at, sized to the hours you have left.
- **Teach it back** — explain a concept in your own words, typed or spoken, and
  get scored on accuracy, missing concepts and misconceptions.
- **"I don't understand this"** — paste anything confusing and get it explained
  simple / normal / detailed / as an example / as a practice question.
- **Homework mode** — hints, step-by-step walkthroughs and work-checking that
  coach rather than hand over answers.
- **Spaced repetition** — an SM-2 scheduler brings cards back right before
  you'd forget them.
- **XP, levels, streaks and achievements** — encouraging, not childish, and
  taking a break never costs you anything.

## Deploy to Vercel

### Option A — from the Vercel dashboard

1. Push this branch to GitHub (already done if you're reading this in the repo).
2. Go to [vercel.com/new](https://vercel.com/new) and import this repository.
3. Vercel auto-detects Next.js — leave the build settings alone.
4. Add the environment variable below, then click **Deploy**.

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

**Without the key the app still deploys and works** — every generator falls back
to a keyword-based offline version, so summaries, cards, quizzes, tests and
grading all still produce real, correctly-shaped content. It is noticeably
dumber than the Claude path (the fallback works from keyword frequency, not
understanding). Add the key to get genuine tutoring.

## Local development

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
```

## How it's put together

```
app/
  page.tsx                     home dashboard — plan, exam countdown, weak topics
  learn/                       tutor chat, "I don't understand", teach-it-back
  notes/                       note list + upload (text / photo / PDF), STUDY THIS
  notes/[id]/                  summary length tabs, flashcards, study guide
  practice/                    SRS flashcards, targeted quizzes, homework mode
  tests/                       test generator + past tests
  tests/[id]/                  exam simulator (timer, navigator, flag, review)
  tests/[id]/results/          score report + targeted practice handoff
  progress/                    mastery grid, study plan, cram mode, XP/achievements
  api/ai/summarize-notes/      structured summary at four lengths
  api/ai/generate-material/    flashcards + questions from your notes
  api/ai/generate-test/        a full practice test
  api/ai/grade-test/           objective grading in code, written answers by Claude
  api/ai/explain/              the "I don't understand this" explainer
  api/ai/teach-back/           marks your own explanation, returns a mastery score
  api/ai/study-plan/           day-by-day plan weighted to weak topics
  api/ai/cram/                 prioritised night-before review
  api/ai/study-guide/          structured guide with a checklist and mini quiz
  api/ai/tutor-chat/           tutor and homework-mode replies
components/                    TopBar, BottomNav, QuestionView, SubjectPicker, ui
lib/
  ai.ts                        Anthropic wrapper — free text + forced tool-use JSON
  schemas.ts                   JSON schemas for every structured generator
  normalize.ts                 hardens model output before it reaches the UI
  offline.ts                   keyword-based fallbacks when no API key is set
  pipeline.ts                  STUDY THIS, plan refresh, targeted practice
  store.ts                     zustand store, persisted to localStorage
  srs.ts                       SM-2 spaced repetition
  extract.ts                   client-side PDF text + image downscaling
  speech.ts                    Web Speech API dictation and read-aloud
  types.ts                     the whole data model
```

Structured output uses forced tool-use rather than asking for JSON and hoping —
every summary, deck, test and grade comes back schema-conformant or not at all,
in which case the offline fallback takes over.

Objective questions (multiple choice, true/false, fill-in-the-blank, matching)
are graded in code: instant, free and consistent. Claude only grades what needs
judgment — short answer and essay — and always against the rubric generated with
each question, never a bare "is this right?".

There is no database and no user accounts — your subjects, notes, cards, tests
and progress live in your browser's `localStorage`. Clearing site data resets
the app, and the Reset button under **Progress → You** does the same thing on
purpose. `PRODUCT_SPEC.md` documents the full server-backed schema this is
designed to migrate to.

Voice uses the browser's built-in Web Speech API, so the mic and read-aloud
buttons only appear in browsers that support it (Chrome and Edge are safest;
Firefox has no speech recognition).

## Product specification

`PRODUCT_SPEC.md` is the full design document: architecture, every screen,
onboarding, the summarization and test-generation systems, the mastery model,
the study-plan algorithm, the database schema, AI architecture, MVP vs. full
scope, monetization, the hardest technical problems, and the end-to-end user
flow.
