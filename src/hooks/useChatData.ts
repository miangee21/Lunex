//src/hooks/useChatData.ts
import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useChatStore } from "@/store/chatStore";

type Deps = {
  activeChat: {
    conversationId?: string | null;
    userId?: string;
  } | null;
  userId: string | null;
};

export function useChatData({ activeChat, userId }: Deps) {
  const { syncChatTheme, syncDisappearing, markReactionAsSeen } =
    useChatStore();

  const cloudTheme = useQuery(
    api.chatThemes.getChatTheme,
    userId && activeChat?.userId
      ? {
          userId: userId as Id<"users">,
          otherUserId: activeChat.userId as Id<"users">,
        }
      : "skip",
  );

  const conversationData = useQuery(
    api.conversations.getConversationById,
    activeChat?.conversationId
      ? { conversationId: activeChat.conversationId as Id<"conversations"> }
      : "skip",
  );

  const rawMessages = useQuery(
    api.messages.getMessages,
    activeChat?.conversationId && userId
      ? {
          conversationId: activeChat.conversationId as Id<"conversations">,
          userId: userId as Id<"users">,
        }
      : "skip",
  );

  const otherUser = useQuery(
    api.users.getUserById,
    activeChat?.userId && userId
      ? {
          userId: activeChat.userId as Id<"users">,
          viewerId: userId as Id<"users">,
        }
      : "skip",
  );

  const currentUser = useQuery(
    api.users.getUserById,
    userId
      ? { userId: userId as Id<"users">, viewerId: userId as Id<"users"> }
      : "skip",
  );

  const typingUsers = useQuery(
    api.typing.getTypingUsers,
    activeChat?.conversationId && userId
      ? {
          conversationId: activeChat.conversationId as Id<"conversations">,
          currentUserId: userId as Id<"users">,
        }
      : "skip",
  );

  const markAsRead = useMutation(api.messages.markMessagesAsRead);
  const markAsDelivered = useMutation(api.messages.markAsDelivered);
  const deleteMessageForMe = useMutation(api.messages.deleteMessageForMe);
  const deleteMessageForEveryone = useMutation(
    api.messages.deleteMessageForEveryone,
  );

  useEffect(() => {
    if (userId && activeChat?.userId && cloudTheme !== undefined) {
      const themeData = cloudTheme
        ? {
            chatPresetName: cloudTheme.chatPresetName,
            chatBgColor: cloudTheme.chatBgColor,
            myBubbleColor: cloudTheme.myBubbleColor,
            otherBubbleColor: cloudTheme.otherBubbleColor,
            myTextColor: cloudTheme.myTextColor,
            otherTextColor: cloudTheme.otherTextColor,
          }
        : {
            chatPresetName: undefined,
            chatBgColor: undefined,
            myBubbleColor: undefined,
            otherBubbleColor: undefined,
            myTextColor: undefined,
            otherTextColor: undefined,
          };
      syncChatTheme(userId, activeChat.userId, themeData);
    }
  }, [cloudTheme, userId, activeChat?.userId, syncChatTheme]);

  useEffect(() => {
    if (
      conversationData !== undefined &&
      currentUser !== undefined &&
      otherUser !== undefined
    ) {
      let effectiveMode = false;
      let effectiveTimer: string | undefined = undefined;
      let effectiveSetBy: string | undefined = undefined;

      if (
        conversationData?.disappearingMode &&
        conversationData?.disappearingTimer
      ) {
        effectiveMode = true;
        effectiveTimer = conversationData.disappearingTimer;
        effectiveSetBy = conversationData.disappearingSetBy;
      } else if (currentUser?.settingDisappearing) {
        effectiveMode = true;
        effectiveTimer = currentUser.settingDisappearing;
        effectiveSetBy = userId as string;
      } else if (otherUser?.settingDisappearing) {
        effectiveMode = true;
        effectiveTimer = otherUser.settingDisappearing;
        effectiveSetBy = otherUser._id;
      }

      syncDisappearing(effectiveMode, effectiveTimer as any, effectiveSetBy);
    }
  }, [conversationData, currentUser, otherUser, syncDisappearing, userId]);

  useEffect(() => {
    if (activeChat?.conversationId && userId) {
      markAsRead({
        conversationId: activeChat.conversationId as Id<"conversations">,
        userId: userId as Id<"users">,
      });
      markAsDelivered({
        conversationId: activeChat.conversationId as Id<"conversations">,
        userId: userId as Id<"users">,
      });
      markReactionAsSeen(activeChat.conversationId, Date.now());
    }
  }, [activeChat?.conversationId, rawMessages?.length, markReactionAsSeen]);

  return {
    conversationData,
    rawMessages,
    otherUser,
    isTyping: typingUsers && typingUsers.length > 0,
    deleteMessageForMe,
    deleteMessageForEveryone,
  };
}
