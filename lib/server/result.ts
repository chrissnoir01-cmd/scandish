import "server-only";
import { AuthError } from "./auth";
import { ValidationError } from "./validate";

/** Turns expected errors into user-facing messages; logs and hides everything else. */
export function fail(err: unknown, fallback: string): { ok: false; error: string } {
  if (err instanceof AuthError || err instanceof ValidationError) {
    return { ok: false, error: err.message };
  }
  console.error(fallback, err);
  return { ok: false, error: fallback };
}
