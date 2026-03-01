// convex/conversations.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getOrCreateConversation = mutation({
  args: {
    myUserId: v.id("users"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("conversations").collect();

    const found = existing.find(
      (c) =>
        c.participantIds.includes(args.myUserId) &&
        c.participantIds.includes(args.otherUserId) &&
        c.participantIds.length === 2,
    );

    if (found) return found._id;

    const conversationId = await ctx.db.insert("conversations", {
      participantIds: [args.myUserId, args.otherUserId],
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    });

    return conversationId;
  },
});

export const getConversationsList = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .collect();

    const myConversations = allConversations.filter((c) =>
      c.participantIds.includes(args.userId),
    );

    const result = await Promise.all(
      myConversations.map(async (conv) => {
        const otherUserId = conv.participantIds.find(
          (id) => id !== args.userId,
        );
        if (!otherUserId) return null;

        const otherUser = await ctx.db.get(otherUserId);
        if (!otherUser) return null;

        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .order("desc")
          .first();

        const deletion = await ctx.db
          .query("chatDeletions")
          .withIndex("by_user_conversation", (q) =>
            q.eq("userId", args.userId).eq("conversationId", conv._id),
          )
          .unique();

        if (
          deletion &&
          (!lastMessage || lastMessage.sentAt <= deletion.deletedAt)
        ) {
          return null;
        }

        const allMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect();

        const unreadCount = allMessages.filter(
          (m) =>
            m.senderId !== args.userId &&
            (!m.readBy || !m.readBy.some((r) => r.userId === args.userId)) &&
            (!deletion || m.sentAt > deletion.deletedAt),
        ).length;

        return {
          conversationId: conv._id,
          otherUserId: otherUser._id,
          username: otherUser.username,
          profilePicStorageId: otherUser.profilePicStorageId ?? null,
          isOnline: otherUser.isOnline,
          lastSeen: otherUser.lastSeen,
          lastMessage: lastMessage
            ? {
                text: lastMessage.encryptedContent,
                sentAt: lastMessage.sentAt,
                senderId: lastMessage.senderId,
                type: lastMessage.type,
              }
            : null,
          unreadCount,
          lastMessageAt: conv.lastMessageAt ?? conv.createdAt,
        };
      }),
    );

    return result
      .filter(Boolean)
      .sort((a, b) => (b!.lastMessageAt ?? 0) - (a!.lastMessageAt ?? 0));
  },
});

export const getConversationById = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

export const deleteChat = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chatDeletions")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { deletedAt: Date.now() });
    } else {
      await ctx.db.insert("chatDeletions", {
        conversationId: args.conversationId,
        userId: args.userId,
        deletedAt: Date.now(),
      });
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    const allDeletions = await Promise.all(
      conversation.participantIds.map((participantId) =>
        ctx.db
          .query("chatDeletions")
          .withIndex("by_user_conversation", (q) =>
            q
              .eq("userId", participantId)
              .eq("conversationId", args.conversationId),
          )
          .unique(),
      ),
    );

    const allDeleted = allDeletions.every(
      (d) => d !== null && d.deletedAt >= (conversation.lastMessageAt ?? 0),
    );

    if (allDeleted) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", args.conversationId),
        )
        .collect();

      await Promise.all(
        messages.map(async (m) => {
          if (m.mediaStorageId) {
            await ctx.storage.delete(m.mediaStorageId);
          }
          await ctx.db.delete(m._id);
        }),
      );

      await Promise.all(allDeletions.map((d) => d && ctx.db.delete(d._id)));
      await ctx.db.delete(args.conversationId);
    }
  },
});

export const updateLastMessageAt = mutation({
  args: {
    conversationId: v.id("conversations"),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: args.timestamp,
    });
  },
});
