"use client";

import { useEffect, useState } from "react";
import { Search, X, ExternalLink } from "lucide-react";
import {
  SpotifyTrack,
  beginLogin,
  getClientId,
  isConnected,
  isPremium,
  searchTracks,
} from "@/lib/spotify";

export default function SpotifyPicker({
  selected,
  onSelect,
  onClear,
}: {
  selected?: { name: string; artist: string; url?: string };
  onSelect: (track: SpotifyTrack) => void;
  onClear: () => void;
}) {
  const [connected, setConnected] = useState(false);
  const [premium, setPremium] = useState(false);
  const [hasClientId, setHasClientId] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConnected(isConnected());
    setPremium(isPremium());
    setHasClientId(Boolean(getClientId()));
  }, []);

  // Debounced search so typing doesn't hammer the API.
  useEffect(() => {
    if (!connected || !query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const id = setTimeout(() => {
      searchTracks(query)
        .then((tracks) => {
          if (!cancelled) {
            setResults(tracks);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled)
            setError(err instanceof Error ? err.message : "Search failed.");
        })
        .finally(() => !cancelled && setSearching(false));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, connected]);

  if (selected) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#1DB954]/10 px-3 py-2">
        <span className="text-[13px]">🎵</span>
        <p className="min-w-0 flex-1 truncate text-[13px]">
          <span className="font-semibold">{selected.name}</span>
          <span className="text-ig-muted"> · {selected.artist}</span>
        </p>
        {selected.url && (
          <a
            href={selected.url}
            target="_blank"
            rel="noreferrer"
            className="text-ig-muted"
            aria-label="Open in Spotify"
          >
            <ExternalLink size={13} />
          </a>
        )}
        <button onClick={onClear} aria-label="Remove song">
          <X size={14} className="text-ig-muted" />
        </button>
      </div>
    );
  }

  if (!hasClientId) {
    return (
      <p className="mt-2 text-[11px] leading-4 text-ig-muted">
        Add a Spotify Client ID in your profile settings (⚙️) to search for
        songs.
      </p>
    );
  }

  if (!connected) {
    return (
      <button
        onClick={() => beginLogin().catch((e) => setError(String(e)))}
        className="mt-2 rounded-full bg-[#1DB954] px-4 py-1.5 text-[13px] font-semibold text-white"
      >
        Connect Spotify
      </button>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 rounded-lg bg-[#efefef] px-3 py-2">
        <Search size={14} className="text-ig-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Spotify for a song"
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-ig-muted"
        />
      </div>

      {!premium && (
        <p className="mt-1.5 text-[11px] text-ig-muted">
          This account isn&apos;t Premium, so the song shows as a label but
          won&apos;t play in the app.
        </p>
      )}
      {error && <p className="mt-1.5 text-[11px] text-ig-red">{error}</p>}
      {searching && (
        <p className="mt-1.5 text-[11px] text-ig-muted">Searching…</p>
      )}

      {results.length > 0 && (
        <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
          {results.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-[#fafafa]"
            >
              {t.artwork ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={t.artwork} alt="" className="h-9 w-9 rounded" />
              ) : (
                <span className="h-9 w-9 rounded bg-ig-bg" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {t.name}
                </span>
                <span className="block truncate text-[11px] text-ig-muted">
                  {t.artist}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
