interface MessageBubbleProps {
  text: string;
  time: string;
  isOwn: boolean;
}

export default function MessageBubble({ text, time, isOwn }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`
        max-w-[70%] px-4 py-2.5 rounded-2xl
        ${isOwn
          ? "bg-primary text-primary-foreground rounded-br-sm"
          : "bg-accent text-foreground rounded-bl-sm"
        }
      `}>
        <p className="text-sm leading-relaxed break-words">{text}</p>
        <p className={`text-[10px] mt-1 text-right ${
          isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
        }`}>
          {time}
        </p>
      </div>
    </div>
  );
}