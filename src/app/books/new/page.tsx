"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import UploadDropzone from "@/components/UploadDropzone";
import { useI18n } from "@/lib/i18n";
import { createBook } from "@/lib/api";

export default function NewBookPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const book = await createBook({ title: title.trim(), description: description || undefined, coverUrl });
      router.push(`/books/${book.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <AppShell backHref="/">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">{t("newBook")} 📖</h1>
        <div className="space-y-5 bg-card rounded-blob border border-line p-6 shadow-sm">
          <label className="block">
            <span className="font-bold text-sm">{t("bookTitle")}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("bookTitlePlaceholder")}
              className="mt-1 w-full rounded-2xl border border-line bg-background px-4 py-2.5 focus:outline-none focus:border-sky"
            />
          </label>
          <label className="block">
            <span className="font-bold text-sm">{t("description")}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={2}
              className="mt-1 w-full rounded-2xl border border-line bg-background px-4 py-2.5 focus:outline-none focus:border-sky"
            />
          </label>
          <div>
            <span className="font-bold text-sm">{t("cover")}</span>
            <div className="mt-1">
              <UploadDropzone kind="image" value={coverUrl} onUploaded={setCoverUrl} hint={t("coverHint")} />
            </div>
          </div>
          {error && <p className="text-coral-deep text-sm">{error}</p>}
          <button
            onClick={submit}
            disabled={busy || !title.trim()}
            className="w-full py-3 rounded-full bg-coral text-white font-bold shadow-md hover:bg-coral-deep transition-colors disabled:opacity-40"
          >
            {busy ? t("saving") : t("createBook")}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
