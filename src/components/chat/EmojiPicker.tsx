//src/components/chat/EmojiPicker.tsx
import { useEffect, useState } from "react";
import Picker, { Theme, EmojiStyle } from "emoji-picker-react";

interface CustomEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onEmojiSelect }: CustomEmojiPickerProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="emoji-picker-wrapper shadow-2xl rounded-xl overflow-hidden border border-border">
      <Picker
        onEmojiClick={(emojiData) => onEmojiSelect(emojiData.emoji)}
        theme={isDark ? Theme.DARK : Theme.LIGHT}
        emojiStyle={EmojiStyle.APPLE}
        lazyLoadEmojis={true}
        searchPlaceHolder="Search emojis..."
        width={320}
        height={400}
        previewConfig={{
          showPreview: false,
        }}
      />
    </div>
  );
}
