"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Printer,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import * as api from "@/lib/api";
import { speak, speechOutputSupported, stopSpeaking } from "@/lib/speech";
import { PodcastLine, Slide } from "@/lib/types";
import { cx } from "@/lib/utils";

export type StudioKind = "podcast" | "slides" | "video";

const TITLE: Record<StudioKind, string> = {
  podcast: "Podcast",
  slides: "Slideshow",
  video: "Video",
};

/**
 * Turns one set of notes into something you can listen to or watch. Playback is
 * the browser's own speech synthesis, so nothing has to be rendered server-side
 * or downloaded — the trade-off is that there's no audio/video file to export.
 */
export default function Studio({
  noteId,
  kind,
  onClose,
}: {
  noteId: string;
  kind: StudioKind;
  onClose: () => void;
}) {
  const note = useStore((s) => s.notes.find((n) => n.id === noteId));
  const subject = useStore((s) => s.subjects.find((x) => x.id === note?.subjectId));
  const level = useStore((s) => s.profile.gradeLevel);

  const [lines, setLines] = useState<PodcastLine[] | null>(null);
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  const live = useRef(true);
  const playRef = useRef(false);
  playRef.current = playing;

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!note) return;
    let cancelled = false;
    (async () => {
      const result = await api.makeMedia({
        kind: kind === "podcast" ? "podcast" : "slides",
        text: note.rawText,
        title: note.title,
        subject: subject?.name,
        level,
      });
      if (cancelled || !live.current) return;
      if (!result) {
        setError("Couldn't build that just now. Close and try again.");
        return;
      }
      if (kind === "podcast") setLines(result.lines ?? []);
      else setSlides(result.slides ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [note, kind, subject, level]);

  /* ---- podcast playback: two voices so it reads as a conversation ---- */
  const playFrom = useCallback(
    (start: number) => {
      if (!lines) return;
      setPlaying(true);
      playRef.current = true;
      const step = (i: number) => {
        if (!live.current || !playRef.current) return;
        if (i >= lines.length) {
          setPlaying(false);
          setIndex(0);
          useStore.getState().awardXp(8);
          useStore.getState().touchStreak();
          return;
        }
        setIndex(i);
        const l = lines[i];
        speak(l.text, () => step(i + 1), {
          pitch: l.speaker === "Ava" ? 1.08 : 0.9,
          rate: 1.04,
        });
      };
      step(start);
    },
    [lines]
  );

  /* ---- video: slides advance when their narration finishes ---- */
  const narrateFrom = useCallback(
    (start: number) => {
      if (!slides) return;
      setPlaying(true);
      playRef.current = true;
      const step = (i: number) => {
        if (!live.current || !playRef.current) return;
        if (i >= slides.length) {
          setPlaying(false);
          useStore.getState().awardXp(8);
          useStore.getState().touchStreak();
          return;
        }
        setIndex(i);
        speak(slides[i].narration || slides[i].heading, () => step(i + 1), {
          rate: 1.0,
        });
      };
      step(start);
    },
    [slides]
  );

  const stop = () => {
    playRef.current = false;
    setPlaying(false);
    stopSpeaking();
  };

  useEffect(() => {
    if (kind !== "video" || !slides || slides.length === 0) return;
    narrateFrom(0);
    // Auto-plays once the deck lands, which is what "video" implies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, kind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stop();
        onClose();
      }
      if (kind === "podcast" || !slides) return;
      if (e.key === "ArrowRight") {
        stop();
        setIndex((i) => Math.min(slides.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft") {
        stop();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kind, slides, onClose]);

  if (!note) return null;
  const loading = kind === "podcast" ? lines === null : slides === null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-sunk">
      <div className="flex items-center gap-3 border-b border-surface-line bg-white px-4 py-3 print:hidden">
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
          {TITLE[kind]} — {note.title}
        </span>
        {kind === "slides" && slides && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => window.print()}
          >
            <Printer size={13} /> PDF
          </button>
        )}
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => {
            stop();
            onClose();
          }}
        >
          <X size={13} /> Close
        </button>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-5">
        {loading && (
          <div className="card flex flex-col items-center gap-3 py-14 text-center">
            <Loader2 size={22} className="animate-spin text-brand-600" />
            <p className="text-sm font-semibold text-ink">
              Writing your {TITLE[kind].toLowerCase()}…
            </p>
            <p className="max-w-xs text-sm text-ink-muted">
              Reading {note.title} and turning it into{" "}
              {kind === "podcast" ? "a two-host episode" : "a deck"}.
            </p>
          </div>
        )}

        {error && (
          <div className="card border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}

        {kind === "podcast" && lines && (
          <div className="space-y-1.5">
            {lines.map((l, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  stopSpeaking();
                  playFrom(i);
                }}
                className={cx(
                  "flex w-full gap-3 rounded-xl border p-3 text-left transition",
                  i === index && playing
                    ? "border-brand-300 bg-brand-50"
                    : "border-transparent hover:bg-white"
                )}
              >
                <span
                  className={cx(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white",
                    l.speaker === "Ava" ? "bg-brand-600" : "bg-amber-600"
                  )}
                >
                  {l.speaker === "Ava" ? "AV" : "BE"}
                </span>
                <span>
                  <span className="block text-[11px] font-semibold text-ink-faint">
                    {l.speaker}
                  </span>
                  <span className="block text-sm text-ink-soft">{l.text}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {kind !== "podcast" && slides && slides.length > 0 && (
          <>
            <SlideView slide={slides[index]} n={index + 1} of={slides.length} />
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 print:hidden">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => {
                    stop();
                    setIndex(i);
                  }}
                  className={cx(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-5 bg-brand-600" : "w-1.5 bg-surface-line"
                  )}
                />
              ))}
            </div>
            <div className="hidden print:block">
              {slides.map((s, i) => (
                <div key={i} className="break-after-page pt-8">
                  <SlideView slide={s} n={i + 1} of={slides.length} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!loading && !error && (
        <div className="mx-auto w-full max-w-3xl border-t border-surface-line bg-white px-4 py-3 print:hidden">
          <div className="flex items-center justify-center gap-2">
            {kind !== "podcast" && (
              <button
                type="button"
                className="btn-secondary px-3"
                disabled={index === 0}
                onClick={() => {
                  stop();
                  setIndex((i) => Math.max(0, i - 1));
                }}
                aria-label="Previous slide"
              >
                <ChevronLeft size={16} />
              </button>
            )}

            {(kind === "podcast" || kind === "video") && (
              <button
                type="button"
                className="btn-primary min-w-[136px]"
                disabled={!speechOutputSupported()}
                onClick={() => {
                  if (playing) stop();
                  else if (kind === "podcast") playFrom(index);
                  else narrateFrom(index);
                }}
              >
                {playing ? (
                  <>
                    <Pause size={15} /> Pause
                  </>
                ) : (
                  <>
                    <Play size={15} /> Play
                  </>
                )}
              </button>
            )}

            {kind !== "podcast" && (
              <button
                type="button"
                className="btn-secondary px-3"
                disabled={!slides || index >= slides.length - 1}
                onClick={() => {
                  stop();
                  setIndex((i) => Math.min((slides?.length ?? 1) - 1, i + 1));
                }}
                aria-label="Next slide"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-ink-faint">
            {!speechOutputSupported()
              ? "This browser can't read aloud — the script is above."
              : kind === "podcast"
              ? "Two synthetic voices, played in your browser. Tap any line to jump there."
              : kind === "video"
              ? "Slides advance as the narration finishes."
              : "Arrow keys work too. PDF prints one slide per page."}
          </p>
        </div>
      )}
    </div>
  );
}

function SlideView({ slide, n, of }: { slide: Slide; n: number; of: number }) {
  const title = slide.kind === "title";
  return (
    <div
      className={cx(
        "relative flex min-h-[320px] flex-col rounded-2xl border p-7 shadow-card",
        title ? "justify-center border-brand-600 bg-brand-600 text-center" : "border-surface-line bg-white"
      )}
    >
      <span
        className={cx(
          "absolute right-4 top-3 text-[11px]",
          title ? "text-white/60" : "text-ink-faint"
        )}
      >
        {n} / {of}
      </span>
      {!title && (
        <span className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.09em] text-brand-600">
          Key idea
        </span>
      )}
      <h2
        className={cx(
          "font-bold tracking-tight",
          title ? "text-[30px] text-white" : "text-[25px] text-ink"
        )}
      >
        {slide.heading}
      </h2>
      {title && slide.subhead && (
        <p className="mt-2 text-white/80">{slide.subhead}</p>
      )}
      {!title && slide.bullets.length > 0 && (
        <ul className="mt-5 space-y-3">
          {slide.bullets.map((b, i) => (
            <li key={i} className="flex gap-3 text-[15.5px] leading-relaxed text-ink-soft">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
