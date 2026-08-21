# TutorAI — Product & Engineering Specification

TutorAI is an AI tutoring and exam-prep platform: a personal teacher, note
summarizer, flashcard/quiz/test generator, exam simulator, study planner, and
mastery tracker that all read from and write to one learning profile, so every
feature makes every other feature smarter. It ships as a real web app on
Vercel — no localhost, no "AI chatbot with buttons around it."

This document is the full spec: product, architecture, algorithms, data
model, technology choices, MVP scope, monetization, and the hardest technical
problems and how we solve them.

---

## 1. Complete Product Specification

**Positioning.** A student who is about to be tested on something opens
TutorAI instead of opening a textbook, a flashcard app, a chatbot, and a
planner separately. Those four experiences are one product here because they
share one state: what the student has uploaded, what they've been quizzed on,
and what they still get wrong.

**Who it's for.** Middle/high school and college students prepping for a
specific class, unit, or exam — not open-ended "learn anything" browsing.
The product is optimized around the shape of a real term: notes accumulate,
a test is coming, time is limited.

**The non-negotiable product principle.** Every feature writes to and reads
from the student's **learning profile** (mastery per topic, spaced-repetition
schedule, XP/streak, study plan). A feature that doesn't touch that profile
doesn't ship. Concretely: a test result must change a topic's mastery status;
a mastery status must change what Practice serves next; a changed mastery
picture must change tomorrow's study plan. See §17 for the full loop.

**Core feature set** (detailed subsections below): AI personal tutor,
note summarization, notes→study-material generation, full practice tests,
an exam simulator, a smart study plan, "I don't understand this,"
teach-it-back, spaced-repetition smart review, homework mode, a study
dashboard, subject-specific modes (math/science/history/languages/English),
AI-generated study guides, one-click "Study This," progressive difficulty,
mastery status (🟢/🟡/🔴), motivation mechanics (XP/levels/streaks/
achievements), multimodal input (text/image/PDF/handwriting/voice), a
consistent tutor personality, and Cram Mode.

---

## 2. Full App Architecture

```
┌─────────────────────────────── Browser ───────────────────────────────┐
│  Next.js App Router (React 19, client components for interactivity)   │
│                                                                         │
│  Zustand store ── persisted to localStorage (MVP) / synced to a       │
│  server DB via REST (full version, §14)                               │
│    • notes, flashcards, questions, tests, attempts                    │
│    • topic mastery map, SRS schedule, study plan, XP/streak            │
│                                                                         │
│  Web Speech API — SpeechRecognition (mic) + speechSynthesis (voice)    │
│  pdf.js — client-side PDF text extraction (no file leaves the browser  │
│  except the extracted text, sent to the API for summarization)         │
└───────────────────────────────┬─────────────────────────────────────┘
                                 │ fetch() to same-origin API routes
                                 ▼
┌──────────────────────── Next.js API Routes (server) ───────────────────┐
│  app/api/ai/*  — one route per generation task (summarize, generate-   │
│  material, generate-test, grade-test, explain, teach-back, study-plan, │
│  cram, study-guide, tutor-chat)                                        │
│                                                                         │
│  lib/ai.ts — Anthropic client wrapper:                                 │
│    generate()            free-text (tutor chat, explanations)          │
│    generateStructured()  forced tool-use → JSON matching a schema      │
│                            (summaries, flashcards, tests, grading)     │
│                                                                         │
│  ANTHROPIC_API_KEY read server-side only, never shipped to the client  │
└────────────────────────────────┬───────────────────────────────────────┘
                                  ▼
                        Anthropic API (Claude)
```

**Why this shape.** The generation surface (summarize, quiz-ify, grade,
explain, plan) is naturally a set of independent, statelessly-callable
functions — each one takes profile data in, returns structured data out. That
maps directly onto Next.js route handlers with no framework beyond it. The
*state* (what the student has learned) is the one thing that must be
consistent across every feature, so it lives in a single client store in the
MVP and a single database in the full version — never duplicated per feature.

---

## 3. Every Major Screen

**Navigation:** bottom nav (mobile-first, works on desktop) — **HOME, LEARN,
NOTES, PRACTICE, TESTS, PROGRESS.**

