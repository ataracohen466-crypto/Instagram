"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { useStore } from "@/lib/store";

export default function NewBookModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const createBook = useStore((s) => s.createBook);
  const router = useRouter();

  const submit = () => {
    if (!title.trim()) return;
    const id = createBook({ title, genre, synopsis });
    onClose();
    router.push(`/book/${id}`);
  };

  return (
    <Modal title="Start a new book" onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-faint">
            Title
          </span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="The book only you can write"
            className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-faint">
            Genre <span className="normal-case text-ink-faint">(optional)</span>
          </span>
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="Literary fiction, fantasy, thriller…"
            className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-faint">
            Synopsis <span className="normal-case text-ink-faint">(optional)</span>
          </span>
          <textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={3}
            placeholder="A sentence or two about what this book is."
            className="w-full resize-none rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        <button
          onClick={submit}
          disabled={!title.trim()}
          className="w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-40"
        >
          Create book
        </button>
      </div>
    </Modal>
  );
}
