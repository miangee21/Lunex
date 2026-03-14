// src/components/auth/PinLockScreen.tsx
import { useState, useEffect } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useAppLockStore } from "@/store/appLockStore";
import { decryptMnemonicWithPin } from "@/crypto/pinEncryption";
import { deriveKeyPairFromMnemonic, keyToBase64 } from "@/crypto/keyDerivation";
import LunexLogo from "@/components/shared/LunexLogo";
import { Delete } from "lucide-react";
import { toast } from "sonner";

const PAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["del", "0", "ok"],
];

export default function PinLockScreen() {
  const convex = useConvex();
  const setOnlineStatus = useMutation(api.users.setOnlineStatus);
  const loginStore = useAuthStore((s) => s.login);
  const setLocked = useAppLockStore((s) => s.setLocked);
  const setAppLockEnabled = useAppLockStore((s) => s.setAppLockEnabled);

  const [pin, setPin] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (pin.length === 6) {
      handleSubmit(pin.join(""));
    }
  }, [pin]);

  async function handleSubmit(enteredPin: string) {
    setIsLoading(true);
    try {
      const { load } = await import("@tauri-apps/plugin-store");
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
      setPin([]);
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
      const { load } = await import("@tauri-apps/plugin-store");
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

  function handlePad(val: string) {
    if (isLoading) return;
    if (val === "del") {
      setPin((p) => p.slice(0, -1));
    } else if (val === "ok") {
      if (pin.length === 6) handleSubmit(pin.join(""));
    } else {
      if (pin.length < 6) setPin((p) => [...p, val]);
    }
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-background/60 backdrop-blur-xl">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 dark:bg-purple-500/8 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm mx-4 flex flex-col items-center gap-8 bg-card/80 backdrop-blur-2xl border border-border/50 rounded-3xl px-8 py-10 shadow-2xl">
        <div className="flex flex-col items-center gap-3">
          <LunexLogo className="w-14 h-14 rounded-2xl shadow-lg" />
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Lunex
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Enter your PIN to continue
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-4 ${
            shake ? "animate-[shake_0.5s_ease-in-out]" : ""
          }`}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                i < pin.length
                  ? "bg-primary scale-110 shadow-sm shadow-primary/40"
                  : "bg-muted-foreground/25 border border-border"
              }`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 w-full">
          {PAD.flat().map((key) => {
            if (key === "del") {
              return (
                <button
                  key={key}
                  onClick={() => handlePad("del")}
                  disabled={isLoading || pin.length === 0}
                  className="h-14 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-accent active:scale-95 transition-all disabled:opacity-30"
                >
                  <Delete size={20} />
                </button>
              );
            }
            if (key === "ok") {
              return (
                <button
                  key={key}
                  onClick={() => pin.length === 6 && handleSubmit(pin.join(""))}
                  disabled={isLoading || pin.length !== 6}
                  className="h-14 rounded-2xl flex items-center justify-center text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-30"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  ) : (
                    "OK"
                  )}
                </button>
              );
            }
            return (
              <button
                key={key}
                onClick={() => handlePad(key)}
                disabled={isLoading}
                className="h-14 rounded-2xl text-xl font-semibold text-foreground bg-accent/50 hover:bg-accent active:scale-95 transition-all border border-border/40 disabled:opacity-50"
              >
                {key}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleForgotPin}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
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
