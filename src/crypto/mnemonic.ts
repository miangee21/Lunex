//src/crypto/mnemonic.ts
import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

// Generate a new 12-word mnemonic
export function generateMnemonic(): string {
  return bip39.generateMnemonic(wordlist, 128);
}

// Validate a mnemonic entered by user during login
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic.trim().toLowerCase(), wordlist);
}

// Convert mnemonic to a 64-byte seed (deterministic)
export async function mnemonicToSeed(mnemonic: string): Promise<Uint8Array> {
  return bip39.mnemonicToSeed(mnemonic.trim().toLowerCase());
}
