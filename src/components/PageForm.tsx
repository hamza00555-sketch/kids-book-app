"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadDropzone from "@/components/UploadDropzone";
import ModelPreview from "@/components/ModelPreview";
import { useI18n } from "@/lib/i18n";
import { createPage, updatePage } from "@/lib/api";
import type { BookPage, PageConfig } from "@/lib/types";

/** Shared editor for adding/editing a book page (reference image + GLB + sound). */
export default function PageForm({ bookId, page }: { bookId: string; page?: BookPage }) {
  const { t } = useI18n();
  const router = useRouter();

  const [title, setTitle] = useState(page?.title ?? "");
  const [targetImageUrl, setTargetImageUrl] = useState(page?.targetImageUrl ?? "");
  const [modelUrl, setModelUrl] = useState(page?.modelUrl ?? "");
  const [audioUrl, setAudioUrl] = useState(page?.audioUrl ?? "");
  const [config, setConfig] = useState<PageConfig>(page?.config ?? {});
  const [clips, setClips] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchConfig = (patch: Partial<PageConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const canSave = title.trim() && targetImageUrl && modelUrl;

  const submit = async () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        targetImageUrl,
        modelUrl,
        audioUrl: audioUrl || undefined,
        config: config as Record<string, unknown>,
      };
      if (page) {
        await updatePage(bookId, page.id, { ...payload, audioUrl: audioUrl || null });
      } else {
        await createPage(bookId, payload);
      }
      router.push(`/books/${bookId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-5 bg-card rounded-blob border border-line p-6 shadow-sm">
        <label className="block">
          <span className="font-bold text-sm">{t("pageTitle")}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("pageTitlePlaceholder")}
            className="mt-1 w-full rounded-2xl border border-line bg-background px-4 py-2.5 focus:outline-none focus:border-sky"
          />
        </label>

        <div>
          <span className="font-bold text-sm">{t("targetImage")}</span>
          <div className="mt-1">
            <UploadDropzone
              kind="image"
              value={targetImageUrl || undefined}
              onUploaded={setTargetImageUrl}
              hint={t("targetImageHint")}
            />
          </div>
        </div>

        <div>
          <span className="font-bold text-sm">{t("model3d")}</span>
          <div className="mt-1">
            <UploadDropzone
              kind="model"
              value={modelUrl || undefined}
              onUploaded={(url) => {
                setClips(null);
                setModelUrl(url);
              }}
              hint={t("model3dHint")}
            />
          </div>
        </div>

        <div>
          <span className="font-bold text-sm">{t("audio")}</span>
          <div className="mt-1">
            <UploadDropzone
              kind="audio"
              value={audioUrl || undefined}
              onUploaded={setAudioUrl}
              hint={t("audioHint")}
            />
          </div>
          {audioUrl && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.audioLoop ?? false}
                onChange={(e) => patchConfig({ audioLoop: e.target.checked })}
              />
              {t("audioLoop")}
            </label>
          )}
        </div>

        {error && <p className="text-coral-deep text-sm">{error}</p>}
        <button
          onClick={submit}
          disabled={busy || !canSave}
          className="w-full py-3 rounded-full bg-coral text-white font-bold shadow-md hover:bg-coral-deep transition-colors disabled:opacity-40"
        >
          {busy ? t("saving") : t("save")}
        </button>
      </div>

      <div className="space-y-4">
        {modelUrl ? (
          <>
            <ModelPreview
              modelUrl={modelUrl}
              targetImageUrl={targetImageUrl || undefined}
              config={config}
              onClips={setClips}
            />
            {clips !== null && clips.length === 0 && (
              <p className="text-sm bg-sunshine/30 rounded-2xl px-4 py-2">💡 {t("noAnimations")}</p>
            )}
            {clips !== null && clips.length > 0 && (
              <label className="block">
                <span className="font-bold text-sm">{t("animationClip")}</span>
                <select
                  value={config.animationClip ?? ""}
                  onChange={(e) => patchConfig({ animationClip: e.target.value || undefined })}
                  className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-2.5"
                >
                  <option value="">{t("firstClip")}</option>
                  {clips.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="font-bold text-sm">
                {t("modelScale")}: ×{(config.scale ?? 1).toFixed(2)}
              </span>
              <input
                type="range"
                min={0.3}
                max={2}
                step={0.05}
                value={config.scale ?? 1}
                onChange={(e) => patchConfig({ scale: Number(e.target.value) })}
                className="w-full accent-coral"
              />
            </label>
            <label className="block">
              <span className="font-bold text-sm">
                {t("modelHeight")}: {(config.offsetY ?? 0).toFixed(2)}
              </span>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={config.offsetY ?? 0}
                onChange={(e) => patchConfig({ offsetY: Number(e.target.value) })}
                className="w-full accent-coral"
              />
            </label>
            <label className="block">
              <span className="font-bold text-sm">
                {t("modelRotation")}: {config.rotationY ?? 0}°
              </span>
              <input
                type="range"
                min={-180}
                max={180}
                step={5}
                value={config.rotationY ?? 0}
                onChange={(e) => patchConfig({ rotationY: Number(e.target.value) })}
                className="w-full accent-coral"
              />
            </label>
          </>
        ) : (
          <div className="h-80 rounded-blob border-2 border-dashed border-line flex items-center justify-center text-center opacity-50 p-6">
            🧸<br />{t("model3dHint")}
          </div>
        )}
      </div>
    </div>
  );
}
