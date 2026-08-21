/**
 * Offline content generators.
 *
 * Every API route under `app/api/ai/*` falls back to one of these when
 * `ANTHROPIC_API_KEY` is missing (or Claude errors out). They are deliberately
 * simple — template + keyword extraction over the student's own text — but they
 * always return something usable so no screen is ever empty or broken.
 */

import {
  CauseEffectItem,
  CramPlan,
  Difficulty,
  NoteSummary,
  Question,
  QuestionType,
  StudyGuide,
  StudyPlanDay,
  SummaryLength,
  TeachBackResult,
  VocabularyItem,
} from "./types";
import { addDays, isoDay, normalizeAnswer, sentences, uid } from "./utils";

const STOPWORDS = new Set(
  `the a an and or but if then than that this these those of to in on for with as at by from is are was were be been being it its it's their there here we you your our they he she his her not no can will would could should may might must about into over under between during before after above below up down out off again further once all any both each few more most other some such only own same so too very`.split(
    /\s+/
  )
);

export interface Keyword {
  term: string;
  count: number;
  sentence: string;
}

/** Pulls the most repeated content words out of the note, with a source line. */
export function keywords(text: string, limit = 12): Keyword[] {
  const lines = sentences(text);
  const counts = new Map<string, number>();
  const firstSentence = new Map<string, string>();

  const words = text.split(/[^A-Za-z0-9'-]+/).filter(Boolean);
  for (const raw of words) {
    const word = raw.trim();
    if (word.length < 4) continue;
    const key = word.toLowerCase();
    if (STOPWORDS.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!firstSentence.has(key)) {
      const hit = lines.find((s) => s.toLowerCase().includes(key));
      if (hit) firstSentence.set(key, hit);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({
      term,
      count,
      sentence: firstSentence.get(term) ?? lines[0] ?? text.slice(0, 160),
    }));
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

const LENGTH_BUDGET: Record<SummaryLength, number> = {
  quick: 3,
  normal: 6,
  detailed: 10,
  cram: 8,
};

export function offlineSummary(
  text: string,
  length: SummaryLength
): NoteSummary {
  const lines = sentences(text);
  const terms = keywords(text, LENGTH_BUDGET[length] + 4);
  const budget = LENGTH_BUDGET[length];

  const vocabulary: VocabularyItem[] = terms.slice(0, budget).map((k) => ({
    term: capitalize(k.term),
    definition: k.sentence.slice(0, 220),
  }));

  const dateMatches = [
    ...text.matchAll(
      /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{0,4}|\b1[0-9]{3}\b|\b20[0-9]{2}\b)/g
    ),
  ].slice(0, 6);

  const causeEffect: CauseEffectItem[] = lines
    .filter((s) => /because|therefore|so that|as a result|leads to|causes/i.test(s))
    .slice(0, 4)
    .map((s) => {
      const [cause, effect] = s.split(
        /\s+(?:because|therefore|so that|as a result|leads to|causes)\s+/i
      );
      return {
        cause: (cause ?? s).slice(0, 160),
        effect: (effect ?? "See the note for the full statement.").slice(0, 160),
      };
    });

  const overviewLines = lines.slice(0, budget);
  const overview =
    overviewLines.length > 0
      ? overviewLines.join(" ")
      : text.slice(0, 400) || "This note is still empty — add some content.";

  return {
    overview:
      length === "quick"
        ? overviewLines.slice(0, 2).join(" ") || overview
        : overview,
    keyConcepts: lines.slice(0, budget).map((s) => s.slice(0, 180)),
    importantDates: dateMatches.map((m) => ({
      date: m[0],
      what:
        lines.find((s) => s.includes(m[0]))?.slice(0, 180) ??
        "Mentioned in your notes.",
    })),
    vocabulary,
    formulas: [
      ...text.matchAll(/([A-Za-z][A-Za-z0-9_ ]{0,20}=\s*[^\n.;]{2,60})/g),
    ]
      .slice(0, 5)
      .map((m) => ({
        name: m[1].split("=")[0].trim(),
        expression: m[1].trim(),
        whenToUse: "Appears in your notes — check the surrounding context.",
      })),
    peopleEvents: [...text.matchAll(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g)]
      .slice(0, 5)
      .map((m) => ({
        name: m[1],
        significance:
          lines.find((s) => s.includes(m[1]))?.slice(0, 180) ??
          "Named in your notes.",
      })),
    causeEffect,
    mustKnow: terms
      .slice(0, Math.max(3, Math.min(budget, 6)))
      .map((k) => `${capitalize(k.term)} — ${k.sentence.slice(0, 140)}`),
    topics: terms.slice(0, 6).map((k) => capitalize(k.term)),
  };
}

export interface OfflineCard {
  front: string;
  back: string;
  topic: string;
}

export function offlineFlashcards(text: string, count = 10): OfflineCard[] {
  const terms = keywords(text, count + 6);
  const lines = sentences(text);

  const cards: OfflineCard[] = terms.slice(0, count).map((k) => ({
    front: `What does "${capitalize(k.term)}" mean in this material?`,
    back: k.sentence.slice(0, 260),
    topic: capitalize(k.term),
  }));

  while (cards.length < Math.min(count, lines.length)) {
    const line = lines[cards.length];
    cards.push({
      front: "Explain this idea in your own words:",
      back: line.slice(0, 260),
      topic: capitalize(terms[0]?.term ?? "General"),
    });
  }

  if (cards.length === 0) {
    cards.push({
      front: "Add some notes to generate real flashcards",
      back: "Paste or type your class notes and hit STUDY THIS.",
      topic: "Getting started",
    });
  }

  return cards;
}

function fillBlank(sentence: string, term: string): string {
  const re = new RegExp(term, "i");
  return sentence.replace(re, "________").slice(0, 240);
}

export function offlineQuestions(
  text: string,
  types: QuestionType[],
  count: number,
  difficulty: Difficulty = "medium"
): Question[] {
  const terms = keywords(text, Math.max(count + 6, 12));
  const lines = sentences(text);
  const requested = types.length > 0 ? types : ["mcq"];
  const out: Question[] = [];

  for (let i = 0; i < count; i += 1) {
    const type = requested[i % requested.length];
    const k = terms[i % Math.max(terms.length, 1)];
    const term = k ? capitalize(k.term) : "the main idea";
    const sentence = k?.sentence ?? lines[i % Math.max(lines.length, 1)] ?? text.slice(0, 200);
    const distractors = terms
      .filter((t) => t.term !== k?.term)
      .slice(0, 3)
      .map((t) => capitalize(t.term));

    const base = {
      id: uid("q"),
      topic: term,
      difficulty,
      explanation: sentence.slice(0, 240),
    };

    if (type === "mcq") {
      const choices = [term, ...distractors];
      while (choices.length < 4) choices.push(`None of these (${choices.length})`);
      out.push({
        ...base,
        type: "mcq",
        prompt: `Which term does this describe? "${sentence.slice(0, 180)}"`,
        choices,
        correctAnswer: term,
      });
    } else if (type === "true-false") {
      out.push({
        ...base,
        type: "true-false",
        prompt: `True or false: ${sentence.slice(0, 200)}`,
        choices: ["True", "False"],
        correctAnswer: "True",
      });
    } else if (type === "fill-blank") {
      out.push({
        ...base,
        type: "fill-blank",
        prompt: fillBlank(sentence, k?.term ?? term),
        correctAnswer: term,
      });
    } else if (type === "matching") {
      const pairsA = terms.slice(0, 4).map((t) => capitalize(t.term));
      const pairsB = terms.slice(0, 4).map((t) => t.sentence.slice(0, 70));
      out.push({
        ...base,
        type: "matching",
        prompt: "Match each term to its description.",
        matchPrompts: pairsA,
        choices: pairsB,
        correctAnswer: pairsA.map((a, idx) => `${a}=${pairsB[idx]}`).join(" | "),
      });
    } else if (type === "essay") {
      out.push({
        ...base,
        type: "essay",
        prompt: `Explain the role of ${term} in this material, using at least two supporting details.`,
        correctAnswer: sentence.slice(0, 400),
      });
    } else {
      out.push({
        ...base,
        type: "short",
        prompt: `In one or two sentences, what is ${term}?`,
        correctAnswer: sentence.slice(0, 300),
      });
    }
  }

  return out;
}

export function offlineStudyGuide(
  text: string,
  title: string
): Omit<StudyGuide, "id" | "subjectId" | "createdAt" | "noteId"> {
  const summary = offlineSummary(text, "detailed");
  return {
    title: `${title} — Study Guide`,
    keyConcepts: [
      { heading: "Core ideas", points: summary.keyConcepts.slice(0, 6) },
      { heading: "Must know", points: summary.mustKnow },
    ],
    vocabulary: summary.vocabulary,
    facts: summary.keyConcepts.slice(0, 8),
    commonMistakes: [
      "Mixing up similar-sounding terms — re-read the vocabulary list above.",
      "Memorising definitions without being able to give an example.",
      "Skipping the cause-and-effect chains; exams love those.",
    ],
    practiceQuestions: offlineQuestions(text, ["short", "mcq"], 5),
    miniQuiz: offlineQuestions(text, ["mcq", "true-false"], 5),
    checklist: summary.mustKnow.map((m) => `I can explain: ${m.split(" — ")[0]}`),
  };
}

export function offlineExplanation(
  snippet: string,
  mode: string
): string {
  const terms = keywords(snippet, 4).map((k) => capitalize(k.term));
  const lead = terms.length > 0 ? terms.join(", ") : "this idea";

  switch (mode) {
    case "simple":
      return `Here's the plain-English version.\n\nThis passage is really about ${lead}. Strip away the wording and it says: ${snippet
        .slice(0, 200)
        .trim()}\n\nThink of it as one claim plus its supporting detail. If you can restate the claim without looking, you understand it.`;
    case "detailed":
      return `Let's take it apart piece by piece.\n\n1. What it says: ${snippet
        .slice(0, 220)
        .trim()}\n2. Key terms: ${lead}.\n3. Why it matters: these terms are what a question on this topic will be built around.\n4. How to remember it: turn it into a single sentence in your own words, then check it against the original.`;
    case "example":
      return `Concrete example.\n\nImagine you had to explain ${lead} to a friend who missed class. You'd say something like: "${snippet
        .slice(0, 160)
        .trim()}" — and then give one real case where it shows up. Now try producing that real case yourself; that's the part exams test.`;
    case "practice-question":
      return `Practice question.\n\nIn your own words, what does ${lead} mean, and give one example of it in action?\n\n(Model answer: ${snippet
        .slice(0, 200)
        .trim()})`;
    default:
      return `Here's what this is saying.\n\n${snippet
        .slice(0, 260)
        .trim()}\n\nThe important part is ${lead}. Everything else in the passage is supporting detail. Try restating it in one sentence — if you can, you've got it.`;
  }
}

export function offlineTeachBack(
  concept: string,
  explanation: string
): TeachBackResult {
  const conceptTerms = keywords(concept, 6).map((k) => k.term);
  const said = normalizeAnswer(explanation);
  const covered = conceptTerms.filter((t) => said.includes(t));
  const missing = conceptTerms.filter((t) => !said.includes(t));
  const wordCount = explanation.trim().split(/\s+/).filter(Boolean).length;

  const coverage =
    conceptTerms.length === 0 ? 0.5 : covered.length / conceptTerms.length;
  const depth = Math.min(1, wordCount / 60);
  const score = Math.round(Math.max(5, Math.min(100, (coverage * 0.7 + depth * 0.3) * 100)));

  return {
    accuracy: score,
    masteryScore: score,
    topic: concept.slice(0, 60),
    correctPoints: covered.map((t) => `You mentioned ${capitalize(t)}.`),
    missingConcepts: missing.slice(0, 4).map((t) => capitalize(t)),
    misconceptions:
      wordCount < 15
        ? ["Your explanation is very short — a marker can't tell what you know from this."]
        : [],
    feedback:
      score >= 80
        ? "Strong explanation. You hit the main terms and gave enough detail to show you understand it, not just remember it."
        : score >= 50
        ? "Decent start. You've got part of it — add the missing terms below and say *why* each one matters, not just what it is."
        : "This one needs another pass. Re-read the material, then try again and aim to use each key term in a sentence of your own.",
  };
}

export function offlineStudyPlan(
  examDate: string,
  topics: string[],
  dailyMinutes: number,
  weakTopics: string[]
): StudyPlanDay[] {
  const today = isoDay();
  const total = Math.max(
    1,
    Math.min(
      21,
      Math.round(
        (new Date(examDate).getTime() - new Date(today).getTime()) /
          (24 * 60 * 60 * 1000)
      )
    )
  );

  const ordered = [...weakTopics, ...topics.filter((t) => !weakTopics.includes(t))];
  const pool = ordered.length > 0 ? ordered : ["Course overview"];
  const days: StudyPlanDay[] = [];

  for (let i = 0; i < total; i += 1) {
    const date = addDays(today, i);
    const focus = pool[i % pool.length];
    const isLast = i === total - 1;
    const isReviewDay = i > 0 && i % 3 === 2;

    const tasks = isLast
      ? [
          {
            id: uid("task"),
            label: "Full practice test",
            detail: "Sit one timed practice test end to end, no notes.",
            minutes: Math.max(30, Math.round(dailyMinutes * 0.7)),
            topic: focus,
            kind: "test" as const,
            done: false,
          },
          {
            id: uid("task"),
            label: "Review every missed question",
            detail: "For each miss, write one sentence on why you missed it.",
            minutes: Math.round(dailyMinutes * 0.3),
            topic: focus,
            kind: "review" as const,
            done: false,
          },
        ]
      : isReviewDay
      ? [
          {
            id: uid("task"),
            label: `Flashcard review — ${focus}`,
            detail: "Clear your due queue in Practice.",
            minutes: Math.round(dailyMinutes * 0.4),
            topic: focus,
            kind: "flashcards" as const,
            done: false,
          },
          {
            id: uid("task"),
            label: "Mixed practice quiz",
            detail: "10 questions across everything covered so far.",
            minutes: Math.round(dailyMinutes * 0.6),
            topic: focus,
            kind: "practice" as const,
            done: false,
          },
        ]
      : [
          {
            id: uid("task"),
            label: `Study ${focus}`,
            detail: "Read the summary, then explain it out loud without looking.",
            minutes: Math.round(dailyMinutes * 0.5),
            topic: focus,
            kind: "read" as const,
            done: false,
          },
          {
            id: uid("task"),
            label: `Quiz yourself on ${focus}`,
            detail: "Short quiz; anything you miss becomes a flashcard.",
            minutes: Math.round(dailyMinutes * 0.5),
            topic: focus,
            kind: "practice" as const,
            done: false,
          },
        ];

    days.push({
      date,
      tasks,
      estimatedMinutes: tasks.reduce((sum, t) => sum + t.minutes, 0),
      completed: false,
      focus,
    });
  }

  return days;
}

export function offlineCram(
  text: string,
  weakTopics: string[]
): Omit<CramPlan, "subjectId" | "createdAt" | "finalTestId"> {
  const summary = offlineSummary(text, "cram");
  return {
    mostImportant: summary.mustKnow.slice(0, 6),
    weakest:
      weakTopics.length > 0
        ? weakTopics
        : summary.topics.slice(0, 3),
    confusionPoints: summary.causeEffect.slice(0, 3).length
      ? summary.causeEffect.slice(0, 3)
      : summary.vocabulary.slice(0, 3).map((v) => ({
          cause: `Confusing ${v.term} with a similar term`,
          effect: "Re-read its definition and say it out loud once.",
        })),
    essentialVocab: summary.vocabulary.slice(0, 10),
    essentialFormulas: summary.formulas,
    practiceQuestions: offlineQuestions(text, ["mcq", "short", "true-false"], 8),
    schedule: [
      { block: "Block 1 — Triage", minutes: 20, detail: "Read the must-know list twice. Say each item out loud." },
      { block: "Block 2 — Weak spots", minutes: 30, detail: "Attack the weakest topics only. Nothing else." },
      { block: "Block 3 — Rapid recall", minutes: 20, detail: "Flashcards, due queue first, no re-reading." },
      { block: "Block 4 — Practice test", minutes: 30, detail: "One timed test, then review every miss." },
      { block: "Block 5 — Final pass", minutes: 15, detail: "Skim the checklist. Sleep. Do not cram past this." },
    ],
  };
}

const TUTOR_OPENERS = [
  "Good question — let's work through it together rather than me just handing you the answer.",
  "Let's break this into steps.",
  "Okay, here's how I'd approach it.",
];

export function offlineTutorReply(message: string, subject: string): string {
  const terms = keywords(message, 3).map((k) => capitalize(k.term));
  const focus = terms[0] ?? "this";
  const opener = TUTOR_OPENERS[message.length % TUTOR_OPENERS.length];

  return `${opener}

**Step 1 — what you're actually being asked.** You're working on ${focus} in ${subject}. Restate the question in your own words first; half of the difficulty usually disappears there.

**Step 2 — what you already know.** What definition or rule for ${focus} do you already have in your notes? Write it down before going further.

**Step 3 — the first move.** Apply that rule to just the first part of the problem. Don't try to see the whole solution at once.

Now, so I can point you at the right thing: **which step are you stuck on — understanding the question, or knowing which rule applies?**

*(Offline mode: no ANTHROPIC_API_KEY is configured, so this is a canned tutoring scaffold rather than a real Claude reply.)*`;
}

export function offlineGradeText(
  studentAnswer: string,
  expected: string
): { correct: boolean; credit: number; whyWrong: string } {
  const a = normalizeAnswer(studentAnswer);
  const b = normalizeAnswer(expected);
  if (a.length === 0) {
    return { correct: false, credit: 0, whyWrong: "You left this blank." };
  }

  const expectedWords = [...new Set(b.split(" ").filter((w) => w.length > 3))];
  const hit = expectedWords.filter((w) => a.includes(w));
  const credit =
    expectedWords.length === 0 ? 0.5 : hit.length / expectedWords.length;

  if (credit >= 0.6) {
    return { correct: true, credit, whyWrong: "Covers the key points." };
  }

  const missed = expectedWords.filter((w) => !a.includes(w)).slice(0, 5);
  return {
    correct: false,
    credit,
    whyWrong: `Your answer misses the key ideas. A full answer should mention: ${missed.join(
      ", "
    )}.`,
  };
}
