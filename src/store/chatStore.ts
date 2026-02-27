import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/store/authStore";

type SidebarView =
  | "chats"
  | "requests"
  | "profile"
  | "friends"
  | "blocked"
  | "search";

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
type ThemeOptions = Partial<
  Pick<
    ActiveChat,
    | "chatPresetName"
    | "chatBgColor"
    | "myBubbleColor"
    | "otherBubbleColor"
    | "myTextColor"
    | "otherTextColor"
  >
>;

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

  lastMessageCache: Record<
    string,
    {
      text: string;
      senderId: string;
      sentAt: number;
      type: string;
    }
  >;
  updateLastMessageCache: (
    conversationId: string,
    data: {
      text: string;
      senderId: string;
      sentAt: number;
      type: string;
    },
  ) => void;
  // ── UPDATED: Caches ab time bhi store karenge ──
  readByCache: Record<string, { userId: string; time: number }[]>;
  updateReadByCache: (conversationId: string, readBy: { userId: string; time: number }[]) => void;
  deliveredToCache: Record<string, { userId: string; time: number }[]>;
  updateDeliveredToCache: (
    conversationId: string,
    deliveredTo: { userId: string; time: number }[],
  ) => void;

  // ── NEW: Message Info Panel tracking ──
  selectedMessageForInfo: { id: string; text: string } | null;
  setSelectedMessageForInfo: (data: { id: string; text: string } | null) => void;

  // ── Cloud Sync Method ──
  syncChatTheme: (
    myUserId: string,
    friendId: string,
    themeData: ThemeOptions,
  ) => void;

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

      setActiveChat: (chat) =>
        set((s) => {
          const myUserId = useAuthStore.getState().userId;
          const myThemes = myUserId ? s.localThemes[myUserId] || {} : {};

          return {
            activeChat: {
              ...chat,
              ...(myThemes[chat.userId] || {}),
            },
            profilePanelOpen: false,
          };
        }),

      clearActiveChat: () => set({ activeChat: null, profilePanelOpen: false }),

      updateActiveChatTheme: (themeData) =>
        set((s) => {
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
                [friendId]: { ...(myThemes[friendId] || {}), ...themeData },
              },
            },
          };
        }),

      // ── SYNC FROM CLOUD ──
      syncChatTheme: (myUserId, friendId, themeData) =>
        set((s) => {
          const myThemes = s.localThemes[myUserId] || {};
          const isCurrentlyActive = s.activeChat?.userId === friendId;

          return {
            ...(isCurrentlyActive &&
              s.activeChat && {
                activeChat: { ...s.activeChat, ...themeData },
              }),
            localThemes: {
              ...s.localThemes,
              [myUserId]: {
                ...myThemes,
                [friendId]: { ...(myThemes[friendId] || {}), ...themeData },
              },
            },
          };
        }),

      // ── SET CONVERSATION ID ──
      setConversationId: (conversationId) =>
        set((s) => ({
          activeChat: s.activeChat ? { ...s.activeChat, conversationId } : null,
        })),
      lastMessageCache: {},
      updateLastMessageCache: (conversationId, data) =>
        set((s) => ({
          lastMessageCache: {
            ...s.lastMessageCache,
            [conversationId]: data,
          },
        })),
      readByCache: {},
      updateReadByCache: (conversationId, readBy) =>
        set((s) => ({
          readByCache: {
            ...s.readByCache,
            [conversationId]: readBy,
          },
        })),
      deliveredToCache: {},
      updateDeliveredToCache: (conversationId, deliveredTo) =>
        set((s) => ({
          deliveredToCache: {
            ...s.deliveredToCache,
            [conversationId]: deliveredTo,
          },
        })),

     // ── NEW: Message Info State Implementation ──
      selectedMessageForInfo: null,
      setSelectedMessageForInfo: (data) =>
        set((s) => {
          // ── FIX 3 & 4: Sirf Width (Chorayi) check kar raha hai, Height nahi! ──
          const width = window.innerWidth;
          let newSidebarState = s.sidebarOpen;

          if (data) {
            // OPENING INFO PANEL: Agar screen choti hai toh Left Sidebar band kar do
            if (width < 1100) {
              newSidebarState = false;
            }
            return {
              selectedMessageForInfo: data,
              profilePanelOpen: true,
              sidebarOpen: newSidebarState,
            };
          } else {
            // CLOSING INFO PANEL: Right panel poora band karo aur Left Sidebar wapas khol do
            if (width >= 900) {
              newSidebarState = true;
            }
            return {
              selectedMessageForInfo: null,
              profilePanelOpen: false, // ── FIX 2: Ab Info band karne par Other Profile wapas nahi aayegi ──
              sidebarOpen: newSidebarState,
            };
          }
        }),

      // Right profile panel
      profilePanelOpen: false,

      toggleProfilePanel: () =>
        set((s) => {
          // ── FIX 1: Agar Info Panel open hai, toh header dabane par usay band kar ke Other Profile dikhao ──
          if (s.selectedMessageForInfo) {
            return {
              selectedMessageForInfo: null, // Info ko hataya
              profilePanelOpen: true,       // Right panel open rakha (taake Other Profile nazar aaye)
            };
          }

          // ── NORMAL TOGGLE LOGIC ──
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
            sidebarOpen: newSidebarState,
          };
        }),

      setProfilePanelOpen: (open) =>
        set((s) => {
          const width = window.innerWidth;
          let newSidebarState = s.sidebarOpen;

          if (open && width < 1100) {
            newSidebarState = false;
          } else if (!open && width >= 900) {
            newSidebarState = true;
          }

          return {
            profilePanelOpen: open,
            sidebarOpen: newSidebarState,
          };
        }),
    }),
    {
      name: "lunex-chat-themes-cloud-sync",
      partialize: (state) => ({ localThemes: state.localThemes }),
    },
  ),
);
