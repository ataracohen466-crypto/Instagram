import { ImageResponse } from "next/og";
import { bloomGlyph } from "@/lib/icon";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(bloomGlyph(192), { width: 192, height: 192 });
}
