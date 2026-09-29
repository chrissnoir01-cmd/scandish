import { getFirestore } from "firebase/firestore";
import { app } from "./firebase";

/**
 * Browser database access, used only for the owner's live order list (Firestore rules allow
 * nothing else). Kept out of lib/firebase.ts so other pages don't download the database client.
 */
export const db = getFirestore(app);
