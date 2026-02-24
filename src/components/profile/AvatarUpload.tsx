import { useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Camera } from "lucide-react";
import { toast } from "sonner";

export default function AvatarUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = useAuthStore((s) => s.userId);
  const username = useAuthStore((s) => s.username);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const updateUserProfile = useMutation(api.users.updateUserProfile);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB.");
      return;
    }

    setUploading(true);

    try {
      // Show preview immediately
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { storageId } = await response.json();

      // Save storageId to user profile
      await updateUserProfile({
        userId,
        profilePicStorageId: storageId,
      });

      toast.success("Profile picture updated!");
    } catch (err) {
      toast.error("Failed to upload image. Please try again.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative group">
      {/* Avatar circle */}
      <div className="w-20 h-20 rounded-3xl overflow-hidden bg-primary flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-primary-foreground font-bold text-3xl">
            {username?.[0]?.toUpperCase() ?? "?"}
          </span>
        )}
      </div>

      {/* Camera overlay on hover */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 w-20 h-20 rounded-3xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      >
        {uploading ? (
          <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <Camera size={20} className="text-white" />
        )}
      </button>

      {/* Hidden file input */}
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