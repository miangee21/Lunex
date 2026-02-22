import nacl from "tweetnacl";
import { keyToBase64, base64ToKey } from "./keyDerivation";

export interface EncryptedPayload {
  encryptedContent: string; // base64
  iv: string;               // base64 (nonce)
}

// Encrypt a plaintext message using our private key and recipient's public key
export function encryptMessage(
  plaintext: string,
  ourSecretKey: Uint8Array,
  theirPublicKey: Uint8Array
): EncryptedPayload {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = nacl.box(encoded, nonce, theirPublicKey, ourSecretKey);

  if (!encrypted) throw new Error("Encryption failed");

  return {
    encryptedContent: keyToBase64(encrypted),
    iv: keyToBase64(nonce),
  };
}

// Decrypt a message using our private key and sender's public key
export function decryptMessage(
  payload: EncryptedPayload,
  ourSecretKey: Uint8Array,
  theirPublicKey: Uint8Array
): string {
  const encrypted = base64ToKey(payload.encryptedContent);
  const nonce = base64ToKey(payload.iv);
  const decrypted = nacl.box.open(encrypted, nonce, theirPublicKey, ourSecretKey);

  if (!decrypted) throw new Error("Decryption failed — wrong key or corrupted data");

  return new TextDecoder().decode(decrypted);
}