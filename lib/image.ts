"use client";

/**
 * Reads a picked file and re-encodes it to a bounded JPEG data URL.
 * Everything stays in the browser — nothing is uploaded.
 *
 * `aspect` is width / height: 1 for square feed photos, 9/16 for reels.
 */
export async function downscale(file: File, aspect = 1): Promise<string> {
  const maxWidth = aspect < 1 ? 720 : 1080;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not read that image."));
    el.src = dataUrl;
  });

  // Largest centred crop of the target aspect that fits inside the source.
  let cropW = img.width;
  let cropH = cropW / aspect;
  if (cropH > img.height) {
    cropH = img.height;
    cropW = cropH * aspect;
  }

  const outW = Math.min(cropW, maxWidth);
  const outH = outW / aspect;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(outW);
  canvas.height = Math.round(outH);

  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.drawImage(
    img,
    (img.width - cropW) / 2,
    (img.height - cropH) / 2,
    cropW,
    cropH,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL("image/jpeg", 0.8);
}
