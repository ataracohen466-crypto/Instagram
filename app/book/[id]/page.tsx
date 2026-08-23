"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import BookWorkspace from "@/components/BookWorkspace";

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useStore((s) => s.hydrated);
  const book = useStore((s) => s.books.find((b) => b.id === id));

  if (!hydrated) return null;

  if (!book) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-paper text-center">
        <p className="font-serif text-lg text-ink">Couldn't find that book.</p>
        <Link href="/" className="text-sm text-accent underline underline-offset-2">
          Back to your library
        </Link>
      </div>
    );
  }

  // Keyed on the book id so navigating straight from one book to another
  // (client-side, no full page load) remounts the workspace instead of
  // carrying over the previous book's selected chapter/scene.
  return <BookWorkspace key={book.id} book={book} />;
}
