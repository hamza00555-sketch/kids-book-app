import { promises as fs } from "fs";
import path from "path";
import { MIME_BY_EXTENSION, extensionOf } from "@/lib/upload-config";

type Params = { params: Promise<{ name: string }> };

/** Local development only: serves files saved by /api/upload. */
export async function GET(_req: Request, { params }: Params) {
  const { name } = await params;
  const safe = path.basename(name); // no traversal
  const filePath = path.join(process.cwd(), "data", "uploads", safe);
  try {
    const data = await fs.readFile(filePath);
    const mime = MIME_BY_EXTENSION[extensionOf(safe)] ?? "application/octet-stream";
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
