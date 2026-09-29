import "server-only";
import { adminDb } from "./firebase-admin";
import { destroyImages, listStored, publicIdFromUrl, type StoredImage } from "./cloudinary";

/** Files younger than this are never touched: an owner may still be editing and not have published yet. */
const MIN_AGE_DAYS = 7;
/** Everything ScanDish uploads lives under this folder; older or foreign files are never touched. */
const ROOT = "scandish/";
const COLLECTIONS = ["restaurants", "companies", "settings", "designPresets", "supportAgents"];

/** Every Cloudinary file referenced anywhere in the database (URLs and private ids, at any depth). */
async function referencedIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  const visit = (v: unknown) => {
    if (typeof v === "string") {
      const fromUrl = publicIdFromUrl(v);
      if (fromUrl) ids.add(fromUrl);
      else if (v.startsWith(ROOT)) ids.add(v.replace(/\.[a-z0-9]+$/i, "")); // private ids, e.g. certificates
    } else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") Object.values(v).forEach(visit);
  };
  const snaps = await Promise.all(COLLECTIONS.map((c) => adminDb().collection(c).get()));
  for (const snap of snaps) snap.docs.forEach((d) => visit(d.data()));
  return ids;
}

export interface CleanupReport {
  scanned: number;
  unused: StoredImage[];
  unusedBytes: number;
}

/** Files under scandish/ that nothing references and that are older than MIN_AGE_DAYS. */
export async function findUnusedImages(): Promise<CleanupReport> {
  const [referenced, publicFiles, privateFiles] = await Promise.all([
    referencedIds(),
    listStored(ROOT, "upload"),
    listStored(ROOT, "authenticated"),
  ]);
  const cutoff = Date.now() - MIN_AGE_DAYS * 86_400_000;
  const all = [...publicFiles, ...privateFiles];
  const unused = all.filter((f) => !referenced.has(f.publicId) && new Date(f.createdAt).getTime() < cutoff);
  return { scanned: all.length, unused, unusedBytes: unused.reduce((n, f) => n + f.bytes, 0) };
}

/** Re-scans (never trusts a list from the browser) and deletes the unused files. */
export async function deleteUnusedImages(): Promise<{ deleted: number; bytes: number }> {
  const { unused } = await findUnusedImages();
  const [pub, priv] = [unused.filter((f) => f.type === "upload"), unused.filter((f) => f.type === "authenticated")];
  const deleted = (await destroyImages(pub.map((f) => f.publicId), "upload")) + (await destroyImages(priv.map((f) => f.publicId), "authenticated"));
  return { deleted, bytes: unused.reduce((n, f) => n + f.bytes, 0) };
}
