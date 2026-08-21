"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Grid3x3, Bookmark, UserSquare, Settings } from "lucide-react";
import { getPersona } from "@/lib/personas";
import { useApp } from "@/lib/store";
import { avatarUrl, photoUrl } from "@/lib/seed";
import Photo from "@/components/Photo";
import { getApiKey, setApiKey } from "@/lib/aiClient";

function SettingsSheet({ onClose }: { onClose: () => void }) {
  const resetEverything = useApp((s) => s.resetEverything);
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKey(getApiKey());
  }, []);

  function save() {
    setApiKey(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[470px] rounded-t-2xl bg-white p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">Settings</h2>

        <p className="mt-4 text-[13px] font-semibold">Anthropic API key</p>
        <p className="mt-1 text-[12px] leading-[17px] text-ig-muted">
          Add a key to make the AI accounts write real replies. It is stored
          only in this browser and is sent straight to Anthropic — never to any
          other server. Without a key the app still works using canned text.
        </p>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-ant-..."
          className="mt-2 w-full rounded-lg border border-ig-border px-3 py-2 text-[13px] outline-none placeholder:text-ig-muted"
        />
        <button
          onClick={save}
          className="mt-2 w-full rounded-lg bg-ig-blue py-2 text-sm font-semibold text-white"
        >
          {saved ? "Saved ✓" : "Save key"}
        </button>
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-center text-[12px] text-ig-blue"
        >
          Get a key from the Anthropic Console
        </a>

        <div className="mt-5 border-t border-ig-border pt-4">
          <button
            onClick={() => {
              if (confirm("Log out and erase this browser's feed?")) {
                resetEverything();
              }
            }}
            className="w-full rounded-lg bg-[#efefef] py-2 text-sm font-semibold text-ig-red"
          >
            Log out and reset
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full py-2 text-sm font-semibold text-ig-muted"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ProfileBody() {
  const searchParams = useSearchParams();
  const username = searchParams.get("u") ?? "";

  const profile = useApp((s) => s.profile);
  const posts = useApp((s) => s.posts);

  const persona = getPersona(username);
  const isMe = profile?.username === username;

  const [following, setFollowing] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  if (!persona && !isMe) {
    return (
      <p className="px-8 py-20 text-center text-sm text-ig-muted">
        Sorry, this page isn&apos;t available.
      </p>
    );
  }

  const displayName = isMe ? profile!.name : persona!.name;
  const avatarSeed = isMe ? profile!.avatarSeed : persona!.avatarSeed;
  const bio = isMe ? profile!.bio : persona!.bio;

  const myPosts = posts.filter((p) => p.authorUsername === username);
  const followers = isMe
    ? myPosts.reduce((n, p) => n + p.likedBy.length, 0)
    : 40_000 + (persona!.username.length * 8123) % 900_000;

  return (
    <div className="bg-white">
      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} />}

      <div className="flex items-center gap-4 px-4 pt-4">
        <div className="story-ring h-[88px] w-[88px] shrink-0 rounded-full p-[3px]">
          <div className="h-full w-full rounded-full bg-white p-[2px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(avatarSeed)}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          </div>
        </div>

        <div className="grid flex-1 grid-cols-3 text-center">
          <div>
            <p className="text-base font-semibold">{myPosts.length}</p>
            <p className="text-[13px]">posts</p>
          </div>
          <div>
            <p className="text-base font-semibold">
              {followers.toLocaleString()}
            </p>
            <p className="text-[13px]">followers</p>
          </div>
          <div>
            <p className="text-base font-semibold">{isMe ? 8 : 342}</p>
            <p className="text-[13px]">following</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3">
        <p className="text-[13px] font-semibold">{displayName}</p>
        {!isMe && (
          <p className="text-[13px] text-ig-muted">
            AI account · {persona!.topic}
          </p>
        )}
        <p className="whitespace-pre-wrap text-[13px] leading-[18px]">{bio}</p>
      </div>

      <div className="flex gap-1.5 px-4 pt-4">
        {isMe ? (
          <>
            <Link
              href="/create"
              className="flex-1 rounded-lg bg-[#efefef] py-1.5 text-center text-sm font-semibold"
            >
              New post
            </Link>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg bg-[#efefef] px-3 py-1.5"
              aria-label="Settings"
            >
              <Settings size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setFollowing((v) => !v)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${
                following
                  ? "bg-[#efefef] text-ig-text"
                  : "bg-ig-blue text-white"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
            <Link
              href={`/messages/chat?p=${encodeURIComponent(persona!.id)}`}
              className="flex-1 rounded-lg bg-[#efefef] py-1.5 text-center text-sm font-semibold"
            >
              Message
            </Link>
          </>
        )}
      </div>

      <div className="mt-4 flex border-t border-ig-border">
        <button className="flex flex-1 justify-center border-t border-black py-2.5">
          <Grid3x3 size={22} strokeWidth={1.5} />
        </button>
        <button className="flex flex-1 justify-center py-2.5 text-ig-muted">
          <Bookmark size={22} strokeWidth={1.5} />
        </button>
        <button className="flex flex-1 justify-center py-2.5 text-ig-muted">
          <UserSquare size={22} strokeWidth={1.5} />
        </button>
      </div>

      {myPosts.length === 0 ? (
        <p className="px-8 py-16 text-center text-sm text-ig-muted">
          No posts yet.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-[2px]">
          {myPosts.map((p) => (
            <div key={p.id} className="aspect-square bg-ig-bg">
              <Photo
                src={p.imageUrl ?? photoUrl(p.imageSeed, 400)}
                seed={p.imageSeed}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ProfileBody />
    </Suspense>
  );
}
