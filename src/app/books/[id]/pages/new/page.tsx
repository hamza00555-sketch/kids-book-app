"use client";

import { use } from "react";
import AppShell from "@/components/AppShell";
import PageForm from "@/components/PageForm";
import { useI18n } from "@/lib/i18n";

export default function NewPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  return (
    <AppShell backHref={`/books/${id}`}>
      <h1 className="text-2xl font-bold mb-6">{t("addPage")} ✨</h1>
      <PageForm bookId={id} />
    </AppShell>
  );
}
