// src/components/chat/bubble/BubbleEmojiReact.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Smile, Plus } from "lucide-react";
import EmojiPicker from "@/components/chat/input/EmojiPicker";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const QUICK_REACT_WIDTH = 290;
const QUICK_REACT_HEIGHT = 52;
const EMOJI_PICKER_WIDTH = 300;
const EMOJI_PICKER_HEIGHT = 345;
const VIEWPORT_PADDING = 10;

function calcPopupStyle(
  triggerRect: DOMRect,
  popupWidth: number,
  popupHeight: number,
): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = triggerRect.left + triggerRect.width / 2 - popupWidth / 2;
  if (left + popupWidth + VIEWPORT_PADDING > vw) {
    left = vw - popupWidth - VIEWPORT_PADDING;
  }
  if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING;
  }

  let top: number;
  const spaceAbove = triggerRect.top;
  const spaceBelow = vh - triggerRect.bottom;

  if (spaceAbove >= popupHeight + VIEWPORT_PADDING) {
    top = triggerRect.top - popupHeight - 6;
  } else if (spaceBelow >= popupHeight + VIEWPORT_PADDING) {
    top = triggerRect.bottom + 6;
  } else {
    if (spaceAbove >= spaceBelow) {
      top = Math.max(VIEWPORT_PADDING, triggerRect.top - popupHeight - 6);
    } else {
      top = Math.min(
        vh - popupHeight - VIEWPORT_PADDING,
        triggerRect.bottom + 6,
      );
    }
  }

  return { position: "fixed", top, left, zIndex: 9999 };
}

interface BubbleEmojiReactProps {
  onEmojiSelect: (emoji: string) => Promise<void>;
}

export default function BubbleEmojiReact({
  onEmojiSelect,
}: BubbleEmojiReactProps) {
  const [showQuickReact, setShowQuickReact] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [quickReactStyle, setQuickReactStyle] = useState<React.CSSProperties>(
    {},
  );
  const [emojiPickerStyle, setEmojiPickerStyle] = useState<React.CSSProperties>(
    {},
  );

  const smileButtonRef = useRef<HTMLButtonElement>(null);
  const quickReactRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideQuick =
        quickReactRef.current?.contains(target) ?? false;
      const clickedInsidePicker =
        emojiPickerRef.current?.contains(target) ?? false;
      const clickedSmile = smileButtonRef.current?.contains(target) ?? false;
      if (!clickedInsideQuick && !clickedInsidePicker && !clickedSmile) {
        setShowQuickReact(false);
        setShowEmojiPicker(false);
      }
    }
    if (showQuickReact || showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showQuickReact, showEmojiPicker]);

  const recalcPositions = useCallback(() => {
    if (!smileButtonRef.current) return;
    const rect = smileButtonRef.current.getBoundingClientRect();
    if (showQuickReact) {
      setQuickReactStyle(
        calcPopupStyle(rect, QUICK_REACT_WIDTH, QUICK_REACT_HEIGHT),
      );
    }
    if (showEmojiPicker) {
      setEmojiPickerStyle(
        calcPopupStyle(rect, EMOJI_PICKER_WIDTH, EMOJI_PICKER_HEIGHT),
      );
    }
  }, [showQuickReact, showEmojiPicker]);

  useEffect(() => {
    if (showQuickReact || showEmojiPicker) {
      window.addEventListener("scroll", recalcPositions, true);
      window.addEventListener("resize", recalcPositions);
    }
    return () => {
      window.removeEventListener("scroll", recalcPositions, true);
      window.removeEventListener("resize", recalcPositions);
    };
  }, [showQuickReact, showEmojiPicker, recalcPositions]);

  const openQuickReact = () => {
    if (!smileButtonRef.current) return;
    const rect = smileButtonRef.current.getBoundingClientRect();
    setQuickReactStyle(
      calcPopupStyle(rect, QUICK_REACT_WIDTH, QUICK_REACT_HEIGHT),
    );
    setShowEmojiPicker(false);
    setShowQuickReact(true);
  };

  const openEmojiPicker = () => {
    if (!smileButtonRef.current) return;
    const rect = smileButtonRef.current.getBoundingClientRect();
    setEmojiPickerStyle(
      calcPopupStyle(rect, EMOJI_PICKER_WIDTH, EMOJI_PICKER_HEIGHT),
    );
    setShowQuickReact(false);
    setShowEmojiPicker(true);
  };

  const handleSelect = async (emoji: string) => {
    await onEmojiSelect(emoji);
    setShowQuickReact(false);
    setShowEmojiPicker(false);
  };

  return (
    <>
      <div
        className={`relative self-center transition-opacity ${
          showQuickReact || showEmojiPicker
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          ref={smileButtonRef}
          onClick={() => {
            if (showQuickReact) {
              setShowQuickReact(false);
            } else {
              openQuickReact();
            }
          }}
          className={`p-1.5 rounded-full transition-colors ${
            showQuickReact || showEmojiPicker
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          <Smile size={18} />
        </button>
      </div>

      {showQuickReact &&
        createPortal(
          <div
            ref={quickReactRef}
            style={quickReactStyle}
            className="flex items-center gap-1 bg-card text-card-foreground shadow-[0_4px_15px_rgba(0,0,0,0.15)] border border-border/50 rounded-full px-2.5 py-1.5 flex-nowrap animate-in zoom-in-75 duration-200"
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="hover:scale-125 transition-transform text-xl px-1.5 shrink-0"
              >
                {emoji}
              </button>
            ))}
            <div className="w-px h-5 bg-border mx-1 shrink-0" />
            <button
              onClick={openEmojiPicker}
              className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground shrink-0"
            >
              <Plus size={18} />
            </button>
          </div>,
          document.body,
        )}

      {showEmojiPicker &&
        createPortal(
          <div
            ref={emojiPickerRef}
            style={emojiPickerStyle}
            className="animate-in zoom-in-75 duration-200"
          >
            <div className="scale-[0.85] origin-top shadow-2xl rounded-xl overflow-hidden border border-border/50">
              <EmojiPicker onEmojiSelect={handleSelect} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
