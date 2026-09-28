import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./firebase-admin";

export class AuthError extends Error {}

/** Verifies a Firebase ID token sent from the browser. Revoked tokens are rejected. */
export async function requireUser(idToken: unknown): Promise<DecodedIdToken> {
  if (typeof idToken !== "string" || !idToken) {
    throw new AuthError("Not signed in");
  }
  try {
    return await adminAuth().verifyIdToken(idToken, true);
  } catch {
    throw new AuthError("Session expired. Please sign in again.");
  }
}

/** Admin access comes only from the `admin` custom claim, which only server scripts can set. */
export async function requireAdmin(idToken: unknown): Promise<DecodedIdToken> {
  const user = await requireUser(idToken);
  if (user.admin !== true) throw new AuthError("Not authorized");
  return user;
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}
