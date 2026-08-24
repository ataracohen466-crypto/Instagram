"use client";

/**
 * Sharing out of the app.
 *
 * Everything here lives only in this browser, encrypted — there's no server
 * to publish a link to. So sharing means handing the actual file to the
 * device: the OS share sheet where that exists, and a plain download
 * everywhere else.
 */

export type ShareResult = "shared" | "downloaded" | "cancelled" | "unavailable";

function download(blob: Blob, filename: string): ShareResult {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoking immediately can cancel the download on some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return "downloaded";
  } catch {
    return "unavailable";
  }
}

export async function shareFile({
  blob,
  filename,
  title,
  text,
}: {
  blob: Blob;
  filename: string;
  title?: string;
  text?: string;
}): Promise<ShareResult> {
  const file = new File([blob], filename, {
    type: blob.type || "application/octet-stream",
  });

  // canShare must be asked about the actual file: a browser can support
  // navigator.share for links yet refuse file payloads.
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title, text });
      return "shared";
    } catch (err) {
      // Dismissing the sheet throws AbortError; that isn't a failure worth
      // falling back on, or the file would download behind their back.
      if (err instanceof DOMException && err.name === "AbortError")
        return "cancelled";
      return download(blob, filename);
    }
  }

  return download(blob, filename);
}

/** Strips anything a filesystem would object to. */
export function safeFilename(base: string, extension: string): string {
  const cleaned =
    base
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "instagr-ai";
  return `${cleaned}.${extension}`;
}

/** Picks a file extension from a blob's MIME type. */
export function extensionFor(blob: Blob, fallback: string): string {
  const type = blob.type || "";
  if (type.includes("mp4")) return "mp4";
  if (type.includes("webm")) return "webm";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("gif")) return "gif";
  return fallback;
}

/** Human date for "made on" labels, e.g. "24 Aug 2026". */
export function madeOn(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
