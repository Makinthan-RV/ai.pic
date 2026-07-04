import { NextResponse } from "next/server";
import { aiDetect } from "@/lib/ai";

// Public (guest) — called repeatedly by the Face Scan loop with camera frames.
export const maxDuration = 30;

/**
 * POST /api/selfie/detect  (multipart: image)
 * Returns the AI quality gate result so the browser knows when to auto-capture.
 * Deliberately thin and fast — no DB, no auth.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const image = form.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "image required" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await image.arrayBuffer());
    const result = await aiDetect(new Blob([buffer], { type: "image/jpeg" }));
    return NextResponse.json(result);
  } catch {
    // Don't break the scan loop on a transient error — report "not ready".
    return NextResponse.json({ count: 0, ready: false, reason: "Scanning…" });
  }
}
