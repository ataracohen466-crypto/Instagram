"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { NotebookPen, PenLine } from "lucide-react";
import { Book, Chapter, EditorFont, Scene } from "@/lib/types";
import { useStore } from "@/lib/store";
import { countWords, formatWords, readingMinutes } from "@/lib/words";

const WIDTHS: Record<string, string> = {
  narrow: "max-w-[560px]",
  normal: "max-w-[720px]",
  wide: "max-w-[900px]",
};

const FONT_CLASS: Record<EditorFont, string> = {
  serif: "",
  sans: "font-ui-sans",
  mono: "font-ui-mono",
};

export interface EditorHandle {
  insertText: (text: string, mode: "replaceSelection" | "append") => void;
}

const Editor = forwardRef<EditorHandle, {
  book: Book;
  chapter: Chapter;
  scene: Scene;
  onSelectionChange: (selection: { start: number; end: number; text: string } | null) => void;
  focusMode: boolean;
}>(function Editor({ book, chapter, scene, onSelectionChange, focusMode }, ref) {
  const updateScene = useStore((s) => s.updateScene);
  const settings = useStore((s) => s.settings);
  const [content, setContent] = useState(scene.content);
  const [title, setTitle] = useState(scene.title);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(scene.notes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Switching scenes: flush pending writes for the old one, load the new one.
  useEffect(() => {
    setContent(scene.content);
    setTitle(scene.title);
    setNotes(scene.notes);
    onSelectionChange(null);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id]);

  const scheduleSave = (patch: Partial<Pick<Scene, "title" | "content" | "notes">>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateScene(book.id, chapter.id, scene.id, patch);
    }, 350);
  };

  const words = countWords(content);

  useImperativeHandle(ref, () => ({
    insertText: (text, mode) => {
      setContent((prev) => {
        let next: string;
        const el = textareaRef.current;
        if (mode === "replaceSelection" && el && el.selectionStart !== el.selectionEnd) {
          next = prev.slice(0, el.selectionStart) + text + prev.slice(el.selectionEnd);
        } else {
          const sep = prev.trim() ? (prev.endsWith("\n") ? "\n" : "\n\n") : "";
          next = prev + sep + text;
        }
        scheduleSave({ content: next });
        return next;
      });
      onSelectionChange(null);
    },
  }));

  return (
    <div className="flex h-full flex-col">
      <div className={`mx-auto w-full ${WIDTHS[settings.editorWidth]} flex flex-1 flex-col px-6`}>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave({ title: e.target.value });
          }}
          placeholder="Scene title"
          className="mt-8 mb-2 w-full bg-transparent font-serif text-2xl text-ink outline-none placeholder:text-ink-faint"
        />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            scheduleSave({ content: e.target.value });
          }}
          onSelect={(e) => {
            const el = e.currentTarget;
            if (el.selectionStart !== el.selectionEnd) {
              onSelectionChange({
                start: el.selectionStart,
                end: el.selectionEnd,
                text: el.value.slice(el.selectionStart, el.selectionEnd),
              });
            } else {
              onSelectionChange(null);
            }
          }}
          placeholder="Once upon a time…"
          spellCheck
          style={
            settings.typewriterMode
              ? { paddingTop: "35vh", paddingBottom: "45vh" }
              : { paddingBottom: "30vh" }
          }
          className={`manuscript ${FONT_CLASS[settings.font]} min-h-0 flex-1 resize-none bg-transparent text-[17px] leading-[1.85] text-ink outline-none placeholder:text-ink-faint`}
        />
      </div>

      <div className="flex items-center justify-between border-t border-border bg-paper px-6 py-2 text-xs text-ink-faint">
        <div className="flex items-center gap-3">
          <span>{formatWords(words)} words</span>
          <span className="hidden sm:inline">· {readingMinutes(words)} min read</span>
        </div>
        {!focusMode && (
          <button
            onClick={() => setNotesOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition ${
              notesOpen ? "bg-accent-soft text-ink" : "hover:text-ink"
            }`}
          >
            {notesOpen ? <PenLine size={13} /> : <NotebookPen size={13} />}
            Scene notes
          </button>
        )}
      </div>

      {notesOpen && !focusMode && (
        <div className={`mx-auto w-full ${WIDTHS[settings.editorWidth]} px-6 pb-4`}>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              scheduleSave({ notes: e.target.value });
            }}
            placeholder="Private notes for this scene — beats to hit, things to fix later…"
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-paper-raised p-3 text-sm text-ink-soft outline-none focus:border-accent"
          />
        </div>
      )}
    </div>
  );
});

export default Editor;
