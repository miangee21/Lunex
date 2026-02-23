import { create } from "zustand";
import { Id } from "../../convex/_generated/dataModel";

interface AuthState {
  userId: Id<"users"> | null;
  username: string | null;
  publicKey: Uint8Array | null;
  secretKey: Uint8Array | null;
  isAuthenticated: boolean;
  login: (data: {
    userId: Id<"users">;
    username: string;
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  username: null,
  publicKey: null,
  secretKey: null,
  isAuthenticated: false,
  login: (data) => set({ ...data, isAuthenticated: true }),
  logout: () =>
    set({
      userId: null,
      username: null,
      publicKey: null,
      secretKey: null,
      isAuthenticated: false,
    }),
}));