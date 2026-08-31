// On-device passcode + encryption. Everything here runs with the Web
// Crypto API in the browser — no data or key material ever leaves the
// device, and there is no server involved at any point.

const PBKDF2_ITERATIONS = 150_000;

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function randomSaltHex(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return toHex(salt.buffer);
}

async function deriveBits(passcode: string, saltHex: string, bits: number): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passcode),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(saltHex) as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    bits
  );
}

/** A verification hash for the passcode — stored locally, used only to check unlock attempts. */
export async function hashPasscode(passcode: string, saltHex: string): Promise<string> {
  const bits = await deriveBits(passcode, saltHex, 256);
  return toHex(bits);
}

async function deriveAesKey(passcode: string, saltHex: string): Promise<CryptoKey> {
  const bits = await deriveBits(`aes:${passcode}`, saltHex, 256);
  return crypto.subtle.importKey("raw", bits, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export interface EncryptedBlob {
  iv: string;
  data: string;
}

export async function encryptJson(value: unknown, passcode: string, saltHex: string): Promise<EncryptedBlob> {
  const key = await deriveAesKey(passcode, saltHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { iv: toHex(iv.buffer), data: toHex(cipher) };
}

export async function decryptJson<T>(blob: EncryptedBlob, passcode: string, saltHex: string): Promise<T> {
  const key = await deriveAesKey(passcode, saltHex);
  const iv = fromHex(blob.iv) as BufferSource;
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, fromHex(blob.data) as BufferSource);
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
