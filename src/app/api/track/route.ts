import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { parseUserAgent } from "@/lib/ua";

/**
 * Analytics beacon from the child viewer. Must never break the viewer:
 * any failure is swallowed and answered with ok anyway.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const bookId = typeof body.bookId === "string" ? body.bookId : "";
    if (!bookId) return NextResponse.json({ ok: false });
    const ua = req.headers.get("user-agent");
    const parsed = parseUserAgent(ua);
    const store = await getStore();
    await store.recordScan({
      bookId,
      deviceType: parsed.deviceType,
      os: parsed.os,
      browser: parsed.browser,
      referrer: req.headers.get("referer") ?? undefined,
      userAgent: ua ?? undefined,
    });
  } catch (e) {
    console.error("[track]", e);
  }
  return NextResponse.json({ ok: true });
}
