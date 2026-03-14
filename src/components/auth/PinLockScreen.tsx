// src/components/auth/PinLockScreen.tsx
import { useState, useEffect } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useAppLockStore } from "@/store/appLockStore";
import { decryptMnemonicWithPin } from "@/crypto/pinEncryption";
import { deriveKeyPairFromMnemonic, keyToBase64 } from "@/crypto/keyDerivation";
import { toast } from "sonner";
import { load } from "@tauri-apps/plugin-store";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function PinLockScreen() {
  const convex = useConvex();
  const setOnlineStatus = useMutation(api.users.setOnlineStatus);
  const loginStore = useAuthStore((s) => s.login);
  const setLocked = useAppLockStore((s) => s.setLocked);
  const setAppLockEnabled = useAppLockStore((s) => s.setAppLockEnabled);

  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [revealPin, setRevealPin] = useState(false);

  useEffect(() => {
    if (pin.length === 6) {
      handleSubmit(pin);
    }
  }, [pin]);

  async function handleSubmit(enteredPin: string) {
    if (enteredPin.length !== 6 || isLoading) return;
    setIsLoading(true);
    try {
      const store = await load("lunex-applock.json");
      const lockData = await store.get<{ ciphertext: string; iv: string }>(
        "lockData",
      );

      if (!lockData) {
        setAppLockEnabled(false);
        setLocked(false);
        useAuthStore.getState().logout();
        return;
      }

      const mnemonic = await decryptMnemonicWithPin(
        lockData.ciphertext,
        lockData.iv,
        enteredPin,
      );

      const keyPair = await deriveKeyPairFromMnemonic(mnemonic);
      const publicKeyB64 = keyToBase64(keyPair.publicKey);
      const user = await convex.query(api.users.getUserByPublicKey, {
        publicKey: publicKeyB64,
      });

      if (!user) throw new Error("User not found");

      loginStore({
        userId: user._id,
        username: user.username,
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey,
        mnemonic,
      });

      await setOnlineStatus({ userId: user._id, isOnline: true });
      setLocked(false);
    } catch {
      setAttempts((a) => a + 1);
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 600);
      if (attempts + 1 >= 3) {
        toast.error("Incorrect PIN");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPin() {
    try {
      const store = await load("lunex-applock.json");
      await store.clear();
      await store.save();
      setAppLockEnabled(false);
      setLocked(false);
      useAuthStore.getState().logout();
    } catch {
      toast.error("Failed to reset. Please restart the app.");
    }
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-background overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-primary/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="absolute inset-0 bg-background/40 backdrop-blur-3xl pointer-events-none" />

      <div
        className={`relative z-10 flex flex-col items-center gap-10 w-full max-w-sm mx-4 ${
          shake ? "animate-[shake_0.5s_ease-in-out]" : ""
        }`}
      >
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your PIN to unlock
          </p>
        </div>

        <div
          className="flex flex-col items-center gap-3 cursor-pointer"
          onMouseEnter={() => setRevealPin(true)}
          onMouseLeave={() => setRevealPin(false)}
          onClick={() => setRevealPin(!revealPin)}
        >
          <InputOTP
            maxLength={6}
            value={pin}
            onChange={setPin}
            disabled={isLoading}
            autoFocus
          >
            <InputOTPGroup className="gap-3">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className={`w-11 h-12 rounded-xl border border-border/60 bg-background/40 backdrop-blur-sm text-foreground font-bold text-lg shadow-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 ${
                    !revealPin ? "[-webkit-text-security:disc]" : ""
                  }`}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {isLoading && (
            <div className="w-4 h-4 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
          )}
        </div>

        <button
          onClick={handleForgotPin}
          disabled={isLoading}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 disabled:opacity-50"
        >
          Forgot PIN? Sign in with 12 words
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
