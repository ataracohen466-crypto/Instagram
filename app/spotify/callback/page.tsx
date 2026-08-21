"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { completeLogin } from "@/lib/spotify";

function Callback() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Connecting to Spotify…");

  useEffect(() => {
    const error = params.get("error");
    const code = params.get("code");

    if (error) {
      setStatus("error");
      setMessage(
        error === "access_denied"
          ? "You cancelled the Spotify connection."
          : `Spotify returned: ${error}`
      );
      return;
    }
    if (!code) {
      setStatus("error");
      setMessage("No authorisation code came back from Spotify.");
      return;
    }

    completeLogin(code)
      .then(() => {
        setStatus("done");
        setMessage("Spotify connected.");
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "Couldn't finish connecting."
        );
      });
  }, [params]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-8 text-center">
      <span className="ig-logo text-4xl">Instagr.ai</span>
      <p
        className={`mt-4 text-sm ${
          status === "error" ? "text-ig-red" : "text-ig-muted"
        }`}
      >
        {message}
      </p>

      {status !== "working" && (
        <Link
          href="/reels/templates"
          className="mt-6 rounded-lg bg-ig-blue px-4 py-2 text-sm font-semibold text-white"
        >
          Back to the app
        </Link>
      )}

      {status === "error" && (
        <p className="mt-4 max-w-xs text-[12px] leading-4 text-ig-muted">
          Check that this exact address is listed as a Redirect URI in your
          Spotify app settings.
        </p>
      )}
    </div>
  );
}

export default function SpotifyCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <span className="ig-logo text-4xl">Instagr.ai</span>
        </div>
      }
    >
      <Callback />
    </Suspense>
  );
}
