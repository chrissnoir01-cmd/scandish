import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Partner Login",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; reset?: string }>;
}) {
  const { email, reset } = await searchParams;
  return <LoginForm initialEmail={typeof email === "string" ? email : ""} passwordReset={reset === "done"} />;
}
