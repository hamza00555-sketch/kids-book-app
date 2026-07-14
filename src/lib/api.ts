// Client-side fetch helpers. Every function throws an Error carrying the
// server's real message so the UI can display it verbatim.

import type { Book, BookPage, BookAnalytics } from "./types";
import type { UploadKind } from "./upload-config";

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export async function listBooks(): Promise<Book[]> {
  const { books } = await jsonOrThrow<{ books: Book[] }>(await fetch("/api/books"));
  return books;
}

export async function getBook(id: string): Promise<Book> {
  const { book } = await jsonOrThrow<{ book: Book }>(await fetch(`/api/books/${id}`));
  return book;
}

export async function createBook(input: { title: string; description?: string; coverUrl?: string }): Promise<Book> {
  const { book } = await jsonOrThrow<{ book: Book }>(
    await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return book;
}

export async function updateBook(id: string, patch: Record<string, unknown>): Promise<Book> {
  const { book } = await jsonOrThrow<{ book: Book }>(
    await fetch(`/api/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  );
  return book;
}

export async function deleteBook(id: string): Promise<void> {
  await jsonOrThrow(await fetch(`/api/books/${id}`, { method: "DELETE" }));
}

export async function createPage(
  bookId: string,
  input: { title: string; targetImageUrl: string; modelUrl: string; audioUrl?: string; config?: Record<string, unknown> }
): Promise<BookPage> {
  const { page } = await jsonOrThrow<{ page: BookPage }>(
    await fetch(`/api/books/${bookId}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
  return page;
}

export async function updatePage(bookId: string, pageId: string, patch: Record<string, unknown>): Promise<BookPage> {
  const { page } = await jsonOrThrow<{ page: BookPage }>(
    await fetch(`/api/books/${bookId}/pages/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  );
  return page;
}

export async function deletePage(bookId: string, pageId: string): Promise<void> {
  await jsonOrThrow(await fetch(`/api/books/${bookId}/pages/${pageId}`, { method: "DELETE" }));
}

export async function getAnalytics(bookId: string): Promise<BookAnalytics> {
  const { analytics } = await jsonOrThrow<{ analytics: BookAnalytics }>(
    await fetch(`/api/books/${bookId}/analytics`)
  );
  return analytics;
}

/**
 * Two-step direct upload: ask /api/upload/sign for a signed URL, then PUT the
 * file straight to Supabase Storage (no Vercel 4.5MB limit). In local dev mode
 * the sign route answers { mode: "local" } and we fall back to multipart.
 * Returns the public URL of the stored file.
 */
export async function uploadFile(file: File | Blob, kind: UploadKind, fileName?: string): Promise<string> {
  const name = fileName ?? (file instanceof File ? file.name : `file-${Date.now()}`);
  const signed = await jsonOrThrow<
    | { mode: "local" }
    | { mode: "signed"; uploadUrl: string; token: string; publicUrl: string }
  >(
    await fetch("/api/upload/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name, size: file.size }),
    })
  );

  if (signed.mode === "local") {
    const form = new FormData();
    form.append("file", file, name);
    form.append("kind", kind);
    const { publicUrl } = await jsonOrThrow<{ publicUrl: string }>(
      await fetch("/api/upload", { method: "POST", body: form })
    );
    return publicUrl;
  }

  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false",
    },
    body: file,
  });
  if (!put.ok) {
    const detail = await put.text().catch(() => "");
    throw new Error(`Storage upload failed (${put.status}) ${detail}`.trim());
  }
  return signed.publicUrl;
}

export async function trackView(bookId: string): Promise<void> {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
      keepalive: true,
    });
  } catch {
    // Analytics must never break the viewer.
  }
}
