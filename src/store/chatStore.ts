import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/store/authStore";

type SidebarView = "chats" | "requests" | "profile" | "friends" | "blocked" | "search";

interface ActiveChat {
  userId: string;
  username: string;
  profilePicStorageId: string | null;
  isOnline: boolean;
  // Per-chat theme customization
  chatPresetName?: string;
  chatBgColor?: string;
  myBubbleColor?: string;
  otherBubbleColor?: string;
  myTextColor?: string;    
  otherTextColor?: string; 
}

// Helper type to make the code cleaner
type ThemeOptions = Partial<Pick<ActiveChat, 'chatPresetName' | 'chatBgColor' | 'myBubbleColor' | 'otherBubbleColor' | 'myTextColor' | 'otherTextColor'>>;

interface ChatState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarView: SidebarView;
  toggleSidebar: () => void;
  setSidebarView: (view: SidebarView) => void;
  setSidebarOpen: (open: boolean) => void;

  // Active chat
  activeChat: ActiveChat | null;
  
  // Nested Multi-User Cache -> { [myUserId]: { [friendId]: ThemeOptions } }
  localThemes: Record<string, Record<string, ThemeOptions>>;

  setActiveChat: (chat: ActiveChat) => void;
  clearActiveChat: () => void;
  updateActiveChatTheme: (themeData: ThemeOptions) => void;

  // ── NEW: Cloud Sync Method ──
  // Called when Convex returns data to ensure local UI matches the backend
  syncChatTheme: (myUserId: string, friendId: string, themeData: ThemeOptions) => void;

  // Right profile panel
  profilePanelOpen: boolean;
  toggleProfilePanel: () => void;
  setProfilePanelOpen: (open: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: true,
      sidebarView: "chats",
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarView: (view) => set({ sidebarView: view, sidebarOpen: true }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // ── LOCAL THEMES CACHE ──
      localThemes: {},

      // Active chat
      activeChat: null,
      
      setActiveChat: (chat) => set((s) => {
        // Grab the current logged-in user's ID
        const myUserId = useAuthStore.getState().userId;
        const myThemes = myUserId ? (s.localThemes[myUserId] || {}) : {};

        return { 
          activeChat: {
            ...chat,
            ...(myThemes[chat.userId] || {}) 
          }, 
          profilePanelOpen: false 
        };
      }),

      clearActiveChat: () => set({ activeChat: null, profilePanelOpen: false }),
      
      updateActiveChatTheme: (themeData) => set((s) => {
        if (!s.activeChat) return s;
        
        const myUserId = useAuthStore.getState().userId;
        if (!myUserId) return s; 

        const friendId = s.activeChat.userId;
        const myThemes = s.localThemes[myUserId] || {};

        return {
          activeChat: { ...s.activeChat, ...themeData },
          localThemes: {
            ...s.localThemes,
            [myUserId]: {
              ...myThemes,
              [friendId]: { ...(myThemes[friendId] || {}), ...themeData } 
            }
          }
        };
      }),

      // ── NEW: SYNC FROM CLOUD ──
      syncChatTheme: (myUserId, friendId, themeData) => set((s) => {
        const myThemes = s.localThemes[myUserId] || {};
        const isCurrentlyActive = s.activeChat?.userId === friendId;

        return {
          // Agar ye chat abhi open hai toh screen par usi waqt update kar do
          ...(isCurrentlyActive && s.activeChat && {
            activeChat: { ...s.activeChat, ...themeData }
          }),
          // Local cache ko update kar do taake baad mein fast load ho
          localThemes: {
            ...s.localThemes,
            [myUserId]: {
              ...myThemes,
              [friendId]: { ...(myThemes[friendId] || {}), ...themeData } 
            }
          }
        };
      }),

      // Right profile panel
      profilePanelOpen: false,
      
      toggleProfilePanel: () => set((s) => {
        const willOpen = !s.profilePanelOpen;
        const width = window.innerWidth;
        
        let newSidebarState = s.sidebarOpen;
        
        if (willOpen && width < 1100) {
          newSidebarState = false; 
        } else if (!willOpen && width >= 900) {
          newSidebarState = true; 
        }

        return { 
          profilePanelOpen: willOpen,
          sidebarOpen: newSidebarState
        };
      }),

      setProfilePanelOpen: (open) => set((s) => {
        const width = window.innerWidth;
        let newSidebarState = s.sidebarOpen;
        
        if (open && width < 1100) {
          newSidebarState = false;
        } else if (!open && width >= 900) {
          newSidebarState = true;
        }
        
        return { 
          profilePanelOpen: open,
          sidebarOpen: newSidebarState
        };
      }),
      
    }),
    {
      // ── CHANGED NAME: This ensures we start fresh with the new cloud-sync logic ──
      name: "lunex-chat-themes-cloud-sync", 
      partialize: (state) => ({ localThemes: state.localThemes }), 
    }
  )
);