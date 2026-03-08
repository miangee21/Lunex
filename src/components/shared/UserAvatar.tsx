//src/components/shared/UserAvatar.tsx
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSecureAvatar } from "@/hooks/useSecureAvatar";

interface UserAvatarProps {
  username: string;
  profilePicStorageId?: Id<"_storage"> | null;
  size?: "sm" | "md" | "lg";
  isOnline?: boolean;
  isGrayedOut?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-20 h-20 text-3xl",
};

export default function UserAvatar({
  username,
  profilePicStorageId,
  size = "md",
  isOnline,
  isGrayedOut = false,
}: UserAvatarProps) {
  const avatarUrl = useQuery(
    api.users.getProfilePicUrl,
    profilePicStorageId ? { storageId: profilePicStorageId } : "skip",
  );

  const secureAvatarUrl = useSecureAvatar(avatarUrl);

  return (
    <div className="relative shrink-0">
      <div
        className={`
        ${sizeClasses[size]} rounded-2xl overflow-hidden flex items-center justify-center font-bold
        ${
          isGrayedOut
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground"
        }
      `}
      >
        {secureAvatarUrl ? (
          <img
            src={secureAvatarUrl}
            alt={username}
            className={`w-full h-full object-cover ${isGrayedOut ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          <span>{username?.[0]?.toUpperCase() ?? "?"}</span>
        )}
      </div>

      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-sidebar ${
            isOnline ? "bg-emerald-500" : "bg-muted-foreground/30"
          }`}
        />
      )}
    </div>
  );
}
