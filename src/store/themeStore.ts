import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "dark",
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("lunex-theme", next);
      return { theme: next };
    }),
  setTheme: (t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    localStorage.setItem("lunex-theme", t);
    set({ theme: t });
  },
}));