import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { serverError, badRequest, notFound } from "@/lib/api-errors";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return badRequest("Page title is required");
    if (typeof body.targetImageUrl !== "string" || !body.targetImageUrl) {
      return badRequest("Target image is required");
    }
    if (typeof body.modelUrl !== "string" || !body.modelUrl) {
      return badRequest("3D model (.glb) is required");
    }
    const store = await getStore();
    const page = await store.createPage(id, {
      title,
      targetImageUrl: body.targetImageUrl,
      modelUrl: body.modelUrl,
      audioUrl: typeof body.audioUrl === "string" ? body.audioUrl : undefined,
      config: body.config && typeof body.config === "object" ? body.config : undefined,
    });
    if (!page) return notFound("Book not found");
    return NextResponse.json({ page }, { status: 201 });
  } catch (e) {
    return serverError("Failed to add page", e);
  }
}
