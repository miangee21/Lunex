import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ── GET MESSAGES ──
// Conversation ki saari messages fetch karo
export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user deleted this chat
    const deletion = await ctx.db
      .query("chatDeletions")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId)
      )
      .unique();

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    // Agar user ne chat delete ki thi — sirf us ke baad ki messages dikhao
    const filteredMessages = deletion
      ? messages.filter((m) => m.sentAt > deletion.deletedAt)
      : messages;

    return filteredMessages
      .filter((m) => {
        // deletedForEveryone — kisi ko mat dikhao
        if (m.deletedForEveryone) return false;
        // deletedForSender — sirf sender ko mat dikhao
        if (m.deletedForSender && m.senderId === args.userId) return false;
        return true;
      })
      .map((m) => ({
        id: m._id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        encryptedContent: m.encryptedContent,
        iv: m.iv,
        type: m.type,
        mediaStorageId: m.mediaStorageId ?? null,
        mediaOriginalName: m.mediaOriginalName ?? null,
        replyToMessageId: m.replyToMessageId ?? null,
        reactions: m.reactions ?? [],
        editedAt: m.editedAt ?? null,
        disappearsAt: m.disappearsAt ?? null,
        sentAt: m.sentAt,
        readBy: m.readBy ?? [],
        isOwn: m.senderId === args.userId,
      }));
  },
});

// ── SEND MESSAGE ──
export const sendMessage = mutation({
  args: {
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
    mediaOriginalName: v.optional(v.string()),
    replyToMessageId: v.optional(v.id("messages")),
    disappearsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      encryptedContent: args.encryptedContent,
      iv: args.iv,
      type: args.type,
      mediaStorageId: args.mediaStorageId,
      mediaOriginalName: args.mediaOriginalName,
      replyToMessageId: args.replyToMessageId,
      disappearsAt: args.disappearsAt,
      sentAt: now,
      readBy: [args.senderId],
    });

    // Update conversation lastMessageAt
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
    });

    // If sender had deleted this chat before — remove deletion record
    // so chat reappears in their list
    const deletion = await ctx.db
      .query("chatDeletions")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.senderId).eq("conversationId", args.conversationId)
      )
      .unique();

    if (deletion) {
      await ctx.db.delete(deletion._id);
    }

    return messageId;
  },
});

// ── MARK MESSAGES AS READ ──
export const markMessagesAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Sirf wahi messages update karo jo is user ne nahi padhe
    const unread = messages.filter(
      (m) =>
        m.senderId !== args.userId &&
        (!m.readBy || !m.readBy.includes(args.userId))
    );

    await Promise.all(
      unread.map((m) =>
        ctx.db.patch(m._id, {
          readBy: [...(m.readBy ?? []), args.userId],
        })
      )
    );
  },
});

// ── DELETE MESSAGE FOR ME ──
export const deleteMessageForMe = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    if (message.senderId === args.userId) {
      await ctx.db.patch(args.messageId, { deletedForSender: true });
    }
    // If receiver — we handle this via chatDeletions (delete chat)
  },
});

// ── DELETE MESSAGE FOR EVERYONE ──
export const deleteMessageForEveryone = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== args.userId)
      throw new Error("Only sender can delete for everyone");

    await ctx.db.patch(args.messageId, {
      deletedForEveryone: true,
      encryptedContent: "",
      iv: "",
    });
  },
});

// ── ADD REACTION ──
export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const reactions = message.reactions ?? [];

    // Remove existing reaction from this user if any
    const filtered = reactions.filter((r) => r.userId !== args.userId);

    // Add new reaction
    await ctx.db.patch(args.messageId, {
      reactions: [...filtered, { userId: args.userId, emoji: args.emoji }],
    });
  },
});

// ── REMOVE REACTION ──
export const removeReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const reactions = (message.reactions ?? []).filter(
      (r) => r.userId !== args.userId
    );

    await ctx.db.patch(args.messageId, { reactions });
  },
});

// ── EDIT MESSAGE ──
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    newEncryptedContent: v.string(),
    newIv: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== args.userId)
      throw new Error("Only sender can edit");

    await ctx.db.patch(args.messageId, {
      encryptedContent: args.newEncryptedContent,
      iv: args.newIv,
      editedAt: Date.now(),
    });
  },
});

// ── GET MESSAGE BY ID (for reply preview) ──
export const getMessageById = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});