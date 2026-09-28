import { getIdToken } from "./firebase";

/** Fetches the service contract PDF for a business ("preview" for MasterAdmin's sample) and saves it. Returns an error message or null. */
export async function downloadContract(companyId: string, businessName: string): Promise<string | null> {
  const res = await fetch(`/api/contracts/${encodeURIComponent(companyId)}`, {
    headers: { Authorization: `Bearer ${await getIdToken()}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return data.error || "Could not generate the contract";
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `ScanDish-contract-${businessName.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return null;
}
