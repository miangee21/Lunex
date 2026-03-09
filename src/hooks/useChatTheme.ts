//src/hooks/useChatTheme.ts
type ActiveChat = {
  chatPresetName?: string;
  chatBgColor?: string;
  myBubbleColor?: string;
  otherBubbleColor?: string;
  myTextColor?: string;
  otherTextColor?: string;
  conversationId?: string | null;
};

type PendingUpload = {
  progress: number;
  file: { name: string };
};

type Deps = {
  activeChat: ActiveChat;
  rawMessages: unknown[] | undefined;
  currentPending: PendingUpload[];
};

export function useChatTheme({
  activeChat,
  rawMessages,
  currentPending,
}: Deps) {
  const themeClass = activeChat.chatPresetName
    ? `theme-${activeChat.chatPresetName.toLowerCase()}`
    : "";

  const customThemeStyles = {
    ...(activeChat.chatBgColor && {
      "--background": activeChat.chatBgColor,
      "--sidebar": activeChat.chatBgColor,
    }),
    ...(activeChat.myBubbleColor && { "--primary": activeChat.myBubbleColor }),
    ...(activeChat.otherBubbleColor && {
      "--secondary": activeChat.otherBubbleColor,
    }),
    ...(activeChat.myTextColor && {
      "--primary-foreground": activeChat.myTextColor,
    }),
    ...(activeChat.otherTextColor && {
      "--secondary-foreground": activeChat.otherTextColor,
    }),
  } as React.CSSProperties;

  const isLoading = activeChat.conversationId && rawMessages === undefined;

  const pendingNamesStr = currentPending
    .filter((p) => p.progress < 100)
    .map((p) => p.file.name)
    .sort()
    .join("|");

  return {
    themeClass,
    customThemeStyles,
    isLoading,
    pendingNamesStr,
  };
}
