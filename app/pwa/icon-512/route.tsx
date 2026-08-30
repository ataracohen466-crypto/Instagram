import { ImageResponse } from "next/og";
import { inkwellGlyph } from "@/lib/icon";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(inkwellGlyph(512), { width: 512, height: 512 });
}
