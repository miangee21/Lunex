import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Reply, Copy, CheckSquare, Pencil, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";

interface MessageBubbleProps {
  text: string;
  time: string;
  isOwn: boolean;
  reactions?: Array<{ userId: string; emoji: string }>;
  editedAt?: number | null;
  readBy?: string[];
}

export default function MessageBubble({
  text,
  time,
  isOwn,
  reactions = [],
  editedAt = null,
  readBy = [],
}: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const userId = useAuthStore((s) => s.userId);
  const { activeChat } = useChatStore();

  const deleteForMe = useMutation(api.messages.deleteMessageForMe);
  const deleteForEveryone = useMutation(api.messages.deleteMessageForEveryone);

  // Truncation logic
  const CHAR_LIMIT = 250;
  const shouldTruncate = text.length > CHAR_LIMIT;
  const displayText =
    shouldTruncate && !isExpanded ? text.slice(0, CHAR_LIMIT) + "..." : text;

  // Read receipt — show if other user has read
  const otherUserId = activeChat?.userId;
  const isReadByOther = otherUserId ? readBy.includes(otherUserId) : false;

  return (
    <div className={`flex w-full group py-1.5 ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative flex max-w-[75%] md:max-w-[65%] items-start gap-2 ${
          isOwn ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {/* Message Bubble Container */}
        <div
          className={`
          relative px-4 pt-2.5 pb-2 rounded-2xl shadow-sm text-[15px] transition-all duration-200
          ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-secondary border border-border/50 text-secondary-foreground rounded-bl-sm"
          }
        `}
        >
          <div className="leading-relaxed break-words pr-6 whitespace-pre-wrap">
            {displayText}

            {/* Read More / Read Less Button */}
            {shouldTruncate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="ml-1 font-bold text-sm hover:underline focus:outline-none opacity-80 hover:opacity-100 transition-opacity"
              >
                {isExpanded ? "Read less" : "Read more"}
              </button>
            )}
          </div>

          {/* Reactions */}
          {reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(
                reactions.reduce(
                  (acc, r) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>
                )
              ).map(([emoji, count]) => (
                <span
                  key={emoji}
                  className="text-xs bg-black/10 dark:bg-white/10 rounded-full px-1.5 py-0.5"
                >
                  {emoji} {count > 1 ? count : ""}
                </span>
              ))}
            </div>
          )}

          {/* Time + Edited + Read receipt */}
          <div className="flex justify-end items-center gap-1 mt-1 -mb-0.5 text-[10.5px] font-medium tracking-wide opacity-70">
            {editedAt && <span>edited</span>}
            <span>{time}</span>
            {isOwn && (
              <span className={isReadByOther ? "text-blue-400 opacity-100" : ""}>
                {isReadByOther ? "✓✓" : "✓"}
              </span>
            )}
          </div>

          {/* Hover Menu */}
          <div className="absolute top-1.5 right-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`
                  p-0.5 rounded-full flex items-center justify-center transition-colors focus:outline-none
                  ${
                    isOwn
                      ? "bg-primary text-primary-foreground hover:bg-black/10 dark:hover:bg-white/10"
                      : "bg-secondary text-secondary-foreground hover:bg-black/10 dark:hover:bg-white/10"
                  }
                `}
                >
                  <ChevronDown className="w-4 h-4 opacity-80" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isOwn ? "end" : "start"}
                className="w-48 shadow-lg rounded-xl"
              >
                <DropdownMenuItem className="cursor-pointer rounded-lg py-2">
                  <Reply className="w-4 h-4 mr-2 text-muted-foreground" /> Reply
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg py-2"
                  onClick={() => {
                    navigator.clipboard.writeText(text);
                    toast.success("Copied!");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2 text-muted-foreground" /> Copy
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg py-2">
                  <CheckSquare className="w-4 h-4 mr-2 text-muted-foreground" /> Select
                </DropdownMenuItem>
                {isOwn && (
                  <>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem className="cursor-pointer rounded-lg py-2">
                      <Pencil className="w-4 h-4 mr-2 text-muted-foreground" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={async () => {
                        // Delete for everyone — Step 11 mein messageId pass karenge
                        toast.info("Delete coming soon!");
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}