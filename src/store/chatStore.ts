import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/store/authStore";

type SidebarView = "chats" | "requests" | "profile" | "friends" | "blocked" | "search";

interface ActiveChat {
  userId: string;
  username: string;
  profilePicStorageId: string | null;
  isOnline: boolean;
  conversationId?: string | null;
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
  setConversationId: (conversationId: string) => void;

  // ── Cloud Sync Method ──
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

      // ── SYNC FROM CLOUD ──
      syncChatTheme: (myUserId, friendId, themeData) => set((s) => {
        const myThemes = s.localThemes[myUserId] || {};
        const isCurrentlyActive = s.activeChat?.userId === friendId;

        return {
          ...(isCurrentlyActive && s.activeChat && {
            activeChat: { ...s.activeChat, ...themeData }
          }),
          localThemes: {
            ...s.localThemes,
            [myUserId]: {
              ...myThemes,
              [friendId]: { ...(myThemes[friendId] || {}), ...themeData } 
            }
          }
        };
      }),

      // ── SET CONVERSATION ID ──
      setConversationId: (conversationId) => set((s) => ({
        activeChat: s.activeChat
          ? { ...s.activeChat, conversationId }
          : null,
      })),

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
      name: "lunex-chat-themes-cloud-sync", 
      partialize: (state) => ({ localThemes: state.localThemes }), 
    }
  )
);