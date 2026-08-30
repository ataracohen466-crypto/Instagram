import { ImageResponse } from "next/og";
import { inkwellGlyph } from "@/lib/icon";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(inkwellGlyph(192), { width: 192, height: 192 });
}
