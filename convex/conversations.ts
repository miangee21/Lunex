import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ── GET OR CREATE CONVERSATION ──
// Jab user kisi friend pe click kare — conversation dhundo ya naya banao
export const getOrCreateConversation = mutation({
  args: {
    myUserId: v.id("users"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Dono participants ki existing conversations dhundo
    const existing = await ctx.db
      .query("conversations")
      .collect();

    const found = existing.find(
      (c) =>
        c.participantIds.includes(args.myUserId) &&
        c.participantIds.includes(args.otherUserId) &&
        c.participantIds.length === 2
    );

    if (found) return found._id;

    // Nahi mili — naya banao
    const conversationId = await ctx.db.insert("conversations", {
      participantIds: [args.myUserId, args.otherUserId],
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    });

    return conversationId;
  },
});

// ── GET CONVERSATIONS LIST ──
// Chat list ke liye — current user ki saari conversations
export const getConversationsList = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Saari conversations collect karo
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .collect();

    // Sirf wahi jisme current user hai
    const myConversations = allConversations.filter((c) =>
      c.participantIds.includes(args.userId)
    );

    // Har conversation ke liye extra info fetch karo
    const result = await Promise.all(
      myConversations.map(async (conv) => {
        // Doosra participant kaun hai
        const otherUserId = conv.participantIds.find(
          (id) => id !== args.userId
        );
        if (!otherUserId) return null;

        const otherUser = await ctx.db.get(otherUserId);
        if (!otherUser) return null;

        // Last message fetch karo
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conv._id)
          )
          .order("desc")
          .first();

        // Unread count — jo messages mujhe nahi padhe
        const allMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", conv._id)
          )
          .collect();

        const unreadCount = allMessages.filter(
          (m) =>
            m.senderId !== args.userId &&
            (!m.readBy || !m.readBy.includes(args.userId))
        ).length;

        // Check if this chat was deleted by current user
        const deletion = await ctx.db
          .query("chatDeletions")
          .withIndex("by_user_conversation", (q) =>
            q.eq("userId", args.userId).eq("conversationId", conv._id)
          )
          .unique();

        // Agar user ne chat delete ki thi aur last message us ke baad ka nahi
        if (deletion && lastMessage && lastMessage.sentAt < deletion.deletedAt) {
          return null;
        }
        if (deletion && !lastMessage) {
          return null;
        }

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
      })
    );

    // null filter karo aur time ke hisaab se sort karo
    return result
      .filter(Boolean)
      .sort((a, b) => (b!.lastMessageAt ?? 0) - (a!.lastMessageAt ?? 0));
  },
});

// ── GET CONVERSATION BY ID ──
export const getConversationById = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

// ── DELETE CHAT (for current user only) ──
export const deleteChat = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if already deleted
    const existing = await ctx.db
      .query("chatDeletions")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId)
      )
      .unique();

    if (existing) {
      // Update deletedAt timestamp
      await ctx.db.patch(existing._id, { deletedAt: Date.now() });
    } else {
      await ctx.db.insert("chatDeletions", {
        conversationId: args.conversationId,
        userId: args.userId,
        deletedAt: Date.now(),
      });
    }
  },
});

// ── UPDATE LAST MESSAGE AT ──
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