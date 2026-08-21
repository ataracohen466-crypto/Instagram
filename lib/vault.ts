"use client";

import {
  Sealed,
  checkVerifier,
  deriveKey,
  exportKey,
  fromBase64,
  importKey,
  makeVerifier,
  randomBytes,
  seal,
  toBase64,
  unseal,
} from "./crypto";

/**
 * Account storage.
 *
 * IndexedDB rather than localStorage: photos are stored as data URLs, and
 * localStorage's ~5MB ceiling fills after a handful of reels. IndexedDB gives
 * orders of magnitude more room.
 *
 * Everything is device-local. There is no server, so accounts do not follow
 * you to another phone or browser.
 */

const DB_NAME = "instaai";
const DB_VERSION = 1;
const ACCOUNTS = "accounts";
const VAULTS = "vaults";
const SESSION_KEY = "instaai.session";

export interface AccountRecord {
  username: string;
  name: string;
  salt: string;
  verifier: Sealed;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ACCOUNTS))
        db.createObjectStore(ACCOUNTS, { keyPath: "username" });
      if (!db.objectStoreNames.contains(VAULTS))
        db.createObjectStore(VAULTS, { keyPath: "username" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = run(t.objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

export function listAccounts(): Promise<AccountRecord[]> {
  return tx<AccountRecord[]>(ACCOUNTS, "readonly", (s) => s.getAll());
}

export function getAccount(username: string): Promise<AccountRecord | undefined> {
  return tx<AccountRecord | undefined>(ACCOUNTS, "readonly", (s) =>
    s.get(username)
  );
}

export async function createAccount(
  username: string,
  name: string,
  password: string
): Promise<CryptoKey> {
  const existing = await getAccount(username);
  if (existing) throw new Error("That username is already taken on this device.");

  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);

  const record: AccountRecord = {
    username,
    name,
    salt: toBase64(salt),
    verifier: await makeVerifier(key),
    createdAt: Date.now(),
  };

  await tx(ACCOUNTS, "readwrite", (s) => s.put(record));
  return key;
}

/** Returns the vault key on success, or null when the password is wrong. */
export async function login(
  username: string,
  password: string
): Promise<CryptoKey | null> {
  const account = await getAccount(username);
  if (!account) return null;

  const key = await deriveKey(password, fromBase64(account.salt));
  return (await checkVerifier(key, account.verifier)) ? key : null;
}

export async function changePassword(
  username: string,
  currentPassword: string,
  nextPassword: string
): Promise<boolean> {
  const key = await login(username, currentPassword);
  if (!key) return false;

  const payload = await readVault(username, key);

  const account = await getAccount(username);
  if (!account) return false;

  const salt = randomBytes(16);
  const nextKey = await deriveKey(nextPassword, salt);
  const verifier = await makeVerifier(nextKey);

  const updated: AccountRecord = {
    ...account,
    salt: toBase64(salt),
    verifier,
  };

  await tx(ACCOUNTS, "readwrite", (s) => s.put(updated));
  // Re-encrypt the payload under the new key, or it becomes unreadable.
  if (payload) await writeVault(username, nextKey, payload);
  await setSession(username, nextKey);
  return true;
}

export async function readVault(
  username: string,
  key: CryptoKey
): Promise<string | null> {
  const row = await tx<{ username: string; sealed: Sealed } | undefined>(
    VAULTS,
    "readonly",
    (s) => s.get(username)
  );
  if (!row) return null;
  return unseal(key, row.sealed);
}

export async function writeVault(
  username: string,
  key: CryptoKey,
  plaintext: string
): Promise<void> {
  const sealed = await seal(key, plaintext);
  await tx(VAULTS, "readwrite", (s) => s.put({ username, sealed }));
}

export async function deleteAccount(username: string): Promise<void> {
  await tx(VAULTS, "readwrite", (s) => s.delete(username));
  await tx(ACCOUNTS, "readwrite", (s) => s.delete(username));
}

/* ── Session ───────────────────────────────────────────────────────────
 * The derived key is cached in sessionStorage so a page reload does not
 * force re-entry of the password. It clears when the tab closes, and
 * "Log out" clears it immediately.
 */

export async function setSession(
  username: string,
  key: CryptoKey
): Promise<void> {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ username, key: await exportKey(key) })
    );
  } catch {
    /* storage disabled — the session just won't survive a reload */
  }
}

export async function getSession(): Promise<{
  username: string;
  key: CryptoKey;
} | null> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { username: string; key: string };
    return { username: parsed.username, key: await importKey(parsed.key) };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing to clear */
  }
}
