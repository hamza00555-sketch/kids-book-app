import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { serverError, badRequest } from "@/lib/api-errors";

export async function GET() {
  try {
    const store = await getStore();
    return NextResponse.json({ books: await store.listBooks() });
  } catch (e) {
    return serverError("Failed to list books", e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return badRequest("Book title is required");
    const store = await getStore();
    const book = await store.createBook({
      title,
      description: typeof body.description === "string" ? body.description : undefined,
      coverUrl: typeof body.coverUrl === "string" ? body.coverUrl : undefined,
    });
    return NextResponse.json({ book }, { status: 201 });
  } catch (e) {
    return serverError("Failed to create book", e);
  }
}
