// Minimal IndexedDB wrapper used only to store photo image data (journal
// photos, skin progress photos) on-device. Structured data lives in
// localStorage via lib/store.ts; photos are kept separately here because
// they're too large for localStorage's quota.

const DB_NAME = "bloom-photos";
const STORE = "images";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putImage(id: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getImage(id: string): Promise<string | undefined> {
  const db = await openDb();
  const result = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function deleteImage(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getAllImageIds(): Promise<string[]> {
  const db = await openDb();
  const result = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function clearAllImages(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Downscales/compresses an image file to a reasonable size before storing. */
export function fileToCompressedDataUrl(file: File, maxDim = 1280, quality = 0.85): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", quality), width, height });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