| Screen | Purpose | Key actions |
|---|---|---|
| **Home** | Daily entry point | "Good morning! Ready to study?" · Today's Plan card → Start N-minute session · Upcoming Test countdown → View Study Plan · Needs Review card (topic count) · Recent Score card · Quick actions: Scan Notes, Ask Tutor, Make Quiz, Practice Test |
| **Learn** | AI tutor | Subject picker · chat with step-by-step teaching, voice in/out · "I don't understand this" (select text → explanation mode) · Teach-it-back mode |
| **Notes** | Material intake | List by subject · upload (type/paste/photo/PDF) · **[STUDY THIS]** on every note |
| **Notes/[id]** | One note | Summary tabs (quick/normal/detailed/exam-cram) · generated flashcards · "Make quiz from this" / "Make test from this" · study guide |
| **Practice** | Low-stakes reps | Due flashcards (SRS queue) · quiz practice by topic · Homework Mode (upload → hints → walkthrough → check work) |
| **Tests** | Test generator + list | Config form (subject/unit/difficulty/count/types/time limit) · past tests with scores |
| **Tests/[id]** | Exam simulator | Timer · question navigator grid · flag for review · jump between questions · review-unanswered gate · submit |
| **Tests/[id]/results** | Score report | Score % · strong areas · weak areas · each missed question + why-wrong · "Start targeted practice" |
| **Progress** | Dashboard | Mastery grid (🟢🟡🔴 per topic) · XP/level/streak/achievements · study plan (editable) · **Cram Mode** entry |

**Onboarding** (§4) is a first-run flow, not a persistent screen.

---

## 4. User Onboarding

A 4-step first-run flow (skippable, editable later from Progress):

1. **What are you studying?** Add one or more subjects (free text + icon/color,
   e.g. "AP US History," "Algebra 1," "Spanish II").
2. **What's coming up?** Optional: exam name + date per subject. This seeds
   the first study plan and the Home countdown card.
3. **Where are you starting from?** Self-reported level per subject
   (behind / on track / ahead) — seeds initial difficulty and tutor tone; it's
   a prior, not a grade, and gets overwritten by real quiz/test performance
   fast.
4. **Bring your first material.** Prompt to upload one set of notes right
   away and run "Study This" on it — the fastest path to the "whoa, it
   actually built me flashcards and a quiz from *my* notes" moment. Skippable
   straight to Home.

No account/password wall in the MVP (see §13) — onboarding writes straight
into local state so the first real action happens in under a minute.

---

## 5. Note Summarization System

