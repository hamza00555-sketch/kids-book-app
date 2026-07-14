import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { serverError, notFound } from "@/lib/api-errors";
import type { UpdatePagePatch } from "@/lib/store";

type Params = { params: Promise<{ id: string; pageId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id, pageId } = await params;
    const body = await req.json();
    const patch: UpdatePagePatch = {};
    if (typeof body.title === "string") patch.title = body.title.trim();
    if (typeof body.targetImageUrl === "string") patch.targetImageUrl = body.targetImageUrl;
    if (typeof body.modelUrl === "string") patch.modelUrl = body.modelUrl;
    if (typeof body.audioUrl === "string" || body.audioUrl === null) patch.audioUrl = body.audioUrl;
    if (body.config && typeof body.config === "object") patch.config = body.config;
    const store = await getStore();
    const page = await store.updatePage(id, pageId, patch);
    if (!page) return notFound("Page not found");
    return NextResponse.json({ page });
  } catch (e) {
    return serverError("Failed to update page", e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id, pageId } = await params;
    const store = await getStore();
    const ok = await store.deletePage(id, pageId);
    if (!ok) return notFound("Page not found");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("Failed to delete page", e);
  }
}
