"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import QRPanel from "@/components/QRPanel";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import { useI18n } from "@/lib/i18n";
import { getBook, updateBook, deleteBook, deletePage, uploadFile } from "@/lib/api";
import { compileBookTargets } from "@/lib/compile-book";
import {
  bookNeedsRecompile,
  targetsFingerprint,
  RECOMMENDED_MAX_PAGES,
  type Book,
} from "@/lib/types";

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  const router = useRouter();

  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compilePercent, setCompilePercent] = useState<number | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    getBook(id).then(setBook).catch((e) => setError(e.message));
  }, [id]);

  useEffect(reload, [reload]);

  const pages = book?.pages ?? [];
  const needsCompile = book ? bookNeedsRecompile(book) : false;
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/book/${id}` : "";

  const compile = async () => {
    if (!book || pages.length === 0) return;
    setCompileError(null);
    setCompilePercent(0);
    try {
      const ordered = pages.slice().sort((a, b) => a.targetIndex - b.targetIndex);
      const blob = await compileBookTargets(
        ordered.map((p) => p.targetImageUrl),
        ({ percent }) => setCompilePercent(percent)
      );
      const mindUrl = await uploadFile(blob, "mind", `${book.id}-${Date.now()}.mind`);
      const updated = await updateBook(book.id, {
        mindUrl,
        mindCompiledAt: new Date().toISOString(),
        config: { ...book.config, mindFingerprint: targetsFingerprint(ordered) },
      });
      setBook(updated);
    } catch (e) {
      setCompileError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompilePercent(null);
    }
  };

  const togglePublish = async () => {
    if (!book) return;
    setBusy(true);
    try {
      setBook(await updateBook(book.id, { status: book.status === "published" ? "draft" : "published" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const removeBook = async () => {
    if (!book || !window.confirm(t("deleteBookConfirm"))) return;
    await deleteBook(book.id);
    router.push("/");
  };

  const removePage = async (pageId: string) => {
    if (!book || !window.confirm(t("deletePageConfirm"))) return;
    await deletePage(book.id, pageId);
    reload();
  };

  if (error) {
    return (
      <AppShell backHref="/">
        <p className="text-coral-deep">{error}</p>
      </AppShell>
    );
  }
  if (!book) {
    return (
      <AppShell backHref="/">
        <p className="opacity-60">{t("loading")}</p>
      </AppShell>
    );
  }

  return (
    <AppShell backHref="/" title={book.title}>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pages column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">{t("pages")}</h2>
            <span className="text-sm opacity-60">({pages.length})</span>
            <Link
              href={`/books/${id}/pages/new`}
              className="ms-auto px-4 py-2 rounded-full bg-coral text-white font-bold text-sm shadow hover:bg-coral-deep transition-colors"
            >
              + {t("addPage")}
            </Link>
          </div>

          {pages.length > RECOMMENDED_MAX_PAGES && (
            <p className="text-sm bg-sunshine/30 rounded-2xl px-4 py-2">
              ⚠️ {t("tooManyPages", { n: RECOMMENDED_MAX_PAGES })}
            </p>
          )}

          {pages.length === 0 && (
            <div className="text-center py-14 rounded-blob border-2 border-dashed border-line">
              <div className="text-5xl mb-2 animate-float-soft">🦁</div>
              <p className="opacity-60">{t("compileHint")}</p>
            </div>
          )}

          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center gap-4 bg-card rounded-blob border border-line p-3 shadow-sm"
            >
              <span className="w-7 h-7 shrink-0 rounded-full bg-sunshine/50 text-sm font-bold flex items-center justify-center">
                {page.targetIndex + 1}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.targetImageUrl}
                alt=""
                className="w-16 h-16 rounded-2xl object-cover border border-line shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold truncate">{page.title}</h3>
                <p className="text-xs opacity-60">
                  🧸 GLB {page.audioUrl && "• 🎵"}
                </p>
              </div>
              <Link
                href={`/books/${id}/pages/${page.id}`}
                className="px-3 py-1.5 rounded-full bg-sky/15 text-sm hover:bg-sky/30 transition-colors"
              >
                ✏️
              </Link>
              <button
                onClick={() => removePage(page.id)}
                className="px-3 py-1.5 rounded-full bg-coral/10 text-sm hover:bg-coral/25 transition-colors"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {/* Publish column */}
        <div className="space-y-5">
          <div className="bg-card rounded-blob border border-line p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold">{t("status")}</h3>
              <span
                className={`ms-auto px-2.5 py-0.5 rounded-full text-sm ${
                  book.status === "published" ? "bg-mint/25 text-green-800" : "bg-line"
                }`}
              >
                {t(book.status)}
              </span>
            </div>

            {pages.length > 0 && (
              <>
                {compilePercent !== null ? (
                  <div>
                    <div className="h-3 rounded-full bg-line overflow-hidden">
                      <div
                        className="h-full bg-mint rounded-full transition-all"
                        style={{ width: `${compilePercent}%` }}
                      />
                    </div>
                    <p className="text-sm text-center mt-1 animate-pulse">
                      {t("compiling")} {compilePercent}%
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={compile}
                    className={`w-full py-2.5 rounded-full font-bold text-sm transition-colors ${
                      needsCompile
                        ? "bg-sunshine hover:bg-sunshine/80"
                        : "bg-line hover:bg-sunshine/50"
                    }`}
                  >
                    {needsCompile ? `⚠️ ${t("compileNeeded")} — ` : "✅ "}
                    {t("compile")}
                  </button>
                )}
                {compileError && (
                  <p className="text-sm text-coral-deep">{t("compileFailed")}: {compileError}</p>
                )}
                {book.mindUrl && !needsCompile && (
                  <p className="text-xs text-center opacity-60">{t("compileDone")}</p>
                )}
              </>
            )}

            <button
              onClick={togglePublish}
              disabled={busy || (book.status === "draft" && (!book.mindUrl || pages.length === 0))}
              className="w-full py-2.5 rounded-full bg-coral text-white font-bold text-sm shadow hover:bg-coral-deep transition-colors disabled:opacity-40"
            >
              {book.status === "published" ? t("unpublish") : t("publish")}
            </button>

            <button
              onClick={removeBook}
              className="w-full py-2 rounded-full text-coral-deep text-sm hover:bg-coral/10 transition-colors"
            >
              🗑️ {t("delete")}
            </button>
          </div>

          {publicUrl && book.mindUrl && <QRPanel url={publicUrl} name={book.title} />}
          <AnalyticsPanel bookId={id} />
        </div>
      </div>
    </AppShell>
  );
}
