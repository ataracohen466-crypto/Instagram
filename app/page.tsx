"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Flame, Plus, Settings, Trash2, BookOpen } from "lucide-react";
import { useStore } from "@/lib/store";
import { bookWords, computeStreak, dateKey, formatWords, last7Days, totalWords } from "@/lib/words";
import { timeAgo } from "@/lib/time";
import ProgressRing from "@/components/ProgressRing";
import NewBookModal from "@/components/NewBookModal";
import SettingsModal from "@/components/SettingsModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Book } from "@/lib/types";

export default function Dashboard() {
  const hydrated = useStore((s) => s.hydrated);
  const books = useStore((s) => s.books);
  const history = useStore((s) => s.history);
  const dailyGoal = useStore((s) => s.settings.dailyGoal);
  const deleteBook = useStore((s) => s.deleteBook);
  const [showNewBook, setShowNewBook] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Book | null>(null);

  const todayWords = history[dateKey()] ?? 0;
  const streak = useMemo(() => computeStreak(history, dailyGoal), [history, dailyGoal]);
  const grandTotal = useMemo(() => totalWords(books), [books]);
  const week = useMemo(() => last7Days(history), [history]);
  const weekMax = Math.max(dailyGoal, ...week.map((d) => d.words), 1);

  if (!hydrated) return null;

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pb-2 pt-8 sm:px-8">
        <h1 className="font-serif text-2xl tracking-tight text-ink">Inkwell</h1>
        <button
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
          className="rounded-full p-2 text-ink-soft transition hover:bg-accent-soft hover:text-ink"
        >
          <Settings size={20} />
        </button>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-6 pt-4 sm:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Streak"
            icon={<Flame size={16} className="text-accent" />}
            value={`${streak} ${streak === 1 ? "day" : "days"}`}
          />
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-paper-raised p-4 shadow-card">
            <ProgressRing progress={dailyGoal ? todayWords / dailyGoal : 0} />
            <div>
              <div className="text-lg font-medium leading-none text-ink">{formatWords(todayWords)}</div>
              <div className="mt-1 text-xs text-ink-faint">of {formatWords(dailyGoal)} today</div>
            </div>
          </div>
          <StatCard label="Total words" value={formatWords(grandTotal)} />
          <div className="col-span-2 rounded-2xl border border-border bg-paper-raised p-4 shadow-card sm:col-span-1">
            <div className="mb-2 text-xs text-ink-faint">This week</div>
            <div className="flex h-8 items-end gap-1">
              {week.map((d) => (
                <div
                  key={d.key}
                  title={`${d.label}: ${d.words} words`}
                  className="flex-1 rounded-sm bg-accent transition-all"
                  style={{
                    height: `${Math.max(6, (d.words / weekMax) * 100)}%`,
                    opacity: d.words > 0 ? 1 : 0.25,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-faint">Your books</h2>
        </div>

        {books.length === 0 ? (
          <button
            onClick={() => setShowNewBook(true)}
            className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-paper-raised px-6 py-16 text-center transition hover:border-accent"
          >
            <BookOpen size={32} className="mb-3 text-ink-faint" />
            <p className="font-serif text-lg text-ink">Every book starts on an empty page.</p>
            <p className="mt-1 text-sm text-ink-faint">Start your first one — it takes ten seconds.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink">
              <Plus size={16} /> New book
            </span>
          </button>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book, i) => {
              const words = bookWords(book);
              return (
                <div
                  key={book.id}
                  className="group relative animate-fade-in"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <Link
                    href={`/book/${book.id}`}
                    className="block h-full rounded-2xl border border-border bg-paper-raised p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
                  >
                    <div className="mb-3 h-1.5 w-10 rounded-full" style={{ background: book.color }} />
                    <h3 className="line-clamp-1 pr-6 font-serif text-lg text-ink">{book.title}</h3>
                    {book.genre && (
                      <span className="mt-1 inline-block text-xs text-ink-faint">{book.genre}</span>
                    )}
                    {book.synopsis && (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{book.synopsis}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between text-xs text-ink-faint">
                      <span>{formatWords(words)} words · {book.chapters.length} ch.</span>
                      <span>{timeAgo(book.updatedAt)}</span>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setPendingDelete(book);
                    }}
                    aria-label={`Delete ${book.title}`}
                    className="absolute right-3 top-3 rounded-full bg-paper-raised/90 p-1.5 text-ink-faint/60 shadow-card transition hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => setShowNewBook(true)}
              className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-ink-faint transition hover:border-accent hover:text-accent"
            >
              <Plus size={22} />
              <span className="text-sm font-medium">New book</span>
            </button>
          </div>
        )}
      </section>

      {showNewBook && <NewBookModal onClose={() => setShowNewBook(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {pendingDelete && (
        <ConfirmDialog
          title={`Delete "${pendingDelete.title}"?`}
          description="This permanently deletes the book and everything in it. This can't be undone."
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteBook(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-paper-raised p-4 shadow-card">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-ink-faint">
        {icon}
        {label}
      </div>
      <div className="text-lg font-medium text-ink">{value}</div>
    </div>
  );
}
