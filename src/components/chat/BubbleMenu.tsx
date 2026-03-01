//src/components/chat/BubbleMenu.tsx
import { toast } from "sonner";
import { useChatStore } from "@/store/chatStore";
import {
  ChevronDown,
  Reply,
  Copy,
  CheckSquare,
  Pencil,
  Trash2,
  Info,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface BubbleMenuProps {
  messageId: string;
  text: string;
  type: string;
  isOwn: boolean;
  onSelect?: () => void;
}

export default function BubbleMenu({
  messageId,
  text,
  type,
  isOwn,
  onSelect,
}: BubbleMenuProps) {
  const setSelectedMessageForInfo = useChatStore(
    (s) => s.setSelectedMessageForInfo,
  );

  return (
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
        {type === "text" && (
          <DropdownMenuItem
            className="cursor-pointer rounded-lg py-2"
            onClick={() => {
              navigator.clipboard.writeText(text);
              toast.success("Copied!");
            }}
          >
            <Copy className="w-4 h-4 mr-2 text-muted-foreground" /> Copy
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="cursor-pointer rounded-lg py-2"
          onClick={() => onSelect?.()}
        >
          <CheckSquare className="w-4 h-4 mr-2 text-muted-foreground" /> Select
        </DropdownMenuItem>

        {isOwn && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="cursor-pointer rounded-lg py-2"
              onClick={() => setSelectedMessageForInfo({ id: messageId, text })}
            >
              <Info className="w-4 h-4 mr-2 text-muted-foreground" /> Info
            </DropdownMenuItem>
            {type === "text" && (
              <DropdownMenuItem className="cursor-pointer rounded-lg py-2">
                <Pencil className="w-4 h-4 mr-2 text-muted-foreground" /> Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="cursor-pointer rounded-lg py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => toast.info("Delete coming soon!")}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </>
        )}

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
  );
}
