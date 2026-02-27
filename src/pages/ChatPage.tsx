import { useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import SlimBar from "@/components/sidebar/SlimBar";
import ChatList from "@/components/chat/ChatList";
import MyProfilePanel from "@/components/profile/MyProfilePanel";
import ChatArea from "@/components/chat/ChatArea";
import OtherUserPanel from "@/components/profile/OtherUserPanel"; 
import MessageInfoPanel from "@/components/chat/MessageInfoPanel";
import { MessageSquare } from "lucide-react";
import icon from "@/assets/icon.png";

export default function ChatPage() {
  const { 
    sidebarOpen, 
    sidebarView, 
    activeChat, 
    profilePanelOpen,
    selectedMessageForInfo 
  } = useChatStore();

  // ════════════════════════════════════════════════════════════════════════
  // ── SOLVES ISSUE 1 & 3: Smart Threshold-Based Resize Listener ──
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let prevWidth = window.innerWidth;

    const handleResize = () => {
      const width = window.innerWidth;
      
      // Zustand se latest state directly get kar rahe hain taake infinite loop na banay
      const state = useChatStore.getState();

      // 1. Agar window expand ho kar 1100px se badi ho gayi (Full Screen) -> Sidebar open kar do (Sab fit aa jayega)
      if (width >= 1100 && prevWidth < 1100) {
        state.setSidebarOpen(true);
      }
      
      // 2. Agar window expand ho kar 900px se badi hui -> Sidebar open karo LEKIN tab agar profile band ho
      else if (width >= 900 && prevWidth < 900) {
        if (!state.profilePanelOpen) {
          state.setSidebarOpen(true);
        }
      }
      
      // 3. Agar window shrink ho kar 1100px se choti hui -> Profile open hai toh sidebar band kar do
      else if (width < 1100 && prevWidth >= 1100) {
        if (state.profilePanelOpen) {
          state.setSidebarOpen(false);
        }
      }
      
      // 4. Agar window shrink ho kar 900px se bhi choti ho gayi -> Agar koi chat open hai toh sidebar band kar do
      else if (width < 900 && prevWidth >= 900) {
        if (state.activeChat) {
          state.setSidebarOpen(false);
        }
      }

      // Next resize event k liye isko save kar lo
      prevWidth = width;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // ── EMPTY DEPENDENCY ARRAY: Yehi Issue 3 ka fix ha! Ab manual click override nahi hoga. ──

  // ════════════════════════════════════════════════════════════════════════

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
      default:
        return <ChatList />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">

      {/* Slim Bar — always visible */}
      <SlimBar />

      {/* Chat Sidebar — collapsible */}
      <div className={`
        flex-shrink-0 border-r border-border bg-sidebar overflow-hidden
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? "w-72" : "w-0"}
      `}>
        {sidebarOpen && (
          <div className="w-72 h-full overflow-hidden">
            {renderSidebarContent()}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden min-w-0">

        {/* Chat or Empty State */}
        {activeChat ? (
          <ChatArea />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-background select-none">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-3xl overflow-hidden opacity-20">
                <img src={icon} alt="Lunex" className="w-full h-full object-cover" />
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

        {/* Right Profile Panel / Message Info Panel — slides in */}
        {activeChat && profilePanelOpen && (
          <div className="w-72 flex-shrink-0 border-l border-border bg-sidebar overflow-hidden">
            {/* ── UPDATED: Message Info aur Profile ke darmiyan switch ── */}
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