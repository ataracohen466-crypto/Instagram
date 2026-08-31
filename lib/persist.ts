"use client";

// Local persistence for Bloom. Structured app data lives in localStorage,
// either as plain JSON or — when the user turns on a passcode with
// encryption — as an AES-GCM ciphertext derived from that passcode.
// Nothing here ever talks to a network.

import { encryptJson, decryptJson, hashPasscode, randomSaltHex, type EncryptedBlob } from "./crypto";
import { emptyData } from "./store";
import type { AppData, LockMethod } from "./types";

const LOCK_META_KEY = "bloom.lock-meta";
const DATA_KEY = "bloom.data";
const DATA_ENC_KEY = "bloom.data.enc";

export interface LockMeta {
  lockMethod: LockMethod;
  passcodeHash?: string;
  passcodeSalt?: string;
  encryptData: boolean;
}

let sessionPasscode: string | null = null;

export function setSessionPasscode(p: string | null) {
  sessionPasscode = p;
}
export function getSessionPasscode(): string | null {
  return sessionPasscode;
}

export function loadLockMeta(): LockMeta {
  try {
    const raw = localStorage.getItem(LOCK_META_KEY);
    if (!raw) return { lockMethod: "none", encryptData: false };
    return JSON.parse(raw);
  } catch {
    return { lockMethod: "none", encryptData: false };
  }
}

function saveLockMeta(meta: LockMeta) {
  localStorage.setItem(LOCK_META_KEY, JSON.stringify(meta));
}

function loadPlain(): AppData | null {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? (JSON.parse(raw) as AppData) : null;
  } catch {
    return null;
  }
}

function savePlain(data: AppData) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function loadEncBlob(): EncryptedBlob | null {
  try {
    const raw = localStorage.getItem(DATA_ENC_KEY);
    return raw ? (JSON.parse(raw) as EncryptedBlob) : null;
  } catch {
    return null;
  }
}

function saveEncBlob(blob: EncryptedBlob) {
  localStorage.setItem(DATA_ENC_KEY, JSON.stringify(blob));
}

/** Loads data on boot. Returns { data, locked } — data is null while locked and unavailable. */
export async function bootLoad(): Promise<{ data: AppData; locked: boolean }> {
  const meta = loadLockMeta();
  if (meta.lockMethod === "passcode" && meta.encryptData) {
    return { data: emptyData(), locked: true };
  }
  const data = loadPlain();
  return { data: data ?? emptyData(), locked: false };
}

export async function verifyAndUnlock(passcode: string): Promise<AppData | null> {
  const meta = loadLockMeta();
  if (!meta.passcodeHash || !meta.passcodeSalt) return null;
  const hash = await hashPasscode(passcode, meta.passcodeSalt);
  if (hash !== meta.passcodeHash) return null;
  setSessionPasscode(passcode);
  if (meta.encryptData) {
    const blob = loadEncBlob();
    if (!blob) return emptyData();
    try {
      return await decryptJson<AppData>(blob, passcode, meta.passcodeSalt);
    } catch {
      return null;
    }
  }
  return loadPlain() ?? emptyData();
}

export async function persist(data: AppData): Promise<void> {
  const meta = loadLockMeta();
  if (meta.lockMethod === "passcode" && meta.encryptData && sessionPasscode && meta.passcodeSalt) {
    const blob = await encryptJson(data, sessionPasscode, meta.passcodeSalt);
    saveEncBlob(blob);
    return;
  }
  savePlain(data);
}

/** Turns on a passcode lock. Pass encrypt=true to also encrypt the data at rest. */
export async function enablePasscode(passcode: string, encrypt: boolean, currentData: AppData): Promise<void> {
  const salt = randomSaltHex();
  const hash = await hashPasscode(passcode, salt);
  saveLockMeta({ lockMethod: "passcode", passcodeHash: hash, passcodeSalt: salt, encryptData: encrypt });
  setSessionPasscode(passcode);
  if (encrypt) {
    const blob = await encryptJson(currentData, passcode, salt);
    saveEncBlob(blob);
    localStorage.removeItem(DATA_KEY);
  } else {
    savePlain(currentData);
  }
}

export async function changePasscode(newPasscode: string, currentData: AppData): Promise<void> {
  const meta = loadLockMeta();
  await enablePasscode(newPasscode, meta.encryptData, currentData);
}

export async function disablePasscode(currentData: AppData): Promise<void> {
  saveLockMeta({ lockMethod: "none", encryptData: false });
  setSessionPasscode(null);
  savePlain(currentData);
  localStorage.removeItem(DATA_ENC_KEY);
}

export function wipeAllLocalData(): void {
  localStorage.removeItem(LOCK_META_KEY);
  localStorage.removeItem(DATA_KEY);
  localStorage.removeItem(DATA_ENC_KEY);
  setSessionPasscode(null);
}

export function exportDataAsJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}
