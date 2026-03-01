//src/components/chat/MessageStatusTick.tsx
export default function MessageStatusTick({
  isSeen,
  isDelivered,
}: {
  isSeen: boolean;
  isDelivered: boolean;
}) {
  if (isSeen) {
    return (
      <svg
        className="w-3.5 h-3.5 ml-1 text-current opacity-100 flex-shrink-0 drop-shadow-md"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    );
  }
  if (isDelivered) {
    return (
      <svg
        className="w-3.5 h-3.5 ml-1 text-current opacity-90 flex-shrink-0 drop-shadow-md"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <circle cx="12" cy="12" r="10" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12.5l2.5 2.5l5 -5"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-3.5 h-3.5 ml-1 text-current opacity-90 flex-shrink-0 drop-shadow-md"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
