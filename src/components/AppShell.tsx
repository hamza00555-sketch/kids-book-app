"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

/** Studio chrome: warm top bar with logo, optional back link, language toggle. */
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
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              aria-label={t("back")}
              className="shrink-0 w-9 h-9 rounded-full bg-background border border-line flex items-center justify-center text-lg hover:bg-sunshine/30 transition-colors rtl:rotate-180"
            >
              ←
            </Link>
          )}
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="text-2xl" aria-hidden>📖✨</span>
            <span className="font-bold text-lg truncate">{title ?? t("appName")}</span>
          </Link>
          <div className="ms-auto flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="px-3 py-1.5 rounded-full border border-line bg-background text-sm hover:bg-sunshine/30 transition-colors"
            >
              {t("language")}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
