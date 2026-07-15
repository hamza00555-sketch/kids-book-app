"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

/** Hayya Studio chrome: editorial, calm and functional for publishers. */
export default function AppShell({
  children,
  backHref,
  title,
}: {
  children: ReactNode;
  backHref?: string;
  title?: string;
}) {
  const { t, lang, setLang } = useI18n();

  return (
    <div className="min-h-screen flex flex-col relative">
      <header className="sticky top-0 z-30 bg-paper/85 backdrop-blur-xl border-b border-ink/8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3.5 flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              aria-label={t("back")}
              className="shrink-0 w-10 h-10 rounded-full bg-white/70 border border-ink/10 flex items-center justify-center text-lg hover:bg-sunshine/30 hover:-translate-x-0.5 transition-all rtl:rotate-180"
            >
              ←
            </Link>
          )}
          <Link href="/" className="flex items-center gap-3 min-w-0 group">
            <HayyaMark />
            <span className="min-w-0 flex flex-col leading-none">
              <span className="font-extrabold text-xl tracking-[-0.04em] truncate">
                {title ?? t("appName")}
              </span>
              {!title && (
                <span className="text-[9px] uppercase tracking-[0.24em] text-ink/45 mt-1.5">
                  Story Studio
                </span>
              )}
            </span>
          </Link>
          {!backHref && (
            <nav className="hidden md:flex items-center gap-1 ms-8 text-sm">
              <Link href="/" className="px-4 py-2 rounded-full bg-ink text-white font-bold">
                {t("myBooks")}
              </Link>
              <span className="px-4 py-2 text-ink/50">WebAR Studio</span>
            </nav>
          )}
          <div className="ms-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mint/15 text-[10px] font-bold text-ink/70 border border-mint/20">
              <i className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
              {lang === "ar" ? "استوديو الناشر" : "Publisher studio"}
            </span>
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="px-3.5 py-2 rounded-full border border-ink/10 bg-white/65 text-xs font-bold hover:bg-sunshine/25 transition-colors"
            >
              {t("language")}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      <footer className="border-t border-ink/8 py-6 px-4 text-center text-[10px] text-ink/40">
        {lang === "ar"
          ? "هَيّا — نصنع لحظات يرفع فيها الطفل رأسه من الشاشة ليرى العالم"
          : "Hayya — moments that lift children from the screen into the world"}
      </footer>
    </div>
  );
}

function HayyaMark() {
  return (
    <span className="hayya-mark" aria-hidden>
      <i />
      <i />
      <i />
    </span>
  );
}
