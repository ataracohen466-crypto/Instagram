import { NextResponse } from "next/server";
import { aiEnabled, generateStructured } from "@/lib/ai";
import { objectSchema, podcastSchema, slidesSchema } from "@/lib/schemas";
import { offlineDeck, offlinePodcast } from "@/lib/offline";
import { PodcastLine, Slide } from "@/lib/types";
import { clampText } from "@/lib/utils";

export const runtime = "nodejs";
// 60s is the ceiling on Vercel's Hobby plan; anything higher fails the
// deploy outright. On Pro this can go up to 300 for very long generations.
export const maxDuration = 60;

interface Body {
  kind?: "podcast" | "slides";
  text?: string;
  title?: string;
  subject?: string;
  level?: string;
}

const PODCAST_SYSTEM = (subject: string, level: string) =>
  `You write a two-host study podcast for a ${level} student revising ${subject}.

Ava is the explainer — warm, clear, never condescending. Ben is the student's voice: he asks the question the listener is already thinking, and pushes back when something is glossed over.

Rules:
- Ground every claim in the notes you're given. Never introduce facts that aren't supported by them.
- Written to be *heard*: no markdown, no lists, no "as we can see". Contractions are good. Vary sentence length.
- Ben's questions must be real questions, not set-ups ("So it's basically X, right?" is fine; "Tell us more!" is not).
- Cover the material in a sensible teaching order, not the order it happens to appear in the notes.
- Somewhere in the middle, have Ben name the thing students most often get wrong here.
- End with Ava giving the single most important takeaway, then a one-line sign-off.`;

const SLIDES_SYSTEM = (subject: string, level: string) =>
  `You build a revision slide deck for a ${level} student studying ${subject}.

Rules:
- Ground everything in the notes you're given. No invented facts.
- One idea per slide. Headings are six words or fewer. Bullets are phrases, not sentences, and never more than five per slide.
- The narration field is what a presenter says over the slide — it must *add* to the bullets (an example, a why-it-matters, a warning), never read them aloud verbatim.
- Open with a title slide, close with a recap slide.
- Where the notes contain a formula, a date range or a process, give it its own slide.`;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const kind = body.kind === "slides" ? "slides" : "podcast";
  const text = (body.text ?? "").trim();
  const title = body.title ?? "Your notes";
  const subject = body.subject ?? "this subject";
  const level = body.level ?? "high school";

  if (!text) {
    return NextResponse.json({ error: "No notes to work from." }, { status: 400 });
  }

  const material = clampText(text, 30000);

  if (kind === "podcast") {
    const result = await generateStructured<{ lines: PodcastLine[] }>({
      system: PODCAST_SYSTEM(subject, level),
      messages: [
        {
          role: "user",
          content: `Write the episode for notes titled "${title}".\n\n${material}`,
        },
      ],
      tool: {
        name: "record_episode",
        description: "Record the podcast script.",
        input_schema: objectSchema({ lines: podcastSchema }, ["lines"]),
      },
      maxTokens: 8000,
    });

    const lines = (result?.lines ?? []).filter(
      (l) => l && typeof l.text === "string" && l.text.trim().length > 0
    );

    if (lines.length >= 6) {
      return NextResponse.json({ lines, source: "claude" });
    }
    return NextResponse.json({
      lines: offlinePodcast(text, title),
      source: aiEnabled() ? "fallback-error" : "offline",
    });
  }

  const result = await generateStructured<{ slides: Slide[] }>({
    system: SLIDES_SYSTEM(subject, level),
    messages: [
      {
        role: "user",
        content: `Build the deck for notes titled "${title}".\n\n${material}`,
      },
    ],
    tool: {
      name: "record_deck",
      description: "Record the slide deck.",
      input_schema: objectSchema({ slides: slidesSchema }, ["slides"]),
    },
    maxTokens: 8000,
  });

  const slides = (result?.slides ?? [])
    .filter((s) => s && typeof s.heading === "string" && s.heading.trim().length > 0)
    .map((s) => ({
      kind: s.kind === "title" ? ("title" as const) : ("points" as const),
      heading: s.heading,
      subhead: s.subhead,
      bullets: Array.isArray(s.bullets) ? s.bullets.filter(Boolean) : [],
      narration: s.narration || s.heading,
    }));

  if (slides.length >= 3) {
    return NextResponse.json({ slides, source: "claude" });
  }
  return NextResponse.json({
    slides: offlineDeck(text, title),
    source: aiEnabled() ? "fallback-error" : "offline",
  });
}
