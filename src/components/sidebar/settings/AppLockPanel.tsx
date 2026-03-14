// src/components/sidebar/settings/AppLockPanel.tsx
import { useState } from "react";
import { ArrowLeft, Lock, ShieldCheck, Timer, Delete } from "lucide-react";
import { useAppLockStore } from "@/store/appLockStore";
import { useAuthStore } from "@/store/authStore";
import {
  encryptMnemonicWithPin,
  decryptMnemonicWithPin,
} from "@/crypto/pinEncryption";
import { toast } from "sonner";

interface AppLockPanelProps {
  onBack: () => void;
}

const AUTO_LOCK_OPTIONS = [
  { value: "1min", label: "1 Minute" },
  { value: "5min", label: "5 Minutes" },
  { value: "30min", label: "30 Minutes" },
  { value: "1hr", label: "1 Hour" },
] as const;

const PAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["del", "0", ""],
];

type SetupStep = "idle" | "enter" | "confirm" | "disable_confirm";

function PinPad({
  pin,
  onPad,
  isLoading,
  shake,
}: {
  pin: string[];
  onPad: (val: string) => void;
  isLoading: boolean;
  shake: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div
        className={`flex items-center gap-3 ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              i < pin.length
                ? "bg-primary scale-110 shadow-sm shadow-primary/40"
                : "bg-muted-foreground/25 border border-border"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 w-full">
        {PAD.flat().map((key, idx) => {
          if (key === "del") {
            return (
              <button
                key={idx}
                onClick={() => onPad("del")}
                disabled={isLoading || pin.length === 0}
                className="h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent active:scale-95 transition-all disabled:opacity-30"
              >
                <Delete size={18} />
              </button>
            );
          }
          if (key === "") {
            return <div key={idx} />;
          }
          return (
            <button
              key={idx}
              onClick={() => onPad(key)}
              disabled={isLoading}
              className="h-12 rounded-xl text-lg font-semibold text-foreground bg-accent/50 hover:bg-accent active:scale-95 transition-all border border-border/40 disabled:opacity-50"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AppLockPanel({ onBack }: AppLockPanelProps) {
  const isAppLockEnabled = useAppLockStore((s) => s.isAppLockEnabled);
  const autoLockTimer = useAppLockStore((s) => s.autoLockTimer);
  const setAppLockEnabled = useAppLockStore((s) => s.setAppLockEnabled);
  const setAutoLockTimer = useAppLockStore((s) => s.setAutoLockTimer);
  const setLocked = useAppLockStore((s) => s.setLocked);

  const [setupStep, setSetupStep] = useState<SetupStep>("idle");
  const [firstPin, setFirstPin] = useState<string>("");
  const [pin, setPin] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  function triggerShake() {
    setShake(true);
    setPin([]);
    setTimeout(() => setShake(false), 600);
  }

  function handlePad(val: string) {
    if (isLoading) return;
    if (val === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 6) return;
    const newPin = [...pin, val];
    setPin(newPin);

    if (newPin.length === 6) {
      setTimeout(() => handlePinComplete(newPin.join("")), 100);
    }
  }

  async function handlePinComplete(enteredPin: string) {
    if (setupStep === "enter") {
      setFirstPin(enteredPin);
      setPin([]);
      setSetupStep("confirm");
      return;
    }

    if (setupStep === "confirm") {
      if (enteredPin !== firstPin) {
        triggerShake();
        toast.error("PINs don't match. Try again.");
        setSetupStep("enter");
        setFirstPin("");
        return;
      }
      await savePin(enteredPin);
      return;
    }

    if (setupStep === "disable_confirm") {
      await verifyAndDisable(enteredPin);
      return;
    }
  }

  async function savePin(enteredPin: string) {
    const mnemonic = useAuthStore.getState().mnemonic;
    if (!mnemonic) {
      toast.error("Session expired. Log out and log in again.");
      setSetupStep("idle");
      setPin([]);
      return;
    }
    setIsLoading(true);
    try {
      const { ciphertext, iv } = await encryptMnemonicWithPin(
        mnemonic,
        enteredPin,
      );
      const { load } = await import("@tauri-apps/plugin-store");
      const store = await load("lunex-applock.json");
      await store.set("lockData", { ciphertext, iv, createdAt: Date.now() });
      await store.save();
      setAppLockEnabled(true);
      setSetupStep("idle");
      setPin([]);
      setFirstPin("");
      toast.success("App Lock enabled!");
    } catch {
      toast.error("Failed to enable App Lock.");
      setSetupStep("idle");
      setPin([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyAndDisable(enteredPin: string) {
    setIsLoading(true);
    try {
      const { load } = await import("@tauri-apps/plugin-store");
      const store = await load("lunex-applock.json");
      const lockData = await store.get<{ ciphertext: string; iv: string }>(
        "lockData",
      );
      if (!lockData) throw new Error("No lock data");
      await decryptMnemonicWithPin(
        lockData.ciphertext,
        lockData.iv,
        enteredPin,
      );
      await store.clear();
      await store.save();
      setAppLockEnabled(false);
      setSetupStep("idle");
      setPin([]);
      toast.success("App Lock disabled.");
    } catch {
      triggerShake();
      toast.error("Incorrect PIN.");
    } finally {
      setIsLoading(false);
    }
  }

  const stepTitle =
    setupStep === "enter"
      ? "Set a PIN"
      : setupStep === "confirm"
        ? "Confirm PIN"
        : setupStep === "disable_confirm"
          ? "Enter current PIN"
          : "";

  const stepSubtitle =
    setupStep === "enter"
      ? "Enter a 6-digit PIN to protect your app"
      : setupStep === "confirm"
        ? "Enter the same PIN again to confirm"
        : setupStep === "disable_confirm"
          ? "Enter your PIN to disable App Lock"
          : "";

  return (
    <div className="flex flex-col h-full bg-sidebar animate-in slide-in-from-right-4 duration-200">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border/40 shrink-0">
        <button
          onClick={() => {
            if (setupStep !== "idle") {
              setSetupStep("idle");
              setPin([]);
              setFirstPin("");
            } else {
              onBack();
            }
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-semibold text-[15px]">App Lock</h2>
        {isAppLockEnabled && setupStep === "idle" && (
          <span className="ml-auto text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
            ON
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar">
        {setupStep !== "idle" ? (
          <div className="flex flex-col items-center gap-6 pt-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Lock size={22} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-semibold text-[15px]">
                {stepTitle}
              </p>
              <p className="text-muted-foreground text-[12px] mt-1">
                {stepSubtitle}
              </p>
            </div>
            <PinPad
              pin={pin}
              onPad={handlePad}
              isLoading={isLoading}
              shake={shake}
            />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3.5">
              <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {isAppLockEnabled
                  ? "App Lock is active. Your app is protected with a PIN."
                  : "Lock your app with a 6-digit PIN. You won't need your 12 words every time."}
              </p>
            </div>

            <div className="bg-card/50 border border-border/40 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-md ${isAppLockEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    <Lock size={15} />
                  </div>
                  <span className="text-[14px] font-medium text-foreground">
                    App Lock
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (isAppLockEnabled) {
                      setSetupStep("disable_confirm");
                    } else {
                      setSetupStep("enter");
                    }
                    setPin([]);
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    isAppLockEnabled ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      isAppLockEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {isAppLockEnabled && (
              <>
                <div>
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider mb-2 pl-1">
                    Auto-lock after
                  </p>
                  <div className="bg-card/50 border border-border/40 rounded-xl overflow-hidden shadow-sm">
                    {AUTO_LOCK_OPTIONS.map((opt, idx) => (
                      <button
                        key={opt.value}
                        onClick={() => setAutoLockTimer(opt.value)}
                        className={`w-full flex items-center justify-between px-3 py-3 hover:bg-accent/20 transition-colors ${
                          idx !== AUTO_LOCK_OPTIONS.length - 1
                            ? "border-b border-border/30"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center justify-center w-7 h-7 rounded-md ${autoLockTimer === opt.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                          >
                            <Timer size={14} />
                          </div>
                          <span
                            className={`text-[14px] font-medium ${autoLockTimer === opt.value ? "text-primary" : "text-foreground"}`}
                          >
                            {opt.label}
                          </span>
                        </div>
                        {autoLockTimer === opt.value && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-card/50 border border-border/40 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setLocked(true)}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-accent/20 transition-colors border-b border-border/30"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground">
                      <Lock size={15} />
                    </div>
                    <span className="text-[14px] font-medium text-foreground">
                      Lock Now
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setSetupStep("enter");
                      setPin([]);
                      setFirstPin("");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-accent/20 transition-colors"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-muted-foreground">
                      <ShieldCheck size={15} />
                    </div>
                    <span className="text-[14px] font-medium text-foreground">
                      Change PIN
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
