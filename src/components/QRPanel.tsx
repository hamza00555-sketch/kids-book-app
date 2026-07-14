"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useI18n } from "@/lib/i18n";

/** Generates the book's QR (PNG canvas + downloadable SVG) from its public URL. */
export default function QRPanel({ url, name }: { url: string; name: string }) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 220,
        margin: 2,
        color: { dark: "#443328", light: "#ffffff" },
      }).catch(console.error);
    }
  }, [url]);

  const downloadPng = () => {
    const a = document.createElement("a");
    a.href = canvasRef.current!.toDataURL("image/png");
    a.download = `${name}-qr.png`;
    a.click();
  };

  const downloadSvg = async () => {
    const svg = await QRCode.toString(url, { type: "svg", margin: 2 });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    a.download = `${name}-qr.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card rounded-blob border border-line p-5 shadow-sm text-center">
      <h3 className="font-bold mb-1">{t("qrTitle")} 🔍</h3>
      <p className="text-xs opacity-70 mb-3">{t("qrHint")}</p>
      <canvas ref={canvasRef} className="mx-auto rounded-2xl border border-line" />
      <p dir="ltr" className="mt-2 text-xs opacity-60 break-all">{url}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm">
        <button onClick={downloadPng} className="px-3 py-1.5 rounded-full bg-sky/15 hover:bg-sky/30 transition-colors">
          {t("downloadPng")}
        </button>
        <button onClick={downloadSvg} className="px-3 py-1.5 rounded-full bg-sky/15 hover:bg-sky/30 transition-colors">
          {t("downloadSvg")}
        </button>
        <button onClick={copyLink} className="px-3 py-1.5 rounded-full bg-mint/20 hover:bg-mint/40 transition-colors">
          {copied ? t("linkCopied") : t("copyLink")}
        </button>
      </div>
    </div>
  );
}
