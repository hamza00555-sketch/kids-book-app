"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getAnalytics } from "@/lib/api";
import type { BookAnalytics } from "@/lib/types";

function Bars({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const max = entries[0][1];
  return (
    <div>
      <h4 className="text-sm font-bold mb-1">{title}</h4>
      <div className="space-y-1">
        {entries.map(([key, count]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-20 truncate">{key}</span>
            <div className="flex-1 h-3 rounded-full bg-line overflow-hidden">
              <div className="h-full bg-sky rounded-full" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="w-6 text-end">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPanel({ bookId }: { bookId: string }) {
  const { t, lang } = useI18n();
  const [analytics, setAnalytics] = useState<BookAnalytics | null>(null);

  useEffect(() => {
    getAnalytics(bookId).then(setAnalytics).catch(() => {});
  }, [bookId]);

  if (!analytics) return null;

  return (
    <div className="bg-card rounded-blob border border-line p-5 shadow-sm space-y-4">
      <h3 className="font-bold">{t("analytics")} 📊</h3>
      <div className="flex gap-4">
        <div className="flex-1 rounded-2xl bg-sunshine/25 p-3 text-center">
          <div className="text-2xl font-bold">{analytics.totalViews}</div>
          <div className="text-xs opacity-70">{t("totalViews")}</div>
        </div>
        <div className="flex-1 rounded-2xl bg-mint/20 p-3 text-center">
          <div className="text-sm font-bold mt-1">
            {analytics.lastViewedAt
              ? new Date(analytics.lastViewedAt).toLocaleString(lang === "ar" ? "ar" : "en")
              : "—"}
          </div>
          <div className="text-xs opacity-70">{t("lastViewed")}</div>
        </div>
      </div>
      {analytics.totalViews === 0 ? (
        <p className="text-sm opacity-60 text-center">{t("noViewsYet")}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <Bars title={t("byDevice")} data={analytics.byDevice} />
          <Bars title={t("byOs")} data={analytics.byOs} />
        </div>
      )}
    </div>
  );
}
