/**
 * Every type in TutorAI is client-side only. There is no database and no
 * server-side account — the zustand store in `lib/store.ts` persists all of
 * this to `localStorage`.
 */

export type SummaryLength = "quick" | "normal" | "detailed" | "cram";

export type MasteryStatus = "mastered" | "learning" | "needs-review";

export type QuestionType =
  | "mcq"
  | "short"
  | "matching"
  | "fill-blank"
  | "true-false"
  | "essay";

export type Difficulty = "easy" | "medium" | "hard" | "mixed";

export type NoteSourceType = "typed" | "pasted" | "image" | "pdf";

export interface Subject {
  id: string;
  name: string;
  /** Tailwind-safe hex, used for chips, rings and the mastery grid. */
  color: string;
  /** lucide-react icon name, resolved through `lib/icons.ts`. */
  icon: string;
  createdAt: number;
  /** Optional exam date (ms epoch) powering countdowns and the study plan. */
  examDate?: string;
}

export interface VocabularyItem {
  term: string;
  definition: string;
}

export interface FormulaItem {
  name: string;
  expression: string;
  whenToUse: string;
}

export interface PersonEventItem {
  name: string;
  significance: string;
}

export interface CauseEffectItem {
  cause: string;
  effect: string;
}

export interface DatedItem {
  date: string;
  what: string;
}

export interface NoteSummary {
  keyConcepts: string[];
  importantDates: DatedItem[];
  vocabulary: VocabularyItem[];
  formulas: FormulaItem[];
  peopleEvents: PersonEventItem[];
  causeEffect: CauseEffectItem[];
  mustKnow: string[];
  /** Prose body — length varies with the requested summary length. */
  overview: string;
  topics: string[];
}

export type NoteSummaries = Partial<Record<SummaryLength, NoteSummary>>;

export interface Note {
  id: string;
  subjectId: string;
  title: string;
  rawText: string;
  sourceType: NoteSourceType;
  createdAt: number;
  summary?: NoteSummaries;
  /** Populated by the `[STUDY THIS]` pipeline. */
  studyGuideId?: string;
}

export interface SrsState {
  /** Days until the next review. */
  interval: number;
  easeFactor: number;
  /** ms epoch. */
  dueDate: number;
  lastReviewed: number | null;
  repetitions: number;
}

export interface Flashcard {
  id: string;
  noteId?: string;
  subjectId: string;
  front: string;
  back: string;
  topic: string;
  srs: SrsState;
  createdAt: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  /** MCQ / true-false options, or the right-hand column for matching. */
  choices?: string[];
  /** Left-hand column for matching questions. */
  matchPrompts?: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  difficulty: Difficulty;
}

export interface TestConfig {
  unit: string;
  difficulty: Difficulty;
  numQuestions: number;
  questionTypes: QuestionType[];
  timeLimitMinutes: number;
}

export interface Test {
  id: string;
  subjectId: string;
  title: string;
  config: TestConfig;
  questions: Question[];
  createdAt: number;
  /** Set when the test was generated from a specific note. */
  noteId?: string;
  /** "practice" tests come from targeted practice on weak topics. */
  kind: "test" | "practice";
}

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  studentAnswer: string;
  correctAnswer: string;
  /** Why the student's answer was wrong (or why theirs works). */
  whyWrong: string;
  topic: string;
  /** 0-1, used for partially-credited short answer / essay. */
  credit: number;
}

export interface TestAttempt {
  id: string;
  testId: string;
  subjectId: string;
  startedAt: number;
  /** questionId -> answer text. */
  answers: Record<string, string>;
  flagged: string[];
  submittedAt: number | null;
  score: number;
  strongAreas: string[];
  weakAreas: string[];
  questionResults: QuestionResult[];
  feedback?: string;
}

export interface MasteryHistoryPoint {
  at: number;
  score: number;
  source: "test" | "practice" | "flashcard" | "teach-back";
}

export interface TopicMastery {
  topic: string;
  subjectId: string;
  status: MasteryStatus;
  lastUpdated: number;
  history: MasteryHistoryPoint[];
}

export interface StudyTask {
  id: string;
  label: string;
  detail: string;
  minutes: number;
  topic: string;
  kind: "review" | "flashcards" | "practice" | "read" | "test";
  done: boolean;
}

export interface StudyPlanDay {
  /** ISO yyyy-mm-dd. */
  date: string;
  tasks: StudyTask[];
  estimatedMinutes: number;
  completed: boolean;
  focus: string;
}

export interface StudyPlan {
  id: string;
  subjectId: string;
  examDate: string;
  days: StudyPlanDay[];
  createdAt: number;
  /** Set when the plan was produced by the cram pipeline. */
  cram?: boolean;
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  earnedAt: number;
  icon: string;
}

export interface Profile {
  name: string;
  level: number;
  xp: number;
  streakDays: number;
  /** ISO yyyy-mm-dd of the last day with any study activity. */
  lastStudyDate: string | null;
  achievements: Achievement[];
  /** Minutes the student can study per day — feeds the study planner. */
  dailyMinutes: number;
  gradeLevel: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface StudyGuideSection {
  heading: string;
  points: string[];
}

export interface StudyGuide {
  id: string;
  subjectId: string;
  noteId?: string;
  title: string;
  createdAt: number;
  keyConcepts: StudyGuideSection[];
  vocabulary: VocabularyItem[];
  facts: string[];
  commonMistakes: string[];
  practiceQuestions: Question[];
  miniQuiz: Question[];
  checklist: string[];
}

export interface CramPlan {
  subjectId: string;
  createdAt: number;
  mostImportant: string[];
  weakest: string[];
  confusionPoints: CauseEffectItem[];
  essentialVocab: VocabularyItem[];
  essentialFormulas: FormulaItem[];
  practiceQuestions: Question[];
  finalTestId?: string;
  schedule: { block: string; minutes: number; detail: string }[];
}

export interface TeachBackResult {
  accuracy: number;
  masteryScore: number;
  correctPoints: string[];
  missingConcepts: string[];
  misconceptions: string[];
  feedback: string;
  topic: string;
}
