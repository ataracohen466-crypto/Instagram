# Guitar AI — Product Specification

**Tagline:** *"Practice like someone's listening."*

Guitar AI is an AI-powered guitar teacher that lives in the browser: it listens
through your microphone, watches your progress over time, writes original
songs and arrangements on demand, and turns repetition into something that
feels like a real lesson instead of a metronome app. This document is the
full product spec, UX design, architecture, and roadmap for the product. The
`/` app in this repository is the real, working MVP described in section 16 —
not a mockup.

> **Update — the 3-path curriculum remodel.** The Learning Path was rebuilt
> around three parallel, home-screen-selectable paths — **Chords**, **Notes**
> (standard notation), and **Tabs** — each 20 levels × 10 parts × 5 lessons
> (1,000 lessons per path), with an AI-narrated Lesson Player (real
> browser text-to-speech plus live mic-based practice checks) on every
> lesson, and a lyric-synced "Play Song" karaoke mode for the app's original
> (fully-lyricked, non-copyrighted) songs. The curriculum is procedurally
> generated from a small set of pedagogical templates rather than hand-typed
> per lesson — see `lib/curriculum.ts` — and the real popular-song library
> grew from 10 to 50 verified songs. Sections 9 and 16 below describe the
> pre-remodel 5-level system; treat the paragraph above as its replacement.

---

## 1. Product Specification

**Who it's for:** absolute beginners who've never touched a guitar, through
advanced players who want objective, structured feedback. The one thing every
tier shares: they want to *get better faster* without paying $60/hr for a
human teacher, and without the shame spiral of a metronome app that just says
"wrong."

**Core promise:** Guitar AI never shames, always prioritizes the *one* fix
that matters most right now, and adapts every session to what you actually
struggled with yesterday — not a fixed curriculum.

**The 13 core feature pillars** (from the brief) map to app routes as follows:

| Feature | Route | Status in MVP |
|---|---|---|
| Live AI Guitar Coach | `/live-coach` | ✅ real mic pitch + chord detection |
| Camera hand tracking | — | 📋 designed, not in MVP (§16/17) |
| Teach Me Any Song | `/learn-song` | ✅ AI-generated original arrangement |
| Personal AI Guitar Teacher | store + `/practice` | ✅ adapts routine to weak areas |
| Guitar Game Mode | `/game` | ✅ real mic-driven rhythm game |
| Create Music | `/create-music` | ✅ AI original composition |
| Fix My Playing | `/fix-my-playing` | ✅ real DSP analysis + report |
| Live Coach Mode | `/live-coach` | ✅ short spoken-style feedback |
| Instrument support | onboarding | ✅ acoustic/electric/classical/bass selection |
| Learning Path (5 levels) | `/learning-path` | ✅ full curriculum |
| Practice Mode (5–45+ min) | `/practice` | ✅ generated, time-boxed sessions |
| Progress Dashboard | `/progress` | ✅ streak, accuracy, chords, weak/strong |
| Personalization (onboarding) | `/onboarding` | ✅ 7-step wizard |

---

## 2. User Experience & Screen Flow

```
Onboarding (first run only)
   -> Home
        -> Practice (duration -> generated session -> completion)
        -> Learning Path (5 levels -> lesson detail -> mark complete)
        -> Live Coach (tuner mode / chord-check mode)
        -> Learn a Song (prompt -> arrangement -> versions)
        -> Fix My Playing (pick song -> record -> report -> routine)
        -> Guitar Game (pick song -> play -> score)
        -> Create Music (prompt -> composition)
        -> Progress (dashboard)
```

Navigation is a persistent left sidebar on desktop and a bottom tab bar on
mobile — every feature is one tap away, because the product's whole value is
in how often you come back to it, not in how deep the information hierarchy
is.

## 3. Onboarding Experience

A 7-step wizard (`app/onboarding/page.tsx`): name → guitar type (acoustic /
electric / classical / bass) → self-reported skill level (5 tiers, matching
the Learning Path levels) → genres + favorite artists → goals (multi-select:
play songs, write music, join a band, play for others, stress relief, theory)
→ daily practice time (5/10/15/20/30/45 min) → focus preference (songs /
technique / theory / a mix). The answers seed the persisted profile and the
starting level on the Learning Path — an advanced player is never trapped
behind "hold the pick" lessons.

## 4. Home Screen

