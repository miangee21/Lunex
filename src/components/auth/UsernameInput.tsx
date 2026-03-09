// src/components/auth/UsernameInput.tsx
import { Link } from "react-router-dom";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";

interface UsernameInputProps {
  username: string;
  setUsername: (val: string) => void;
  formatError: string | null;
  isAvailable: boolean | undefined;
  canContinue: boolean;
  onContinue: () => void;
}

export default function UsernameInput({
  username,
  setUsername,
  formatError,
  isAvailable,
  canContinue,
  onContinue,
}: UsernameInputProps) {
  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUsername(e.target.value.toLowerCase());
  }

  return (
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
            <div className="shrink-0">
              {username.length >= 3 &&
                (formatError ? (
                  <XCircle size={22} className="text-red-500" />
                ) : isAvailable === true ? (
                  <CheckCircle size={22} className="text-emerald-500" />
                ) : isAvailable === false ? (
                  <XCircle size={22} className="text-red-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                ))}
            </div>

            <button
              onClick={onContinue}
              disabled={!canContinue}
              className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-500 rounded-xl px-5 py-2.5 font-semibold transition-all duration-300 disabled:cursor-not-allowed"
            >
              <span className="mr-2">Next</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="absolute -bottom-7 left-2 h-5">
          {formatError && (
            <p className="text-red-500 text-sm font-medium">{formatError}</p>
          )}
          {!formatError && isAvailable === false && (
            <p className="text-red-500 text-sm font-medium">
              Username already taken
            </p>
          )}
          {!formatError && isAvailable === true && (
            <p className="text-emerald-500 text-sm font-medium">
              Username is available!
            </p>
          )}
        </div>
      </div>

      <div className="mt-12">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
