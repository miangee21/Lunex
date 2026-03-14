// src/store/appLockStore.ts
import { create } from "zustand";

type AutoLockTimer = "1min" | "5min" | "30min" | "1hr";

interface AppLockState {
  isAppLockEnabled: boolean;
  autoLockTimer: AutoLockTimer;
  isLocked: boolean;
  setAppLockEnabled: (val: boolean) => void;
  setAutoLockTimer: (val: AutoLockTimer) => void;
  setLocked: (val: boolean) => void;
}

export const useAppLockStore = create<AppLockState>((set) => ({
  isAppLockEnabled: false,
  autoLockTimer: "5min",
  isLocked: false,
  setAppLockEnabled: (val) => set({ isAppLockEnabled: val }),
  setAutoLockTimer: (val) => set({ autoLockTimer: val }),
  setLocked: (val) => set({ isLocked: val }),
}));
