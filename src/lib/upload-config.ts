// Single source of truth for what can be uploaded. Both the sign route and the
// local dev file server read from here (duplicating this once caused a .mind 404).

export type UploadKind = "image" | "model" | "audio" | "mind";

interface KindRule {
  extensions: string[];
  maxBytes: number;
  label: string;
}

export const UPLOAD_RULES: Record<UploadKind, KindRule> = {
  image: { extensions: ["jpg", "jpeg", "png", "webp"], maxBytes: 15 * 1024 * 1024, label: "image (jpg/png/webp)" },
  model: { extensions: ["glb"], maxBytes: 60 * 1024 * 1024, label: "3D model (.glb)" },
  audio: { extensions: ["mp3", "m4a", "wav"], maxBytes: 10 * 1024 * 1024, label: "audio (mp3/m4a/wav)" },
  mind: { extensions: ["mind"], maxBytes: 40 * 1024 * 1024, label: "compiled targets (.mind)" },
};

export const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  glb: "model/gltf-binary",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  mind: "application/octet-stream",
};

export function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function validateUpload(kind: UploadKind, fileName: string, size: number): string | null {
  const rule = UPLOAD_RULES[kind];
  if (!rule) return `Unknown upload kind "${kind}"`;
  const ext = extensionOf(fileName);
  if (!rule.extensions.includes(ext)) {
    return `Expected ${rule.label}, got ".${ext}"`;
  }
  if (size > rule.maxBytes) {
    return `File too large: ${(size / 1024 / 1024).toFixed(1)}MB (max ${(rule.maxBytes / 1024 / 1024).toFixed(0)}MB)`;
  }
  return null;
}
