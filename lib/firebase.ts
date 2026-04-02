import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAAAQYju1z_I9RLaqv0BeC-l0kgHjkSSnU",
  authDomain: "maclink-b6843.firebaseapp.com",
  projectId: "maclink-b6843",
  storageBucket: "maclink-b6843.firebasestorage.app",
  messagingSenderId: "308366757637",
  appId: "1:308366757637:web:d4a31102499021ba70f16c",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);