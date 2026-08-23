"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Book } from "@/lib/types";
import { useStore } from "@/lib/store";
import { sceneWords } from "@/lib/words";

export default function ChapterTree({
  book,
  selectedChapterId,
  selectedSceneId,
  onSelect,
}: {
  book: Book;
  selectedChapterId: string | null;
  selectedSceneId: string | null;
  onSelect: (chapterId: string, sceneId: string | null) => void;
}) {
  const addChapter = useStore((s) => s.addChapter);
  const updateChapter = useStore((s) => s.updateChapter);
  const deleteChapter = useStore((s) => s.deleteChapter);
  const reorderChapter = useStore((s) => s.reorderChapter);
  const addScene = useStore((s) => s.addScene);
  const updateScene = useStore((s) => s.updateScene);
  const deleteScene = useStore((s) => s.deleteScene);
  const reorderScene = useStore((s) => s.reorderScene);

  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {book.chapters.map((chapter, ci) => (
          <div key={chapter.id} className="mb-1">
            <div className="group flex items-center rounded-lg px-1.5 py-1.5 hover:bg-accent-soft/60">
              <button
                onClick={() => updateChapter(book.id, chapter.id, { collapsed: !chapter.collapsed })}
                className="mr-1 text-ink-faint"
              >
                {chapter.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
              {renaming === chapter.id ? (
                <input
                  autoFocus
                  defaultValue={chapter.title}
                  onBlur={(e) => {
                    updateChapter(book.id, chapter.id, { title: e.target.value.trim() || chapter.title });
                    setRenaming(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className="flex-1 rounded border border-accent bg-paper px-1 text-sm text-ink outline-none"
                />
              ) : (
                <button
                  onDoubleClick={() => setRenaming(chapter.id)}
                  className="flex-1 truncate text-left text-sm font-medium text-ink"
                >
                  {chapter.title}
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setMenuFor(menuFor === chapter.id ? null : chapter.id)}
                  className="rounded p-1 text-ink-faint opacity-0 transition hover:bg-paper-raised group-hover:opacity-100"
                >
                  <MoreHorizontal size={14} />
                </button>
                {menuFor === chapter.id && (
                  <ChapterMenu
                    onClose={() => setMenuFor(null)}
                    onRename={() => setRenaming(chapter.id)}
                    onMoveUp={ci > 0 ? () => reorderChapter(book.id, chapter.id, -1) : undefined}
                    onMoveDown={
                      ci < book.chapters.length - 1 ? () => reorderChapter(book.id, chapter.id, 1) : undefined
                    }
                    onDelete={() => {
                      if (confirm(`Delete "${chapter.title}" and all its scenes?`)) {
                        deleteChapter(book.id, chapter.id);
                      }
                    }}
                  />
                )}
              </div>
            </div>

            {!chapter.collapsed && (
              <div className="ml-4 border-l border-border pl-2">
                {chapter.scenes.map((scene, si) => (
                  <div key={scene.id} className="group/scene relative flex items-center">
                    {renaming === scene.id ? (
                      <input
                        autoFocus
                        defaultValue={scene.title}
                        onBlur={(e) => {
                          updateScene(book.id, chapter.id, scene.id, {
                            title: e.target.value.trim() || scene.title,
                          });
                          setRenaming(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                        className="my-0.5 flex-1 rounded border border-accent bg-paper px-2 py-1 text-sm text-ink outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => onSelect(chapter.id, scene.id)}
                        onDoubleClick={() => setRenaming(scene.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition ${
                          selectedSceneId === scene.id
                            ? "bg-accent-soft text-ink"
                            : "text-ink-soft hover:bg-accent-soft/50"
                        }`}
                      >
                        <span className="truncate">{scene.title}</span>
                        <span className="ml-2 shrink-0 text-[11px] text-ink-faint">{sceneWords(scene)}</span>
                      </button>
                    )}
                    <button
                      onClick={() => setMenuFor(menuFor === scene.id ? null : scene.id)}
                      className="absolute right-7 rounded p-1 text-ink-faint opacity-0 transition hover:bg-paper-raised group-hover/scene:opacity-100"
                    >
                      <MoreHorizontal size={13} />
                    </button>
                    {menuFor === scene.id && (
                      <ChapterMenu
                        onClose={() => setMenuFor(null)}
                        onRename={() => setRenaming(scene.id)}
                        onMoveUp={si > 0 ? () => reorderScene(book.id, chapter.id, scene.id, -1) : undefined}
                        onMoveDown={
                          si < chapter.scenes.length - 1
                            ? () => reorderScene(book.id, chapter.id, scene.id, 1)
                            : undefined
                        }
                        onDelete={() => {
                          if (confirm(`Delete "${scene.title}"?`)) {
                            deleteScene(book.id, chapter.id, scene.id);
                            if (selectedSceneId === scene.id) onSelect(chapter.id, null);
                          }
                        }}
                      />
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    const id = addScene(book.id, chapter.id);
                    onSelect(chapter.id, id);
                  }}
                  className="mt-0.5 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-ink-faint transition hover:text-accent"
                >
                  <Plus size={12} /> Scene
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-2">
        <button
          onClick={() => addChapter(book.id)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm text-ink-soft transition hover:bg-accent-soft hover:text-ink"
        >
          <Plus size={14} /> New chapter
        </button>
      </div>
    </div>
  );
}

function ChapterMenu({
  onClose,
  onRename,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  onClose: () => void;
  onRename: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-border bg-paper-raised p-1 shadow-soft">
        <MenuItem
          label="Rename"
          onClick={() => {
            onRename();
            onClose();
          }}
        />
        {onMoveUp && (
          <MenuItem
            icon={<ArrowUp size={13} />}
            label="Move up"
            onClick={() => {
              onMoveUp();
              onClose();
            }}
          />
        )}
        {onMoveDown && (
          <MenuItem
            icon={<ArrowDown size={13} />}
            label="Move down"
            onClick={() => {
              onMoveDown();
              onClose();
            }}
          />
        )}
        <MenuItem
          icon={<Trash2 size={13} />}
          label="Delete"
          danger
          onClick={() => {
            onDelete();
            onClose();
          }}
        />
      </div>
    </>
  );
}

function MenuItem({
  label,
  onClick,
  icon,
  danger,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition hover:bg-accent-soft ${
        danger ? "text-red-500" : "text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
