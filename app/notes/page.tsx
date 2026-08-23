"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  ImageIcon,
  Loader2,
  NotebookPen,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import SubjectPicker from "@/components/SubjectPicker";
import StudioButtons from "@/components/StudioButtons";
import { Card, EmptyState, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { useStore } from "@/lib/store";
import { runStudyThis } from "@/lib/pipeline";
import * as api from "@/lib/api";
import { ExtractedImage, pdfToText, shrinkImage } from "@/lib/extract";
import { NoteSourceType } from "@/lib/types";
import { titleFrom } from "@/lib/utils";

export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <NotesInner />
    </Suspense>
  );
}

function NotesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const notes = useStore((s) => s.notes);
  const subjects = useStore((s) => s.subjects);
  const activeSubjectId = useStore((s) => s.activeSubjectId);
  const removeNote = useStore((s) => s.removeNote);

  const [adding, setAdding] = useState(params.get("add") === "1");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [step, setStep] = useState("");

  const studyThis = async (noteId: string) => {
    setBusyId(noteId);
    try {
      await runStudyThis(noteId, setStep);
      router.push(`/notes/${noteId}`);
    } finally {
      setBusyId(null);
      setStep("");
    }
  };

  if (!hydrated) return null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Notes"
        subtitle="Everything you upload becomes summaries, cards, quizzes and tests."
        right={
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={() => setAdding((v) => !v)}
          >
            <Upload size={14} /> Add
          </button>
        }
      />

      {adding && (
        <AddNote
          defaultSubjectId={activeSubjectId || subjects[0]?.id || ""}
          onDone={(id) => {
            setAdding(false);
            if (id) void studyThis(id);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {notes.length === 0 && !adding ? (
        <EmptyState
          icon={NotebookPen}
          title="No notes yet"
          body="Paste your class notes, type them out, photograph a page or drop in a PDF. TutorAI handles the rest."
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setAdding(true)}
            >
              <Upload size={15} /> Add your first notes
            </button>
          }
        />
      ) : (
        subjects.map((subject) => {
          const mine = notes.filter((n) => n.subjectId === subject.id);
          if (mine.length === 0) return null;
          return (
            <div key={subject.id}>
              <SectionTitle>{subject.name}</SectionTitle>
              <div className="space-y-3">
                {mine.map((note) => (
                  <Card key={note.id}>
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/notes/${note.id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {note.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
                          {note.rawText.slice(0, 180) || "Photographed notes"}
                        </p>
                      </Link>
                      <button
                        type="button"
                        aria-label="Delete note"
                        className="btn-ghost btn-sm shrink-0 text-ink-faint hover:text-status-bad"
                        onClick={() => removeNote(note.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Pill>{sourceLabel(note.sourceType)}</Pill>
                      {note.summary?.normal && <Pill tone="good">Summarised</Pill>}
                      {note.studyGuideId && <Pill tone="brand">Study guide</Pill>}
                    </div>

                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => studyThis(note.id)}
                      className="btn-primary mt-3 w-full"
                    >
                      {busyId === note.id ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          {step || "Working…"}
                        </>
                      ) : (
                        <>
                          <Wand2 size={15} /> STUDY THIS
                        </>
                      )}
                    </button>

                    <p className="mb-2 mt-4 section-title">
                      Turn these notes into
                    </p>
                    <StudioButtons noteId={note.id} />
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function sourceLabel(source: NoteSourceType): string {
  return { typed: "Typed", pasted: "Pasted", image: "Photo", pdf: "PDF" }[source];
}

function AddNote({
  defaultSubjectId,
  onDone,
  onCancel,
}: {
  defaultSubjectId: string;
  onDone: (noteId: string | null) => void;
  onCancel: () => void;
}) {
  const addNote = useStore((s) => s.addNote);
  const setActiveSubject = useStore((s) => s.setActiveSubject);

  const [subjectId, setSubjectId] = useState(defaultSubjectId);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState<ExtractedImage | null>(null);
  const [imageName, setImageName] = useState("");
  const [source, setSource] = useState<NoteSourceType>("pasted");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      if (file.type === "application/pdf") {
        setBusy("Reading PDF…");
        const extracted = await pdfToText(file);
        if (!extracted.trim()) {
          setError(
            "That PDF has no readable text layer — it's probably a scan. Photograph the page instead and TutorAI will read the image."
          );
        } else {
          setText((prev) => (prev ? `${prev}\n\n${extracted}` : extracted));
          setSource("pdf");
          if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
        }
      } else if (file.type.startsWith("image/")) {
        setBusy("Preparing image…");
        setImage(await shrinkImage(file));
        setImageName(file.name);
        setSource("image");
        if (!title) setTitle(file.name.replace(/\.[a-z0-9]+$/i, ""));
      } else {
        setError("Upload an image or a PDF, or paste the text directly.");
      }
    } catch {
      setError("Couldn't read that file. Try pasting the text instead.");
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    if (!text.trim() && !image) {
      setError("Add some text or a photo first.");
      return;
    }
    if (!subjectId) {
      setError("Pick a subject.");
      return;
    }

    setBusy("Reading your notes…");
    setError("");

    // A photo has no text yet — summarise it first so the note carries real
    // text that every downstream generator (cards, quizzes, tests) can use.
    let body = text.trim();
    if (image) {
      const result = await api.summarizeNotes({
        text: body,
        length: "normal",
        title: title || undefined,
        image,
      });
      if (result?.summary) {
        const s = result.summary;
        body = [
          s.overview,
          s.keyConcepts.join("\n"),
          s.vocabulary.map((v) => `${v.term}: ${v.definition}`).join("\n"),
          s.mustKnow.join("\n"),
          body,
        ]
          .filter(Boolean)
          .join("\n\n");
      }
    }

    const note = addNote({
      subjectId,
      title: title.trim() || titleFrom(body) || "Untitled note",
      rawText: body,
      sourceType: source,
    });
    setActiveSubject(subjectId);
    setBusy("");
    onDone(note.id);
  };

  return (
    <Card className="mb-4 border-brand-200">
      <p className="mb-3 text-sm font-semibold text-ink">Add notes</p>

      <label className="label">Subject</label>
      <SubjectPicker value={subjectId} onChange={setSubjectId} />

      <label className="label mt-4">Title</label>
      <input
        className="field"
        placeholder="e.g. Unit 3 — Cell respiration"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label className="label mt-4">Notes</label>
      <textarea
        className="field min-h-[140px] resize-y"
        placeholder="Paste or type your notes here…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (source !== "pdf" && source !== "image") setSource("pasted");
        }}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => void pickFile(e.target.files?.[0])}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon size={14} /> Photo or PDF
        </button>
        {image && (
          <Pill tone="brand">
            <ImageIcon size={11} /> {imageName || "image attached"}
          </Pill>
        )}
      </div>

      {image && (
        <p className="mt-2 text-xs text-ink-muted">
          TutorAI will read the photo and pull the text out before generating
          anything, so you can check it got your handwriting right.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={Boolean(busy)}
          onClick={save}
        >
          {busy ? (
            <>
              <Loader2 size={15} className="animate-spin" /> {busy}
            </>
          ) : (
            <>
              <Sparkles size={15} /> Save &amp; Study This
            </>
          )}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Card>
  );
}
