// Full read-only backup of Firestore + Auth user list into backups/<timestamp>/.
// Usage: npm run backup   (reads credentials from .env.local)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);

const plain = (value) =>
  JSON.parse(JSON.stringify(value, (_k, v) => (v instanceof Timestamp ? v.toDate().toISOString() : v)));

async function dumpCollection(ref) {
  const out = {};
  for (const doc of (await ref.get()).docs) {
    const subs = await doc.ref.listCollections();
    const entry = { data: plain(doc.data()) };
    if (subs.length) {
      entry.subcollections = {};
      for (const sub of subs) entry.subcollections[sub.id] = await dumpCollection(sub);
    }
    out[doc.id] = entry;
  }
  return out;
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = join("backups", stamp);
mkdirSync(dir, { recursive: true });

const firestore = {};
for (const col of await db.listCollections()) {
  firestore[col.id] = await dumpCollection(col);
  console.log(`  ${col.id}: ${Object.keys(firestore[col.id]).length} documents`);
}
writeFileSync(join(dir, "firestore.json"), JSON.stringify(firestore, null, 2));

const users = [];
let pageToken;
do {
  const page = await getAuth(app).listUsers(1000, pageToken);
  users.push(
    ...page.users.map((u) => ({
      uid: u.uid,
      email: u.email,
      emailVerified: u.emailVerified,
      disabled: u.disabled,
      customClaims: u.customClaims ?? {},
      created: u.metadata.creationTime,
      lastSignIn: u.metadata.lastSignInTime,
    }))
  );
  pageToken = page.pageToken;
} while (pageToken);
writeFileSync(join(dir, "auth-users.json"), JSON.stringify(users, null, 2));

console.log(`\nBackup written to ${dir} (${users.length} auth users). Keep it private — it contains customer data.`);
