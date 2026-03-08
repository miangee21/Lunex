// src/crypto/dpEncryption.ts

// ── PRO FIX: Yeh hamari app ki master key hai. Bucket mein image is se lock hogi. ──
// Isko kabhi change nahi karna warna purani pictures decrypt nahi hongi.
const APP_WIDE_DP_SECRET = "Lunex-App-Wide-Profile-Pic-Secret-Key-2026!";

// Helper: Master password se 256-bit AES-GCM key banata hai
async function getDPKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest("SHA-256", enc.encode(APP_WIDE_DP_SECRET));
  return await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Image file ko encrypt kar ke kachra (Blob) banata hai.
 * Isey hum AvatarUpload.tsx mein use karenge.
 */
export async function encryptDP(file: File | Blob): Promise<Blob> {
  const key = await getDPKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const arrayBuffer = await file.arrayBuffer();

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    arrayBuffer
  );

  // IV (12 bytes) aur Encrypted Data ko ek sath jor dete hain
  return new Blob([iv, encryptedBuffer], { type: "application/octet-stream" });
}

/**
 * Encrypted Blob ko wapas normal image URL mein convert karta hai.
 * Isey hum apne useSecureAvatar hook mein use karenge.
 */
export async function decryptDP(encryptedBlob: Blob, mimeType: string = "image/jpeg"): Promise<string> {
  try {
    const key = await getDPKey();
    const arrayBuffer = await encryptedBlob.arrayBuffer();

    // IV (shuru ke 12 bytes) nikalte hain
    const iv = arrayBuffer.slice(0, 12);
    // Baqi ka data asal encrypted picture hai
    const data = arrayBuffer.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      data
    );

    const decryptedBlob = new Blob([decryptedBuffer], { type: mimeType });
    return URL.createObjectURL(decryptedBlob); // Direct <img> src ke liye URL ban gaya
  } catch (error) {
    console.error("DP Decryption failed:", error);
    throw new Error("Failed to decrypt profile picture");
  }
}