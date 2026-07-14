import { NextResponse } from "next/server";
import { storageMode, appUrl } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    storage: storageMode(),
    appUrl: appUrl(),
  });
}
