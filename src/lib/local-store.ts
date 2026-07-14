import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import type { Book, BookPage, BookAnalytics, ScanInfo } from "./types";
import type {
  BookStore,
  CreateBookInput,
  CreatePageInput,
  UpdateBookPatch,
  UpdatePagePatch,
} from "./store";

interface ScanRow extends ScanInfo {
  id: string;
  createdAt: string;
}

interface DbShape {
  books: Book[];
  pages: BookPage[];
  scans: ScanRow[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

/** JSON-file store for local development. Never used in production. */
export class LocalStore implements BookStore {
  private async read(): Promise<DbShape> {
    try {
      const raw = await fs.readFile(DB_FILE, "utf8");
      return JSON.parse(raw) as DbShape;
    } catch {
      return { books: [], pages: [], scans: [] };
    }
  }

  private async write(db: DbShape): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
  }

  private withPages(db: DbShape, book: Book): Book {
    const pages = db.pages
      .filter((p) => p.bookId === book.id)
      .sort((a, b) => a.targetIndex - b.targetIndex);
    return { ...book, pages };
  }

  async listBooks(): Promise<Book[]> {
    const db = await this.read();
    return db.books
      .map((b) => this.withPages(db, b))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  async getBook(id: string): Promise<Book | null> {
    const db = await this.read();
    const book = db.books.find((b) => b.id === id);
    return book ? this.withPages(db, book) : null;
  }

  async createBook(input: CreateBookInput): Promise<Book> {
    const db = await this.read();
    const now = new Date().toISOString();
    const book: Book = {
      id: nanoid(10),
      title: input.title,
      description: input.description,
      coverUrl: input.coverUrl,
      status: "draft",
      config: {},
      totalViews: 0,
      createdAt: now,
      updatedAt: now,
    };
    db.books.push(book);
    await this.write(db);
    return { ...book, pages: [] };
  }

  async updateBook(id: string, patch: UpdateBookPatch): Promise<Book | null> {
    const db = await this.read();
    const book = db.books.find((b) => b.id === id);
    if (!book) return null;
    Object.assign(book, patch, { updatedAt: new Date().toISOString() });
    await this.write(db);
    return this.withPages(db, book);
  }

  async deleteBook(id: string): Promise<boolean> {
    const db = await this.read();
    const before = db.books.length;
    db.books = db.books.filter((b) => b.id !== id);
    db.pages = db.pages.filter((p) => p.bookId !== id);
    db.scans = db.scans.filter((s) => s.bookId !== id);
    await this.write(db);
    return db.books.length < before;
  }

  async createPage(bookId: string, input: CreatePageInput): Promise<BookPage | null> {
    const db = await this.read();
    if (!db.books.some((b) => b.id === bookId)) return null;
    const siblings = db.pages.filter((p) => p.bookId === bookId);
    const now = new Date().toISOString();
    const page: BookPage = {
      id: nanoid(10),
      bookId,
      targetIndex: siblings.length,
      title: input.title,
      targetImageUrl: input.targetImageUrl,
      modelUrl: input.modelUrl,
      audioUrl: input.audioUrl,
      config: input.config ?? {},
      createdAt: now,
      updatedAt: now,
    };
    db.pages.push(page);
    await this.write(db);
    return page;
  }

  async updatePage(bookId: string, pageId: string, patch: UpdatePagePatch): Promise<BookPage | null> {
    const db = await this.read();
    const page = db.pages.find((p) => p.id === pageId && p.bookId === bookId);
    if (!page) return null;
    const { audioUrl, ...rest } = patch;
    Object.assign(page, rest, { updatedAt: new Date().toISOString() });
    if (audioUrl !== undefined) page.audioUrl = audioUrl ?? undefined;
    await this.write(db);
    return page;
  }

  async deletePage(bookId: string, pageId: string): Promise<boolean> {
    const db = await this.read();
    const before = db.pages.length;
    db.pages = db.pages.filter((p) => !(p.id === pageId && p.bookId === bookId));
    if (db.pages.length === before) return false;
    // Keep targetIndex dense so it always matches the compile order.
    db.pages
      .filter((p) => p.bookId === bookId)
      .sort((a, b) => a.targetIndex - b.targetIndex)
      .forEach((p, i) => (p.targetIndex = i));
    await this.write(db);
    return true;
  }

  async recordScan(scan: ScanInfo): Promise<void> {
    const db = await this.read();
    const book = db.books.find((b) => b.id === scan.bookId);
    if (!book) return;
    const now = new Date().toISOString();
    db.scans.push({ ...scan, id: nanoid(10), createdAt: now });
    book.totalViews += 1;
    book.lastViewedAt = now;
    await this.write(db);
  }

  async getAnalytics(bookId: string): Promise<BookAnalytics | null> {
    const db = await this.read();
    const book = db.books.find((b) => b.id === bookId);
    if (!book) return null;
    const scans = db.scans.filter((s) => s.bookId === bookId);
    const count = (key: "deviceType" | "os") =>
      scans.reduce<Record<string, number>>((acc, s) => {
        acc[s[key]] = (acc[s[key]] ?? 0) + 1;
        return acc;
      }, {});
    return {
      totalViews: book.totalViews,
      lastViewedAt: book.lastViewedAt,
      byDevice: count("deviceType"),
      byOs: count("os"),
      recent: scans
        .slice(-20)
        .reverse()
        .map((s) => ({ createdAt: s.createdAt, deviceType: s.deviceType, os: s.os, browser: s.browser })),
    };
  }
}
