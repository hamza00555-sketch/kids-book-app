"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { listBooks } from "@/lib/api";
import { bookNeedsRecompile, type Book } from "@/lib/types";

export default function DashboardPage() {
  const { t, lang } = useI18n();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBooks().then(setBooks).catch((e) => setError(e.message));
  }, []);

  const stats = useMemo(() => {
    const list = books ?? [];
    return {
      total: list.length,
      published: list.filter((book) => book.status === "published").length,
      views: list.reduce((sum, book) => sum + (book.totalViews ?? 0), 0),
    };
  }, [books]);

  return (
    <AppShell>
      <section className="hayya-hero mb-14 sm:mb-20">
        <div className="relative min-h-[430px] sm:w-[58%] ms-auto flex flex-col justify-end sm:justify-center p-6 sm:p-10 lg:p-14">
          <span className="hayya-kicker w-fit">✦ {lang === "ar" ? "استوديو القصص الحيّة" : "Living stories studio"}</span>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.055em] leading-[1.12]">
            {lang === "ar" ? (
              <>كل صفحةٍ بوابة.<br /><span className="text-sunshine">وكل طفلٍ مستكشف.</span></>
            ) : (
              <>Every page is a portal.<br /><span className="text-sunshine">Every child, an explorer.</span></>
            )}
          </h1>
          <p className="mt-5 max-w-xl text-sm sm:text-base leading-8 text-white/72 font-normal">
            {lang === "ar"
              ? "اصنع كتباً ورقية تتحول أمام الطفل إلى شخصيات متحركة وصوت وعالم يمكنه لمسه — من المتصفح مباشرة."
              : "Turn printed pages into living characters, sound and touchable worlds — straight from the browser."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/books/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-coral px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:bg-coral-deep"
            >
              <PlusIcon /> {t("newBook")}
            </Link>
            <a
              href="#library"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              {lang === "ar" ? "استكشف المكتبة" : "Explore library"} ↓
            </a>
          </div>
          <div className="mt-9 flex items-center gap-5 text-white">
            <Metric value={stats.total} label={lang === "ar" ? "كتاب" : "Books"} locale={lang} />
            <Metric value={stats.published} label={lang === "ar" ? "منشور" : "Published"} locale={lang} />
            <Metric value={stats.views} label={lang === "ar" ? "مشاهدة" : "Views"} locale={lang} />
          </div>
        </div>
      </section>

      <section id="library" className="scroll-mt-28">
        <div className="mb-7 flex items-end gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[.16em] text-coral uppercase">
              {lang === "ar" ? "عوالم صنعتها أنت" : "Worlds you created"}
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-[-.045em]">{t("myBooks")}</h2>
          </div>
          <Link
            href="/books/new"
            className="ms-auto hidden sm:inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-4 py-2.5 text-xs font-bold transition hover:bg-white"
          >
            <PlusIcon /> {t("newBook")}
          </Link>
        </div>

        {error && (
          <div className="rounded-2xl bg-coral/10 border border-coral/30 p-4 text-coral-deep">{error}</div>
        )}

        {!books && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((item) => <div key={item} className="h-80 rounded-3xl bg-white/50 animate-pulse" />)}
          </div>
        )}

        {books && books.length === 0 && (
          <div className="relative overflow-hidden text-center py-20 px-6 rounded-[2rem] border border-ink/8 bg-paper shadow-sm animate-pop-in">
            <div className="absolute -top-24 -start-20 w-64 h-64 bg-sunshine/15 rounded-full" />
            <div className="relative text-7xl mb-5 animate-float-soft">📖</div>
            <h3 className="relative text-2xl font-extrabold">{t("noBooksYet")}</h3>
            <p className="relative mt-3 text-sm text-ink/55">
              {lang === "ar" ? "ابدأ بصورة واحدة، شخصية واحدة، ولحظة دهشة واحدة." : "Start with one picture, one character and one moment of wonder."}
            </p>
            <Link href="/books/new" className="relative mt-6 inline-flex items-center gap-2 rounded-2xl bg-coral px-5 py-3 text-white font-bold">
              <PlusIcon /> {t("createBook")}
            </Link>
          </div>
        )}

        {books && books.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {books.map((book, index) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="hayya-book-card group rounded-[1.65rem]"
              >
                <div className={`relative h-56 overflow-hidden ${book.coverUrl ? "bg-line" : "hayya-cover-placeholder"}`}>
                  {book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.coverUrl} alt="" className="w-full h-full object-cover transition duration-700 group-hover:scale-105" />
                  ) : (
                    <>
                      <span className="absolute bottom-5 inset-x-5 z-10 text-white text-2xl font-extrabold drop-shadow-md">{book.title}</span>
                      <span className="absolute bottom-16 start-6 text-5xl animate-float-soft" aria-hidden>{index % 2 ? "🌱" : "🦊"}</span>
                    </>
                  )}
                  <span className="absolute top-4 end-4 rounded-full bg-black/35 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-md">
                    {book.pages?.length ?? 0} {t("pages")}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0">
                      <h3 className="text-xl font-extrabold truncate">{book.title}</h3>
                      <p className="mt-1 text-xs text-ink/48 line-clamp-1">{book.description || (lang === "ar" ? "حكاية تنتظر أن تنبض بالحياة" : "A story waiting to come alive")}</p>
                    </div>
                    <span className="ms-auto shrink-0 w-9 h-9 rounded-full border border-ink/10 grid place-items-center transition group-hover:bg-ink group-hover:text-white rtl:rotate-180">→</span>
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-[10px] font-bold flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full ${book.status === "published" ? "bg-mint/18 text-ink" : "bg-line text-ink/60"}`}>
                      <i className={`inline-block w-1.5 h-1.5 rounded-full me-1.5 ${book.status === "published" ? "bg-mint" : "bg-ink/25"}`} />
                      {t(book.status)}
                    </span>
                    {bookNeedsRecompile(book) && <span className="px-2.5 py-1 rounded-full bg-sunshine/25">⚠ {t("compileNeeded")}</span>}
                    <span className="ms-auto text-ink/42">◉ {book.totalViews}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Link
        href="/books/new"
        aria-label={t("newBook")}
        className="sm:hidden fixed end-5 bottom-5 z-20 w-14 h-14 rounded-full bg-coral text-white shadow-2xl grid place-items-center"
      >
        <PlusIcon />
      </Link>
    </AppShell>
  );
}

function Metric({ value, label, locale }: { value: number; label: string; locale: "ar" | "en" }) {
  return <span className="hayya-metric"><b>{value.toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}</b><span>{label}</span></span>;
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
