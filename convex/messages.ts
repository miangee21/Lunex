// convex/messages.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const deletion = await ctx.db
      .query("chatDeletions")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId),
      )
      .unique();

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    const filteredMessages = deletion
      ? messages.filter((m) => m.sentAt > deletion.deletedAt)
      : messages;

    return filteredMessages
      .filter((m) => {
        if (m.deletedForEveryone) return false;
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
        mediaIv: m.mediaIv ?? null,
        mediaOriginalName: m.mediaOriginalName ?? null,
        replyToMessageId: m.replyToMessageId ?? null,
        reactions: m.reactions ?? [],
        editedAt: m.editedAt ?? null,
        disappearsAt: m.disappearsAt ?? null,
        sentAt: m.sentAt,
        readBy: m.readBy ?? [],
        deliveredTo: m.deliveredTo ?? [],
        isOwn: m.senderId === args.userId,
      }));
  },
});

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
      v.literal("file"),
    ),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaIv: v.optional(v.string()),
    mediaOriginalName: v.optional(v.string()),
    replyToMessageId: v.optional(v.id("messages")),
    disappearsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      encryptedContent: args.encryptedContent,
      iv: args.iv,
      type: args.type,
      mediaStorageId: args.mediaStorageId,
      mediaIv: args.mediaIv,
      mediaOriginalName: args.mediaOriginalName,
      replyToMessageId: args.replyToMessageId,
      disappearsAt: args.disappearsAt,
      sentAt: now,

      readBy: [{ userId: args.senderId, time: now }],
      deliveredTo: [{ userId: args.senderId, time: now }],
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
    });
  },
});

export const markMessagesAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    const now = Date.now();
    const unread = messages.filter(
      (m) =>
        m.senderId !== args.userId &&
        (!m.readBy || !m.readBy.some((r) => r.userId === args.userId)),
    );

    await Promise.all(
      unread.map((m) =>
        ctx.db.patch(m._id, {
          readBy: [...(m.readBy ?? []), { userId: args.userId, time: now }],
        }),
      ),
    );
  },
});

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
  },
});

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
    const filtered = reactions.filter((r) => r.userId !== args.userId);

    await ctx.db.patch(args.messageId, {
      reactions: [...filtered, { userId: args.userId, emoji: args.emoji }],
    });
  },
});

export const removeReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const reactions = (message.reactions ?? []).filter(
      (r) => r.userId !== args.userId,
    );

    await ctx.db.patch(args.messageId, { reactions });
  },
});

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

export const getMessageById = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

export const markAsDelivered = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    const now = Date.now();
    const undelivered = messages.filter(
      (m) =>
        m.senderId !== args.userId &&
        (!m.deliveredTo ||
          !m.deliveredTo.some((d) => d.userId === args.userId)),
    );

    await Promise.all(
      undelivered.map((m) =>
        ctx.db.patch(m._id, {
          deliveredTo: [
            ...(m.deliveredTo ?? []),
            { userId: args.userId, time: now },
          ],
        }),
      ),
    );
  },
});
