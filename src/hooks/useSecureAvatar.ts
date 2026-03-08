// src/hooks/useSecureAvatar.ts
import { useState, useEffect } from "react";
import { decryptDP } from "@/crypto";

export function useSecureAvatar(avatarUrl: string | undefined | null) {
  const [secureUrl, setSecureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarUrl) {
      setSecureUrl(null);
      return;
    }

    let isMounted = true;
    let objectUrl: string | null = null;

    async function fetchAndDecrypt() {
      try {
        const response = await fetch(avatarUrl as string);
        const encryptedBlob = await response.blob();

        objectUrl = await decryptDP(encryptedBlob);

        if (isMounted) setSecureUrl(objectUrl);
      } catch (error) {
        console.error("DP Decryption failed:", error);
        if (isMounted) setSecureUrl(null);
      }
    }

    fetchAndDecrypt();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarUrl]);

  return secureUrl;
}
