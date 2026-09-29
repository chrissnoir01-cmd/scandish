import "server-only";
import { ValidationError } from "./validate";

const ROOT = "scandish/private/certificates";

/** Each uploader gets their own folder, so a support member can only attach files they uploaded. */
export const certificateFolder = (uid: string) => `${ROOT}/${uid}`;

/**
 * Checks a certificate id returned by /api/upload. With `uploaderUid`, the file must be one that
 * account uploaded; without it (MasterAdmin), any certificate upload is accepted.
 */
export function validateCertificateId(value: unknown, uploaderUid?: string): string {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id) return "";
  const prefix = uploaderUid ? `${certificateFolder(uploaderUid)}/` : `${ROOT}/`;
  if (!id.startsWith(prefix) || !/^[\w/-]+\.(pdf|jpe?g|png|webp|avif|gif)$/i.test(id) || id.includes("..")) {
    throw new ValidationError("Upload the certificate again");
  }
  return id;
}