Time-of-day greeting ("Good morning 🎸"), a stat row (streak, total practice
time, chords mastered), a hero card for **today's N-minute practice** with a
single **Start Practice** button, a **Continue Learning** card pointing at
the next incomplete lesson, and a 2×3 grid linking every other feature. No
scoreboard-of-shame, no red badges — progress framing only.

## 5. Live Coaching Interface

Two modes, both driven by a real `getUserMedia` mic stream and a Web Audio
`AnalyserNode` — no simulated data:

- **Single note / tuner:** autocorrelation pitch detection shows the nearest
  note name and a cents-offset needle, with a rule-based coach line ("A touch
  sharp", "Good — right in tune").
- **Chord check:** a 12-bin chroma vector (FFT energy folded into pitch
  classes) is cosine-matched against chord templates; the UI shows the best
  guess, a confidence bar, and a chord diagram, with feedback graded by
  confidence ("almost there — check every string is ringing" vs. "clean and
  clear").

Feedback is deliberately terse — one line, replaced every ~1s at most — per
the "don't overwhelm" principle.

## 6. Song-Learning Interface

`/learn-song` has two paths, because "teach me a song" splits into two
genuinely different requests:

- **A specific song the learner already knows** — a curated grid of real,
  well-known songs (`lib/popularSongs.ts`) they tap directly. Each shows the
  song's title/artist, capo, BPM, and its chord progression by section
  (Verse/Chorus/Bridge). This is deliberately **chords only**: a chord
  progression is a functional building block, not independently
  copyrightable, which is why every chord-chart site can publish them — but
  we never reproduce lyrics or a note-for-note transcription of the
  recording, so this stays firmly in "here's how the song is built," not "a
  copy of the song."
- **A vibe, mood, or song idea with no fixed identity** ("a slow acoustic
  love song") — a title/vibe input plus genre/mood/difficulty selectors call
  `/api/ai/song-arrangement` and get back a fully **original** teaching
  arrangement, explicitly never a transcription of an existing recording.

Both render the same way: difficulty stars, BPM, time signature, capo, a
chord-diagram strip, a **slow practice mode** slider (50–100% of tempo)
wired to a real Web Audio metronome, and section-by-section cards (chords
used plus a strum-pattern arrow row). The AI-generated path additionally
gets an optional ASCII tab block, a short teaching note per section, and a
beginner/intermediate/advanced tab — every AI response also carries a
one-line disclaimer that it's an original arrangement, not a transcription.

## 7. "Fix My Playing" Analysis Screen

The learner picks one of three built-in original practice songs, hits record,
and plays along with a real click track while the mic is analyzed live:

- **Chord accuracy** — chroma-matched every 300ms against the expected chord
  for that moment in the song (computed from a chord timeline built from the
  arrangement's sections/bars/BPM).
- **Timing accuracy** — a spectral-flux onset detector timestamps every
  strum; those onsets are scored against the song's beat grid.
- **Tempo drift** — average onset spacing in the first half of the take vs.
  the second half, to catch "speeding up in the hard part."

These three real, measured signals produce a ranked issues list ("1. F chord
— 63% accuracy", "2. Strumming — inconsistent", "3. Tempo — speeding up"),
an AI-phrased (or template-phrased, if no API key) encouraging summary that
always names the single biggest fix first, and an automatically generated
10–20 minute routine pulled from the Learning Path's exercise bank, targeted
at exactly those weak points.

## 8. Practice System

`/practice`: pick 5/10/15/20/30/45 minutes → `buildRoutine()` scores every
exercise in the curriculum against the learner's stored weak areas and
un-mastered target chords, greedily time-boxes them into the chosen duration
(always warming up with a technique exercise first), and hands back a
checklist with a running countdown. Completing exercises logs chord reps
(30 reps auto-marks a chord "mastered") and extends the practice streak.

## 9. Progression / Level System

Five levels (`lib/levels.ts`), each with a title, description, 2 lessons (each
with chords taught + 2-3 exercises), a technique-challenge list, and a set of
"test chords." Levels 2–5 unlock either by reported onboarding skill level or
by completing ≥60% of the previous level's lessons — so nobody is stuck, and
nobody is thrown into barre chords on day one.

## 10. AI Architecture

```
Client (React/Next.js)
  ├─ Web Audio pipeline (pitch/chroma/onset) — 100% client-side, real-time
  ├─ Zustand store, persisted to localStorage — profile + all progress
  └─ fetch() to same-origin API routes for anything generative

Server (Next.js Route Handlers, on Vercel)
  ├─ /api/ai/song-arrangement  → Claude, JSON-mode system prompt
  ├─ /api/ai/compose           → Claude, JSON-mode system prompt
  ├─ /api/ai/fix-report        → Claude, short natural-language phrasing
  │                               of *already-computed* real metrics
  └─ every route wraps the Claude call in try/catch and falls back to a
     deterministic template generator (lib/fallback.ts) so the product
     never dead-ends without an API key or on a transient failure
```

Design principle: **the AI never invents the performance data.** Timing,
pitch, and chord-match numbers in Fix My Playing and the Game come from real
DSP running against the mic. Claude's job is arrangement/composition writing
and turning already-measured numbers into a warm, specific sentence — never
grading the user itself. That split is what keeps the "never shame the user"
principle honest instead of aspirational.

## 11. Audio Analysis & Computer Vision Technology

**Shipped in this MVP (client-side Web Audio API, no native deps):**

- **Pitch detection** — autocorrelation (ACF2+) over a 2048-sample buffer
  with parabolic interpolation for sub-sample accuracy; an RMS gate avoids
  hallucinating pitch from noise floor. Good enough for a single plucked
  string's strong fundamental.
- **Chord detection** — FFT frequency bins folded into a 12-bin chroma vector
  (pitch-class energy, octave-independent), cosine-matched against hand-built
  templates for the common open-chord shapes.
- **Onset/rhythm detection** — spectral-flux (frame-to-frame positive energy
  change) with an adaptive mean+stddev threshold and a 120ms debounce, scored
  against a beat grid derived from BPM/time-signature.
- **Metronome/backing** — a lookahead Web Audio scheduler (the standard
  "schedule ~100ms ahead of `currentTime`" pattern), immune to JS timer
  jitter.

**What full production would add:**

- **Real chord/note recognition at scale:** a small on-device model (e.g. a
  CNN/CRNN over CQT frames, exported to ONNX/TensorFlow.js) trained on
  isolated guitar recordings — chroma-template matching is a strong MVP
  heuristic but breaks down on distorted electric tone, partial chords, and
  extended/altered voicings.
- **Polyphonic pitch tracking:** something in the BasicPitch / MT3 family
  for full note-level transcription (needed for "detect wrong notes" on
  single-note lines and solos, not just chords).
- **Camera hand-tracking:** MediaPipe Hands (or a custom pose model) running
  in-browser via WebGL/WASM for fretting-hand finger-placement and
  picking-hand angle/motion analysis — genuinely real-time-feasible on
  today's phones, and the natural reason this becomes a native app later
  (sustained camera + mic use is rough on a mobile browser tab's lifecycle).
- **Server-side heavy lifting:** an optional "deep analysis" tier that
  uploads a take for offline processing with a bigger transcription model,
  for players who want conservatory-grade feedback on a big practice session.

## 12. Detecting Chords, Notes, Rhythm, Tempo & Technique

| Signal | Technique used | Where |
|---|---|---|
| Single note pitch | Autocorrelation + parabolic interpolation | `lib/audio/pitch.ts` |
| Chord identity | Chroma vector + cosine similarity to templates | `lib/audio/chroma.ts` |
| Strum/note onset | Spectral flux, adaptive threshold | `lib/audio/onset.ts` |
| Tempo/timing accuracy | Onsets scored against a generated beat grid | `lib/audio/onset.ts` |
| Tempo drift ("speeding up") | Mean onset interval, first half vs. second half | `lib/audio/analysis.ts` |
| Technique (finger placement, pick angle, wrist position) | Camera + hand-landmark model (MediaPipe Hands) — **designed, not in MVP** | §17 |
| Buzzing / muted strings | Spectral irregularity / inharmonicity in the attack transient — **designed, not in MVP** | §15 |

## 13. Data Model

Everything lives in one persisted client-side store today (`lib/store.ts`,
`localStorage` key `guitar-ai-storage`); the shape below is exactly what a
real backend's schema would become once accounts exist (see §17):

```ts
OnboardingProfile {
  name, guitarType, skillLevel, genres[], artists,
  goals[], minutesPerDay, focus, completedAt
}

UserProgress {
  level, chordsMastered[], chordReps: { [chordId]: number },
  completedLessonIds[], songsLearned[],
  streakDays, lastPracticeDate, totalPracticeMinutes,
  sessionHistory: { date, minutes, focus }[],
  fixReports: FixMyPlayingReport[],
  gameScores: GameScore[],
  weakAreas[]
}

FixMyPlayingReport {
  songTitle, overallAccuracy, timingScore,
  chordAccuracy: { [chordId]: percent },
  issues: { label, detail, severity, metric }[],
  summary, routine: PracticeExercise[], createdAt
}

GameScore { date, songTitle, accuracy, timingAccuracy, bestStreak, notesHit, notesTotal }
```

A production backend would move `UserProgress` (and everything under it) into
Postgres, keyed by `user_id`, with `sessionHistory`/`fixReports`/`gameScores`
as append-only child tables rather than arrays-in-a-blob — the localStorage
shape above is intentionally already normalized so that migration is a
straight lift, not a redesign.

## 14. Monetization Model

**Free tier (generous, on purpose — this is a learning tool, gatekeeping
learning tools ages badly and kills word-of-mouth):**
- Full Learning Path (all 5 levels, all lessons/exercises)
- Live Coach (tuner + chord check), unlimited
- 1 Fix My Playing analysis per day
- 1 AI song arrangement + 1 AI composition per day
- Guitar Game with the built-in song library
- Full progress dashboard, streaks, chord tracking

**Guitar AI Pro (subscription, ~$9–12/mo or ~$79/yr):**
- Unlimited Fix My Playing, song arrangements, and compositions
- Priority/faster AI generation, longer compositions, backing-track audio
  render (not just a click track)
- Camera hand-tracking technique mode (once shipped — this is the flagship
  paid feature, it's the most expensive to run and the highest "wow")
- Downloadable/printable chord charts and tabs
- Practice history export, deeper analytics (per-chord trend lines over
  months, not just current snapshot)

**Guitar AI for Studios/Teachers (B2B, later):** a human teacher's dashboard
over their students' Fix My Playing history — the AI becomes an assignment
and progress-tracking tool for a real instructor rather than a replacement
for one. High-margin, low-volume, and it turns "AI is coming for my job" into
"this is the best homework-tracking tool I've ever had."

The free tier is deliberately not crippled: someone with zero budget can
genuinely learn guitar end-to-end on it. Pro is about *volume* (unlimited AI
generation) and the camera feature, not about withholding core teaching.

## 15. Hardest Technical Problems

1. **Chord detection accuracy on real (imperfect, noisy, roomy) audio.**
   Chroma-template matching is fooled by open strings ringing into a chord
   change, palm-muting, distortion (harmonics smear the chroma vector), and
   partial/incomplete strums. *Mitigation shipped:* an energy gate + a
   generous confidence threshold before showing a "wrong" verdict, phrasing
   uncertainty as "almost there" rather than a hard fail. *Full fix:* a
   trained on-device model with a proper negative class ("no clear chord
   yet") instead of always returning a nearest-neighbor guess.
2. **Detecting buzzing/muted strings specifically** (not just "wrong pitch").
   This needs attack-transient analysis (a buzz has extra inharmonic energy
   right at the pluck) rather than steady-state pitch/chroma — a genuinely
   hard, under-researched DSP problem for consumer hardware mics. Proposed
   approach: a short-window spectral-flatness measure on just the first
   ~30ms after an onset, flagged as a candidate buzz when flatness spikes
   well above the sustain portion's baseline.
3. **Timing latency and jitter across browsers/devices.** `getUserMedia`
   audio has variable input latency (worse on Bluetooth), and the visual
   game loop runs on `requestAnimationFrame`, not the audio clock. *Mitigation
   shipped:* all game/analysis timing is measured from the Web Audio clock’s
   own timestamps and a lookahead-scheduled metronome, not from `setTimeout`
   deltas. A full fix needs a one-time per-device latency calibration step
   (clap-along-to-a-click test) whose offset gets baked into every subsequent
   session.
4. **Camera hand-tracking performance/heat on real phones held up for 10+
   minutes.** Continuous camera + mic + inference is exactly the workload
   mobile Safari throttles hardest. This is the strongest argument for a
   native/PWA-with-background-permissions companion app for that one feature
   specifically, rather than trying to make it a flawless browser tab.
5. **"Teach any song" without infringing copyright** while still being
   genuinely useful for a song the user actually wants to learn. Mitigation
   shipped: the system prompt is explicit that this is an *original teaching
   arrangement*, never a transcription or lyric reproduction, and every
   result carries a visible disclaimer. The harder version of this problem —
   accepting a user's own audio/video reference and deriving a chord chart
   *from that specific recording* — needs audio-to-chord transcription
   (essentially a smaller version of problem #1) plus a clear terms-of-use
   boundary that the derived chart is the user's own study material, not a
   redistributable copy of someone else's song.

## 16. Realistic MVP (what's actually built in this repo)

Everything in the table in §1 marked ✅ is real, working code in this
repository today — not a mockup:

- Full onboarding → home → 9-screen product, responsive, dark "studio" theme
- Real client-side DSP: autocorrelation pitch detection, chroma chord
  matching, spectral-flux onset detection, a lookahead Web Audio metronome
- Two Claude-backed generative features (song arrangement, composition) with
  a deterministic offline fallback so the app is fully functional with zero
  API key configured
- A genuinely measured Fix My Playing pipeline: real chord-accuracy and
  timing-accuracy numbers computed from the user's own mic input against a
  built chord timeline and beat grid, not canned numbers
- A rhythm game that judges real strums (via the same onset + chroma
  pipeline) against a scrolling note chart, with streaks and personal records
- A 5-level curriculum with lesson detail, chord diagrams, exercises, and
  progress-gated unlocking
- Full progress dashboard and a routine-builder that actually reads the
  learner's stored weak areas
- Deploys to Vercel as a normal Next.js app (server routes for the AI
  endpoints; everything else statically optimized)

**Explicitly out of MVP scope:** camera hand-tracking, user accounts /
cross-device sync (localStorage only), payments, backing-track audio
synthesis (the "backing track" today is a click/metronome, not a rendered
melody+accompaniment), and a trained chord/note-recognition model (the MVP
uses signal-processing heuristics, described honestly in §11/§15).

## 17. Full Version

- **Accounts & sync:** email/OAuth login, Postgres-backed version of the data
  model in §13, so progress follows the learner across devices.
- **Camera hand-tracking:** MediaPipe Hands in-browser for fretting-hand
  finger placement, wrist angle, and picking-hand motion, feeding the same
  "one prioritized correction" feedback style as the audio coach.
  Realistically ships as a companion PWA/native shell so a 10+ minute
  camera+mic session doesn't fight the mobile browser tab lifecycle.
- **Trained recognition models:** an on-device (ONNX/TFJS) chord/note
  classifier replacing the chroma-template heuristic, plus a polyphonic
  transcription model for full-song "detect every wrong note" analysis.
- **Reference-audio "teach me this song":** upload a recording/video and get
  a derived chord chart via audio-to-chord transcription, clearly scoped as
  personal study material.
- **Real backing tracks:** rendered instrumental accompaniment (not just a
  click) for Create Music and Learn a Song, generated from the same chord/
  strum data already being produced.
- **Studio/teacher dashboard:** the B2B tier from §14.
- **Social layer (careful, opt-in):** share a Guitar Game score or a Fix My
  Playing streak, without turning the product into a leaderboard-shame
  machine — this is explicitly a "maybe, and only if it doesn't undermine
  the no-shame principle" item, not a roadmap certainty.

## 18. Brand Identity

**Name:** Guitar AI
**Tagline:** *"Practice like someone's listening."*
Alt taglines considered: *"Your teacher, always tuned in."* (used as the
sidebar's tagline in the app itself) and *"Real feedback, every rep."*

**Visual identity:** a dark "studio" palette (near-black ink background,
warm string-gold accent, teal for "in tune / correct," soft coral for gentle
corrections — never harsh red) meant to feel like sitting in a well-lit
practice room at night, not a gamified checklist app. Sora for display
headings (confident, slightly rounded), Inter for body text, JetBrains Mono
for tab notation. The logo mark is a simple guitar glyph in a rounded gold
square — legible at favicon size, not trying to be clever.

**Voice:** specific, warm, never robotic, never shaming. "Your G chord is
almost there — try moving your third finger closer to the fret" beats both
"Wrong!" and a vague "Good job!" — every piece of copy in the app, from the
onboarding wizard to the Fix My Playing summary, is written to that standard.
