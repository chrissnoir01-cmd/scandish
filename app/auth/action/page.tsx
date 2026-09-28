import type { Metadata } from "next";
import ActionHandler from "./ActionHandler";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false },
  // The one-time code is in the URL; don't leak it to other sites.
  referrer: "no-referrer",
};

/**
 * Landing page for links in Firebase Auth emails (password reset, email verification).
 * Set as the custom action URL in Firebase console → Authentication → Templates.
 */
export default async function AuthActionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  return <ActionHandler mode={one("mode")} oobCode={one("oobCode")} />;
}
