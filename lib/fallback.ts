/**
 * Canned responses used when no ANTHROPIC_API_KEY is set, so the AI panel
 * still does something useful instead of just failing.
 */

const CONTINUATIONS = [
  "The room held its breath, and for a moment neither of them moved.",
  "Something in the silence told her this wasn't over — not by a long way.",
  "He almost said it then. Almost.",
  "Outside, the wind picked up, rattling the window in its frame like it wanted in on the conversation.",
  "It wasn't the answer she'd expected, and that, more than anything, made her trust it.",
];

const REWRITE_NOTES = [
  "Tightened the pacing and cut a few redundant words — the rest is yours to judge.",
  "Leaned into stronger verbs here; see if it still sounds like you.",
  "Trimmed some hedging language so the line lands harder.",
];

const BRAINSTORM_IDEAS = [
  "What if the thing your protagonist wants most is the thing that will hurt them?",
  "Consider raising the stakes by giving a minor character a secret that complicates the plan.",
  "A scene where two characters want the same thing for opposite reasons could sharpen the conflict here.",
  "Try ending this chapter one beat earlier than feels natural — right before the reveal, not after.",
  "What does this character believe about themselves that the story is about to prove wrong?",
];

function pick(arr: string[], seed: number): string {
  return arr[Math.abs(seed) % arr.length];
}

function seedFrom(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return h;
}

export function fallbackContinue(context: string): string {
  return pick(CONTINUATIONS, seedFrom(context) + 1);
}

export function fallbackRewrite(selection: string): string {
  const note = pick(REWRITE_NOTES, seedFrom(selection));
  return `${selection.trim()}\n\n(offline note: ${note})`;
}

export function fallbackBrainstorm(prompt: string): string {
  const idea = pick(BRAINSTORM_IDEAS, seedFrom(prompt) + 2);
  return `${idea}\n\nAdd an ANTHROPIC_API_KEY to get ideas tailored to your actual manuscript instead of this offline suggestion.`;
}
