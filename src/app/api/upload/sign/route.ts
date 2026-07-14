import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { validateUpload, type UploadKind } from "@/lib/upload-config";
import { storageMode } from "@/lib/env";
import { createSignedUpload } from "@/lib/storage";
import { serverError, badRequest } from "@/lib/api-errors";

/**
 * Step 1 of the two-step direct upload. The browser then PUTs the file straight
 * to Supabase Storage, bypassing Vercel's 4.5MB request body limit entirely.
 * Without Supabase keys it answers { mode: "local" } and the browser falls back
 * to a plain multipart POST to /api/upload (dev only).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const kind = body.kind as UploadKind;
    const name = typeof body.name === "string" ? body.name : "";
    const size = typeof body.size === "number" ? body.size : 0;

    const invalid = validateUpload(kind, name, size);
    if (invalid) return badRequest(invalid);

    if (storageMode() === "local") {
      return NextResponse.json({ mode: "local" });
    }

    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectPath = `${kind}/${nanoid(8)}-${safeName}`;
    const signed = await createSignedUpload(objectPath);
    return NextResponse.json({ mode: "signed", ...signed });
  } catch (e) {
    return serverError("Failed to sign upload", e);
  }
}
