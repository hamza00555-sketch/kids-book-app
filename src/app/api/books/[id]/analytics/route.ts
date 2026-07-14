import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { serverError, notFound } from "@/lib/api-errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const store = await getStore();
    const analytics = await store.getAnalytics(id);
    if (!analytics) return notFound("Book not found");
    return NextResponse.json({ analytics });
  } catch (e) {
    return serverError("Failed to load analytics", e);
  }
}
