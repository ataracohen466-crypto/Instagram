"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp, bindVault } from "@/lib/store";
import {
  AccountRecord,
  createAccount,
  getSession,
  listAccounts,
  login,
  setSession,
} from "@/lib/vault";
import { passwordProblem } from "@/lib/crypto";

const LEGACY_KEY = "instaai-store-v1";

/** Pulls pre-account localStorage data into the first account created. */
function takeLegacyState(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    return parsed?.state ?? null;
  } catch {
    return null;
  }
}

function clearLegacyState() {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* nothing to clear */
  }
}

export default function OnboardingGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrated = useApp((s) => s.hydrated);
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);

  const [checking, setChecking] = useState(true);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshAccounts = useCallback(async () => {
    try {
      const list = await listAccounts();
      setAccounts(list);
      setMode(list.length ? "login" : "signup");
      if (list.length === 1) setUsername(list[0].username);
    } catch {
      setMode("signup");
    }
  }, []);

  // Restore an unlocked session across reloads, otherwise show the gate.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getSession();
        if (session && !cancelled) {
          await bindVault(session.username, session.key);
          if (!cancelled) {
            setChecking(false);
            return;
          }
        }
      } catch {
        /* fall through to the login screen */
      }
      if (!cancelled) {
        await refreshAccounts();
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAccounts]);

  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (cleaned.length < 3) {
      setError("Usernames need at least 3 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const problem = passwordProblem(password);
        if (problem) {
          setError(problem);
          return;
        }
        if (password !== confirm) {
          setError("Those passwords don't match.");
          return;
        }

        const key = await createAccount(cleaned, name.trim() || cleaned, password);
        await setSession(cleaned, key);
        await bindVault(cleaned, key);

        // First account on a device inherits anything made before accounts existed.
        const legacy = accounts.length === 0 ? takeLegacyState() : null;
        if (legacy && Array.isArray(legacy.posts)) {
          useApp.setState({
            posts: legacy.posts as never,
            reels: (legacy.reels ?? []) as never,
            chats: (legacy.chats ?? {}) as never,
          });
          clearLegacyState();
        }

        setProfile({
          username: cleaned,
          name: name.trim() || cleaned,
          avatarSeed: `me-${cleaned}`,
          bio: "just here for the algorithm 🤖",
        });
      } else {
        const key = await login(cleaned, password);
        if (!key) {
          setError("Wrong username or password.");
          return;
        }
        await setSession(cleaned, key);
        await bindVault(cleaned, key);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="ig-logo text-4xl">Instagr.ai</span>
      </div>
    );
  }

  if (profile && hydrated) return <>{children}</>;

  // Signed in but the account has no profile yet (fresh signup mid-flight).
  if (hydrated && !profile && busy) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="ig-logo text-4xl">Instagr.ai</span>
      </div>
    );
  }

  const signup = mode === "signup";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ig-bg px-4 py-10">
      <div className="w-full max-w-sm rounded-sm border border-ig-border bg-white px-8 py-10">
        <h1 className="ig-logo mb-2 text-center text-5xl">Instagr.ai</h1>
        <p className="mb-7 text-center text-sm text-ig-muted">
          {signup
            ? "Create an account. Your posts, reels and chats are saved to it."
            : "Welcome back. Log in to your feed."}
        </p>

        <form onSubmit={submit} className="space-y-2">
          {!signup && accounts.length > 1 ? (
            <select
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-sm border border-ig-border bg-ig-bg px-2 py-2.5 text-xs outline-none focus:border-ig-muted"
            >
              <option value="">Choose an account…</option>
              {accounts.map((a) => (
                <option key={a.username} value={a.username}>
                  {a.username}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              className="w-full rounded-sm border border-ig-border bg-ig-bg px-2 py-2.5 text-xs outline-none focus:border-ig-muted"
            />
          )}

          {signup && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name (optional)"
              autoComplete="name"
              className="w-full rounded-sm border border-ig-border bg-ig-bg px-2 py-2.5 text-xs outline-none focus:border-ig-muted"
            />
          )}

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            autoComplete={signup ? "new-password" : "current-password"}
            className="w-full rounded-sm border border-ig-border bg-ig-bg px-2 py-2.5 text-xs outline-none focus:border-ig-muted"
          />

          {signup && (
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              placeholder="Confirm password"
              autoComplete="new-password"
              className="w-full rounded-sm border border-ig-border bg-ig-bg px-2 py-2.5 text-xs outline-none focus:border-ig-muted"
            />
          )}

          {error && (
            <p className="pt-1 text-center text-[12px] text-ig-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy || cleaned.length < 3 || password.length === 0}
            className="mt-3 w-full rounded-lg bg-ig-blue py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Please wait…" : signup ? "Sign up" : "Log in"}
          </button>
        </form>

        <div className="mt-5 border-t border-ig-border pt-4 text-center">
          <button
            onClick={() => {
              setMode(signup ? "login" : "signup");
              setError(null);
              setPassword("");
              setConfirm("");
            }}
            className="text-[13px] text-ig-muted"
          >
            {signup ? (
              <>
                Have an account?{" "}
                <span className="font-semibold text-ig-blue">Log in</span>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <span className="font-semibold text-ig-blue">Sign up</span>
              </>
            )}
          </button>
        </div>

        <p className="mt-5 text-center text-[11px] leading-4 text-ig-muted">
          Your password encrypts everything you save. It is never sent anywhere
          — which also means it can&apos;t be reset, and your account lives on
          this device only.
        </p>
      </div>
    </div>
  );
}
