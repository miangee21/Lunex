//src/components/chat/area/MessageList.tsx
import { useMemo } from "react";
import MessageBubble from "@/components/chat/bubble/ChatBubble";
import MediaGridGroup from "@/components/chat/media/MediaGridGroup";
import { DecryptedMessage } from "@/types/chat";

function getDateLabel(timestamp: number): string {
  const msgDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(msgDate, today)) return "Today";
  if (isSameDay(msgDate, yesterday)) return "Yesterday";

  return msgDate.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: msgDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-3 gap-3">
      <div className="h-px flex-1 bg-border/50" />
      <span className="text-[11px] font-semibold text-muted-foreground bg-accent/60 px-3 py-1 rounded-full select-none">
        {label}
      </span>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

type ActiveChat = {
  conversationId?: string | null;
  userId?: string;
  username?: string;
};

type Props = {
  decryptedMessages: DecryptedMessage[];
  pendingNamesStr: string;
  selectMode: boolean;
  selectedMessages: Set<string>;
  gridMenuOpen: string | null;
  secretKey: Uint8Array | null | undefined;
  otherUser: { publicKey?: string; _id?: string } | null | undefined;
  activeChat: ActiveChat;
  pinnedMessages: string[];
  toggleSelectMessage: (id: string) => void;
  setSelectMode: (val: boolean) => void;
  setGridMenuOpen: (val: string | null) => void;
  onDeleteClick: (ids: string[]) => void;
};

function SelectCheckbox({
  isOwn,
  isSelected,
}: {
  isOwn: boolean;
  isSelected: boolean;
}) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary" : "border-muted-foreground"}`}
      >
        {isSelected && (
          <svg
            className="w-3 h-3 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

export default function MessageList({
  decryptedMessages,
  pendingNamesStr,
  selectMode,
  selectedMessages,
  gridMenuOpen,
  secretKey,
  otherUser,
  activeChat,
  pinnedMessages,
  toggleSelectMessage,
  setSelectMode,
  setGridMenuOpen,
  onDeleteClick,
}: Props) {
  const memoizedMessages = useMemo(() => {
    const pendingNames = new Set(pendingNamesStr.split("|").filter(Boolean));
    const now = Date.now();

    const visibleMessages = decryptedMessages.filter((msg) => {
      if (
        msg.isOwn &&
        pendingNames.size > 0 &&
        msg.mediaOriginalName &&
        pendingNames.has(msg.mediaOriginalName)
      ) {
        if (now - msg.timestamp < 60000) return false;
      }
      return true;
    });

    const elements: React.ReactNode[] = [];

    let i = 0;
    let lastDateLabel: string | null = null;

    while (i < visibleMessages.length) {
      const msg = visibleMessages[i];

      if (msg.type !== "text" && msg.type !== "system") {
        const group: typeof visibleMessages = [];
        let j = i;
        while (
          j < visibleMessages.length &&
          visibleMessages[j].type !== "text" &&
          visibleMessages[j].type !== "system" &&
          visibleMessages[j].senderId === msg.senderId &&
          (j === i ||
            (msg.uploadBatchId &&
              visibleMessages[j].uploadBatchId === msg.uploadBatchId))
        ) {
          group.push(visibleMessages[j]);
          j++;
        }

        if (group.length > 1) {
          const displayGroup = group.slice(0, 4);
          const extraCount = group.length > 4 ? group.length - 4 : 0;

          const currentDateLabel = getDateLabel(msg.timestamp);
          if (currentDateLabel !== lastDateLabel) {
            elements.push(
              <DateSeparator
                key={`date-sep-${msg.id}`}
                label={currentDateLabel}
              />,
            );
            lastDateLabel = currentDateLabel;
          }

          elements.push(
            <div
              key={`wrap-${msg.id}`}
              id={`wrap-${msg.id}`}
              onClick={() => selectMode && toggleSelectMessage(msg.id)}
              className={selectMode ? "cursor-pointer" : ""}
            >
              {selectMode && (
                <SelectCheckbox
                  isOwn={msg.isOwn}
                  isSelected={selectedMessages.has(msg.id)}
                />
              )}
              <div className={selectMode ? "pointer-events-none" : ""}>
                <MediaGridGroup
                  displayGroup={displayGroup}
                  group={group}
                  extraCount={extraCount}
                  secretKey={secretKey}
                  otherUser={otherUser}
                  activeChat={activeChat}
                  pinnedMessages={pinnedMessages}
                  isGroupOwn={msg.isOwn}
                  setGridMenuOpen={setGridMenuOpen}
                  gridMenuOpen={gridMenuOpen}
                  toggleSelectMessage={toggleSelectMessage}
                  selectMode={selectMode}
                  setSelectMode={setSelectMode}
                  selectedMessages={selectedMessages}
                  onDeleteClick={() => {
                    const batchIds = group.map((m: any) => m.id);
                    onDeleteClick(batchIds);
                  }}
                />
              </div>
            </div>,
          );
          i = j;
          continue;
        }
      }

      const currentDateLabel = getDateLabel(msg.timestamp);
      if (currentDateLabel !== lastDateLabel) {
        elements.push(
          <DateSeparator key={`date-sep-${msg.id}`} label={currentDateLabel} />,
        );
        lastDateLabel = currentDateLabel;
      }

      elements.push(
        <div
          key={msg.id}
          onClick={() => selectMode && toggleSelectMessage(msg.id)}
          className={selectMode ? "cursor-pointer" : ""}
        >
          {selectMode && (
            <SelectCheckbox
              isOwn={msg.isOwn}
              isSelected={selectedMessages.has(msg.id)}
            />
          )}
          <MessageBubble
            messageId={msg.id}
            text={msg.text}
            time={msg.time}
            isOwn={msg.isOwn}
            type={msg.type}
            disappearsAt={msg.disappearsAt ?? undefined}
            mediaDeletedAt={msg.mediaDeletedAt ?? undefined}
            mediaStorageId={msg.mediaStorageId}
            mediaIv={msg.mediaIv}
            mediaOriginalName={msg.mediaOriginalName}
            reactions={msg.reactions}
            editedAt={msg.editedAt}
            readBy={msg.readBy}
            deliveredTo={msg.deliveredTo}
            otherUserId={activeChat?.userId}
            sentAt={msg.timestamp}
            secretKey={secretKey}
            otherUserPublicKey={otherUser?.publicKey}
            isStarred={msg.isStarred}
            isPinned={pinnedMessages?.includes(msg.id as any)}
            conversationId={activeChat?.conversationId ?? undefined}
            otherUserName={activeChat?.username}
            replyToMessage={(() => {
              if (!msg.replyToMessageId) return null;
              const originalMsg = decryptedMessages.find(
                (m) => m.id === msg.replyToMessageId,
              );
              if (!originalMsg) return null;

              const senderName = originalMsg.isOwn
                ? "You"
                : activeChat?.username || "User";

              return {
                id: originalMsg.id,
                text: originalMsg.text,
                senderName,
                type: originalMsg.type,
                mediaStorageId: originalMsg.mediaStorageId,
              };
            })()}
            onSelect={() => {
              setSelectMode(true);
              toggleSelectMessage(msg.id);
            }}
          />
        </div>,
      );
      i++;
    }
    return elements;
  }, [
    decryptedMessages,
    pendingNamesStr,
    selectMode,
    selectedMessages,
    gridMenuOpen,
    secretKey,
    otherUser,
    activeChat,
    pinnedMessages,
  ]);

  return <>{memoizedMessages}</>;
}
