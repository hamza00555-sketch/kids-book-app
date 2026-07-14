import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import type { Book, BookPage, BookAnalytics, ScanInfo } from "./types";
import type {
  BookStore,
  CreateBookInput,
  CreatePageInput,
  UpdateBookPatch,
  UpdatePagePatch,
} from "./store";
import { getSupabaseEnv } from "./env";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function rowToBook(row: Row): Book {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    coverUrl: row.cover_url ?? undefined,
    mindUrl: row.mind_url ?? undefined,
    mindCompiledAt: row.mind_compiled_at ?? undefined,
    config: row.config ?? {},
    totalViews: row.total_views ?? 0,
    lastViewedAt: row.last_viewed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPage(row: Row): BookPage {
  return {
    id: row.id,
    bookId: row.book_id,
    targetIndex: row.target_index,
    title: row.title,
    targetImageUrl: row.target_image_url,
    modelUrl: row.model_url,
    audioUrl: row.audio_url ?? undefined,
    config: row.config ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Production store: Supabase Postgres. Uses the secret key — server only.
 * All tables live in the dedicated "kidsbook" schema so the app can share a
 * Supabase project with other apps and be split out later without code changes.
 */
export class SupabaseStore implements BookStore {
  // Schema-typed client: every .from()/.rpc() targets the "kidsbook" schema.
  private client: SupabaseClient<any, any, "kidsbook">;

  constructor() {
    const env = getSupabaseEnv();
    if (!env) throw new Error("SupabaseStore constructed without SUPABASE_URL/SUPABASE_SECRET_KEY");
    this.client = createClient(env.url, env.secretKey, {
      auth: { persistSession: false },
      db: { schema: "kidsbook" },
    });
  }

  private async pagesOf(bookIds: string[]): Promise<Map<string, BookPage[]>> {
    const map = new Map<string, BookPage[]>();
    if (bookIds.length === 0) return map;
    const { data, error } = await this.client
      .from("book_pages")
      .select("*")
      .in("book_id", bookIds)
      .order("target_index", { ascending: true });
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const page = rowToPage(row);
      const list = map.get(page.bookId) ?? [];
      list.push(page);
      map.set(page.bookId, list);
    }
    return map;
  }

  async listBooks(): Promise<Book[]> {
    const { data, error } = await this.client
      .from("books")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const books = (data ?? []).map(rowToBook);
    const pages = await this.pagesOf(books.map((b) => b.id));
    return books.map((b) => ({ ...b, pages: pages.get(b.id) ?? [] }));
  }

  async getBook(id: string): Promise<Book | null> {
    const { data, error } = await this.client.from("books").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const book = rowToBook(data);
    const pages = await this.pagesOf([id]);
    return { ...book, pages: pages.get(id) ?? [] };
  }

  async createBook(input: CreateBookInput): Promise<Book> {
    const { data, error } = await this.client
      .from("books")
      .insert({
        id: nanoid(10),
        title: input.title,
        description: input.description ?? null,
        cover_url: input.coverUrl ?? null,
        status: "draft",
        config: {},
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { ...rowToBook(data), pages: [] };
  }

  async updateBook(id: string, patch: UpdateBookPatch): Promise<Book | null> {
    const row: Row = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.coverUrl !== undefined) row.cover_url = patch.coverUrl;
    if (patch.mindUrl !== undefined) row.mind_url = patch.mindUrl;
    if (patch.mindCompiledAt !== undefined) row.mind_compiled_at = patch.mindCompiledAt;
    if (patch.config !== undefined) row.config = patch.config;
    const { data, error } = await this.client
      .from("books")
      .update(row)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const pages = await this.pagesOf([id]);
    return { ...rowToBook(data), pages: pages.get(id) ?? [] };
  }

  async deleteBook(id: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("books")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  async createPage(bookId: string, input: CreatePageInput): Promise<BookPage | null> {
    const { count, error: countError } = await this.client
      .from("book_pages")
      .select("id", { count: "exact", head: true })
      .eq("book_id", bookId);
    if (countError) throw new Error(countError.message);
    const { data, error } = await this.client
      .from("book_pages")
      .insert({
        id: nanoid(10),
        book_id: bookId,
        target_index: count ?? 0,
        title: input.title,
        target_image_url: input.targetImageUrl,
        model_url: input.modelUrl,
        audio_url: input.audioUrl ?? null,
        config: input.config ?? {},
      })
      .select("*")
      .single();
    if (error) {
      // FK violation → the book does not exist.
      if (error.code === "23503") return null;
      throw new Error(error.message);
    }
    return rowToPage(data);
  }

  async updatePage(bookId: string, pageId: string, patch: UpdatePagePatch): Promise<BookPage | null> {
    const row: Row = { updated_at: new Date().toISOString() };
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.targetImageUrl !== undefined) row.target_image_url = patch.targetImageUrl;
    if (patch.modelUrl !== undefined) row.model_url = patch.modelUrl;
    if (patch.audioUrl !== undefined) row.audio_url = patch.audioUrl;
    if (patch.config !== undefined) row.config = patch.config;
    if (patch.targetIndex !== undefined) row.target_index = patch.targetIndex;
    const { data, error } = await this.client
      .from("book_pages")
      .update(row)
      .eq("id", pageId)
      .eq("book_id", bookId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToPage(data) : null;
  }

  async deletePage(bookId: string, pageId: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("book_pages")
      .delete({ count: "exact" })
      .eq("id", pageId)
      .eq("book_id", bookId);
    if (error) throw new Error(error.message);
    if ((count ?? 0) === 0) return false;
    // Re-densify target_index so it always matches the compile order.
    const { data, error: listError } = await this.client
      .from("book_pages")
      .select("id, target_index")
      .eq("book_id", bookId)
      .order("target_index", { ascending: true });
    if (listError) throw new Error(listError.message);
    for (let i = 0; i < (data ?? []).length; i++) {
      if (data![i].target_index !== i) {
        await this.client.from("book_pages").update({ target_index: i }).eq("id", data![i].id);
      }
    }
    return true;
  }

  async recordScan(scan: ScanInfo): Promise<void> {
    const { error } = await this.client.rpc("record_scan", {
      p_book_id: scan.bookId,
      p_device_type: scan.deviceType,
      p_os: scan.os,
      p_browser: scan.browser,
      p_referrer: scan.referrer ?? null,
      p_user_agent: scan.userAgent ?? null,
    });
    if (error) throw new Error(error.message);
  }

  async getAnalytics(bookId: string): Promise<BookAnalytics | null> {
    const { data: book, error } = await this.client
      .from("books")
      .select("total_views, last_viewed_at")
      .eq("id", bookId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!book) return null;
    const { data: scans, error: scanError } = await this.client
      .from("scans")
      .select("device_type, os, browser, created_at")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (scanError) throw new Error(scanError.message);
    const count = (key: "device_type" | "os") =>
      (scans ?? []).reduce<Record<string, number>>((acc, s: Row) => {
        acc[s[key]] = (acc[s[key]] ?? 0) + 1;
        return acc;
      }, {});
    return {
      totalViews: book.total_views ?? 0,
      lastViewedAt: book.last_viewed_at ?? undefined,
      byDevice: count("device_type"),
      byOs: count("os"),
      recent: (scans ?? []).slice(0, 20).map((s: Row) => ({
        createdAt: s.created_at,
        deviceType: s.device_type,
        os: s.os,
        browser: s.browser,
      })),
    };
  }
}
