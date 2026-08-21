"use client";

import Link from "next/link";
import { ChevronLeft, PenSquare } from "lucide-react";
import { PERSONAS } from "@/lib/personas";
import { useApp } from "@/lib/store";
import { avatarUrl } from "@/lib/seed";
import { timeAgo } from "@/lib/time";

export default function MessagesPage() {
  const chats = useApp((s) => s.chats);
  const profile = useApp((s) => s.profile);

  const rows = PERSONAS.map((p) => {
    const thread = chats[p.id] ?? [];
    const last = thread[thread.length - 1];
    return { persona: p, last };
  }).sort((a, b) => (b.last?.createdAt ?? 0) - (a.last?.createdAt ?? 0));

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-ig-border bg-white">
        <div className="mx-auto flex h-[60px] w-full max-w-[470px] items-center gap-3 px-4">
          <Link href="/" aria-label="Back">
            <ChevronLeft size={26} />
          </Link>
          <p className="flex-1 text-base font-semibold">{profile?.username}</p>
          <PenSquare size={22} strokeWidth={1.8} />
        </div>
      </header>

      <div className="pt-[60px]">
        {rows.map(({ persona, last }) => (
          <Link
            key={persona.id}
            href={`/messages/${persona.id}`}
            className="flex items-center gap-3 px-4 py-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(persona.avatarSeed)}
              alt=""
              className="h-14 w-14 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{persona.username}</p>
              <p className="truncate text-sm text-ig-muted">
                {last
                  ? `${last.sender === "me" ? "You: " : ""}${last.text}`
                  : persona.bio}
                {last ? ` · ${timeAgo(last.createdAt)}` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
