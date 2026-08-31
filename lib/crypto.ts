"use client";

/**
 * Password-based encryption for account vaults.
 *
 * The password never leaves the device and is never stored. It derives an
 * AES-GCM key via PBKDF2; that key encrypts the whole account payload, so
 * without the password the stored bytes are unreadable — the login screen
 * is a real gate, not a UI check.
 */

const ITERATIONS = 210_000;
const VERIFIER = "inkwell-vault-v1";

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    // Extractable so the session can cache it for the tab's lifetime.
    true,
    ["encrypt", "decrypt"]
  );
}

export interface Sealed {
  iv: string;
  data: string;
}

export async function seal(key: CryptoKey, plaintext: string): Promise<Sealed> {
  const iv = randomBytes(12);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    new TextEncoder().encode(plaintext)
  );
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(cipher)) };
}

/** Returns null when the key is wrong — AES-GCM fails authentication. */
export async function unseal(
  key: CryptoKey,
  sealed: Sealed
): Promise<string | null> {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(sealed.iv) as unknown as BufferSource },
      key,
      fromBase64(sealed.data) as unknown as BufferSource
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

export function makeVerifier(key: CryptoKey): Promise<Sealed> {
  return seal(key, VERIFIER);
}

export async function checkVerifier(
  key: CryptoKey,
  sealed: Sealed
): Promise<boolean> {
  return (await unseal(key, sealed)) === VERIFIER;
}

export async function exportKey(key: CryptoKey): Promise<string> {
  return toBase64(new Uint8Array(await crypto.subtle.exportKey("raw", key)));
}

export async function importKey(raw: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    fromBase64(raw) as unknown as BufferSource,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return "Use at least one letter and one number.";
  return null;
}
