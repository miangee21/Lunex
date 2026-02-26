import { create } from "zustand";

type SidebarView = "chats" | "requests" | "profile" | "friends" | "blocked" | "search";

interface ActiveChat {
  userId: string;
  username: string;
  profilePicStorageId: string | null;
  isOnline: boolean;
}

interface ChatState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarView: SidebarView;
  toggleSidebar: () => void;
  setSidebarView: (view: SidebarView) => void;

  // Active chat
  activeChat: ActiveChat | null;
  setActiveChat: (chat: ActiveChat) => void;
  clearActiveChat: () => void;

  // Right profile panel
  profilePanelOpen: boolean;
  toggleProfilePanel: () => void;
  setProfilePanelOpen: (open: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  // Sidebar
  sidebarOpen: true,
  sidebarView: "chats",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarView: (view) => set({ sidebarView: view, sidebarOpen: true }),

  // Active chat
  activeChat: null,
  setActiveChat: (chat) => set({ activeChat: chat, profilePanelOpen: false }),
  clearActiveChat: () => set({ activeChat: null, profilePanelOpen: false }),

  // Right profile panel
  profilePanelOpen: false,
  toggleProfilePanel: () => set((s) => ({ profilePanelOpen: !s.profilePanelOpen })),
  setProfilePanelOpen: (open) => set({ profilePanelOpen: open }),
}));