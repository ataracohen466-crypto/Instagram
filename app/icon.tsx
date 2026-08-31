import { ImageResponse } from "next/og";
import { bloomGlyph } from "@/lib/icon";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(bloomGlyph(size.width), { ...size });
}
