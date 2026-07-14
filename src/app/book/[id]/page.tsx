"use client";

// The public viewer page — what the QR on the book cover opens.

import { use, useEffect, useState } from "react";
import BookARViewer from "@/components/BookARViewer";
import { useI18n } from "@/lib/i18n";
import { getBook } from "@/lib/api";
import type { Book } from "@/lib/types";

export default function PublicBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBook(id)
      .then(setBook)
      .catch(() => setError(t("bookNotFound")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) {
    return <Message emoji="🙈" text={error} />;
  }
  if (!book) {
    return <Message emoji="📖" text={t("loading")} pulse />;
  }
  // Drafts stay viewable so the publisher can test before publishing;
  // a book with no compiled targets can't be experienced at all.
  if (!book.mindUrl || (book.pages ?? []).length === 0) {
    return <Message emoji="🚧" text={t("bookNotReady")} />;
  }
  return <BookARViewer book={book} />;
}

function Message({ emoji, text, pulse }: { emoji: string; text: string; pulse?: boolean }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center bg-gradient-to-b from-sky/25 via-background to-sunshine/30">
      <div className={`text-7xl ${pulse ? "animate-float-soft" : ""}`}>{emoji}</div>
      <p className={`text-lg font-bold ${pulse ? "animate-pulse" : ""}`}>{text}</p>
    </div>
  );
}
