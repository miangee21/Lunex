// src/store/settingsStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  isTrayEnabled: boolean;
  setTrayEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isTrayEnabled: false,
      setTrayEnabled: (enabled) => set({ isTrayEnabled: enabled }),
    }),
    {
      name: "lunex-settings",
    },
  ),
);
