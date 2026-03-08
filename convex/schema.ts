// convex/schema.ts
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

    theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
    globalPreset: v.optional(v.string()),
    
    // ── PRO FIX: WhatsApp-Style Privacy System (4 Options) ──
    privacyOnline: v.optional(v.union(v.literal("everyone"), v.literal("nobody"), v.literal("only_these"), v.literal("all_except"))),
    onlineExceptions: v.optional(v.array(v.id("users"))),
    
    privacyTyping: v.optional(v.union(v.literal("everyone"), v.literal("nobody"), v.literal("only_these"), v.literal("all_except"))),
    typingExceptions: v.optional(v.array(v.id("users"))),
    
    privacyReadReceipts: v.optional(v.union(v.literal("everyone"), v.literal("nobody"), v.literal("only_these"), v.literal("all_except"))),
    readReceiptsExceptions: v.optional(v.array(v.id("users"))),

    // ── STEP 16: Notifications Privacy & Pinned Chats ──
    privacyNotifications: v.optional(v.union(v.literal("everyone"), v.literal("nobody"), v.literal("only_these"), v.literal("all_except"))),
    notificationExceptions: v.optional(v.array(v.id("users"))),
    pinnedChats: v.optional(v.array(v.id("conversations"))),

    settingDisappearing: v.optional(
      v.union(
        v.literal("1h"),
        v.literal("6h"),
        v.literal("12h"),
        v.literal("1d"),
        v.literal("3d"),
        v.literal("7d"),
      ),
    ),
  })
    .index("by_username", ["username"])
    .index("by_public_key", ["publicKey"]),

  friendRequests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
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
    disappearingTimer: v.optional(v.union(
      v.literal("1h"),
      v.literal("6h"),
      v.literal("12h"),
      v.literal("1d"),
      v.literal("3d"),
      v.literal("7d"),
    )),
    createdAt: v.number(),
    lastMessageAt: v.optional(v.number()),
    lastReaction: v.optional(
      v.object({
        messageId: v.id("messages"),
        encryptedEmoji: v.string(),
        iv: v.string(),
        userId: v.id("users"),
        timestamp: v.number(),
      }),
    ),
  }).index("by_last_message", ["lastMessageAt"]),

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
      v.literal("file"),
      v.literal("system"),
    ),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaIv: v.optional(v.string()),
    mediaDeletedAt: v.optional(v.number()),
    mediaExpiresAt: v.optional(v.number()),
    mediaOriginalName: v.optional(v.string()),
    uploadBatchId: v.optional(v.string()),
    replyToMessageId: v.optional(v.id("messages")),
    reactions: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          emoji: v.optional(v.string()),
          encryptedEmoji: v.optional(v.string()),
          iv: v.optional(v.string()),
        }),
      ),
    ),
    editedAt: v.optional(v.number()),
    deletedForSender: v.optional(v.boolean()),
    deletedForReceiver: v.optional(v.boolean()),
    deletedForEveryone: v.optional(v.boolean()),
    disappearsAt: v.optional(v.number()),
    sentAt: v.number(),
    readBy: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          time: v.number(),
        }),
      ),
    ),
    deliveredTo: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          time: v.number(),
        }),
      ),
    ),
  })
    .index("by_conversation", ["conversationId", "sentAt"])
    .index("by_expires", ["mediaExpiresAt"])
    .index("by_disappears", ["disappearsAt"]),

  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    isTyping: v.boolean(),
    updatedAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  chatDeletions: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    deletedAt: v.number(),
    isActive: v.optional(v.boolean()),
  }).index("by_user_conversation", ["userId", "conversationId"]),

  chatThemes: defineTable({
    userId: v.id("users"),
    otherUserId: v.id("users"),
    chatPresetName: v.optional(v.string()),
    chatBgColor: v.optional(v.string()),
    myBubbleColor: v.optional(v.string()),
    otherBubbleColor: v.optional(v.string()),
    myTextColor: v.optional(v.string()),
    otherTextColor: v.optional(v.string()),
  }).index("by_user_and_other", ["userId", "otherUserId"]),
});
