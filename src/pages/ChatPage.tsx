import { useChatStore } from "@/store/chatStore";
import SlimBar from "@/components/sidebar/SlimBar";
import ChatList from "@/components/chat/ChatList";
import MyProfilePanel from "@/components/profile/MyProfilePanel";
import { MessageSquare } from "lucide-react";
import icon from "@/assets/icon.png";

export default function ChatPage() {
  const { sidebarOpen, sidebarView } = useChatStore();

  const renderSidebarContent = () => {
    switch (sidebarView) {
      case "chats":
      case "requests":
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
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-w-0">
        <div className="flex flex-col items-center gap-4 select-none">
          <div className="w-20 h-20 rounded-3xl overflow-hidden opacity-40">
            <img src={icon} alt="Lunex" className="w-full h-full object-cover" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Select a conversation to start chatting
          </p>
          <p className="text-muted-foreground/50 text-xs">
            or find someone new with the
            <MessageSquare size={12} className="inline mx-1" />
            button
          </p>
        </div>
      </div>

    </div>
  );
}