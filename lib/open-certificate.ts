import { getIdToken } from "./firebase";

/**
 * Opens a business's registration certificate in a new tab. The tab is opened before the
 * request so popup blockers allow it. Returns an error message or null.
 */
export async function openCertificate(companyId: string): Promise<string | null> {
  const tab = window.open("", "_blank");
  try {
    const res = await fetch(`/api/certificates/${encodeURIComponent(companyId)}`, {
      headers: { Authorization: `Bearer ${await getIdToken()}` },
    });
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json().catch(() => ({})) : null;
    if (!res.ok) {
      tab?.close();
      return data?.error || "Could not open the certificate";
    }
    const url = data?.url ?? URL.createObjectURL(await res.blob());
    if (tab) tab.location.href = url;
    else window.location.assign(url);
    if (!data?.url) setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return null;
  } catch {
    tab?.close();
    return "Could not open the certificate. Check your connection.";
  }
}
