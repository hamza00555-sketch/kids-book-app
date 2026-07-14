"use client";

import { use, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import PageForm from "@/components/PageForm";
import { useI18n } from "@/lib/i18n";
import { getBook } from "@/lib/api";
import type { BookPage } from "@/lib/types";

export default function EditPagePage({ params }: { params: Promise<{ id: string; pageId: string }> }) {
  const { id, pageId } = use(params);
  const { t } = useI18n();
  const [page, setPage] = useState<BookPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBook(id)
      .then((book) => {
        const found = book.pages?.find((p) => p.id === pageId);
        if (!found) throw new Error(t("error"));
        setPage(found);
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, pageId]);

  return (
    <AppShell backHref={`/books/${id}`}>
      <h1 className="text-2xl font-bold mb-6">{t("editPage")} ✏️</h1>
      {error && <p className="text-coral-deep">{error}</p>}
      {!page && !error && <p className="opacity-60">{t("loading")}</p>}
      {page && <PageForm bookId={id} page={page} />}
    </AppShell>
  );
}
