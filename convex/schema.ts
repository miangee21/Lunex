import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    publicKey: v.string(),
    profilePicStorageId: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
    isOnline: v.boolean(),
    lastSeen: v.number(),
    
    // ── NEW: Global Theme Sync ──
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
    globalPreset: v.optional(v.string()),
  })
    .index("by_username", ["username"])
    .index("by_public_key", ["publicKey"]),

  friendRequests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
  })
    .index("by_from_user", ["fromUserId", "status"])
    .index("by_to_user", ["toUserId", "status"])
    .index("by_pair", ["fromUserId", "toUserId"]),

  blockedUsers: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"])
    .index("by_pair", ["blockerId", "blockedId"]),

  conversations: defineTable({
    participantIds: v.array(v.id("users")),
    disappearingMode: v.optional(v.boolean()),
    disappearingSetBy: v.optional(v.id("users")),
    createdAt: v.number(),
    lastMessageAt: v.optional(v.number()),
  })
    .index("by_last_message", ["lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    encryptedContent: v.string(),
    iv: v.string(),
    type: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("file")
    ),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaIv: v.optional(v.string()),
    mediaDeletedAt: v.optional(v.number()),
    mediaExpiresAt: v.optional(v.number()),
    mediaOriginalName: v.optional(v.string()),
    replyToMessageId: v.optional(v.id("messages")),
    reactions: v.optional(v.array(v.object({
      userId: v.id("users"),
      emoji: v.string(),
    }))),
    editedAt: v.optional(v.number()),
    deletedForSender: v.optional(v.boolean()),
    deletedForEveryone: v.optional(v.boolean()),
    disappearsAt: v.optional(v.number()),
    sentAt: v.number(),
    readBy: v.optional(v.array(v.object({
      userId: v.id("users"),
      time: v.number()
    }))),
    deliveredTo: v.optional(v.array(v.object({
      userId: v.id("users"),
      time: v.number()
    }))),
  })
    .index("by_conversation", ["conversationId", "sentAt"])
    .index("by_expires", ["mediaExpiresAt"])
    .index("by_disappears", ["disappearsAt"]),

  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    isTyping: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"]),

  chatDeletions: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    deletedAt: v.number(),
    isActive: v.optional(v.boolean()),
  })
    .index("by_user_conversation", ["userId", "conversationId"]),

  // ── NEW: Per-Chat Themes Table ──
  chatThemes: defineTable({
    userId: v.id("users"),        
    otherUserId: v.id("users"),   
    chatPresetName: v.optional(v.string()),
    chatBgColor: v.optional(v.string()),
    myBubbleColor: v.optional(v.string()),
    otherBubbleColor: v.optional(v.string()),
    myTextColor: v.optional(v.string()),
    otherTextColor: v.optional(v.string()),
  })
    .index("by_user_and_other", ["userId", "otherUserId"]),
});