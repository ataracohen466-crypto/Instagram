"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookText,
  Download,
  List,
  Maximize2,
  Minimize2,
  Settings,
  Sparkles,
} from "lucide-react";
import { Book } from "@/lib/types";
import { useStore } from "@/lib/store";
import { bookWords, formatWords } from "@/lib/words";
import { exportBookAsMarkdown, exportBookAsText } from "@/lib/exportBook";
import ChapterTree from "./ChapterTree";
import Editor, { EditorHandle } from "./Editor";
import CodexPanel from "./CodexPanel";
import AssistantPanel from "./AssistantPanel";
import SettingsModal from "./SettingsModal";
import Modal from "./Modal";

type RightPanel = "codex" | "assistant" | null;

export default function BookWorkspace({ book }: { book: Book }) {
  const updateBook = useStore((s) => s.updateBook);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    book.chapters[0]?.id ?? null
  );
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(
    book.chapters[0]?.scenes[0]?.id ?? null
  );
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showMobileChapters, setShowMobileChapters] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const editorRef = useRef<EditorHandle>(null);
  const [titleDraft, setTitleDraft] = useState(book.title);

  useEffect(() => setTitleDraft(book.title), [book.title]);

  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode]);

  const chapter = book.chapters.find((c) => c.id === selectedChapterId) ?? null;
  const scene = chapter?.scenes.find((s) => s.id === selectedSceneId) ?? null;

  const selectScene = (chapterId: string, sceneId: string | null) => {
    setSelectedChapterId(chapterId);
    setSelectedSceneId(sceneId);
  };

  return (
    <div className="flex h-screen flex-col bg-paper">
      {!focusMode && (
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              className="rounded-full p-1.5 text-ink-faint transition hover:bg-accent-soft hover:text-ink"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={18} />
            </Link>
            <button
              onClick={() => setShowMobileChapters(true)}
              className="rounded-full p-1.5 text-ink-faint transition hover:bg-accent-soft hover:text-ink md:hidden"
              aria-label="Chapters"
            >
              <List size={18} />
            </button>
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => updateBook(book.id, { title: titleDraft.trim() || book.title })}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="w-full max-w-xs truncate bg-transparent font-serif text-lg text-ink outline-none"
            />
            <span className="hidden shrink-0 text-xs text-ink-faint sm:inline">
              {formatWords(bookWords(book))} words
            </span>
          </div>

          <div className="flex items-center gap-1">
            <PanelToggle
              active={rightPanel === "codex"}
              onClick={() => setRightPanel(rightPanel === "codex" ? null : "codex")}
              icon={<BookText size={16} />}
              label="Codex"
            />
            <PanelToggle
              active={rightPanel === "assistant"}
              onClick={() => setRightPanel(rightPanel === "assistant" ? null : "assistant")}
              icon={<Sparkles size={16} />}
              label="Assistant"
            />
            <div className="relative">
              <button
                onClick={() => setShowExport((v) => !v)}
                className="rounded-full p-2 text-ink-soft transition hover:bg-accent-soft hover:text-ink"
                aria-label="Export"
              >
                <Download size={16} />
              </button>
              {showExport && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-border bg-paper-raised p-1 shadow-soft">
                    <button
                      onClick={() => {
                        exportBookAsText(book);
                        setShowExport(false);
                      }}
                      className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-ink hover:bg-accent-soft"
                    >
                      Export as .txt
                    </button>
                    <button
                      onClick={() => {
                        exportBookAsMarkdown(book);
                        setShowExport(false);
                      }}
                      className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-ink hover:bg-accent-soft"
                    >
                      Export as .md
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setFocusMode(true)}
              className="rounded-full p-2 text-ink-soft transition hover:bg-accent-soft hover:text-ink"
              aria-label="Focus mode"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-full p-2 text-ink-soft transition hover:bg-accent-soft hover:text-ink"
              aria-label="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </header>
      )}

      <div className="flex min-h-0 flex-1">
        {!focusMode && (
          <aside className="hidden w-64 shrink-0 border-r border-border md:block">
            <ChapterTree
              book={book}
              selectedChapterId={selectedChapterId}
              selectedSceneId={selectedSceneId}
              onSelect={selectScene}
            />
          </aside>
        )}

        <main className="relative min-h-0 flex-1">
          {focusMode && (
            <button
              onClick={() => setFocusMode(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-paper-raised p-2 text-ink-faint shadow-card transition hover:text-ink"
              aria-label="Exit focus mode"
            >
              <Minimize2 size={16} />
            </button>
          )}
          {chapter && scene ? (
            <Editor
              ref={editorRef}
              book={book}
              chapter={chapter}
              scene={scene}
              onSelectionChange={setSelection}
              focusMode={focusMode}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-ink-faint">
              <p className="font-serif text-lg text-ink">No scene selected</p>
              <p className="mt-1 text-sm">Pick a scene from the sidebar, or create a new one.</p>
            </div>
          )}
        </main>

        {!focusMode && rightPanel && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/40 lg:hidden"
              onClick={() => setRightPanel(null)}
            />
            <aside className="fixed inset-x-0 bottom-0 z-40 h-[75vh] rounded-t-2xl border-t border-border bg-paper shadow-soft animate-fade-in lg:static lg:z-auto lg:h-auto lg:w-80 lg:shrink-0 lg:animate-none lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none">
              {rightPanel === "codex" && <CodexPanel book={book} />}
              {rightPanel === "assistant" &&
                (scene ? (
                  <AssistantPanel
                    book={book}
                    scene={scene}
                    chapterTitle={chapter?.title ?? ""}
                    selection={selection}
                    onInsert={(text, mode) => editorRef.current?.insertText(text, mode)}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-faint">
                    Pick a scene to write in before asking for help with it.
                  </div>
                ))}
            </aside>
          </>
        )}
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {showMobileChapters && (
        <Modal title={book.title} onClose={() => setShowMobileChapters(false)}>
          <div className="-m-5 h-[70vh]">
            <ChapterTree
              book={book}
              selectedChapterId={selectedChapterId}
              selectedSceneId={selectedSceneId}
              onSelect={(chapterId, sceneId) => {
                selectScene(chapterId, sceneId);
                if (sceneId) setShowMobileChapters(false);
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

function PanelToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition sm:px-3 ${
        active ? "bg-accent-soft text-ink" : "text-ink-soft hover:bg-accent-soft hover:text-ink"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
