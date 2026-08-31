"use client";

import { useStore } from "./store";
import { Book, Settings } from "./types";
import { totalWords } from "./words";

interface BackupFile {
  app: "inkwell";
  version: 1;
  exportedAt: string;
  books: Book[];
  settings?: Settings;
  history?: Record<string, number>;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Everything, in one plain file the writer keeps. Not encrypted: it is the
 * copy that survives a forgotten password or a wiped device. */
export function downloadBackup(): void {
  const { books, settings, history } = useStore.getState();
  const payload: BackupFile = {
    app: "inkwell",
    version: 1,
    exportedAt: new Date().toISOString(),
    books,
    settings,
    history,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inkwell-backup-${stamp()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface RestoreResult {
  ok: boolean;
  message: string;
}

/**
 * Adds the backup's books alongside whatever is already here rather than
 * replacing anything — restoring should never be the thing that loses work.
 */
export async function restoreBackup(file: File): Promise<RestoreResult> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text()) as BackupFile;
  } catch {
    return { ok: false, message: "That file isn't a readable backup." };
  }

  if (parsed?.app !== "inkwell" || !Array.isArray(parsed.books)) {
    return { ok: false, message: "That doesn't look like an Inkwell backup." };
  }

  const current = useStore.getState().books;
  const existingIds = new Set(current.map((b) => b.id));
  // A book already here wins; the backup copy comes in under a new id so
  // neither version is silently thrown away.
  const incoming = parsed.books.map((b) =>
    existingIds.has(b.id)
      ? { ...b, id: `${b.id}-restored`, title: `${b.title} (restored)` }
      : b
  );

  const books = [...incoming, ...current];
  useStore.setState({ books, totalWordsCache: totalWords(books) });

  return {
    ok: true,
    message: `Restored ${incoming.length} ${incoming.length === 1 ? "book" : "books"}.`,
  };
}
