"use client";

import { assetUrl } from "./assets";

/**
 * Spotify integration.
 *
 * Auth uses the PKCE flow, which needs no client secret and so works from a
 * static site. What it can and cannot do:
 *
 *  - CAN: search the catalogue, attach a real track to a reel, and play it
 *    through the Web Playback SDK for a listener with Spotify Premium.
 *  - CANNOT: put that audio into an exported reel. The SDK's stream is
 *    DRM-protected and browsers block capturing it. Background music baked
 *    into the file comes from the user's own audio instead.
 */

const CLIENT_ID_KEY = "instaai.spotify.clientId";
const TOKEN_KEY = "instaai.spotify.token";
const VERIFIER_KEY = "instaai.spotify.verifier";

const AUTH_HOST = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";

const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artist: string;
  album: string;
  artwork?: string;
  url: string;
  durationMs: number;
}

interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  product?: string;
}

/* ── Config ─────────────────────────────────────────────────────────── */

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(CLIENT_ID_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setClientId(id: string): void {
  try {
    const trimmed = id.trim();
    if (trimmed) localStorage.setItem(CLIENT_ID_KEY, trimmed);
    else localStorage.removeItem(CLIENT_ID_KEY);
  } catch {
    /* storage disabled */
  }
}

export function redirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${assetUrl("/spotify/callback/")}`;
}

/* ── Tokens ─────────────────────────────────────────────────────────── */

function readToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as StoredToken) : null;
  } catch {
    return null;
  }
}

function writeToken(token: StoredToken | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage disabled */
  }
}

export function isConnected(): boolean {
  return Boolean(readToken());
}

export function disconnect(): void {
  writeToken(null);
}

/** True when the connected account can use the Web Playback SDK. */
export function isPremium(): boolean {
  return readToken()?.product === "premium";
}

/* ── PKCE ───────────────────────────────────────────────────────────── */

function randomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function base64url(bytes: ArrayBuffer): string {
  let binary = "";
  new Uint8Array(bytes).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Sends the browser to Spotify's consent screen. */
export async function beginLogin(): Promise<void> {
  const clientId = getClientId();
  if (!clientId) throw new Error("Add your Spotify Client ID first.");

  const verifier = randomString(64);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    code_challenge_method: "S256",
    code_challenge: base64url(digest),
    scope: SCOPES,
  });

  window.location.href = `${AUTH_HOST}/authorize?${params.toString()}`;
}

/** Exchanges the ?code= from the callback for tokens. */
export async function completeLogin(code: string): Promise<void> {
  const clientId = getClientId();
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!clientId || !verifier) throw new Error("Login session expired.");

  const res = await fetch(`${AUTH_HOST}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      client_id: clientId,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Spotify rejected the login (${res.status}). ${detail}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  writeToken({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  sessionStorage.removeItem(VERIFIER_KEY);

  // Record whether this account can stream, so the UI can say so up front.
  try {
    const me = await apiGet<{ product?: string }>("/me");
    const token = readToken();
    if (token) writeToken({ ...token, product: me.product });
  } catch {
    /* not fatal — playback simply reports its own error later */
  }
}

async function refresh(): Promise<string | null> {
  const token = readToken();
  const clientId = getClientId();
  if (!token?.refreshToken || !clientId) return null;

  const res = await fetch(`${AUTH_HOST}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
      client_id: clientId,
    }),
  });
  if (!res.ok) {
    writeToken(null);
    return null;
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  writeToken({
    ...token,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? token.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}

export async function getAccessToken(): Promise<string | null> {
  const token = readToken();
  if (!token) return null;
  // Refresh a minute early so a call can't expire mid-flight.
  if (Date.now() > token.expiresAt - 60_000) return refresh();
  return token.accessToken;
}

/* ── API ────────────────────────────────────────────────────────────── */

async function apiGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("Connect Spotify first.");

  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    writeToken(null);
    throw new Error("Spotify session expired — connect again.");
  }
  if (!res.ok) throw new Error(`Spotify request failed (${res.status}).`);
  return (await res.json()) as T;
}

interface RawTrack {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  external_urls: { spotify: string };
  album: { name: string; images: { url: string }[] };
  artists: { name: string }[];
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];
  const data = await apiGet<{ tracks: { items: RawTrack[] } }>(
    `/search?q=${encodeURIComponent(query)}&type=track&limit=20`
  );

  return data.tracks.items.map((t) => ({
    id: t.id,
    uri: t.uri,
    name: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    album: t.album.name,
    artwork: t.album.images.at(-1)?.url ?? t.album.images[0]?.url,
    url: t.external_urls.spotify,
    durationMs: t.duration_ms,
  }));
}

/* ── Web Playback SDK ───────────────────────────────────────────────── */

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  pause: () => Promise<void>;
  addListener: (event: string, cb: (payload: never) => void) => void;
}

let sdkPromise: Promise<void> | null = null;
let player: SpotifyPlayer | null = null;
let deviceId: string | null = null;

function loadSdk(): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.Spotify) return resolve();
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.onerror = () => reject(new Error("Couldn't load the Spotify player."));
    document.body.appendChild(script);
    // Don't hang forever if the script loads but never signals ready.
    setTimeout(() => reject(new Error("Spotify player timed out.")), 15000);
  });
  return sdkPromise;
}

/** Boots the player once; returns the device id to target with playback. */
export async function ensurePlayer(): Promise<string | null> {
  if (deviceId) return deviceId;
  if (!isConnected()) return null;

  await loadSdk();
  if (!window.Spotify) return null;

  player = new window.Spotify.Player({
    name: "Instagr.ai",
    getOAuthToken: (cb) => {
      getAccessToken().then((t) => t && cb(t));
    },
    volume: 0.8,
  });

  const ready = new Promise<string | null>((resolve) => {
    player!.addListener("ready", ((p: { device_id: string }) => {
      resolve(p.device_id);
    }) as never);
    player!.addListener("initialization_error", (() => resolve(null)) as never);
    player!.addListener("authentication_error", (() => resolve(null)) as never);
    player!.addListener("account_error", (() => resolve(null)) as never);
    setTimeout(() => resolve(null), 12000);
  });

  await player.connect();
  deviceId = await ready;
  return deviceId;
}

export async function playTrack(uri: string, positionMs = 0): Promise<boolean> {
  const token = await getAccessToken();
  const device = await ensurePlayer();
  if (!token || !device) return false;

  const res = await fetch(
    `${API}/me/player/play?device_id=${encodeURIComponent(device)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: [uri], position_ms: positionMs }),
    }
  );
  return res.ok || res.status === 204;
}

export async function pausePlayback(): Promise<void> {
  try {
    await player?.pause();
  } catch {
    /* nothing playing */
  }
}
