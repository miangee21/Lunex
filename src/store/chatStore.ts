import { create } from "zustand";

type SidebarView = "chats" | "requests" | "profile" | "friends" | "blocked" | "search";

interface ChatState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarView: SidebarView;
  toggleSidebar: () => void;
  setSidebarView: (view: SidebarView) => void;

  // Active chat
  activeChatId: string | null;
  activeChatUsername: string | null;
  setActiveChat: (chatId: string, username: string) => void;
  clearActiveChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  // Sidebar
  sidebarOpen: true,
  sidebarView: "chats",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarView: (view) => set({ sidebarView: view, sidebarOpen: true }),

  // Active chat
  activeChatId: null,
  activeChatUsername: null,
  setActiveChat: (chatId, username) => set({ activeChatId: chatId, activeChatUsername: username }),
  clearActiveChat: () => set({ activeChatId: null, activeChatUsername: null }),
}));