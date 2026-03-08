// src/components/sidebar/StarredMessagesPanel.tsx
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { Id } from "../../../convex/_generated/dataModel";
import { decryptMessage } from "@/crypto/encryption";
import { base64ToKey } from "@/crypto/keyDerivation";
import {
  ArrowLeft,
  Search,
  Star,
  MessageSquare,
  Image as ImageIcon,
  Video,
  File,
} from "lucide-react";

interface StarredMessagesPanelProps {
  onBack: () => void;
}

export default function StarredMessagesPanel({
  onBack,
}: StarredMessagesPanelProps) {
  const userId = useAuthStore((s) => s.userId);
  const secretKey = useAuthStore((s) => s.secretKey);
  const { setActiveChat, setJumpToMessageId } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");

  const currentUser = useQuery(
    api.users.getUserById,
    userId
      ? { userId: userId as Id<"users">, viewerId: userId as Id<"users"> }
      : "skip",
  );

  const starredMessages = useQuery(
    api.messages.getStarredMessages,
    userId ? { userId: userId as Id<"users"> } : "skip",
  );

  const conversations = useQuery(
    api.conversations.getConversationsList,
    userId ? { userId: userId as Id<"users"> } : "skip",
  );

  const themeMode = currentUser?.theme === "dark" ? "dark" : "light";
  const themeClass = currentUser?.globalPreset
    ? `theme-${currentUser.globalPreset.toLowerCase()}`
    : "";

  const formattedMessages = (starredMessages || []).map((msg) => {
    const conv = conversations?.find(
      (c: any) => c.conversationId === msg.conversationId,
    );
    let text = "🔒 Unable to decrypt";
    let chatName = "Unknown Chat";
    let properActiveChatObj = null;

    if (conv) {
      chatName = conv.username || "User";

      if (
        msg.type === "text" &&
        secretKey &&
        conv.publicKey &&
        msg.encryptedContent &&
        msg.iv
      ) {
        try {
          const theirPublicKey = base64ToKey(conv.publicKey);
          text = decryptMessage(
            { encryptedContent: msg.encryptedContent, iv: msg.iv },
            secretKey,
            theirPublicKey,
          );
        } catch (e) {
          text = "🔒 Unable to decrypt";
        }
      } else if (msg.type !== "text") {
        text = `Attachment: ${msg.type}`;
      }

      properActiveChatObj = {
        userId: conv.otherUserId,
        username: conv.username,
        profilePicStorageId: conv.profilePicStorageId,
        isOnline: conv.isOnline,
        conversationId: conv.conversationId,
        publicKey: conv.publicKey,
      };
    }

    return {
      ...msg,
      text,
      chatName,
      properActiveChatObj,
    };
  });

  const filteredMessages = formattedMessages.filter(
    (msg) =>
      msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.chatName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleMessageClick = (convObj: any, messageId: string) => {
    if (convObj) {
      setActiveChat(convObj);
    }
    setJumpToMessageId(messageId);
  };

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(new Date(timestamp));
  };

  return (
    <div
      className={`flex flex-col h-full bg-sidebar animate-in slide-in-from-left-4 duration-200 ${themeMode} ${themeClass}`}
    >
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border/40 shrink-0 bg-background/50 backdrop-blur-md">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-foreground font-semibold text-[15px] flex items-center gap-2">
          <Star size={16} className="fill-yellow-500 text-yellow-500" />
          Starred Messages
        </h2>
      </div>

      <div className="px-4 py-3 shrink-0">
        <div className="relative flex items-center">
          <Search className="absolute left-3 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search starred messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-accent/50 hover:bg-accent border border-transparent focus:border-primary/30 focus:bg-background outline-none rounded-xl text-[14px] transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
        {starredMessages === undefined ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-60 mt-10">
            <Star size={48} className="text-muted-foreground mb-4 opacity-50" />
            <p className="text-[14px] font-medium text-foreground">
              No starred messages
            </p>
            <p className="text-[12px] text-muted-foreground mt-1 text-center max-w-50">
              Star messages in any chat to find them easily here.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredMessages.map((msg) => (
              <button
                key={msg.id}
                onClick={() =>
                  handleMessageClick(msg.properActiveChatObj, msg.id)
                }
                className="w-full text-left p-3 rounded-2xl hover:bg-accent/50 transition-colors group border border-transparent hover:border-border/50"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare
                      size={14}
                      className="text-primary opacity-80 shrink-0"
                    />
                    <span className="text-[13px] font-semibold text-foreground truncate">
                      {msg.chatName}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                    {formatTime(msg.sentAt)}
                  </span>
                </div>

                <div className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed ml-5">
                  {msg.type === "text" ? (
                    msg.text
                  ) : msg.type === "image" ? (
                    <span className="flex items-center gap-1.5">
                      <ImageIcon size={14} /> Photo
                    </span>
                  ) : msg.type === "video" ? (
                    <span className="flex items-center gap-1.5">
                      <Video size={14} /> Video
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <File size={14} /> Document
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
