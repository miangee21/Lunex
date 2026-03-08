// src/crypto/dpEncryption.ts

const APP_WIDE_DP_SECRET = "Lunex-App-Wide-Profile-Pic-Secret-Key-2026!";

async function getDPKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(APP_WIDE_DP_SECRET),
  );
  return await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptDP(file: File | Blob): Promise<Blob> {
  const key = await getDPKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const arrayBuffer = await file.arrayBuffer();

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    arrayBuffer,
  );

  return new Blob([iv, encryptedBuffer], { type: "application/octet-stream" });
}

export async function decryptDP(
  encryptedBlob: Blob,
  mimeType: string = "image/jpeg",
): Promise<string> {
  try {
    const key = await getDPKey();
    const arrayBuffer = await encryptedBlob.arrayBuffer();

    const iv = arrayBuffer.slice(0, 12);
    const data = arrayBuffer.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      data,
    );

    const decryptedBlob = new Blob([decryptedBuffer], { type: mimeType });
    return URL.createObjectURL(decryptedBlob);
  } catch (error) {
    console.error("DP Decryption failed:", error);
    throw new Error("Failed to decrypt profile picture");
  }
}
