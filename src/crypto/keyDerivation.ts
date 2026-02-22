import { mnemonicToSeed } from "./mnemonic";
import nacl from "tweetnacl";

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

// Derive a deterministic X25519 keypair from the mnemonic
export async function deriveKeyPairFromMnemonic(mnemonic: string): Promise<KeyPair> {
  const seed = await mnemonicToSeed(mnemonic);
  const secretKey = seed.slice(0, 32);
  return nacl.box.keyPair.fromSecretKey(secretKey);
}

// Convert a Uint8Array key to base64 string for storing in Convex
export function keyToBase64(key: Uint8Array): string {
  return btoa(String.fromCharCode(...key));
}

// Convert base64 string back to Uint8Array for use in crypto
export function base64ToKey(b64: string): Uint8Array {
  return new Uint8Array(atob(b64).split("").map((c) => c.charCodeAt(0)));
}