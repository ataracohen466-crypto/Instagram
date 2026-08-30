import { ImageResponse } from "next/og";
import { inkwellGlyph } from "@/lib/icon";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(inkwellGlyph(size.width), { ...size });
}
