//src/crypto/mediaEncryption.ts
import nacl from "tweetnacl";

async function deriveAesKey(
  ourSecretKey: Uint8Array,
  theirPublicKey: Uint8Array,
): Promise<CryptoKey> {
  const sharedSecret = nacl.box.before(
    theirPublicKey.slice(0, 32),
    ourSecretKey.slice(0, 32),
  );

  return await crypto.subtle.importKey(
    "raw",
    new Uint8Array(sharedSecret),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

// ── ENCRYPT FILE ──
export async function encryptMediaFile(
  file: File,
  ourSecretKey: Uint8Array,
  theirPublicKey: Uint8Array,
): Promise<{ encryptedBlob: Blob; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAesKey(ourSecretKey, theirPublicKey);

  const fileBuffer = await file.arrayBuffer();

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    fileBuffer,
  );

  const encryptedBlob = new Blob([encryptedBuffer], {
    type: "application/octet-stream",
  });

  return {
    encryptedBlob,
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// ── DECRYPT FILE ──
export async function decryptMediaFile(
  encryptedUrl: string,
  ivBase64: string,
  ourSecretKey: Uint8Array,
  theirPublicKey: Uint8Array,
  originalMimeType: string,
): Promise<string> {
  const response = await fetch(encryptedUrl);
  const encryptedBuffer = await response.arrayBuffer();

  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const aesKey = await deriveAesKey(ourSecretKey, theirPublicKey);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encryptedBuffer,
  );

  const blob = new Blob([decryptedBuffer], { type: originalMimeType });
  return URL.createObjectURL(blob);
}

// ── MIME TYPE FROM FILENAME ──
export function getMimeTypeFromName(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    txt: "text/plain",
    csv: "text/csv",
  };
  return map[ext] ?? "application/octet-stream";
}
