"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { auth, getIdToken } from "@/lib/firebase";
import { loadSupportPortal } from "@/app/actions/support";
import SupportPortal from "@/components/support/SupportPortal";
import type { SupportPortal as PortalData } from "@/lib/types";

export default function SupportPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");

  const apply = useCallback((res: Awaited<ReturnType<typeof loadSupportPortal>>) => {
    if (res.ok) {
      setData(res.data);
      setError("");
    } else setError(res.error);
  }, []);

  const reload = useCallback(async () => apply(await loadSupportPortal(await getIdToken())), [apply]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (current) => {
      if (!current) return router.replace("/support/login");
      const token = await current.getIdTokenResult();
      if (token.claims.support !== true) return router.replace("/support/login");
      setUser(current);
      apply(await loadSupportPortal(token.token));
    });
  }, [router, apply]);

  if (error && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8f5] px-6">
        <div className="max-w-md rounded-3xl border border-[#f4d4ca] bg-white p-8 text-center">
          <h1 className="text-xl font-bold">Can&apos;t open the portal</h1>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <button onClick={() => signOut(auth).then(() => router.replace("/support/login"))} className="mt-6 rounded-2xl bg-[#f08c6c] px-6 py-3 font-semibold text-white">
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  if (!user || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8f5]">
        <Loader2 className="animate-spin text-[#f08c6c]" size={36} />
      </main>
    );
  }

  return (
    <SupportPortal
      data={data}
      onReload={reload}
      onLogout={() => signOut(auth).then(() => router.replace("/support/login"))}
    />
  );
}
