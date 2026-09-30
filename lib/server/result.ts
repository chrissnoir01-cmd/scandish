import "server-only";
import { AuthError } from "./auth";
import { ValidationError } from "./validate";
import { LockedError, SignedOutError } from "./dashboard-security";

/** Turns expected errors into user-facing messages; logs and hides everything else. */
export function fail(err: unknown, fallback: string): { ok: false; error: string; code?: "locked" | "signed_out" } {
  if (err instanceof SignedOutError) return { ok: false, error: err.message, code: "signed_out" };
  if (err instanceof LockedError) return { ok: false, error: err.message, code: "locked" };
  if (err instanceof AuthError || err instanceof ValidationError) {
    return { ok: false, error: err.message };
  }
  console.error(fallback, err);
  return { ok: false, error: fallback };
}
