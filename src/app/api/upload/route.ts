import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { validateUpload, type UploadKind } from "@/lib/upload-config";
import { storageMode } from "@/lib/env";
import { serverError, badRequest } from "@/lib/api-errors";

/** Local development only: multipart upload saved under data/uploads/. */
export async function POST(req: Request) {
  try {
    if (storageMode() !== "local") {
      return badRequest("Direct upload is disabled in production — use /api/upload/sign");
    }
    const form = await req.formData();
    const file = form.get("file");
    const kind = form.get("kind") as UploadKind;
    if (!(file instanceof File)) return badRequest("No file provided");

    const invalid = validateUpload(kind, file.name, file.size);
    if (invalid) return badRequest(invalid);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const stored = `${nanoid(8)}-${safeName}`;
    const dir = path.join(process.cwd(), "data", "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, stored), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ publicUrl: `/api/files/${stored}` });
  } catch (e) {
    return serverError("Failed to upload file", e);
  }
}
