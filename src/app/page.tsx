"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { listBooks } from "@/lib/api";
import { bookNeedsRecompile, type Book } from "@/lib/types";

export default function DashboardPage() {
  const { t } = useI18n();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBooks().then(setBooks).catch((e) => setError(e.message));
  }, []);

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{t("myBooks")}</h1>
        <Link
          href="/books/new"
          className="ms-auto px-5 py-2.5 rounded-full bg-coral text-white font-bold shadow-md hover:bg-coral-deep transition-colors"
        >
          + {t("newBook")}
        </Link>
      </div>

      {error && (
        <div className="rounded-blob bg-coral/10 border border-coral p-4 text-coral-deep">{error}</div>
      )}

      {!books && !error && <p className="opacity-60">{t("loading")}</p>}

      {books && books.length === 0 && (
        <div className="text-center py-20 animate-pop-in">
          <div className="text-6xl mb-4 animate-float-soft">📚✨</div>
          <p className="text-lg opacity-70">{t("noBooksYet")}</p>
        </div>
      )}

      {books && books.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="group rounded-blob bg-card border border-line overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="h-36 bg-sunshine/30 flex items-center justify-center overflow-hidden">
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <span className="text-5xl" aria-hidden>📖</span>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-bold truncate">{book.title}</h2>
                <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      book.status === "published" ? "bg-mint/25 text-green-800" : "bg-line"
                    }`}
                  >
                    {t(book.status)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-sky/15">
                    {book.pages?.length ?? 0} {t("pages")}
                  </span>
                  {bookNeedsRecompile(book) && (
                    <span className="px-2 py-0.5 rounded-full bg-sunshine/50">⚠ {t("compileNeeded")}</span>
                  )}
                  <span className="ms-auto opacity-60">👀 {book.totalViews}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
