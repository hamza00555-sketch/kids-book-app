"use client";

import { useCallback, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { uploadFile } from "@/lib/api";
import { downscaleImage } from "@/lib/safe-texture";
import { UPLOAD_RULES, validateUpload, type UploadKind } from "@/lib/upload-config";

const KIND_ICONS: Record<UploadKind, string> = {
  image: "🖼️",
  model: "🧸",
  audio: "🎵",
  mind: "🧠",
};

/**
 * Drag/drop + click upload with local validation. Images are downscaled to a
 * WebGL-safe size before upload (huge phone photos render black on mobile GPUs).
 */
export default function UploadDropzone({
  kind,
  value,
  onUploaded,
  hint,
}: {
  kind: UploadKind;
  value?: string;
  onUploaded: (publicUrl: string) => void;
  hint?: string;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = UPLOAD_RULES[kind].extensions.map((e) => `.${e}`).join(",");

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const invalid = validateUpload(kind, file.name, file.size);
      if (invalid) {
        setError(invalid);
        return;
      }
      setBusy(true);
      try {
        let payload: File | Blob = file;
        if (kind === "image") {
          const { blob } = await downscaleImage(file);
          payload = blob;
        }
        const url = await uploadFile(payload, kind, file.name);
        onUploaded(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [kind, onUploaded]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={`relative rounded-blob border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
          dragOver ? "border-coral bg-coral/10" : "border-line bg-card hover:border-sky"
        }`}
      >
        {busy ? (
          <p className="py-3 animate-pulse">{t("uploading")}</p>
        ) : value ? (
          <div className="flex items-center gap-3 justify-center">
            {kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-16 w-16 object-cover rounded-2xl border border-line" />
            ) : (
              <span className="text-3xl" aria-hidden>{KIND_ICONS[kind]}</span>
            )}
            <span className="text-sm text-sky underline">{t("replaceFile")}</span>
          </div>
        ) : (
          <p className="py-3">
            <span className="text-3xl block mb-1" aria-hidden>{KIND_ICONS[kind]}</span>
            {t("dropOrClick")}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {hint && <p className="mt-1 text-xs opacity-70">{hint}</p>}
      {error && <p className="mt-1 text-sm text-coral-deep">{error}</p>}
    </div>
  );
}
