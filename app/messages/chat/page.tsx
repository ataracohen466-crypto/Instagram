"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Phone, Video, Info } from "lucide-react";
import { getPersona } from "@/lib/personas";
import { useApp, uid } from "@/lib/store";
import { avatarUrl } from "@/lib/seed";
import { ChatMessage } from "@/lib/types";
import { generateChatReply } from "@/lib/aiClient";

function Chat() {
  const searchParams = useSearchParams();
  const persona = getPersona(searchParams.get("p") ?? "");

  const profile = useApp((s) => s.profile);
  const chats = useApp((s) => s.chats);
  const appendChat = useApp((s) => s.appendChat);

  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const thread: ChatMessage[] = persona ? chats[persona.id] ?? [] : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, typing]);

  if (!persona) {
    return (
      <p className="px-8 py-20 text-center text-sm text-ig-muted">
        Sorry, this conversation isn&apos;t available.
      </p>
    );
  }

  async function send() {
    const text = draft.trim();
    if (!text || typing) return;

    const mine: ChatMessage = {
      id: uid("m"),
      sender: "me",
      text,
      createdAt: Date.now(),
    };
    appendChat(persona!.id, mine);
    setDraft("");
    setTyping(true);

    try {
      const reply = await generateChatReply(
        persona!.id,
        profile?.name ?? profile?.username ?? "there",
        [...thread, mine]
      );
      if (reply) {
        appendChat(persona!.id, {
          id: uid("m"),
          sender: "persona",
          text: reply,
          createdAt: Date.now(),
        });
      }
    } catch {
      appendChat(persona!.id, {
        id: uid("m"),
        sender: "persona",
        text: "hmm, my connection dropped. say that again?",
        createdAt: Date.now(),
      });
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-ig-border bg-white">
        <div className="mx-auto flex h-[60px] w-full max-w-[470px] items-center gap-3 px-4">
          <Link href="/messages" aria-label="Back">
            <ChevronLeft size={26} />
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(persona.avatarSeed)}
            alt=""
            className="h-8 w-8 rounded-full"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{persona.username}</p>
            <p className="text-[11px] leading-3 text-ig-muted">AI · Active now</p>
          </div>
          <Phone size={22} strokeWidth={1.8} />
          <Video size={24} strokeWidth={1.8} />
          <Info size={22} strokeWidth={1.8} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[470px] flex-1 px-4 pb-24 pt-[76px]">
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(persona.avatarSeed)}
            alt=""
            className="h-24 w-24 rounded-full"
          />
          <p className="text-lg font-semibold">{persona.name}</p>
          <p className="text-sm text-ig-muted">
            {persona.username} · AI account
          </p>
          <p className="max-w-[260px] text-sm text-ig-muted">{persona.bio}</p>
          <Link
            href={`/profile?u=${encodeURIComponent(persona.username)}`}
            className="mt-1 rounded-lg bg-[#efefef] px-4 py-1.5 text-sm font-semibold"
          >
            View profile
          </Link>
        </div>

        <div className="space-y-1.5">
          {thread.map((m, i) => {
            const prev = thread[i - 1];
            const showAvatar = m.sender === "persona" && prev?.sender !== "persona";
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${
                  m.sender === "me" ? "justify-end" : "justify-start"
                }`}
              >
                {m.sender === "persona" &&
                  (showAvatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={avatarUrl(persona.avatarSeed)}
                      alt=""
                      className="h-6 w-6 shrink-0 rounded-full"
                    />
                  ) : (
                    <span className="h-6 w-6 shrink-0" />
                  ))}
                <p
                  className={`max-w-[75%] whitespace-pre-wrap break-words rounded-[22px] px-3.5 py-2 text-[14px] leading-[19px] ${
                    m.sender === "me"
                      ? "bg-[#3797f0] text-white"
                      : "bg-[#efefef] text-ig-text"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            );
          })}

          {typing && (
            <div className="flex items-end gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl(persona.avatarSeed)}
                alt=""
                className="h-6 w-6 shrink-0 rounded-full"
              />
              <span className="flex items-center gap-1 rounded-[22px] bg-[#efefef] px-4 py-3">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ig-muted" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ig-muted" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ig-muted" />
              </span>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ig-border bg-white"
      >
        <div className="mx-auto flex w-full max-w-[470px] items-center gap-2 px-4 py-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${persona.name}…`}
            className="flex-1 rounded-full border border-ig-border px-4 py-2 text-[14px] outline-none placeholder:text-ig-muted"
          />
          <button
            type="submit"
            disabled={!draft.trim() || typing}
            className="text-[14px] font-semibold text-ig-blue disabled:opacity-30"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <Chat />
    </Suspense>
  );
}