**Input normalization.** Every input type is converted to plain text (plus,
for images, kept as an image block for Claude's vision) before summarization:
typed/pasted text as-is; photos and textbook-page images sent directly as
vision input; PDFs run through `pdf.js` client-side to extract text (falls
back to page-image vision input for scanned/handwritten PDFs with no text
layer); PowerPoint export-to-PDF or paste-the-outline-text as the supported
path in the MVP (native `.pptx` binary parsing is future-version scope, §14).

**Generation.** One `generateStructured` call per summary length
(quick/normal/detailed/exam-cram), each with a length-specific system prompt
and the same forced output schema:

```
{
  keyConcepts: string[],
  importantDates: {date, event}[],
  vocabulary: {term, definition}[],
  formulas: {name, formula, whenToUse}[],
  peopleEvents: {name, significance}[],
  causeEffect: {cause, effect}[],
  mustKnow: string[]
}
```

- **Quick** — must-know list only, 5–8 bullets.
- **Normal** — full schema, moderate depth.
- **Detailed** — full schema, expanded explanations per item.
- **Exam cram** — must-know + vocabulary + formulas only, ranked by
  estimated test-weight (frequency/emphasis in the source material), built to
  be read in under 10 minutes.

All four are generated once per note (on demand, cached in the note record)
so switching tabs is instant, not a re-generation.

---

## 6. Practice-Test Generator

**Input:** subject, unit/chapter, difficulty, question count, question types
(MCQ/short-answer/matching/fill-blank/true-false/essay), time limit.

**Grounding.** If the subject has notes attached, the generator is given
those notes' extracted text as context and instructed to write questions
*from that material* — not generic trivia. Without notes, it falls back to
general subject/unit knowledge at the requested difficulty, clearly labeled
"general practice" (not from-your-notes) in the UI so students know the
difference.

**Structure enforcement.** One `generateStructured` call returns:

```
{ questions: [{ id, type, prompt, choices?, correctAnswer,
                rubric?, explanation, topic, difficulty }] }
```

Difficulty is distributed, not uniform — e.g. a "medium" 20-question test is
roughly 30% easy / 50% medium / 20% hard, so a strong student is still
challenged and a struggling one still gets wins. Topic tags on every question
are what make the post-test strong/weak breakdown possible (§8).

**Grading.**
- Objective types (MCQ, T/F, fill-blank, matching) grade client-side,
  instantly, no API call.
- Short-answer/essay go to `grade-test`, which sends each answer + the
  question's rubric to Claude and gets back a correctness judgment, a
  partial-credit-aware score, and specific feedback — not just right/wrong.

**Score report:**

```
SCORE: 84%
STRONG AREAS: [topics where accuracy ≥ 80%]
WEAK AREAS:   [topics where accuracy < 60%]
QUESTIONS MISSED: [question] → Why you got it wrong: [explanation]
```

Weak areas feed directly into `TopicMastery` (§8) and a "Start targeted
practice" button that opens a Practice session pre-filtered to exactly those
topics.

---

## 7. AI Tutoring System

**Persona contract** (system prompt, fixed across the app): patient,
intelligent, encouraging, never judgmental, never sarcastic. Explains
step-by-step with concrete examples/analogies before abstractions. When a
student is trying to *learn a process* (a derivation, a proof, a grammar
rule), the tutor does **not** hand over the final answer on the first ask —
it asks a guiding question or breaks the step down, and only gives the direct
answer if the student explicitly asks for it or is clearly stuck after a
follow-up. When a student just needs a fact (a date, a definition), it
answers directly — Socratic-by-default is a teaching tactic, not a stalling
tactic.

**Level adaptation.** Every tutor call is given the subject's current level
signal (self-reported at onboarding, then overridden by real mastery data,
§8) and instructed to calibrate vocabulary and pacing accordingly — a
"learning" topic gets simpler language and more scaffolding than a
"mastered" one being reviewed for depth.

**Follow-ups are free and unlimited** — the chat keeps full thread context
(bounded by a rolling window + summary of older turns once a thread gets
long, to control token cost — see §16) so "wait, why?" always lands with
context intact.

**Voice.** Mic input via `SpeechRecognition`, replies read aloud via
`speechSynthesis` on toggle — both are browser-native, zero extra
infrastructure, and feature-detected (buttons hide gracefully on
unsupported browsers, notably some Firefox/older-Safari builds).

**"I don't understand this."** Select any text (in a note, a summary, a
tutor reply) → one button → choose simple / normal / detailed / example /
visual / practice-question → a fresh `explain` call scoped to just that
snippet, with the surrounding note as context. "Visual" produces a described
diagram/structured breakdown (ASCII/structured layout in MVP; rendered
diagrams are future-version scope, §14).

**Teach it back.** Student explains a concept typed or spoken; `teach-back`
compares it against the concept's known key points (from the note's summary
or general subject knowledge) and returns: accuracy, missing concepts,
misconceptions, and a 0–100 mastery score, which writes directly into
`TopicMastery` — this is one of the highest-signal mastery inputs, since
explaining is a harder test of understanding than recognizing a right answer.

---

## 8. Student Mastery System

**Model.** Every `TopicMastery` record is `{topic, subjectId, status,
score, lastUpdated, history[]}` where `status ∈ {mastered, learning,
needs-review}` and `score` is a rolling 0–100 confidence estimate.

**Update sources and weights** (score is an exponentially-weighted moving
average, recent evidence counts more):

| Signal | Weight | Notes |
|---|---|---|
| Practice-test question result | high | topic-tagged, so directly attributable |
| Quiz result | medium | same mechanism, lower stakes |
| Flashcard SRS grade (§9) | low per-card, cumulative | many small signals |
| Teach-it-back score | high | strongest single signal — production, not recognition |
| Time since last touched | decay | untouched topics drift toward "needs-review" even with no new evidence, so stale mastery doesn't sit green forever |

**Status thresholds:** `score ≥ 80` → 🟢 mastered, `50–79` → 🟡 learning,
`< 50` or stale beyond a subject-appropriate window → 🔴 needs review.
Thresholds are per-subject-tunable later (a 50% on a brutal AP exam unit
means something different than a 50% on vocab quiz) but fixed globally for
the MVP.

