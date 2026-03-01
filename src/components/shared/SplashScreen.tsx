// src/components/shared/SplashScreen.tsx
import { useEffect, useState } from "react";
import icon from "@/assets/icon.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2500;
    const interval = 20;
    const steps = duration / interval;
    const increment = 100 / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= 100) {
        setProgress(100);
        clearInterval(timer);
        setTimeout(onComplete, 200);
      } else {
        setProgress(current);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-[#09090b]">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="z-10 flex flex-col items-center gap-8">
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/20 border border-slate-200/50 dark:border-slate-700/50">
            <img
              src={icon}
              alt="Lunex"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="absolute inset-0 w-28 h-28 rounded-3xl bg-indigo-500/20 blur-xl -z-10" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Lunex
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium tracking-wide">
            Private. Encrypted. Yours.
          </p>
        </div>

        <div className="w-48 flex flex-col items-center gap-2">
          <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
