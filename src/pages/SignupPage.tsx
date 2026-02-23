import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { generateMnemonic, deriveKeyPairFromMnemonic, keyToBase64 } from "@/crypto";
import { validateUsernameFormat } from "@/lib/usernameValidation";
import { useAuthStore } from "@/store/authStore";
import { CheckCircle, XCircle, Copy, FileText, AlertTriangle, ArrowRight, ArrowLeft, Check } from "lucide-react";

type Phase = "username" | "mnemonic";

export default function SignupPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const createUser = useMutation(api.users.createUser);

  const [phase, setPhase] = useState<Phase>("username");
  const [username, setUsername] = useState("");
  const [formatError, setFormatError] = useState<string | null>(null);
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [warningChecked, setWarningChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  
  // Toast ke liye new state
  const [showToast, setShowToast] = useState(false);

  const isAvailable = useQuery(
    api.users.isUsernameAvailable,
    username.length >= 3 && !formatError ? { username } : "skip"
  );

  useEffect(() => {
    if (username === "") { setFormatError(null); return; }
    const result = validateUsernameFormat(username);
    setFormatError(result.valid ? null : (result.error ?? null));
  }, [username]);

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUsername(e.target.value.toLowerCase());
  }

  async function handleContinue() {
    const words = generateMnemonic().split(" ");
    setMnemonic(words);
    setPhase("mnemonic");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(mnemonic.join(" "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    const content = `LUNEX RECOVERY PHRASE\n\nKeep this file safe. Never share it.\nLosing these words means permanent loss of your account.\n\n${mnemonic.map((w, i) => `${i + 1}. ${w}`).join("\n")}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lunex-key.txt";
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
    
    // Toast show karne ka logic
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  async function handleSignup() {
    if (!warningChecked || !saved) return;
    setIsLoading(true);
    setSignupError(null);
    try {
      const mnemonicString = mnemonic.join(" ");
      const keyPair = await deriveKeyPairFromMnemonic(mnemonicString);
      const publicKeyB64 = keyToBase64(keyPair.publicKey);
      const userId = await createUser({ username, publicKey: publicKeyB64 });
      login({ userId, username, publicKey: keyPair.publicKey, secretKey: keyPair.secretKey });
      navigate("/chat");
    } catch (err: unknown) {
      setSignupError(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const formatValid = formatError === null && username.length >= 3;
  const canContinue = formatValid && isAvailable === true;

  // Premium Background Styling
  const bgStyle = "min-h-screen w-full flex flex-col items-center justify-center px-6 relative overflow-hidden bg-slate-50 dark:bg-[#09090b] transition-colors duration-500";
  
  // Ambient glows
  const ambientGlows = (
    <>
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />
    </>
  );

  // ── PHASE 1: Username Selection ──
  if (phase === "username") {
    return (
      <div className={bgStyle}>
        {ambientGlows}
        
        <div className="w-full max-w-md z-10 flex flex-col items-center">
          
          <div className="w-full relative">
            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-3 ml-2 tracking-wide uppercase">
              Enter Username
            </label>
            
            <div className="relative flex items-center bg-white/60 dark:bg-[#121215]/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl backdrop-blur-xl shadow-sm transition-all focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 dark:focus-within:border-indigo-500">
              <input
                value={username}
                onChange={handleUsernameChange}
                placeholder="e.g. yaram45"
                maxLength={10}
                className="flex-1 bg-transparent py-4 pl-5 pr-2 outline-none text-slate-900 dark:text-white text-xl placeholder:text-slate-400/60 font-medium"
              />
              
              <div className="flex items-center gap-3 pr-2">
                <div className="flex-shrink-0">
                  {username.length >= 3 && (
                    formatError ? (
                      <XCircle size={22} className="text-red-500" />
                    ) : isAvailable === true ? (
                      <CheckCircle size={22} className="text-emerald-500" />
                    ) : isAvailable === false ? (
                      <XCircle size={22} className="text-red-500" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    )
                  )}
                </div>

                <button
                  onClick={handleContinue}
                  disabled={!canContinue}
                  className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-500 rounded-xl px-5 py-2.5 font-semibold transition-all duration-300 disabled:cursor-not-allowed"
                >
                  <span className="mr-2">Next</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            <div className="absolute -bottom-7 left-2 h-5">
              {formatError && <p className="text-red-500 text-sm font-medium">{formatError}</p>}
              {!formatError && isAvailable === false && <p className="text-red-500 text-sm font-medium">Username already taken</p>}
              {!formatError && isAvailable === true && <p className="text-emerald-500 text-sm font-medium">Username is available!</p>}
            </div>
          </div>

          <div className="mt-12">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                Log in
              </Link>
            </p>
          </div>

        </div>
      </div>
    );
  }

  // ── PHASE 2: Mnemonic Phrase ──
  return (
    <div className={bgStyle}>
      {ambientGlows}

      {showToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/20 font-medium text-sm animate-in fade-in slide-in-from-top-5 duration-300">
          <CheckCircle size={18} />
          <span>lunex-key.txt saved successfully!</span>
        </div>
      )}

      <div className="w-full max-w-2xl z-10 flex flex-col gap-8">
        
        <div>
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 ml-1 tracking-wide uppercase">
            Your Recovery Phrase
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {mnemonic.map((word, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-white/60 dark:bg-[#121215]/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md rounded-xl px-4 py-3 shadow-sm transition-all hover:border-indigo-500/30"
              >
                <span className="text-slate-400 dark:text-slate-500 text-xs font-bold w-4">{i + 1}.</span>
                <span className="text-slate-800 dark:text-slate-200 text-sm font-bold tracking-wide">{word}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-[#121215]/40 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all text-sm font-bold"
          >
            <Copy size={18} />
            {copied ? "Copied!" : "Copy Phrase"}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-[#121215]/40 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all text-sm font-bold"
          >
            <FileText size={18} />
            {saved ? "File Saved!" : "Save to PC"}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              <strong className="text-red-600 dark:text-red-400 font-bold">Critical Warning:</strong> This is your ONLY way to access your account. If you lose this file, your account is gone forever. No recovery possible.
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group w-fit">
            {/* Hidden Input add kar diya gaya hai yahan */}
            <input 
              type="checkbox" 
              className="hidden" 
              checked={warningChecked}
              onChange={() => setWarningChecked(!warningChecked)} 
            />
            <div className={`w-6 h-6 rounded-lg border-2 shrink-0 flex items-center justify-center transition-all ${
              warningChecked ? "bg-indigo-600 border-indigo-600" : "border-slate-300 dark:border-slate-600 group-hover:border-indigo-400"
            }`}>
              {warningChecked && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-slate-700 dark:text-slate-200 text-sm font-medium select-none">
              I have safely saved lunex-key.txt and understand the risks.
            </span>
          </label>
        </div>

        {signupError && <p className="text-red-500 text-sm font-medium">{signupError}</p>}

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
    </div>
  );
}