//src/pages/LoginPage.tsx
import { useNavigate, Link } from "react-router-dom";
import { useConvex } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import {
  validateMnemonic,
  deriveKeyPairFromMnemonic,
  keyToBase64,
} from "@/crypto";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const convex = useConvex();
  const setOnlineStatus = useMutation(api.users.setOnlineStatus);

  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [showWords, setShowWords] = useState(false);

  const allFilled = words.every((w) => w.trim() !== "");
  const enteredMnemonic = words.join(" ").trim();

  function handleWordChange(index: number, value: string) {
    const updated = [...words];
    updated[index] = value.toLowerCase().trim();
    setWords(updated);
  }

  function handlePaste(
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number,
  ) {
    const pasted = e.clipboardData.getData("text").trim();
    const pastedWords = pasted.split(/\s+/);
    if (pastedWords.length === 12) {
      e.preventDefault();
      setWords(pastedWords.map((w) => w.toLowerCase().trim()));
    } else if (pastedWords.length > 1) {
      e.preventDefault();
      const updated = [...words];
      pastedWords.forEach((w, i) => {
        if (index + i < 12) updated[index + i] = w.toLowerCase().trim();
      });
      setWords(updated);
    }
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      const next = document.getElementById(`word-${index + 1}`);
      if (next) (next as HTMLInputElement).focus();
    }
  }

  async function handleLogin() {
    setIsLoading(true);

    try {
      if (!validateMnemonic(enteredMnemonic)) {
        toast.error("Invalid recovery phrase. Please check your words.");
        setIsLoading(false);
        return;
      }

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

      login({
        userId: user._id,
        username: user.username,
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey,
      });
      await setOnlineStatus({ userId: user._id, isOnline: true });

      toast.success("Welcome back, " + user.username + "!");
      setTimeout(() => navigate("/chat"), 1000);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 relative overflow-hidden bg-slate-50 dark:bg-[#09090b]">
      <div className="absolute top-1/4 left-1/4 w-125 h-125 bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-100 h-100 bg-purple-500/10 dark:bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg z-10 flex flex-col items-center gap-8">
        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase w-full text-center">
          Enter Recovery Phrase
        </label>

        <div className="w-full grid grid-cols-3 gap-3">
          {words.map((word, i) => (
            <div
              key={i}
              className="relative flex items-center gap-2 bg-white/60 dark:bg-[#121215]/60 border border-slate-200 dark:border-slate-800/80 rounded-xl backdrop-blur-xl shadow-sm transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10"
            >
              <span className="text-slate-400 dark:text-slate-500 text-xs font-bold pl-3 shrink-0">
                {i + 1}.
              </span>
              <input
                type={showWords ? "text" : "password"}
                id={`word-${i}`}
                value={word}
                onChange={(e) => handleWordChange(i, e.target.value)}
                onPaste={(e) => handlePaste(e, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                className={`flex-1 bg-transparent py-3 outline-none text-slate-900 dark:text-white text-sm font-medium placeholder:text-slate-300 dark:placeholder:text-slate-700 min-w-0 ${i === 0 ? "pr-8" : "pr-3"}`}
                placeholder="word"
                autoComplete="off"
                spellCheck={false}
              />

              {i === 0 && (
                <button
                  type="button"
                  onClick={() => setShowWords(!showWords)}
                  className="absolute right-3 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors focus:outline-none"
                >
                  {showWords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleLogin}
          disabled={!allFilled || isLoading}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all"
        >
          {isLoading ? (
            <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <>
              Login
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
          Not a user?{" "}
          <Link
            to="/signup"
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
