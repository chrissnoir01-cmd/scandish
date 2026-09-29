// Grants (or with --revoke, removes) MasterAdmin access for an existing account.
// Usage: npm run set-admin -- admin@scandish.online [--revoke]
// Admin rights belong to the account (uid), not the address: a deleted and re-created account needs this again.
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error("Usage: npm run set-admin -- <email> [--revoke]");
  process.exit(1);
}

const auth = getAuth(
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
);

const user = await auth.getUserByEmail(email);
const revoke = flag === "--revoke";
const claims = { ...(user.customClaims ?? {}) };
if (revoke) delete claims.admin;
else claims.admin = true;

await auth.setCustomUserClaims(user.uid, claims);
// Force existing sessions to pick up the change.
await auth.revokeRefreshTokens(user.uid);

console.log(`${revoke ? "Removed" : "Granted"} admin for ${email} (uid ${user.uid}). They must sign in again.`);
