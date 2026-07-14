// Phone cameras produce 4000px+ photos; mobile WebGL renders textures above
// its limit as black. Downscale reference images before upload/texture use.

export const MAX_TEXTURE_SIZE = 2048;

/**
 * Returns a JPEG/PNG blob no larger than MAX_TEXTURE_SIZE on its longest side,
 * plus the final dimensions. Small images pass through untouched.
 */
export async function downscaleImage(
  file: File | Blob,
  maxSize: number = MAX_TEXTURE_SIZE
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  if (width <= maxSize && height <= maxSize) {
    bitmap.close();
    return { blob: file, width, height };
  }
  const ratio = Math.min(maxSize / width, maxSize / height);
  const w = Math.round(width * ratio);
  const h = Math.round(height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))), type, 0.92)
  );
  return { blob, width: w, height: h };
}
