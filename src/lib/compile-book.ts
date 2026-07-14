// Client-side compilation of ALL page reference images into one multi-target
// .mind file (feature-point extraction runs in the browser via MindAR).
// Target order === pages' targetIndex order — the viewer relies on this.

export interface CompileProgress {
  /** 0..100 across the whole compilation. */
  percent: number;
}

/** Feature extraction should take seconds; past this something is stuck. */
const HANG_TIMEOUT_MS = 90_000;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load target image: ${url}`));
    img.src = url;
  });
}

/**
 * Compiles the ordered list of target image URLs into a .mind Blob.
 * Throws a clear error instead of hanging forever if the compiler stalls.
 */
export async function compileBookTargets(
  imageUrls: string[],
  onProgress?: (p: CompileProgress) => void
): Promise<Blob> {
  if (imageUrls.length === 0) throw new Error("No pages to compile");

  const { Compiler } = await import("mind-ar/dist/mindar-image.prod.js");
  const images = await Promise.all(imageUrls.map(loadImage));

  const compiler = new Compiler();
  let lastProgressAt = Date.now();

  const compilePromise = compiler.compileImageTargets(images, (percent: number) => {
    lastProgressAt = Date.now();
    onProgress?.({ percent: Math.min(99, Math.round(percent)) });
  });

  // Hang guard: fail visibly if no progress for HANG_TIMEOUT_MS.
  const guard = new Promise<never>((_, reject) => {
    const timer = setInterval(() => {
      if (Date.now() - lastProgressAt > HANG_TIMEOUT_MS) {
        clearInterval(timer);
        reject(new Error("Compilation stalled — try smaller or more detailed images"));
      }
    }, 5_000);
    compilePromise.finally(() => clearInterval(timer));
  });

  await Promise.race([compilePromise, guard]);
  const buffer: ArrayBuffer = await compiler.exportData();
  onProgress?.({ percent: 100 });
  return new Blob([buffer], { type: "application/octet-stream" });
}
