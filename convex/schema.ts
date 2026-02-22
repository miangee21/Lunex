import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // Users table — one row per registered user
  users: defineTable({
    username: v.string(),
    publicKey: v.string(),
    profilePicStorageId: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
    isOnline: v.boolean(),
    lastSeen: v.number(),
  })
    .index("by_username", ["username"])
    .index("by_public_key", ["publicKey"]),

  // Friend requests table
  friendRequests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("blocked"),
    ),
    createdAt: v.number(),
  })
    .index("by_to_user", ["toUserId", "status"])
    .index("by_from_user", ["fromUserId", "status"])
    .index("by_pair", ["fromUserId", "toUserId"]),

  // Conversations table — one per pair of friends
  conversations: defineTable({
    participantIds: v.array(v.id("users")),
    disappearingMode: v.optional(v.union(
      v.literal("1h"),
      v.literal("6h"),
      v.literal("12h"),
      v.literal("1d"),
      v.literal("3d"),
      v.literal("1w"),
    )),
    disappearingSetBy: v.optional(v.id("users")),
    createdAt: v.number(),
    lastMessageAt: v.number(),
  })
    .index("by_participants", ["participantIds"]),

  // Messages table
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    encryptedContent: v.string(),
    iv: v.string(),
    type: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("video"),
      v.literal("document"),
      v.literal("emoji"),
    ),
    mediaStorageId: v.optional(v.id("_storage")),
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
    readBy: v.optional(v.array(v.id("users"))),
  })
    .index("by_conversation", ["conversationId", "sentAt"])
    .index("by_expires", ["mediaExpiresAt"])
    .index("by_disappears", ["disappearsAt"]),

  // Typing indicators
  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    isTyping: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"]),

  // Chat deletions — tracks when a user deleted a chat
  chatDeletions: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    deletedAt: v.number(),
  })
    .index("by_user_and_conversation", ["userId", "conversationId"]),

});