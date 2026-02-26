import { useChatStore } from "@/store/chatStore";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import MessageBubble from "@/components/chat/ChatBubble";
import { useAuthStore } from "@/store/authStore";

// Dummy messages — will be real in Step 11
const DUMMY_MESSAGES = [
  {
    id: "1",
    senderId: "other",
    text: "Hey! How are you doing?",
    time: "10:30 AM",
    isOwn: false,
  },
  {
    id: "2",
    senderId: "me",
    text: "I'm doing great! Just testing this awesome app 🚀",
    time: "10:31 AM",
    isOwn: true,
  },
  {
    id: "3",
    senderId: "other",
    text: "Lunex looks amazing so far!",
    time: "10:32 AM",
    isOwn: false,
  },
  {
    id: "4",
    senderId: "me",
    text: "Thanks! Built with love ❤️",
    time: "10:33 AM",
    isOwn: true,
  },
];

export default function ChatArea() {
  const { activeChat } = useChatStore();

  if (!activeChat) return null;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background">

      {/* Header */}
      <ChatHeader />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {DUMMY_MESSAGES.map((msg) => (
          <MessageBubble
            key={msg.id}
            text={msg.text}
            time={msg.time}
            isOwn={msg.isOwn}
          />
        ))}
      </div>

      {/* Input */}
      <ChatInput />

    </div>
  );
}