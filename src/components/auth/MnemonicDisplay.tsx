// src/components/auth/MnemonicDisplay.tsx
import { useState } from "react";
import { Eye, EyeOff, Copy, Download, Check } from "lucide-react";
import { toast } from "sonner";

interface MnemonicDisplayProps {
  mnemonic: string;
  onDownload: () => void;
}

export default function MnemonicDisplay({
  mnemonic,
  onDownload,
}: MnemonicDisplayProps) {
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const words = mnemonic.split(" ");

  const handleCopyMnemonic = () => {
    navigator.clipboard.writeText(mnemonic);
    setHasCopied(true);
    toast.success("Recovery phrase copied!");
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-center px-1">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Save Your Recovery Phrase
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {words.map((word, index) => (
          <div
            key={index}
            className="relative flex items-center justify-center py-3 bg-white/60 dark:bg-[#121215]/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl backdrop-blur-xl shadow-sm transition-all"
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400/50 dark:text-slate-500/50 text-[11px] font-mono select-none">
              {(index + 1).toString().padStart(2, "0")}
            </span>

            <span
              className={`font-mono font-semibold text-sm ${
                !showMnemonic
                  ? "blur-xs select-none text-slate-400"
                  : "text-slate-900 dark:text-white"
              } ${index === 0 ? "pl-4 pr-8" : "px-2"}`}
            >
              {showMnemonic ? word : "•••••"}
            </span>

            {index === 0 && (
              <button
                onClick={() => setShowMnemonic(!showMnemonic)}
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                title={showMnemonic ? "Hide words" : "Show words"}
              >
                {showMnemonic ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-2">
        <button
          onClick={handleCopyMnemonic}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors"
        >
          {hasCopied ? (
            <Check size={18} className="text-emerald-500" />
          ) : (
            <Copy size={18} />
          )}
          {hasCopied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={onDownload}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold text-sm transition-colors"
        >
          <Download size={18} />
          Download
        </button>
      </div>
    </div>
  );
}
