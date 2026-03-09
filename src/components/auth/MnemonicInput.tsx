// src/components/auth/MnemonicInput.tsx
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface MnemonicInputProps {
  words: string[];
  setWords: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function MnemonicInput({ words, setWords }: MnemonicInputProps) {
  const [showWords, setShowWords] = useState(false);

  function handleWordChange(index: number, value: string) {
    const updated = [...words];
    updated[index] = value.toLowerCase().trim();
    setWords(updated);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    const pastedWords = pasteData
      .split(/[\s,]+/)
      .filter((w) => w.trim() !== "")
      .map((w) => w.toLowerCase());

    if (pastedWords.length > 0) {
      const newWords = [...words];
      for (let i = 0; i < 12 && i < pastedWords.length; i++) {
        newWords[i] = pastedWords[i];
      }
      setWords(newWords);
    }
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < 12) {
        document.getElementById(`word-${nextIndex}`)?.focus();
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-center px-1">
        <span className="text-sm font-semibold text-muted-foreground">
          Enter Recovery Phrase
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {words.map((word, index) => (
          <div key={index} className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-[11px] font-mono select-none">
              {(index + 1).toString().padStart(2, "0")}
            </span>

            <input
              id={`word-${index}`}
              type={showWords ? "text" : "password"}
              value={word}
              onChange={(e) => handleWordChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={index === 0 ? handlePaste : undefined}
              className={`w-full bg-card border border-border/50 rounded-2xl py-3 pl-8 ${
                index === 0 ? "pr-10" : "pr-3"
              } text-sm font-semibold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono`}
              placeholder="•••"
              autoComplete="off"
              spellCheck="false"
            />

            {index === 0 && (
              <button
                onClick={() => setShowWords(!showWords)}
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title={showWords ? "Hide words" : "Show words"}
              >
                {showWords ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
