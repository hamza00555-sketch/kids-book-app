import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { serverError, notFound } from "@/lib/api-errors";
import type { UpdateBookPatch } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const store = await getStore();
    const book = await store.getBook(id);
    if (!book) return notFound("Book not found");
    return NextResponse.json({ book });
  } catch (e) {
    return serverError("Failed to load book", e);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const patch: UpdateBookPatch = {};
    if (typeof body.title === "string") patch.title = body.title.trim();
    if (typeof body.description === "string") patch.description = body.description;
    if (body.status === "draft" || body.status === "published") patch.status = body.status;
    if (typeof body.coverUrl === "string") patch.coverUrl = body.coverUrl;
    if (typeof body.mindUrl === "string") patch.mindUrl = body.mindUrl;
    if (typeof body.mindCompiledAt === "string") patch.mindCompiledAt = body.mindCompiledAt;
    if (body.config && typeof body.config === "object") patch.config = body.config;
    const store = await getStore();
    const book = await store.updateBook(id, patch);
    if (!book) return notFound("Book not found");
    return NextResponse.json({ book });
  } catch (e) {
    return serverError("Failed to update book", e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const store = await getStore();
    const ok = await store.deleteBook(id);
    if (!ok) return notFound("Book not found");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("Failed to delete book", e);
  }
}
