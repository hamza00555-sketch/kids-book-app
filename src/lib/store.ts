import type { Book, BookPage, BookAnalytics, ScanInfo, BookConfig, PageConfig } from "./types";
import { getSupabaseEnv } from "./env";

export interface CreateBookInput {
  title: string;
  description?: string;
  coverUrl?: string;
}

export type UpdateBookPatch = Partial<{
  title: string;
  description: string;
  status: Book["status"];
  coverUrl: string;
  mindUrl: string;
  mindCompiledAt: string;
  config: BookConfig;
}>;

export interface CreatePageInput {
  title: string;
  targetImageUrl: string;
  modelUrl: string;
  audioUrl?: string;
  config?: PageConfig;
}

export type UpdatePagePatch = Partial<{
  title: string;
  targetImageUrl: string;
  modelUrl: string;
  audioUrl: string | null;
  config: PageConfig;
  targetIndex: number;
}>;

/**
 * Storage abstraction: the whole app talks to this interface only.
 * SupabaseStore runs in production; LocalStore (data/ folder) runs when no
 * Supabase keys are configured, so local dev needs zero setup.
 */
export interface BookStore {
  listBooks(): Promise<Book[]>;
  getBook(id: string): Promise<Book | null>;
  createBook(input: CreateBookInput): Promise<Book>;
  updateBook(id: string, patch: UpdateBookPatch): Promise<Book | null>;
  deleteBook(id: string): Promise<boolean>;

  createPage(bookId: string, input: CreatePageInput): Promise<BookPage | null>;
  updatePage(bookId: string, pageId: string, patch: UpdatePagePatch): Promise<BookPage | null>;
  deletePage(bookId: string, pageId: string): Promise<boolean>;

  recordScan(scan: ScanInfo): Promise<void>;
  getAnalytics(bookId: string): Promise<BookAnalytics | null>;
}

let cached: BookStore | null = null;

export async function getStore(): Promise<BookStore> {
  if (cached) return cached;
  if (getSupabaseEnv()) {
    const { SupabaseStore } = await import("./supabase-store");
    cached = new SupabaseStore();
  } else {
    const { LocalStore } = await import("./local-store");
    cached = new LocalStore();
  }
  return cached;
}
