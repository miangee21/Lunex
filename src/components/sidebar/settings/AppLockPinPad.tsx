// src/components/sidebar/settings/AppLockPinPad.tsx
import { Delete } from "lucide-react";

const PAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["del", "0", ""],
];

interface AppLockPinPadProps {
  pin: string[];
  onPad: (val: string) => void;
  isLoading: boolean;
  shake: boolean;
}

export default function AppLockPinPad({
  pin,
  onPad,
  isLoading,
  shake,
}: AppLockPinPadProps) {
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
