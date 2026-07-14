// Core domain types shared by the dashboard, API routes and the child viewer.

export type BookStatus = "draft" | "published";

/** Per-page tuning stored in book_pages.config (jsonb). */
export interface PageConfig {
  /** Model footprint relative to the printed page width (1 = as wide as the page). */
  scale?: number;
  /** Lift above the page surface, in page-width units. */
  offsetY?: number;
  /** Rotation around the vertical axis, in degrees. */
  rotationY?: number;
  /** Name of the GLB animation clip to play. Empty = first clip in the file. */
  animationClip?: string;
  audioLoop?: boolean;
}

/** Book-level settings stored in books.config (jsonb). */
export interface BookConfig {
  /** Accent color for the child start screen. */
  accentColor?: string;
  /** Celebration on first discovery of each page. */
  celebrate?: boolean;
  /** Snapshot of the target images baked into the current .mind file. */
  mindFingerprint?: string;
}

export interface BookPage {
  id: string;
  bookId: string;
  /** Position of this page inside the compiled .mind file (compile order). */
  targetIndex: number;
  title: string;
  targetImageUrl: string;
  modelUrl: string;
  audioUrl?: string;
  config: PageConfig;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  title: string;
  description?: string;
  status: BookStatus;
  coverUrl?: string;
  mindUrl?: string;
  /** When the current .mind was compiled — page edits after this mean "needs republish". */
  mindCompiledAt?: string;
  config: BookConfig;
  totalViews: number;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
  pages?: BookPage[];
}

export interface ScanInfo {
  bookId: string;
  deviceType: string;
  os: string;
  browser: string;
  referrer?: string;
  userAgent?: string;
}

export interface BookAnalytics {
  totalViews: number;
  lastViewedAt?: string;
  byDevice: Record<string, number>;
  byOs: Record<string, number>;
  recent: { createdAt: string; deviceType: string; os: string; browser: string }[];
}

/** More targets in one .mind slows matching down noticeably — warn past this. */
export const RECOMMENDED_MAX_PAGES = 15;

export const DEFAULT_PAGE_CONFIG: Required<Pick<PageConfig, "scale" | "offsetY" | "rotationY">> = {
  scale: 1,
  offsetY: 0,
  rotationY: 0,
};

/**
 * Identity of the target set baked into a .mind file: page order + target images.
 * Config-only edits (scale, clip, audio) do NOT require recompiling.
 */
export function targetsFingerprint(pages: BookPage[]): string {
  return pages
    .slice()
    .sort((a, b) => a.targetIndex - b.targetIndex)
    .map((p) => p.targetImageUrl)
    .join("|");
}

export function bookNeedsRecompile(book: Book): boolean {
  const pages = book.pages ?? [];
  if (pages.length === 0) return false;
  if (!book.mindUrl) return true;
  return targetsFingerprint(pages) !== (book.config.mindFingerprint ?? "");
}
