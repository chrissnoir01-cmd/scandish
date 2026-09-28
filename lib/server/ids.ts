import "server-only";
import { randomInt } from "node:crypto";
import { adminDb } from "./firebase-admin";

// No 0/O/1/I to avoid misreading codes over the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 10; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `SD-${code.slice(0, 5)}-${code.slice(5)}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/** Returns `base`, or `base-2`, `base-3`… — whichever no company or restaurant uses yet. */
export async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "restaurant";
  const db = adminDb();
  for (let n = 1; n < 100; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const [c, r] = await Promise.all([
      db.collection("companies").where("slug", "==", candidate).limit(1).get(),
      db.collection("restaurants").where("slug", "==", candidate).limit(1).get(),
    ]);
    if (c.empty && r.empty) return candidate;
  }
  throw new Error("Could not find a free slug");
}
