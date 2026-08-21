"use client";

/**
 * Client-side file → text/image extraction for the notes uploader.
 *
 * PDFs are parsed in the browser with pdf.js so the raw file never leaves the
 * device — only the extracted text is posted to the API. Scanned PDFs have no
 * text layer, so when extraction comes back empty the caller is told to fall
 * back to photographing the page instead (which goes to Claude as vision
 * input).
 */

export interface ExtractedImage {
  mediaType: string;
  /** Base64 without the data-URL prefix, which is what the API route wants. */
  data: string;
}

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function fileToImage(file: File): Promise<ExtractedImage> {
  const dataUrl = await readAsDataUrl(file);
  const comma = dataUrl.indexOf(",");
  return {
    mediaType: file.type || "image/jpeg",
    data: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl,
  };
}

/** Downscales a photo so a phone-camera shot doesn't blow past the size cap. */
export async function shrinkImage(
  file: File,
  maxEdge = 1600
): Promise<ExtractedImage> {
  if (typeof document === "undefined") return fileToImage(file);
  try {
    const dataUrl = await readAsDataUrl(file);
    const image = await loadImage(dataUrl);
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    if (scale >= 1 && file.size <= MAX_IMAGE_BYTES) return fileToImage(file);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return fileToImage(file);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const out = canvas.toDataURL("image/jpeg", 0.85);
    return { mediaType: "image/jpeg", data: out.slice(out.indexOf(",") + 1) };
  } catch {
    return fileToImage(file);
  }
}

export async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Bundled worker — resolved by the bundler, no CDN fetch at runtime.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) pages.push(text);
  }
  await doc.destroy();
  return pages.join("\n\n");
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
