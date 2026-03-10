//src/components/profile/AvatarUpload.tsx
import { useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Camera, Trash2 } from "lucide-react";
import { useSecureAvatar } from "@/hooks/useSecureAvatar";
import { encryptDP } from "@/crypto";
import { toast } from "sonner";

export default function AvatarUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const [uploading, setUploading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const deleteFile = useMutation(api.media.deleteFile);
  const removeProfilePic = useMutation(api.users.removeProfilePic);

  const userRecord = useQuery(
    api.users.getUserById,
    userId
      ? { userId: userId as Id<"users">, viewerId: userId as Id<"users"> }
      : "skip",
  );

  const avatarUrl = useQuery(
    api.users.getProfilePicUrl,
    userRecord?.profilePicStorageId
      ? { storageId: userRecord.profilePicStorageId }
      : "skip",
  );

  const secureAvatarUrl = useSecureAvatar(avatarUrl);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB.");
      return;
    }

    setUploading(true);
    setDropdownOpen(false);

    try {
      if (userRecord?.profilePicStorageId) {
        await deleteFile({ storageId: userRecord.profilePicStorageId });
      }

      const uploadUrl = await generateUploadUrl();

      const encryptedBlob = await encryptDP(file);

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: encryptedBlob,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { storageId } = await response.json();

      await updateUserProfile({ userId, profilePicStorageId: storageId });

      toast.success("Profile picture updated!");
    } catch {
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);

      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!userId || !userRecord?.profilePicStorageId) return;
    setDropdownOpen(false);
    try {
      await deleteFile({ storageId: userRecord.profilePicStorageId });

      await removeProfilePic({ userId });
      toast.success("Profile picture removed!");
    } catch {
      toast.error("Failed to remove picture.");
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen((v) => !v)}
        disabled={uploading}
        className="w-20 h-20 rounded-3xl overflow-hidden bg-primary flex items-center justify-center relative group"
      >
        {secureAvatarUrl ? (
          <img
            src={secureAvatarUrl}
            alt="avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-primary-foreground font-bold text-3xl">
            {username?.[0]?.toUpperCase() ?? "?"}
          </span>
        )}

        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <Camera size={20} className="text-white" />
          )}
        </div>
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 w-44 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50">
            <button
              onClick={() => {
                setDropdownOpen(false);
                fileInputRef.current?.click();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <Camera size={15} className="text-muted-foreground" />
              Change Avatar
            </button>

            {userRecord?.profilePicStorageId && (
              <>
                <div className="h-px bg-border mx-2" />
                <button
                  onClick={handleRemove}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 size={15} />
                  Remove Avatar
                </button>
              </>
            )}
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
