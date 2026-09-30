import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { prepareUpload } from "./compress-image";

// Public web config (safe to ship). The browser only uses Firebase for sign-in;
// all data access goes through server actions.
const firebaseConfig = {
  apiKey: "AIzaSyAAAQYju1z_I9RLaqv0BeC-l0kgHjkSSnU",
  authDomain: "maclink-b6843.firebaseapp.com",
  projectId: "maclink-b6843",
  storageBucket: "maclink-b6843.firebasestorage.app",
  messagingSenderId: "308366757637",
  appId: "1:308366757637:web:d4a31102499021ba70f16c",
};

export const app = getApps()[0] ?? initializeApp(firebaseConfig);

export const auth = getAuth(app);

export async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  return user.getIdToken();
}

/** Stores a contract stamp/signature (MasterAdmin) or certificate privately and returns its id (never a public URL). */
export async function uploadPrivateAsset(file: File, purpose: "contract-stamp" | "contract-signature" | "certificate"): Promise<string> {
  const formData = new FormData();
  // Stamp and signature keep their exact pixels (transparent PNG); certificates are shrunk like photos.
  formData.append("file", purpose === "certificate" ? await prepareUpload(file) : file);
  formData.append("purpose", purpose);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${await getIdToken()}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.id as string;
}

/** An upload refused by the Security Center: `code` is "locked" (PIN needed) or "signed_out". */
export class UploadBlockedError extends Error {
  constructor(message: string, readonly code: "locked" | "signed_out") {
    super(message);
  }
}

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", await prepareUpload(file));
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${await getIdToken()}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (data.code === "locked" || data.code === "signed_out") throw new UploadBlockedError(data.error, data.code);
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}
