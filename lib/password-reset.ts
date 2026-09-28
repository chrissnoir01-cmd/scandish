import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebase";

export type ResetRequestResult = "sent" | "invalid-email" | "too-many-requests" | "network" | "error";

const CONTINUE_URL_ERRORS = new Set([
  "auth/unauthorized-continue-uri",
  "auth/invalid-continue-uri",
  "auth/missing-continue-uri",
]);

const code = (err: unknown) => (err as { code?: string })?.code ?? "";

/**
 * Sends the Firebase password-reset email.
 * - Asks Firebase to return the user to our login page afterwards; if this domain isn't
 *   authorized in Firebase Auth, it retries without that so the email still goes out.
 * - "user not found" is reported as "sent" so the form can't reveal which emails have accounts.
 */
export async function requestPasswordReset(rawEmail: string): Promise<ResetRequestResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "invalid-email";

  auth.languageCode = "en";
  try {
    try {
      await sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/login?reset=done` });
    } catch (err) {
      if (!CONTINUE_URL_ERRORS.has(code(err))) throw err;
      await sendPasswordResetEmail(auth, email);
    }
    return "sent";
  } catch (err) {
    switch (code(err)) {
      case "auth/user-not-found":
        return "sent";
      case "auth/invalid-email":
        return "invalid-email";
      case "auth/too-many-requests":
        return "too-many-requests";
      case "auth/network-request-failed":
        return "network";
      default:
        console.error("Password reset request failed", err);
        return "error";
    }
  }
}

export const RESET_MESSAGES: Record<Exclude<ResetRequestResult, "sent">, string> = {
  "invalid-email": "Enter a valid email address.",
  "too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  network: "No connection. Check your internet and try again.",
  error: "We couldn't send the email right now. Please try again or contact support.",
};
