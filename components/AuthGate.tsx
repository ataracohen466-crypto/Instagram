"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import {
  AccountRecord,
  createAccount,
  getSession,
  listAccounts,
  login,
  setActive,
  setSession,
} from "@/lib/vault";
import { passwordProblem } from "@/lib/crypto";
import { adoptLegacyBooks, bindVault, useStore } from "@/lib/store";

type Phase = "loading" | "signup" | "login" | "in";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setSignedInAs = useStore((s) => s.setSignedInAs);

  // Resume an unlocked tab, otherwise decide between signup and login.
  useEffect(() => {
    (async () => {
      try {
        const existing = await listAccounts();
        setAccounts(existing);

        const session = await getSession();
        if (session) {
          setActive(session.username, session.key);
          await bindVault(session.username, session.key);
          setSignedInAs(session.username);
          setPhase("in");
          return;
        }

        if (existing.length > 0) {
          setUsername(existing[0].username);
          setPhase("login");
        } else {
          setPhase("signup");
        }
      } catch {
        setPhase("signup");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enter = async (name: string, key: CryptoKey, isNew: boolean) => {
    await setSession(name, key);
    setActive(name, key);
    await bindVault(name, key);
    if (isNew) await adoptLegacyBooks();
    setSignedInAs(name);
    setPassword("");
    setConfirm("");
    setPhase("in");
  };

  const submitSignup = async () => {
    const name = username.trim();
    if (!name) return setError("Pick a name for your account.");

    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("The two passwords don't match.");

    setBusy(true);
    setError(null);
    try {
      const key = await createAccount(name, password);
      await enter(name, key, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create that account.");
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async () => {
    const name = username.trim();
    if (!name || !password) return setError("Enter your name and password.");

    setBusy(true);
    setError(null);
    try {
      const key = await login(name, password);
      if (!key) {
        setError("That password doesn't match this account.");
        return;
      }
      await enter(name, key, false);
    } finally {
      setBusy(false);
    }
  };

  if (phase === "in") return <>{children}</>;

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 size={20} className="animate-spin text-ink-faint" />
      </div>
    );
  }

  const signingUp = phase === "signup";

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-ink">
            <Lock size={20} />
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-ink">Inkwell</h1>
          <p className="mt-1.5 text-sm text-ink-faint">
            {signingUp
              ? "Choose a password. Your writing is saved to this account and locked with it."
              : "Welcome back. Unlock your writing."}
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-paper-raised p-5 shadow-card">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-faint">
              Name
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Your name"
              className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-faint">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !signingUp && submitLogin()
              }
              autoComplete={signingUp ? "new-password" : "current-password"}
              placeholder={signingUp ? "At least 8 characters" : "Your password"}
              className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </label>

          {signingUp && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-faint">
                Confirm password
              </span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSignup()}
                autoComplete="new-password"
                placeholder="Type it again"
                className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
          )}

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <button
            onClick={signingUp ? submitSignup : submitLogin}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-medium text-accent-ink transition hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {signingUp ? "Create account" : "Unlock"}
          </button>

          {signingUp && (
            <p className="pt-1 text-center text-[11px] leading-relaxed text-ink-faint">
              There's no password reset — the password is the key your writing is
              encrypted with. Keep it somewhere safe.
            </p>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-ink-faint">
          {signingUp ? (
            accounts.length > 0 && (
              <button
                onClick={() => {
                  setError(null);
                  setPhase("login");
                }}
                className="underline underline-offset-2 hover:text-ink"
              >
                Log in to an existing account
              </button>
            )
          ) : (
            <button
              onClick={() => {
                setError(null);
                setUsername("");
                setPhase("signup");
              }}
              className="underline underline-offset-2 hover:text-ink"
            >
              Create a new account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
