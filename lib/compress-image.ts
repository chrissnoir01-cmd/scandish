/**
 * Shrinks photos in the browser before upload. Phone photos are often 3–12 MB; the server accepts
 * at most 4 MB (Vercel's request limit), and smaller files upload far faster on mobile data.
 * Re-drawing also drops hidden photo data such as GPS location. GIFs (animation) and PDFs pass unchanged.
 */
const MAX_SIDE = 2000;
const TARGET_BYTES = 1.5 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** Largest original we try to shrink (bigger ones are almost certainly not a normal photo). */
const MAX_INPUT_BYTES = 30 * 1024 * 1024;

const SHRINKABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function prepareUpload(file: File): Promise<File> {
  if (!SHRINKABLE.has(file.type)) {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error(`File is too large (max ${MAX_UPLOAD_BYTES / 1048576} MB)`);
    return file;
  }
  if (file.size > MAX_INPUT_BYTES) throw new Error("This photo is too large. Please choose a smaller one.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This file isn't a readable image. Try another photo.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  // Already small and light: keep the original bytes (still re-encoded to strip photo metadata if it's a JPEG).
  const needsResize = scale < 1 || file.size > TARGET_BYTES || file.type === "image/jpeg";
  if (!needsResize) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // WebP keeps transparency (logos) and is small; fall back to JPEG where WebP encoding isn't supported.
  for (const [type, quality] of [
    ["image/webp", 0.85],
    ["image/jpeg", 0.85],
    ["image/jpeg", 0.7],
  ] as const) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    if (blob && blob.type === type && blob.size <= MAX_UPLOAD_BYTES) {
      const name = file.name.replace(/\.[^.]+$/, "") + (type === "image/webp" ? ".webp" : ".jpg");
      // Keep a small original only if re-encoding wouldn't help — except JPEGs, whose camera data (GPS) must go.
      return blob.size < file.size || scale < 1 || file.type === "image/jpeg" ? new File([blob], name, { type }) : file;
    }
  }
  if (file.size <= MAX_UPLOAD_BYTES) return file;
  throw new Error("This photo is too large even after shrinking. Please choose a smaller one.");
}
