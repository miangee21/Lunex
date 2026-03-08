//src/pages/ChatPage.tsx
import { useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import SlimBar from "@/components/sidebar/SlimBar";
import ChatList from "@/components/chat/ChatList";
import MyProfilePanel from "@/components/profile/MyProfilePanel";
import ChatArea from "@/components/chat/ChatArea";
import OtherUserPanel from "@/components/profile/OtherUserPanel";
import MessageInfoPanel from "@/components/chat/MessageInfoPanel";
import StarredMessagesPanel from "@/components/sidebar/StarredMessagesPanel";
import { useAppNotifications } from "@/hooks/useAppNotifications";
import { MessageSquare } from "lucide-react";
import icon from "@/assets/icon.png";

export default function ChatPage() {
  useAppNotifications();
  const userId = useAuthStore((s) => s.userId);
  const setOnlineStatus = useMutation(api.users.setOnlineStatus);

  const {
    sidebarOpen,
    sidebarView,
    activeChat,
    profilePanelOpen,
    selectedMessageForInfo,
  } = useChatStore();

  useEffect(() => {
    if (!userId) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pendingStatus: boolean | null = null;
    let isProcessing = false;

    const updateOnlineStatus = async (isOnline: boolean) => {
      if (pendingStatus === isOnline) return;

      pendingStatus = isOnline;

      clearTimeout(timeoutId!);
      timeoutId = setTimeout(async () => {
        if (isProcessing) return;
        isProcessing = true;

        try {
          await setOnlineStatus({
            userId: userId as Id<"users">,
            isOnline,
          });
        } catch (error) {
          console.error(`Failed to set online status to ${isOnline}:`, error);
        } finally {
          isProcessing = false;
          pendingStatus = null;
        }
      }, 500);
    };

    updateOnlineStatus(true);

    const handleBeforeUnload = () => updateOnlineStatus(false);
    const handlePageHide = () => updateOnlineStatus(false);

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      clearTimeout(timeoutId!);

      if (pendingStatus !== null) {
        try {
          setOnlineStatus({
            userId: userId as Id<"users">,
            isOnline: false,
          }).catch(console.error);
        } catch (error) {
          console.error("Failed to set offline on unmount:", error);
        }
      }
    };
  }, [userId, setOnlineStatus]);

  useEffect(() => {
    let prevWidth = window.innerWidth;

    const handleResize = () => {
      const width = window.innerWidth;

      const state = useChatStore.getState();

      if (width >= 1100 && prevWidth < 1100) {
        state.setSidebarOpen(true);
      } else if (width >= 900 && prevWidth < 900) {
        if (!state.profilePanelOpen) {
          state.setSidebarOpen(true);
        }
      } else if (width < 1100 && prevWidth >= 1100) {
        if (state.profilePanelOpen) {
          state.setSidebarOpen(false);
        }
      } else if (width < 900 && prevWidth >= 900) {
        if (state.activeChat) {
          state.setSidebarOpen(false);
        }
      }

      prevWidth = width;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderSidebarContent = () => {
    switch (sidebarView) {
      case "chats":
      case "requests":
      case "search":
        return <ChatList />;
      case "profile":
      case "friends":
      case "blocked":
        return <MyProfilePanel />;
      case "starred":
        return (
          <StarredMessagesPanel
            onBack={() => useChatStore.getState().setSidebarView("chats")}
          />
        );
      default:
        return <ChatList />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background relative z-0">
      <div className="relative z-100 h-full shrink-0 flex">
        <SlimBar />
      </div>

      <div
        className={`
        relative z-90 shrink-0 border-r border-border bg-sidebar overflow-hidden
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? "w-72" : "w-0"}
      `}
      >
        {sidebarOpen && (
          <div className="w-72 h-full overflow-hidden">
            {renderSidebarContent()}
          </div>
        )}
      </div>

      <div className="relative z-40 flex-1 flex overflow-hidden min-w-0">
        {activeChat ? (
          <ChatArea />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-background select-none">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-3xl overflow-hidden opacity-20">
                <img
                  src={icon}
                  alt="Lunex"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-muted-foreground text-sm font-medium">
                Select a conversation to start chatting
              </p>
              <p className="text-muted-foreground/50 text-xs flex items-center gap-1">
                or find someone new with the
                <MessageSquare size={12} className="inline mx-1" />
                button
              </p>
            </div>
          </div>
        )}

        {activeChat && profilePanelOpen && (
          <div className="relative z-90 w-72 shrink-0 border-l border-border bg-sidebar overflow-hidden">
            {selectedMessageForInfo ? (
              <MessageInfoPanel
                messageId={selectedMessageForInfo.id}
                messageText={selectedMessageForInfo.text}
              />
            ) : (
              <OtherUserPanel />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
