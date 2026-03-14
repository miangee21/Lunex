// src/components/auth/PinLockScreen.tsx
import { useState, useEffect, useRef } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useAppLockStore } from "@/store/appLockStore";
import { decryptMnemonicWithPin } from "@/crypto/pinEncryption";
import { deriveKeyPairFromMnemonic, keyToBase64 } from "@/crypto/keyDerivation";
import { load } from "@tauri-apps/plugin-store";
import { ArrowLeft } from "lucide-react";
import MnemonicInput from "@/components/auth/MnemonicInput";
import { validateMnemonic } from "@/crypto/mnemonic";
import { encryptMnemonicWithPin } from "@/crypto/pinEncryption";
import { toast } from "sonner";
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

  type LockStep = "login" | "recover" | "set_new" | "confirm_new";
  const [step, setStep] = useState<LockStep>("login");

  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [revealPin, setRevealPin] = useState(false);

  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const [newPin, setNewPin] = useState("");
  const [firstNewPin, setFirstNewPin] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isLoading]);

  useEffect(() => {
    if (step === "login" && pin.length === 6) {
      handleSubmit(pin);
    } else if (step === "set_new" && newPin.length === 6) {
      setFirstNewPin(newPin);
      setNewPin("");
      setStep("confirm_new");
    } else if (step === "confirm_new" && newPin.length === 6) {
      handleConfirmNewPin(newPin);
    }
  }, [pin, newPin, step]);

  async function handleVerifyWords() {
    const enteredMnemonic = words.join(" ").trim();
    if (!validateMnemonic(enteredMnemonic)) {
      toast.error("Invalid recovery phrase. Please check your words.");
      return;
    }

    setIsLoading(true);
    try {
      const keyPair = await deriveKeyPairFromMnemonic(enteredMnemonic);
      const publicKeyB64 = keyToBase64(keyPair.publicKey);
      const user = await convex.query(api.users.getUserByPublicKey, {
        publicKey: publicKeyB64,
      });

      if (!user) {
        toast.error("No account found for these 12 words.");
        setIsLoading(false);
        return;
      }
      setStep("set_new");
    } catch (err) {
      toast.error("Verification failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmNewPin(confirmedPin: string) {
    if (confirmedPin !== firstNewPin) {
      setAttempts((a) => a + 1);
      setShake(true);
      setNewPin("");
      setFirstNewPin("");
      setTimeout(() => setShake(false), 600);
      toast.error("PINs don't match. Try again.");
      setStep("set_new");
      return;
    }

    setIsLoading(true);
    try {
      const enteredMnemonic = words.join(" ").trim();
      const { ciphertext, iv } = await encryptMnemonicWithPin(
        enteredMnemonic,
        confirmedPin,
      );

      const store = await load("lunex-applock.json");
      await store.set("lockData", { ciphertext, iv, createdAt: Date.now() });
      await store.save();

      const keyPair = await deriveKeyPairFromMnemonic(enteredMnemonic);
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
        mnemonic: enteredMnemonic,
      });

      await setOnlineStatus({ userId: user._id, isOnline: true });
      setLocked(false);
      toast.success("PIN reset successfully!");
    } catch (err) {
      toast.error("Failed to set new PIN.");
    } finally {
      setIsLoading(false);
    }
  }

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

  let title = "🔒Welcome Back";
  let subtitle = "Enter your PIN to access your chats";

  if (step === "recover") {
    title = "🛟Recover PIN";
    subtitle = "Enter your 12-word recovery phrase to restore your PIN";
  } else if (step === "set_new") {
    title = "🔒Create PIN";
    subtitle = "Create a 6-digit PIN to continue";
  } else if (step === "confirm_new") {
    title = "🔒Confirm PIN";
    subtitle = "Enter your new PIN again to confirm";
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-background overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-primary/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-background/40 backdrop-blur-3xl pointer-events-none" />

      <div
        className={`relative z-10 flex flex-col items-center gap-10 w-full transition-all duration-300 ${
          step === "recover" ? "max-w-2xl" : "max-w-sm"
        } mx-4 ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
      >
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {step === "login" && (
          <div className="flex flex-col gap-2 w-fit mx-auto">
            <div
              className="flex flex-col items-center gap-3 cursor-pointer"
              onMouseEnter={() => setRevealPin(true)}
              onMouseLeave={() => setRevealPin(false)}
              onClick={() => setRevealPin(!revealPin)}
            >
              <InputOTP
                ref={inputRef}
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
                <div className="absolute -bottom-6 w-4 h-4 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
              )}
            </div>

            <button
              onClick={() => setStep("recover")}
              disabled={isLoading}
              className="self-end text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 mt-1"
            >
              Forgot PIN?
            </button>
          </div>
        )}

        {step === "recover" && (
          <div className="flex flex-col items-center gap-8 w-full animate-in fade-in zoom-in duration-300">
            <MnemonicInput
              words={words}
              setWords={setWords}
              hideHeading={true}
            />

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm">
              <button
                onClick={() => {
                  setStep("login");
                  setWords(Array(12).fill(""));
                }}
                disabled={isLoading}
                className="flex-1 w-full py-3 rounded-xl border border-border/50 text-foreground font-medium hover:bg-accent/50 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <button
                onClick={handleVerifyWords}
                disabled={isLoading || !words.every((w) => w.trim() !== "")}
                className="flex-1 w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  "Verify Phrase"
                )}
              </button>
            </div>
          </div>
        )}

        {(step === "set_new" || step === "confirm_new") && (
          <>
            <div
              className="flex flex-col items-center gap-3 cursor-pointer animate-in fade-in zoom-in duration-300"
              onMouseEnter={() => setRevealPin(true)}
              onMouseLeave={() => setRevealPin(false)}
              onClick={() => setRevealPin(!revealPin)}
            >
              <InputOTP
                ref={inputRef}
                maxLength={6}
                value={newPin}
                onChange={setNewPin}
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
              onClick={() => {
                setStep("recover");
                setNewPin("");
                setFirstNewPin("");
              }}
              disabled={isLoading}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <ArrowLeft size={14} />
              Cancel and go back
            </button>
          </>
        )}
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
