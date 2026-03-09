//src/pages/SignupPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { validateUsernameFormat } from "@/lib/usernameValidation";
import UsernameInput from "@/components/auth/UsernameInput";
import MnemonicDisplay from "@/components/auth/MnemonicDisplay";
import { useAuthStore } from "@/store/authStore";
import { AlertTriangle, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import {
  generateMnemonic,
  deriveKeyPairFromMnemonic,
  keyToBase64,
} from "@/crypto";

type Phase = "username" | "mnemonic";

export default function SignupPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const createUser = useMutation(api.users.createUser);

  const [phase, setPhase] = useState<Phase>("username");
  const [username, setUsername] = useState("");
  const [formatError, setFormatError] = useState<string | null>(null);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [warningChecked, setWarningChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isAvailable = useQuery(
    api.users.isUsernameAvailable,
    username.length >= 3 && !formatError ? { username } : "skip",
  );

  useEffect(() => {
    if (username === "") {
      setFormatError(null);
      return;
    }
    const result = validateUsernameFormat(username);
    setFormatError(result.valid ? null : (result.error ?? null));
  }, [username]);

  async function handleContinue() {
    const words = generateMnemonic().split(" ");
    setMnemonic(words);
    setPhase("mnemonic");
  }

  function handleSave() {
    const content = `LUNEX RECOVERY PHRASE\n\nKeep this file safe.\nNever share it.\nLosing these words means permanent loss of your account.\n\n${mnemonic.map((w, i) => `${i + 1}. ${w}`).join("\n")}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lunex-key.txt";
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
    toast.success("lunex-key.txt saved successfully!", {
      description: "Store this file somewhere safe. You will need it to login.",
    });
  }

  async function handleSignup() {
    if (!warningChecked || !saved) return;
    setIsLoading(true);
    try {
      const mnemonicString = mnemonic.join(" ");
      const keyPair = await deriveKeyPairFromMnemonic(mnemonicString);
      const publicKeyB64 = keyToBase64(keyPair.publicKey);
      const userId = await createUser({ username, publicKey: publicKeyB64 });

      login({
        userId,
        username,
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey,
      });

      toast.success("Welcome to Lunex, " + username + "!");
      setTimeout(() => navigate("/chat"), 1000);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Signup failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const formatValid = formatError === null && username.length >= 3;
  const canContinue = formatValid && isAvailable === true;

  const bgStyle =
    "min-h-screen w-full flex flex-col items-center justify-center px-6 relative overflow-hidden bg-slate-50 dark:bg-[#09090b]";
  const ambientGlows = (
    <>
      <div className="absolute top-1/4 left-1/4 w-125 h-125 bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-100 h-100 bg-purple-500/10 dark:bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />
    </>
  );

  return (
    <div className={bgStyle}>
      {ambientGlows}
      {phase === "username" && (
        <UsernameInput
          username={username}
          setUsername={setUsername}
          formatError={formatError}
          isAvailable={isAvailable}
          canContinue={canContinue}
          onContinue={handleContinue}
        />
      )}

      {phase === "mnemonic" && (
        <div className="w-full max-w-2xl z-10 flex flex-col gap-8">
          <MnemonicDisplay
            mnemonic={mnemonic.join(" ")}
            onDownload={handleSave}
          />

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={20}
                className="text-red-500 dark:text-red-400 shrink-0 mt-0.5"
              />
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                <strong className="text-red-600 dark:text-red-400 font-bold">
                  Critical Warning:
                </strong>{" "}
                This is your ONLY way to access your account. If you lose this
                file, your account is gone forever. No recovery possible.
              </p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group w-fit">
              <input
                type="checkbox"
                className="hidden"
                checked={warningChecked}
                onChange={() => setWarningChecked(!warningChecked)}
              />
              <div
                className={`w-6 h-6 rounded-lg border-2 shrink-0 flex items-center justify-center transition-all ${
                  warningChecked
                    ? "bg-indigo-600 border-indigo-600"
                    : "border-slate-300 dark:border-slate-600 group-hover:border-indigo-400"
                }`}
              >
                {warningChecked && (
                  <Check size={14} className="text-white" strokeWidth={3} />
                )}
              </div>
              <span className="text-slate-700 dark:text-slate-200 text-sm font-medium select-none">
                I have safely saved lunex-key.txt and understand the risks.
              </span>
            </label>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <button
              onClick={() => setPhase("username")}
              className="px-5 py-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={handleSignup}
              disabled={!warningChecked || !saved || isLoading}
              className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all flex justify-center items-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                "Complete Signup"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
