"use client";

import { useMemo, useState } from "react";
import {
  Plus, Search, CalendarDays, List, Mic, MicOff, Image as ImageIcon, Trash2, X,
} from "lucide-react";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, format,
} from "date-fns";
import { useStore } from "@/lib/store";
import { Card, PageHeader, EmptyState } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PhotoThumb } from "@/components/JournalPhotoThumb";
import { dayKey, formatFriendly, formatShort } from "@/lib/dates";
import { moodFace } from "@/lib/mood";
import { putImage, fileToCompressedDataUrl, deleteImage } from "@/lib/db";
import { newId } from "@/lib/id";
import { useVoiceToText } from "@/lib/speech";
import type { JournalEntry } from "@/lib/types";

export default function JournalPage() {
  const entries = useStore((s) => s.journalEntries);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);

  const filtered = useMemo(() => {
    let list = entries;
    if (selectedDate) list = list.filter((e) => e.date === selectedDate);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) => e.text.toLowerCase().includes(q) || e.title?.toLowerCase().includes(q) || e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [entries, query, selectedDate]);

  return (
    <div className="pb-10">
      <PageHeader
        title="Journal"
        subtitle="Private, on this device only."
        action={
          <button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-ink"
          >
            <Plus size={15} /> New entry
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search — school, friends, stress, happy…"
            className="w-full rounded-full border border-border bg-surface-raised py-2.5 pl-9 pr-4 text-sm text-ink outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={() => setView(view === "list" ? "calendar" : "list")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-ink-soft"
        >
          {view === "list" ? <CalendarDays size={16} /> : <List size={16} />}
        </button>
      </div>

      {selectedDate && (
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">{formatFriendly(selectedDate)}</span>
          <button onClick={() => setSelectedDate(null)} className="text-xs text-ink-faint underline">Clear</button>
        </div>
      )}

      {view === "calendar" && <CalendarGrid entries={entries} onSelectDate={setSelectedDate} selected={selectedDate} />}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ImageIcon size={20} />}
          title={entries.length === 0 ? "Your journal is empty" : "No entries match"}
          body={entries.length === 0 ? "Write your first entry — thoughts, photos, or just a few words." : "Try a different search or clear the date filter."}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                setEditing(e);
                setEditorOpen(true);
              }}
              className="block w-full rounded-2xl border border-border bg-surface p-4 text-left shadow-card"
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{e.title || formatFriendly(e.date)}</p>
                <div className="flex items-center gap-2">
                  {typeof e.mood === "number" && <span>{moodFace(e.mood).emoji}</span>}
                  <span className="text-xs text-ink-faint">{formatShort(e.date)}</span>
                </div>
              </div>
              <p className="line-clamp-2 text-sm text-ink-soft">{e.text}</p>
              {(e.tags.length > 0 || e.photoIds.length > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {e.tags.map((t) => (
                    <span key={t} className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary">#{t}</span>
                  ))}
                  {e.photoIds.length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-ink-faint">
                      <ImageIcon size={11} /> {e.photoIds.length}
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <EntryEditor
        open={editorOpen}
        entry={editing}
        onClose={() => setEditorOpen(false)}
      />
    </div>
  );
}

function CalendarGrid({
  entries,
  onSelectDate,
  selected,
}: {
  entries: JournalEntry[];
  onSelectDate: (d: string) => void;
  selected: string | null;
}) {
  const [cursor, setCursor] = useState(new Date());
  const datesWithEntries = useMemo(() => new Set(entries.map((e) => e.date)), [entries]);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });

  return (
    <Card className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="px-2 text-ink-soft">‹</button>
        <p className="text-sm font-medium text-ink">{format(cursor, "MMMM yyyy")}</p>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="px-2 text-ink-soft">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-ink-faint">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = dayKey(d);
          const has = datesWithEntries.has(key);
          const inMonth = isSameMonth(d, cursor);
          return (
            <button
              key={key}
              onClick={() => has && onSelectDate(key)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs ${
                selected === key ? "bg-primary text-primary-ink" : inMonth ? "text-ink" : "text-ink-faint/40"
              }`}
            >
              {format(d, "d")}
              {has && <span className={`mt-0.5 h-1 w-1 rounded-full ${selected === key ? "bg-primary-ink" : "bg-primary"}`} />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function EntryEditor({ open, entry, onClose }: { open: boolean; entry: JournalEntry | null; onClose: () => void }) {
  const addJournalEntry = useStore((s) => s.addJournalEntry);
  const updateJournalEntry = useStore((s) => s.updateJournalEntry);
  const deleteJournalEntry = useStore((s) => s.deleteJournalEntry);

  const [title, setTitle] = useState(entry?.title ?? "");
  const [text, setText] = useState(entry?.text ?? "");
  const [mood, setMood] = useState<number | undefined>(entry?.mood);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);
  const [photoIds, setPhotoIds] = useState<string[]>(entry?.photoIds ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [key, setKey] = useState(0);

  const voice = useVoiceToText((chunk) => setText((t) => (t ? `${t} ${chunk}` : chunk)));

  // Reset local state whenever a different entry (or a new blank one) opens.
  useMemo(() => {
    setTitle(entry?.title ?? "");
    setText(entry?.text ?? "");
    setMood(entry?.mood);
    setTags(entry?.tags ?? []);
    setPhotoIds(entry?.photoIds ?? []);
    setKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, open]);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const { dataUrl } = await fileToCompressedDataUrl(file);
      const id = newId();
      await putImage(id, dataUrl);
      setPhotoIds((p) => [...p, id]);
    }
  }

  function save() {
    if (!text.trim() && photoIds.length === 0) return;
    if (entry) {
      updateJournalEntry(entry.id, { title: title || undefined, text, mood, tags, photoIds });
    } else {
      addJournalEntry({ date: dayKey(), title: title || undefined, text, mood, tags, photoIds });
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={entry ? "Edit entry" : "New journal entry"} wide>
      <div key={key} className="space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm font-medium text-ink outline-none focus:border-primary"
        />
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder="What's on your mind?"
            className="w-full resize-none rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
          {voice.supported && (
            <button
              onClick={() => (voice.listening ? voice.stop() : voice.start())}
              className={`absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full ${
                voice.listening ? "bg-warn text-white" : "bg-surface text-ink-soft"
              }`}
              title="Voice to text"
            >
              {voice.listening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-soft">Mood with this entry (optional)</p>
          <div className="flex gap-2">
            {[2, 4, 6, 8, 10].map((m) => (
              <button
                key={m}
                onClick={() => setMood(mood === m ? undefined : m)}
                className={`flex-1 rounded-xl border py-2 text-lg ${mood === m ? "border-primary bg-primary-soft" : "border-border"}`}
              >
                {moodFace(m).emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-soft">Tags</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs text-primary">
                #{t}
                <button onClick={() => setTags(tags.filter((x) => x !== t))}><X size={11} /></button>
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tagInput.trim()) {
                e.preventDefault();
                setTags([...new Set([...tags, tagInput.trim().toLowerCase()])]);
                setTagInput("");
              }
            }}
            placeholder="Type a tag and press Enter"
            className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-soft">Photos</p>
          <div className="flex flex-wrap gap-2">
            {photoIds.map((id) => (
              <PhotoThumb key={id} id={id} onRemove={() => setPhotoIds(photoIds.filter((x) => x !== id))} />
            ))}
            <label className="flex h-[72px] w-[72px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-border text-ink-faint">
              <ImageIcon size={18} />
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          {entry ? (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-sm text-warn">
              <Trash2 size={14} /> Delete
            </button>
          ) : (
            <span />
          )}
          <button onClick={save} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-ink">
            Save entry
          </button>
        </div>
      </div>

      {entry && (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            entry.photoIds.forEach((id) => deleteImage(id));
            deleteJournalEntry(entry.id);
            onClose();
          }}
          title="Delete this entry?"
          body="This can't be undone."
          confirmLabel="Delete"
          danger
        />
      )}
    </Modal>
  );
}
