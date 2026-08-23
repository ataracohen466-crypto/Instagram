"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2, User, MapPin, Package, StickyNote } from "lucide-react";
import { Book, CodexEntry, CodexType } from "@/lib/types";
import { useStore } from "@/lib/store";
import ConfirmDialog from "./ConfirmDialog";

const TYPE_META: Record<CodexType, { label: string; icon: React.ReactNode }> = {
  character: { label: "Characters", icon: <User size={13} /> },
  location: { label: "Locations", icon: <MapPin size={13} /> },
  item: { label: "Items", icon: <Package size={13} /> },
  note: { label: "Notes", icon: <StickyNote size={13} /> },
};

export default function CodexPanel({ book }: { book: Book }) {
  const addCodexEntry = useStore((s) => s.addCodexEntry);
  const updateCodexEntry = useStore((s) => s.updateCodexEntry);
  const deleteCodexEntry = useStore((s) => s.deleteCodexEntry);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<CodexType | null>(null);
  const [draftName, setDraftName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CodexEntry | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return book.codex;
    return book.codex.filter(
      (e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
    );
  }, [book.codex, query]);

  const grouped = (Object.keys(TYPE_META) as CodexType[]).map((type) => ({
    type,
    entries: filtered.filter((e) => e.type === type),
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-paper px-2.5 py-1.5">
          <Search size={13} className="text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search codex…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {book.codex.length === 0 && (
          <p className="mb-3 text-xs text-ink-faint">
            Track characters, places, and details here so the AI assistant knows your story.
          </p>
        )}
        {grouped.map(({ type, entries }) => (
          <div key={type} className="mb-4">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
                {TYPE_META[type].icon}
                {TYPE_META[type].label}
              </div>
              <button
                onClick={() => {
                  setAddingType(type);
                  setDraftName("");
                }}
                className="rounded p-0.5 text-ink-faint transition hover:text-accent"
                aria-label={`Add ${type}`}
              >
                <Plus size={14} />
              </button>
            </div>

            {addingType === type && (
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draftName.trim()) {
                    const id = addCodexEntry(book.id, type, draftName);
                    setAddingType(null);
                    setOpenId(id);
                  } else if (e.key === "Escape") {
                    setAddingType(null);
                  }
                }}
                onBlur={() => setAddingType(null)}
                placeholder="Name…"
                className="mb-1.5 w-full rounded-lg border border-accent bg-paper px-2.5 py-1.5 text-sm text-ink outline-none"
              />
            )}

            {entries.length === 0 && addingType !== type ? (
              <p className="text-xs text-ink-faint/70">None yet</p>
            ) : (
              <div className="space-y-1">
                {entries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border bg-paper-raised">
                    <button
                      onClick={() => setOpenId(openId === entry.id ? null : entry.id)}
                      className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-sm text-ink"
                    >
                      <span className="truncate">{entry.name}</span>
                      <Trash2
                        size={12}
                        role="button"
                        tabIndex={0}
                        aria-label={`Delete ${entry.name}`}
                        className="shrink-0 text-ink-faint transition hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(entry);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            e.preventDefault();
                            setPendingDelete(entry);
                          }
                        }}
                      />
                    </button>
                    {openId === entry.id && (
                      <div className="border-t border-border p-2.5">
                        <textarea
                          defaultValue={entry.description}
                          onBlur={(e) => updateCodexEntry(book.id, entry.id, { description: e.target.value })}
                          placeholder="Description, backstory, traits…"
                          rows={3}
                          className="w-full resize-none rounded-lg border border-border bg-paper p-2 text-xs text-ink-soft outline-none focus:border-accent"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete "${pendingDelete.name}"?`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteCodexEntry(book.id, pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
