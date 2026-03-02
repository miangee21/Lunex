//src/store/chatStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/store/authStore";
import { type AllowedFileType } from "@/lib/fileValidation";

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

export interface PendingUpload {
  id: string;
  file: File;
  type: AllowedFileType;
  progress: number;
  previewUrl: string;
  status: "uploading" | "error";
}

export interface ReplyingToState {
  id: string;
  text: string;
  senderName: string;
  type: string;
  mediaStorageId?: string;
}

interface ChatState {
  replyingTo: ReplyingToState | null;
  setReplyingTo: (msg: ReplyingToState | null) => void;
  editingMessage: { id: string; text: string } | null;
  setEditingMessage: (msg: { id: string; text: string } | null) => void;
  jumpToMessageId: string | null;
  setJumpToMessageId: (id: string | null) => void;
 seenReactions: Record<string, number>;
  markReactionAsSeen: (conversationId: string, timestamp: number) => void;
  scrollToBottomTrigger: number;
  triggerScrollToBottom: () => void;
  sidebarOpen: boolean;
  sidebarView: SidebarView;
  toggleSidebar: () => void;
  setSidebarView: (view: SidebarView) => void;
  setSidebarOpen: (open: boolean) => void;

  activeChat: ActiveChat | null;
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

  readByCache: Record<string, { userId: string; time: number }[]>;
  updateReadByCache: (
    conversationId: string,
    readBy: { userId: string; time: number }[],
  ) => void;

  deliveredToCache: Record<string, { userId: string; time: number }[]>;
  updateDeliveredToCache: (
    conversationId: string,
    deliveredTo: { userId: string; time: number }[],
  ) => void;

  selectedMessageForInfo: {
    id: string;
    text: string;
    type?: string;
    mediaStorageId?: string | null;
    mediaIv?: string | null;
    mediaOriginalName?: string | null;
    cameFromPreview?: boolean;
  } | null;
  setSelectedMessageForInfo: (
    data: {
      id: string;
      text: string;
      type?: string;
      mediaStorageId?: string | null;
      mediaIv?: string | null;
      mediaOriginalName?: string | null;
      cameFromPreview?: boolean;
    } | null,
  ) => void;

  syncChatTheme: (
    myUserId: string,
    friendId: string,
    themeData: ThemeOptions,
  ) => void;

  profilePanelOpen: boolean;
  toggleProfilePanel: () => void;
  setProfilePanelOpen: (open: boolean) => void;

  localMediaCache: Record<string, string>;
  addLocalMediaCache: (storageId: string, url: string) => void;

  pendingUploads: Record<string, PendingUpload[]>;
  addPendingUploads: (conversationId: string, uploads: PendingUpload[]) => void;
  updateUploadProgress: (
    conversationId: string,
    id: string,
    progress: number,
  ) => void;
  updateUploadStatus: (
    conversationId: string,
    id: string,
    status: "uploading" | "error",
  ) => void;
  removePendingUpload: (conversationId: string, id: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarView: "chats",
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarView: (view) => set({ sidebarView: view, sidebarOpen: true }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

     replyingTo: null,
      setReplyingTo: (msg) => set({ replyingTo: msg, editingMessage: null }),

      editingMessage: null,
      setEditingMessage: (msg) =>
        set({ editingMessage: msg, replyingTo: null }),

      jumpToMessageId: null,
      setJumpToMessageId: (id) => set({ jumpToMessageId: id }),
      seenReactions: {},
      markReactionAsSeen: (convId, ts) => set((s) => ({ seenReactions: { ...s.seenReactions, [convId]: ts } })),
      scrollToBottomTrigger: 0,
      triggerScrollToBottom: () => set((s) => ({ scrollToBottomTrigger: s.scrollToBottomTrigger + 1 })),

      localThemes: {},
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

      localMediaCache: {},
      addLocalMediaCache: (storageId, url) =>
        set((s) => ({
          localMediaCache: { ...s.localMediaCache, [storageId]: url },
        })),

      selectedMessageForInfo: null,
      setSelectedMessageForInfo: (data) =>
        set((s) => {
          const width = window.innerWidth;
          let newSidebarState = s.sidebarOpen;
          if (data) {
            if (width < 1100) newSidebarState = false;
            return {
              selectedMessageForInfo: data,
              profilePanelOpen: true,
              sidebarOpen: newSidebarState,
            };
          } else {
            if (width >= 900) newSidebarState = true;
            return {
              selectedMessageForInfo: null,
              profilePanelOpen: false,
              sidebarOpen: newSidebarState,
            };
          }
        }),

      profilePanelOpen: false,
      toggleProfilePanel: () =>
        set((s) => {
          if (s.selectedMessageForInfo) {
            return {
              selectedMessageForInfo: null,
              profilePanelOpen: true,
            };
          }
          const willOpen = !s.profilePanelOpen;
          const width = window.innerWidth;
          let newSidebarState = s.sidebarOpen;
          if (willOpen && width < 1100) newSidebarState = false;
          else if (!willOpen && width >= 900) newSidebarState = true;
          return {
            profilePanelOpen: willOpen,
            sidebarOpen: newSidebarState,
          };
        }),

      setProfilePanelOpen: (open) =>
        set((s) => {
          const width = window.innerWidth;
          let newSidebarState = s.sidebarOpen;
          if (open && width < 1100) newSidebarState = false;
          else if (!open && width >= 900) newSidebarState = true;
          return {
            profilePanelOpen: open,
            sidebarOpen: newSidebarState,
          };
        }),

      pendingUploads: {},
      addPendingUploads: (conversationId, uploads) =>
        set((s) => ({
          pendingUploads: {
            ...s.pendingUploads,
            [conversationId]: [
              ...(s.pendingUploads[conversationId] || []),
              ...uploads,
            ],
          },
        })),
      updateUploadProgress: (conversationId, id, progress) =>
        set((s) => ({
          pendingUploads: {
            ...s.pendingUploads,
            [conversationId]: (s.pendingUploads[conversationId] || []).map(
              (u) => (u.id === id ? { ...u, progress } : u),
            ),
          },
        })),
      updateUploadStatus: (conversationId, id, status) =>
        set((s) => ({
          pendingUploads: {
            ...s.pendingUploads,
            [conversationId]: (s.pendingUploads[conversationId] || []).map(
              (u) => (u.id === id ? { ...u, status } : u),
            ),
          },
        })),
      removePendingUpload: (conversationId, id) =>
        set((s) => ({
          pendingUploads: {
            ...s.pendingUploads,
            [conversationId]: (s.pendingUploads[conversationId] || []).filter(
              (u) => u.id !== id,
            ),
          },
        })),
    }),
    {
      name: "lunex-chat-themes-cloud-sync",
      partialize: (state) => ({ localThemes: state.localThemes, seenReactions: state.seenReactions }),
    },
  ),
);
