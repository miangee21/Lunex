// ── UPDATED: Info icon import kiya ──
import { ChevronDown, Reply, Copy, CheckSquare, Pencil, Trash2, Info } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState } from "react";

interface MessageBubbleProps {
  messageId: string; // ── NEW: Info track karne ke liye ──
  text: string;
  time: string;
  isOwn: boolean;
  reactions?: Array<{ userId: string; emoji: string }>;
  editedAt?: number | null;
  // ── UPDATED: Naye object format ke mutabiq ──
  readBy?: { userId: string; time: number }[];
  deliveredTo?: { userId: string; time: number }[];
  otherUserId?: string;
  onSelect?: () => void;
}

export default function MessageBubble({
  messageId,
  text,
  time,
  isOwn,
  reactions = [],
  editedAt = null,
  readBy = [],
  deliveredTo = [],
  otherUserId,
  onSelect,
}: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const userId = useAuthStore((s) => s.userId);
  // ── NEW: Store function to open Info panel ──
  const setSelectedMessageForInfo = useChatStore((s) => s.setSelectedMessageForInfo);

  const deleteForMe = useMutation(api.messages.deleteMessageForMe);
  const deleteForEveryone = useMutation(api.messages.deleteMessageForEveryone);

  // Truncation logic
  const CHAR_LIMIT = 250;
  const shouldTruncate = text.length > CHAR_LIMIT;
  const displayText =
    shouldTruncate && !isExpanded ? text.slice(0, CHAR_LIMIT) + "..." : text;

  // ── SHAPE BASED TICKS ──
  // Seen — other user ne padha
  const isSeen = otherUserId ? readBy.some((r) => r.userId === otherUserId) : false;
  // Delivered — other user ke device tak pahuncha
  const isDelivered = otherUserId ? deliveredTo.some((d) => d.userId === otherUserId) : false;

  // Shape-Based Status Icon (Messenger Style)
  function TickIcon() {
    if (isSeen) {
      // ── SEEN: Solid Filled Circle with Checkmark ──
      return (
        <svg className="w-3.5 h-3.5 ml-1 text-current opacity-100 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      );
    }
    if (isDelivered) {
      // ── DELIVERED: Hollow Circle with Checkmark ──
      return (
        <svg className="w-3.5 h-3.5 ml-1 text-current opacity-70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12.5l2.5 2.5l5 -5" />
        </svg>
      );
    }
    // ── SENT: Only Hollow Circle ──
    return (
      <svg className="w-3.5 h-3.5 ml-1 text-current opacity-70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  }

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

          {/* Time + Edited + Signal Ticks */}
          <div className="flex justify-end items-center gap-1 mt-1 -mb-0.5 text-[10.5px] font-medium tracking-wide opacity-70">
            {editedAt && <span>edited</span>}
            <span>{time}</span>
            {isOwn && <TickIcon />}
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
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg py-2"
                  onClick={() => onSelect?.()}
                >
                  <CheckSquare className="w-4 h-4 mr-2 text-muted-foreground" /> Select
                </DropdownMenuItem>

                {/* Own message options */}
                {isOwn && (
                  <>
                    <DropdownMenuSeparator className="my-1" />
                    {/* ── NEW: Info Button ── */}
                    <DropdownMenuItem 
                      className="cursor-pointer rounded-lg py-2"
                      onClick={() => setSelectedMessageForInfo({ id: messageId, text })}
                    >
                      <Info className="w-4 h-4 mr-2 text-muted-foreground" /> Info
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer rounded-lg py-2">
                      <Pencil className="w-4 h-4 mr-2 text-muted-foreground" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => toast.info("Delete coming soon!")}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </>
                )}

                {/* Other user message options */}
                {!isOwn && (
                  <>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => toast.info("Delete coming soon!")}
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