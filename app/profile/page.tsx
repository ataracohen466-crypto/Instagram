"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Grid3x3, Bookmark, UserSquare, Settings, Copy, Play } from "lucide-react";
import { Post } from "@/lib/types";
import { coverSlide, hasMultipleSlides, hasVideo } from "@/lib/postMedia";
import { getMediaUrl } from "@/lib/media";
import { getPersona } from "@/lib/personas";
import { useApp, unbindVault } from "@/lib/store";
import { avatarUrl, photoUrl } from "@/lib/seed";
import Photo from "@/components/Photo";
import { getApiKey, setApiKey } from "@/lib/aiClient";
import { changePassword, clearSession, deleteAccount } from "@/lib/vault";
import { passwordProblem } from "@/lib/crypto";

/** A post's cover in the profile grid — its first slide, video or photo. */
function GridThumb({ post }: { post: Post }) {
  const slide = coverSlide(post);
  const [url, setUrl] = useState<string | null>(slide.url ?? null);

  useEffect(() => {
    let cancelled = false;
    if (slide.mediaId) {
      getMediaUrl(slide.mediaId).then((resolved) => {
        if (!cancelled) setUrl(resolved);
      });
    } else {
      setUrl(slide.url ?? null);
    }
    return () => {
      cancelled = true;
    };
  }, [slide.mediaId, slide.url]);

  if (slide.kind === "video") {
    return url ? (
      /* Metadata alone paints the first frame, which is all a thumbnail needs. */
      /* eslint-disable-next-line jsx-a11y/media-has-caption */
      <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
    ) : (
      <div className="h-full w-full bg-ig-bg" />
    );
  }

  return (
    <Photo
      src={url ?? photoUrl(slide.seed ?? post.imageSeed, 400)}
      seed={slide.seed ?? post.imageSeed}
      className="h-full w-full object-cover"
    />
  );
}

/** Renders the build stamp as a short local date/time, e.g. "23 Aug, 02:15". */
function formatBuild(iso: string | undefined): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SettingsSheet({ onClose }: { onClose: () => void }) {
  const profile = useApp((s) => s.profile);
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    setKey(getApiKey());
  }, []);

  function save() {
    setApiKey(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  async function submitPassword() {
    if (!profile) return;
    setPwMsg(null);
    const problem = passwordProblem(nextPw);
    if (problem) {
      setPwMsg(problem);
      return;
    }
    const ok = await changePassword(profile.username, currentPw, nextPw);
    setPwMsg(ok ? "Password changed ✓" : "Current password is wrong.");
    if (ok) {
      setCurrentPw("");
      setNextPw("");
    }
  }

  function logOut() {
    clearSession();
    unbindVault();
    location.reload();
  }

  async function removeAccount() {
    if (!profile) return;
    const typed = prompt(
      `This permanently deletes @${profile.username} and everything in it. Type the username to confirm.`
    );
    if (typed !== profile.username) return;
    await deleteAccount(profile.username);
    clearSession();
    unbindVault();
    location.reload();
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
            onClick={() => setShowPw((v) => !v)}
            className="text-[13px] font-semibold text-ig-blue"
          >
            {showPw ? "Cancel" : "Change password"}
          </button>

          {showPw && (
            <div className="mt-2 space-y-2">
              <input
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Current password"
                className="w-full rounded-lg border border-ig-border px-3 py-2 text-[13px] outline-none"
              />
              <input
                value={nextPw}
                onChange={(e) => setNextPw(e.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder="New password"
                className="w-full rounded-lg border border-ig-border px-3 py-2 text-[13px] outline-none"
              />
              <button
                onClick={submitPassword}
                className="w-full rounded-lg bg-ig-text py-2 text-sm font-semibold text-white"
              >
                Save new password
              </button>
            </div>
          )}

          {pwMsg && (
            <p className="mt-2 text-[12px] text-ig-muted">{pwMsg}</p>
          )}
        </div>

        <div className="mt-4 space-y-2 border-t border-ig-border pt-4">
          <button
            onClick={logOut}
            className="w-full rounded-lg bg-[#efefef] py-2 text-sm font-semibold"
          >
            Log out
          </button>
          <button
            onClick={removeAccount}
            className="w-full rounded-lg py-2 text-sm font-semibold text-ig-red"
          >
            Delete account
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full py-2 text-sm font-semibold text-ig-muted"
        >
          Close
        </button>

        <p className="pb-1 text-center text-[11px] text-ig-muted">
          Build {formatBuild(process.env.NEXT_PUBLIC_BUILD_TIME)}
        </p>
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

  const allMine = posts.filter((p) => p.authorUsername === username);
  const myPosts = allMine.filter((p) => !p.archived);
  // Unshared posts are only ever your own, and only shown to you.
  const unshared = isMe ? allMine.filter((p) => p.archived) : [];
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
            <div key={p.id} className="relative aspect-square bg-ig-bg">
              <GridThumb post={p} />
              {hasMultipleSlides(p) && (
                <Copy
                  size={15}
                  className="absolute right-1.5 top-1.5 text-white drop-shadow"
                />
              )}
              {hasVideo(p) && !hasMultipleSlides(p) && (
                <Play
                  size={15}
                  fill="white"
                  className="absolute right-1.5 top-1.5 text-white drop-shadow"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {unshared.length > 0 && (
        <div className="mt-6">
          <p className="px-3 text-[13px] font-semibold">Unshared</p>
          <p className="px-3 pb-2 text-[11px] text-ig-muted">
            Only you can see these. Tap one to edit and share it again.
          </p>
          <div className="grid grid-cols-3 gap-[2px]">
            {unshared.map((p) => (
              <Link
                key={p.id}
                href={`/create?edit=${encodeURIComponent(p.id)}`}
                className="relative aspect-square bg-ig-bg"
              >
                <div className="h-full w-full opacity-40">
                  <GridThumb post={p} />
                </div>
                <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[10px] font-semibold text-white">
                  Unshared
                </span>
              </Link>
            ))}
          </div>
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
