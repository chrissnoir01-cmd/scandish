import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

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

const app = getApps()[0] ?? initializeApp(firebaseConfig);

export const auth = getAuth(app);

export async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  return user.getIdToken();
}

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${await getIdToken()}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}