**Progressive difficulty.** Each new question/test-generation call is given
the requesting topic's current mastery score and told to calibrate: scores
trending up get harder items and less scaffolding; scores trending down or
low get easier items, more worked examples, and are prefixed with a
prerequisite check when the miss pattern suggests a gap earlier in the chain
(e.g. missing quadratic-formula questions because of a factoring gap, not a
formula-memorization gap).

---

## 9. Study-Plan Algorithm

**Inputs:** exam date, subject, current level/mastery map, available daily
study minutes, syllabus topics (from onboarding or inferred from uploaded
notes' topics).

**Generation approach:** deterministic scaffolding + one LLM pass for
content, not an LLM inventing a schedule from scratch (LLMs are bad at
arithmetic-heavy scheduling and good at judging what's important):

1. **Time budget.** `daysUntilExam × dailyMinutes` = total study budget.
   Reserve the final 1–2 days for cumulative review + a full practice test,
   deterministically.
2. **Priority ranking.** Rank topics by `(1 − masteryScore/100) × topicWeight`
   where `topicWeight` defaults to equal-per-topic but can be boosted by
   syllabus emphasis (e.g. a unit explicitly flagged as "40% of the exam").
   This is arithmetic, not a model call — reproducible and debuggable.
3. **Allocation.** Greedily assign study minutes per day to the
   highest-priority topics first, spaced so no topic goes untouched for more
   than ~4 days (spacing effect) and every topic gets at least one pass
   before the reserved review days, budget permitting. If the budget can't
   cover everything, lower-priority topics are the ones that get cut — never
   silently drop the highest-weak-area topics.
4. **Content pass.** For each day's allocated topics, one `study-plan` LLM
   call turns the allocation into concrete tasks ("Review quadratic formula
   flashcards (10 min); 8-question practice quiz on factoring (15 min)") —
   the model picks *what kind* of task fits the time and the topic's mastery
   level (a 🔴 topic gets an explain-then-practice pairing; a 🟡 topic gets a
   practice-test slice; a 🟢 topic gets a quick spaced-repetition check).

**Regeneration triggers** (this is what makes it "smart" rather than static):
a new test/quiz result, a mastery status change, an edited exam date, or an
explicit student edit to a day's tasks. Regeneration re-runs steps 2–4 only
for days that haven't happened yet — past days are frozen as a record of what
was actually planned/done, which is also what streak/XP accounting reads.

**Cram Mode** is this same algorithm with `daysUntilExam = 1` and a stricter
priority function that also weights *recency of confusion* (topics with a
recent wrong-answer or low teach-back score jump the queue even above raw
mastery score, since "confused yesterday" beats "never great at this" when
there's no time left): most important concepts → weakest concepts → likely
confusion points → essential vocab/formulas → practice questions → one final
practice test, in that order, sized to fit however many hours the student
says they have left.

---

## 10. Database Structure

**MVP (§13):** no server database — the learning profile lives in
`localStorage` via a persisted Zustand store, scoped to one browser. This is
a deliberate scope cut (see §13, §16), not the target architecture.

**Full-version schema (Postgres — Vercel Postgres or Supabase):**

```sql
users            (id, email, created_at, plan)
subjects         (id, user_id, name, color, icon)
notes            (id, subject_id, title, source_type, raw_text,
                  storage_url, created_at)
note_summaries   (id, note_id, length, content jsonb, created_at)
flashcards       (id, note_id, subject_id, front, back, topic,
                  interval, ease_factor, due_date, repetitions,
                  last_reviewed)
questions        (id, source_type, source_id, type, prompt, choices jsonb,
                  correct_answer, rubric, explanation, topic, difficulty)
tests            (id, subject_id, title, config jsonb, created_at)
test_questions   (test_id, question_id, position)
test_attempts    (id, test_id, user_id, started_at, submitted_at,
                  answers jsonb, score, strong_areas jsonb,
                  weak_areas jsonb)
topic_mastery    (id, user_id, subject_id, topic, status, score,
                  last_updated)
mastery_history  (id, topic_mastery_id, score, source, recorded_at)
study_plans      (id, subject_id, exam_date, created_at)
study_plan_days  (id, plan_id, date, tasks jsonb, completed)
chat_threads     (id, user_id, subject_id, topic)
chat_messages    (id, thread_id, role, content, created_at)
profile_stats    (user_id, xp, level, streak_days, last_study_date)
achievements     (id, user_id, key, unlocked_at)
```

Design notes: `jsonb` columns for LLM-shaped structured output (question
sets, summaries, plan tasks) so schema evolution doesn't require migrations
every time a generator's output shape gains a field; normalized relational
tables for everything mastery/scheduling reads and writes, since that's
queried and aggregated constantly (dashboard, due-cards queue, plan
regeneration) and needs indexes, not JSON blob scans.

---

## 11. AI Architecture

**Model.** Claude, called server-side only via `@anthropic-ai/sdk`
(`ANTHROPIC_API_KEY` never reaches the browser).

**Two call shapes, one wrapper (`lib/ai.ts`):**
- `generate()` — free-text completion for tutor chat and prose explanations,
  where the output *is* the product (a conversational reply).
- `generateStructured<T>()` — forced tool-use (`tool_choice: {type:"tool",
  name}`) with an explicit JSON schema per generator, so summaries,
  flashcards, tests, and grading come back as typed data the UI can render
  directly, never as prose the app has to regex-parse. This is the single
  biggest reliability lever in the whole system (§16).

**Grounding over invention.** Every generator that can be grounded in the
student's own material is: summaries, flashcards, and notes-based tests are
given the source text and instructed to draw *from it*; general-knowledge
tests (no notes attached) are explicitly labeled as such in the UI so a
student never mistakes "the AI's general guess at what's on your test" for
"pulled from what you actually gave it."

**Context management.** Tutor threads keep a rolling window of recent turns
verbatim plus a running summary of older turns (generated lazily once a
thread crosses a length threshold) — bounds cost and latency on long study
sessions without losing "wait, why did you say X three messages ago."

**Grading integrity.** Objective question types are graded by code, not by
the model — deterministic, free, instant, and not subject to model
inconsistency. The model only grades what genuinely requires judgment
(short-answer, essay, teach-it-back), and always against the question's own
rubric/expected-answer, never a bare "is this right?" with no anchor.

---

## 12. Recommended Technologies

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19 | one deploy target for UI + API routes, matches existing repo pattern, first-class Vercel support |
| Language | TypeScript | structured LLM I/O needs real types end to end |
| Styling | Tailwind CSS | fast, consistent, easy to keep "modern and clean" |
| Icons | lucide-react | already in the repo, consistent icon language |
| MVP state | Zustand + localStorage | zero infra, instant to ship, matches this repo's existing pattern |
| Full-version state | Zustand (client cache) + Postgres via Prisma or Drizzle | durable, multi-device, queryable for dashboards |
| Full-version auth | Auth.js (NextAuth) or Clerk | fastest path to real accounts without hand-rolling sessions |
| File storage (images/PDFs, full version) | Vercel Blob or S3 | notes/photos need durable storage once they outlive one browser |
| PDF parsing | pdf.js (client-side text layer extraction) | keeps raw files off the server in the MVP; server-side OCR (Textract/equivalent) for scanned PDFs in the full version |
| Voice | Web Speech API (browser-native) | zero-cost STT/TTS; full version can upgrade to a hosted STT/TTS API for reliability across browsers |
| AI | Claude via `@anthropic-ai/sdk`, forced tool-use for structured output | one model family, reliable JSON via tool-use rather than prompt-and-hope |
| Hosting | Vercel | matches the product requirement directly; first-class Next.js support, zero-config previews per PR |
| Payments (monetization, §15) | Stripe (Billing + Customer Portal) | standard for subscription SaaS |

---

## 13. MVP Version

**Scope: everything in §3's screens, working end to end, no accounts, no
server database.** This is what ships first and is what the current build
targets.

- Learning profile in `localStorage` (Zustand persist) — one browser, no
  login. This is the single biggest MVP cut: it means no cross-device sync
  and clearing browser data resets everything. Explicitly acceptable for an
  MVP whose goal is proving the core loop (§17) end to end, not retention
  infrastructure.
- Notes: typed/pasted text, image upload (vision), client-side PDF text
  extraction. No native `.pptx` parsing — export-to-PDF or paste-the-text is
  the supported path.
- Full AI pipeline (§5–§9) implemented for real against Claude, with offline
  fallback content when no API key is configured so the app is still
  demoable.
- Voice via Web Speech API only (no hosted STT/TTS fallback).
- "Visual explanation" is a structured/described breakdown, not a rendered
  diagram.
- No payments — every feature is unlocked (monetization ships after the core
  loop is validated, §15).

---

## 14. Full Future Version

Layered on top of the MVP once the core loop is validated:

- **Accounts + server database** (§10's full schema) — cross-device sync,
  no data loss on browser clear, the prerequisite for everything below.
- **Real file storage** for uploaded images/PDFs (Vercel Blob/S3), with
  server-side OCR for scanned/handwritten PDFs that have no text layer.
- **Native PPTX/DOCX parsing** — no more export-to-PDF workaround.
- **Rendered visual explanations** — actual diagrams (timelines, molecule
  structures, geometry figures) instead of structured text, likely via a
  constrained diagram-generation step (structured spec → SVG renderer)
  rather than asking the model to draw pixels directly.
- **Hosted STT/TTS** for reliable voice across every browser, plus
  latency-optimized streaming voice tutoring (closer to a real-time spoken
  conversation instead of turn-based dictation).
- **Collaborative/classroom mode** — a teacher assigns a unit, sees
  aggregate (never individual-shaming) class mastery heatmaps.
- **Import from existing tools** — Google Classroom/Canvas syllabus and
  assignment import to auto-seed subjects/topics/exam dates.
- **Offline-capable PWA** — cached recent material + flashcard review
  usable without connectivity; generation queues and syncs when back online.
- **Multi-model routing** — cheaper/faster model for objective grading and
  flashcard generation, top-tier model reserved for tutoring conversation and
  essay grading, to control unit economics at scale (§16).

---

## 15. Monetization Strategy

**Model: freemium subscription**, because the product's value compounds with
usage (more notes → better mastery data → better plans), which is exactly
the shape that rewards a subscription over one-time or pure ads (ads are
also a poor fit for a focused studying context).

- **Free tier:** full core loop, capped — e.g. a monthly cap on AI
  generations (summaries, test generation, tutor messages) generous enough
  to prove the product on one class, tight enough that an actively-studying
  student preparing for finals across 4–5 classes outgrows it. Cram Mode
  available but capped harder (it's the highest-intent, highest-willingness-
  to-pay moment — "my test is tomorrow" is not when you want to hit a paywall
  mid-session, so the cap should be generous enough to complete one cram
  session, tight on repeat use in the same week).
- **Plus (student, monthly/annual, annual discounted):** unlimited
  generations, unlimited subjects, full voice tutoring, priority generation
  speed. Priced at a genuine student-budget point (below typical tutoring-app
  pricing, since the comparison in a student's head is "a coffee a week," not
  "a human tutor's hourly rate").
- **Family/Team plan:** multiple student seats under one billing account —
  natural fit for a parent managing several kids or a small tutoring pod.
- **School/District licensing (later):** the classroom-mode features in §14
  are the wedge — sold per-seat annually, which is also where margins are
  best since acquisition cost per student drops sharply.
- **What's never paywalled:** the ability to see your own mastery data and
  study plan (even capped on *generating new* content, a student should never
  lose access to reviewing what they already built) — locking someone out of
  their own accumulated study history the week of finals is the fastest way
  to churn and to burn trust.

---

## 16. Biggest Technical Challenges and Solutions

1. **Getting reliable structured output from the model at scale.**
   Free-text generation that gets regex-parsed into flashcards/questions is
   fragile and breaks silently. *Solution:* forced tool-use for every
   structured generator (§11) — the model literally cannot return something
   that doesn't match the schema, and a failed/refused call returns `null`
   cleanly instead of malformed JSON the UI has to guess at.

2. **Grounding generated tests/summaries in the student's actual material
   instead of hallucinated content.** A "practice test" that doesn't match
   what's in the notes is worse than useless — it's actively misleading.
   *Solution:* always pass the source note text as context when it exists;
   explicitly label ungrounded (general-knowledge) content in the UI so trust
   isn't misplaced (§11).

3. **Grading short-answer/essay questions consistently.** Free-form grading
   is where models are least reliable and students most sensitive to
   perceived unfairness. *Solution:* every gradable question carries its own
   rubric/expected-answer generated alongside it at creation time, and
   grading is always anchored to that specific rubric — never an
   open-ended "is this correct?" judgment call made fresh at grading time.

4. **Making the study plan actually adaptive without it feeling
   unpredictable/chaotic to the student.** Silent full-regeneration every
   time a quiz result comes in would make the plan feel unstable. *Solution:*
   deterministic priority-ranking + allocation (§9 steps 1–3) means the same
   inputs always produce the same plan shape — the LLM only fills in *content*
   for future days, and past days are frozen, so the student's history of
   what was planned/done never gets rewritten under them.

5. **Cost and latency at scale.** A student generating a 50-question test,
   getting it graded, chatting with the tutor, and reviewing flashcards in
   one session is many model calls. *Solution:* deterministic logic instead
   of model calls wherever possible (SRS scheduling, objective grading,
   plan-allocation math — §6, §9, §11); rolling-summary context compression
   for long tutor threads (§11); cached per-length summaries generated once
   per note, not on every view (§5); future-version model routing by task
   difficulty (§14).

6. **Multimodal input quality — handwriting and scanned/photographed notes.**
   Vision-based OCR-equivalent extraction from messy handwriting is
   meaningfully worse than from typed text, and a bad extraction poisons
   every downstream feature (summary, flashcards, test) built on it.
   *Solution:* MVP shows the extracted/interpreted text back to the student
   before generating anything from it, so a garbled read is caught and
   correctable before it propagates instead of silently producing wrong
   flashcards.

7. **No-database MVP vs. cross-device product expectations.** Students
   study on a phone and a laptop; localStorage-only doesn't survive that.
   *Solution:* explicitly scoped as an MVP tradeoff (§13), with the full
   schema (§10) already designed so the migration path is "add a database and
   sync the same client store shape to it," not a rearchitecture.

8. **Keeping mastery data honest over time (no green-forever topics).**
   A topic mastered in September and never revisited shouldn't still show
   🟢 in May. *Solution:* time-decay term in the mastery score (§8) pulls
   stale topics back toward "needs review" even with zero new evidence.

---

## 17. Complete User Flow

**The one loop the whole product is built around:**

```
Upload notes
   ↓
AI summarizes them (§5)
   ↓
[STUDY THIS] generates flashcards + a quiz + a study guide (§6)
   ↓
Student practices — flashcards (SRS, §9) and quiz — and takes a full
practice test when ready (§6)
   ↓
Test is graded; weak topics identified (§6)
   ↓
TopicMastery updates from test/quiz/teach-back signals (§8)
   ↓
"Needs review" surfaces on Home and Progress; due flashcards reprioritize
in Practice (§8, §9)
   ↓
Study plan regenerates around the exam date, weighted toward weak areas (§9)
   ↓
Today's Plan on Home reflects the new priorities
   ↓
(loop continues daily until exam date)
   ↓
Exam is tomorrow → Cram Mode runs the same pipeline at 1-day urgency,
prioritizing weakest + most-recently-confused material (§9)
```

**A concrete walkthrough, start to finish:**

1. Student opens TutorAI for the first time → 4-step onboarding (§4): adds
   "AP Biology," sets the unit-4 exam date three weeks out, self-reports
   "on track," uploads a photo of today's lecture notes and runs Study This
   immediately.
2. Within the same minute: a normal-length summary, 12 flashcards, and a
   10-question quiz exist for that note, and Home shows "Today's plan:
   15-minute session" built from it.
3. Student takes the quiz. Gets 6/10. Weak topics: "cellular respiration,"
   "Krebs cycle." `TopicMastery` for both drops to 🔴.
4. Home's "Needs review" card now shows those two topics. Practice's due
   queue prioritizes their flashcards.
5. Two days later, tutor chat: student asks "I still don't get the Krebs
   cycle" → step-by-step explanation with an analogy, unlimited follow-ups,
   ends with "teach it back to me" → student explains, scores 55/100,
   specific missing concepts named.
6. Study plan (already running in the background) reallocates the next
   three days to include a Krebs-cycle-focused session, generated from the
   current mastery map, not a static original plan.
7. A week later, a 30-question unit-4 practice test (mixed MCQ/short-answer,
   grounded in every note uploaded so far) — scores 84%, strong on
   photosynthesis, weak on enzyme kinetics now instead. Mastery map updates
   again; plan reallocates again.
8. Night before the exam: "My test is tomorrow" → Cram Mode produces a
   ranked review — weakest concepts first, essential vocab/formulas, a short
   final practice test — sized to the hours the student says they have left.
9. Exam simulator available any time along the way for a full timed
   dry run with the same navigator/flag/review mechanics as the real thing.

Every step above both consumes and produces state in the same profile — that
continuity, not any single feature, is the product.
