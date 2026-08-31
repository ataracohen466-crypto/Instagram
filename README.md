# Bloom

A private, on-device mental health progress tracker for teens and young
adults — plus an integrated skin wellness tracker. It's built to feel like a
calming personal-growth app, not a clinical one: quick daily check-ins,
gentle pattern discovery, non-competitive progress tracking, a private
journal, a short practical toolkit, and a always-reachable "having a hard
day" support screen with real crisis resources.

Built with Next.js 16 (App Router) and deployed on Vercel as a real web app.

**Bloom is a self-awareness and wellness tool — not a diagnosis, not a
medical device, and not a replacement for therapy.** It never claims to be
a therapist, and it always points toward real human help when someone
indicates they may be in danger.

## Privacy, by construction

There is no backend, no database, and no user accounts. Everything you
track — check-ins, journal entries, goals, skin data, progress photos —
lives only in your browser (`localStorage` for structured data, IndexedDB
for photos). Nothing is ever sent to a server:

- **No cloud AI.** The "Wellness Assistant" and every pattern/insight in the
  app are computed entirely on-device with simple statistics over your own
  check-ins (correlations, trends, averages). There is no API key, no
  network call, and nothing to configure — it works the same offline.
- **Optional passcode lock**, backed by real AES-256-GCM encryption of the
  stored data (key derived from your passcode via PBKDF2, Web Crypto only).
- **Full data export** (JSON) and **full data deletion**, from Settings.
- **No advertising**, no analytics, no third-party trackers.

## What's in it

- **Daily check-in** — mood, emotions, anxiety, energy, motivation, sleep,
  social connection, school/work stress, physical wellbeing, confidence,
  gratitude, and optional journaling — all sliders and taps, under a minute.
- **Emotional timeline** — today through 1 year, with non-judgmental trend
  sentences ("your average stress has decreased over 30 days").
- **Pattern & trigger discovery** — gentle, clearly-labeled observations
  ("you seem to report better moods on days you spent time outside") with a
  "why might this be" explanation, never phrased as medical fact.
- **Progress dashboard** — growth areas (emotional awareness, stress
  management, sleep consistency, etc.) and non-competitive celebrations, no
  streak-shaming.
- **Goals** — sleep, stress, exercise, journaling, social time, mindfulness,
  confidence, study-life balance, screen time — with milestones and a log of
  what's helped. Never weight/appearance-based.
- **Weekly & monthly reports** — "your week," "what I learned about myself,"
  "next week," plus a deeper monthly report with a "look how far you've
  come" comparison.
- **Journal** — text, photos, tags, mood, search, and a calendar view.
- **Toolkit** — breathing exercises, grounding, mindfulness, journaling
  prompts, relaxation, focus, sleep wind-down, positive reflection, and a
  stress reframe — short and practical.
- **"Having a hard day"** — a calming, always-reachable screen that slows
  things down, asks what you're feeling, offers grounding tools, and always
  surfaces real crisis resources (988, Crisis Text Line, findahelpline.com).
- **My Mental Health Story** — an auto-generated, month-by-month narrative
  of gradual growth, built from your own check-ins.
- **Skin section** (optional) — quick skin check-ins, an AM/PM routine
  tracker, private progress photos (front/left/right, weekly comparisons
  encouraged over daily checking), a Skin Experiment mode for tracking a
  product change over 8 weeks, gentle skin↔lifestyle and skin↔mood pattern
  observations, and an optional dermatologist-style summary report. Skin
  photos are on-device only, deletable at any time.
- **Apple Health** — a clearly-labeled placeholder integration point in
  Settings (sleep, workouts, steps, mindfulness, State of Mind), ready to be
  wired up in a native build; nothing is read without explicit opt-in.

## Deploy to Vercel

```bash
npm i -g vercel
vercel          # first deploy, answer the prompts
vercel --prod   # promote to your production URL
```

Or import the repo at [vercel.com/new](https://vercel.com/new) — Vercel
auto-detects Next.js. **No environment variables are required**; the app has
no server-side secrets because it has no server-side AI or database calls.

## Local development

```bash
npm install
npm run dev
```

## How it's put together

```
app/
  page.tsx                 home dashboard
  onboarding/               first-run flow: privacy explainer, optional passcode, preferences
  check-in/                 daily check-in
  timeline/                 emotional timeline (range charts)
  insights/                 pattern discovery + local wellness assistant
  progress/                 growth-area dashboard
  goals/                    goals with milestones and weekly logs
  reports/                  weekly & monthly reports
  journal/                  journal (text, photos, tags, search, calendar)
  toolkit/[id]/              breathing, grounding, timers, prompt tools
  hard-day/                  calming support screen + crisis resources
  skin/                      skin hub, check-in, routine, photos, experiments, report
  story/                    My Mental Health Story timeline
  settings/                  theme, passcode, data export/delete, privacy
lib/
  types.ts                  full data model
  store.ts                  zustand store (in-memory app state)
  persist.ts                localStorage read/write, passcode lock, encryption
  crypto.ts                 PBKDF2 + AES-GCM (Web Crypto only, on-device)
  db.ts                     IndexedDB photo storage
  insights.ts / reports.ts / story.ts / assistant.ts / skinInsights.ts
                             the local statistics engine behind every insight
  toolkit.ts, mood.ts, goals.ts, dates.ts, series.ts, ...
components/
  AppShell.tsx               boot/hydrate, autosave, lock screen, auto-lock
  ChromeGate.tsx / Nav.tsx    navigation shell, onboarding gate
  ui/                        Slider, MoodPicker, Charts, Modal, Card, ...
public/
  sw.js                      offline app-shell caching (installable PWA)
```

Three themes (light / dark / system) are implemented as CSS custom
properties switched by a `data-theme` attribute, applied before first paint
so there's no flash of the wrong palette.
