import { NextResponse } from "next/server";
import { aiEnabled, generateStructured } from "@/lib/ai";
import { objectItem, objectSchema } from "@/lib/schemas";
import { offlineGradeText } from "@/lib/offline";
import { Question, QuestionResult } from "@/lib/types";
import { normalizeAnswer } from "@/lib/utils";

export const runtime = "nodejs";
// 60s is the ceiling on Vercel's Hobby plan; anything higher fails the
// deploy outright. On Pro this can go up to 300 for very long generations.
export const maxDuration = 60;

interface Body {
  questions?: Question[];
  answers?: Record<string, string>;
  title?: string;
  subject?: string;
}

const OBJECTIVE = new Set(["mcq", "true-false", "fill-blank", "matching"]);

function gradeObjective(
  question: Question,
  answer: string
): { correct: boolean; credit: number; whyWrong: string } {
  const given = normalizeAnswer(answer);
  const expected = normalizeAnswer(question.correctAnswer);

  if (!given) {
    return { correct: false, credit: 0, whyWrong: "You left this one blank." };
  }

  if (question.type === "matching") {
    const expectedPairs = question.correctAnswer
      .split("|")
      .map((p) => normalizeAnswer(p));
    const givenPairs = answer.split("|").map((p) => normalizeAnswer(p));
    const hits = expectedPairs.filter((p) => givenPairs.includes(p)).length;
    const credit = expectedPairs.length ? hits / expectedPairs.length : 0;
    return {
      correct: credit >= 0.999,
      credit,
      whyWrong:
        credit >= 0.999
          ? "All pairs matched."
          : `You matched ${hits} of ${expectedPairs.length} pairs correctly. Re-read the definitions for the ones you swapped.`,
    };
  }

  const exact = given === expected;
  const contained =
    question.type === "fill-blank" &&
    (given.includes(expected) || expected.includes(given));

  const correct = exact || contained;
  return {
    correct,
    credit: correct ? 1 : 0,
    whyWrong: correct
      ? "Correct."
      : `You answered "${answer.trim()}" but the answer is "${question.correctAnswer}". ${question.explanation}`,
  };
}

interface AiGrade {
  questionId: string;
  credit: number;
  whyWrong: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const questions = body.questions ?? [];
  const answers = body.answers ?? {};

  if (questions.length === 0) {
    return NextResponse.json({ error: "No questions to grade." }, { status: 400 });
  }

  const results = new Map<string, QuestionResult>();
  const openEnded: Question[] = [];

  for (const q of questions) {
    const answer = answers[q.id] ?? "";
    if (OBJECTIVE.has(q.type)) {
      const graded = gradeObjective(q, answer);
      results.set(q.id, {
        questionId: q.id,
        correct: graded.correct,
        credit: graded.credit,
        studentAnswer: answer,
        correctAnswer: q.correctAnswer,
        whyWrong: graded.whyWrong,
        topic: q.topic,
      });
    } else {
      openEnded.push(q);
    }
  }

  let aiGraded: { grades: AiGrade[]; strongAreas: string[]; weakAreas: string[]; feedback: string } | null =
    null;

  if (openEnded.length > 0) {
    aiGraded = await generateStructured({
      system: `You are a fair but rigorous grader marking a student's short-answer and essay responses.

Rules:
- Grade against the expected answer given for each question, not against your own preferred phrasing. A different wording that shows the same understanding earns full credit.
- credit is 0 to 1. Award partial credit generously for partially-correct reasoning, but never for a blank or off-topic answer.
- whyWrong must be specific and useful: name what was missing or misunderstood and how to fix it. If the answer was fully correct, say briefly what made it strong.
- Address the student as "you".`,
      messages: [
        {
          role: "user",
          content: `Grade these responses.

${openEnded
  .map(
    (q, i) => `--- Question ${i + 1} (id: ${q.id}, topic: ${q.topic}, type: ${q.type})
Question: ${q.prompt}
Expected answer / rubric: ${q.correctAnswer}
Student answer: ${answers[q.id]?.trim() || "(left blank)"}`
  )
  .join("\n\n")}

Also give the student overall strong and weak topic areas across the whole test.`,
        },
      ],
      tool: {
        name: "record_grades",
        description: "Record the grades for the open-ended questions.",
        input_schema: objectSchema(
          {
            grades: {
              type: "array",
              items: objectItem(
                {
                  questionId: { type: "string" },
                  credit: { type: "number", description: "0 to 1." },
                  whyWrong: { type: "string" },
                },
                ["questionId", "credit", "whyWrong"]
              ),
            },
            strongAreas: { type: "array", items: { type: "string" } },
            weakAreas: { type: "array", items: { type: "string" } },
            feedback: {
              type: "string",
              description: "Two or three sentences of overall feedback.",
            },
          },
          ["grades", "strongAreas", "weakAreas", "feedback"]
        ),
      },
      maxTokens: 8000,
    });

    for (const q of openEnded) {
      const answer = answers[q.id] ?? "";
      const hit = aiGraded?.grades?.find((g) => g.questionId === q.id);
      if (hit && typeof hit.credit === "number") {
        const credit = Math.max(0, Math.min(1, hit.credit));
        results.set(q.id, {
          questionId: q.id,
          correct: credit >= 0.7,
          credit,
          studentAnswer: answer,
          correctAnswer: q.correctAnswer,
          whyWrong: hit.whyWrong || q.explanation,
          topic: q.topic,
        });
      } else {
        const graded = offlineGradeText(answer, q.correctAnswer);
        results.set(q.id, {
          questionId: q.id,
          correct: graded.correct,
          credit: graded.credit,
          studentAnswer: answer,
          correctAnswer: q.correctAnswer,
          whyWrong: `${graded.whyWrong} ${q.explanation}`.trim(),
          topic: q.topic,
        });
      }
    }
  }

  const ordered = questions.map((q) => results.get(q.id)).filter(Boolean) as QuestionResult[];
  const score = ordered.length
    ? Math.round(
        (ordered.reduce((sum, r) => sum + r.credit, 0) / ordered.length) * 100
      )
    : 0;

  // Topic areas come from the actual per-question results so they always line
  // up with what gets written into TopicMastery.
  const byTopic = new Map<string, { hit: number; total: number }>();
  for (const r of ordered) {
    const bucket = byTopic.get(r.topic) ?? { hit: 0, total: 0 };
    bucket.hit += r.credit;
    bucket.total += 1;
    byTopic.set(r.topic, bucket);
  }
  const topicScores = [...byTopic.entries()].map(([topic, b]) => ({
    topic,
    score: b.hit / b.total,
  }));

  const strongAreas = topicScores
    .filter((t) => t.score >= 0.8)
    .map((t) => t.topic);
  const weakAreas = topicScores.filter((t) => t.score < 0.6).map((t) => t.topic);

  return NextResponse.json({
    score,
    questionResults: ordered,
    strongAreas,
    weakAreas,
    feedback:
      aiGraded?.feedback ??
      (score >= 85
        ? "Strong result. Keep the weak topics warm with short flashcard sessions."
        : score >= 60
        ? "Solid middle. The weak areas below are where the next points are — practise those first."
        : "This one needs another pass. Work through the missed questions below one at a time before retaking."),
    source: openEnded.length === 0 ? "auto" : aiGraded ? "claude" : aiEnabled() ? "fallback-error" : "offline",
  });
}
