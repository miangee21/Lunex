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

    const now = Date.now();

    return filteredMessages
      .filter((m) => {
        if (m.deletedForEveryone) return false;
        if (m.deletedForSender && m.senderId === args.userId) return false;
        if (m.deletedForReceiver && m.senderId !== args.userId) return false;

        // ── PRO FIX 1: Frontend ko expired message dena hi nahi, zero flicker ──
        if (
          m.disappearsAt !== undefined &&
          m.disappearsAt !== null &&
          m.disappearsAt !== 0 &&
          m.disappearsAt <= now
        ) {
          return false;
        }

        return true;
      })
      .map((m) => {
        // ── PRO FIX 2: Expired media ko server se hi block kar do ──
        const isMediaExpired =
          m.mediaExpiresAt !== undefined &&
          m.mediaExpiresAt !== null &&
          m.mediaExpiresAt !== 0 &&
          m.mediaExpiresAt <= now;
        return {
          id: m._id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          encryptedContent: m.encryptedContent,
          iv: m.iv,
          type: m.type,
          mediaStorageId: isMediaExpired ? null : (m.mediaStorageId ?? null),
          mediaIv: isMediaExpired ? null : (m.mediaIv ?? null),
          mediaOriginalName: isMediaExpired
            ? null
            : (m.mediaOriginalName ?? null),
          mediaDeletedAt: isMediaExpired ? now : (m.mediaDeletedAt ?? null),
          uploadBatchId: m.uploadBatchId ?? null,
          replyToMessageId: m.replyToMessageId ?? null,
          reactions: m.reactions ?? [],
          editedAt: m.editedAt ?? null,
          disappearsAt: m.disappearsAt ?? null,
          sentAt: m.sentAt,
          // ── POINT-IN-TIME FIX: Agar time -1 hai, toh wo "Ghost Read" hai, usay chupa do ──
          readBy: (m.readBy ?? []).filter((r: any) => r.userId === args.userId || r.time !== -1),
          deliveredTo: m.deliveredTo ?? [],
          isOwn: m.senderId === args.userId,
        };
      });
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
      v.literal("system"),
    ),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaIv: v.optional(v.string()),
    mediaOriginalName: v.optional(v.string()),
    uploadBatchId: v.optional(v.string()),
    replyToMessageId: v.optional(v.id("messages")),
    disappearsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // ── PRO FIX: Backend automatically Disappearing Time calculate karega (Override Logic) ──
    const conv = await ctx.db.get(args.conversationId);
    const currentUser = await ctx.db.get(args.senderId);
    const otherUserId = conv?.participantIds.find((id) => id !== args.senderId);
    const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;
    
    let calculatedDisappearsAt: number | undefined = undefined;

    // System messages par timer apply nahi hota
    if (args.type !== "system") {
      let effectiveTimer: string | undefined = undefined;

      // Priority 1: Chat ka apna Individual Timer
      if (conv?.disappearingMode && conv?.disappearingTimer) {
        effectiveTimer = conv.disappearingTimer;
      } 
      // Priority 2: Sender ka apna Global Timer (Settings se)
      else if (currentUser?.settingDisappearing) {
        effectiveTimer = currentUser.settingDisappearing as string;
      }
      // Priority 3: Receiver ka apna Global Timer (Symmetric Fix - Dono k liye)
      else if (otherUser?.settingDisappearing) {
        effectiveTimer = otherUser.settingDisappearing as string;
      }

      // Agar koi bhi timer mila hai, tou usay apply kar do
      if (effectiveTimer) {
        const timerMap: Record<string, number> = {
          "1h": 1 * 60 * 60 * 1000,
          "6h": 6 * 60 * 60 * 1000,
          "12h": 12 * 60 * 60 * 1000,
          "1d": 24 * 60 * 60 * 1000,
          "3d": 3 * 24 * 60 * 60 * 1000,
          "7d": 7 * 24 * 60 * 60 * 1000,
        };
        const duration = timerMap[effectiveTimer];
        if (duration) {
          calculatedDisappearsAt = now + duration;
        }
      }
    }

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      encryptedContent: args.encryptedContent,
      iv: args.iv,
      type: args.type,
      mediaStorageId: args.mediaStorageId,
      mediaIv: args.mediaIv,
      mediaOriginalName: args.mediaOriginalName,
      uploadBatchId: args.uploadBatchId,
      replyToMessageId: args.replyToMessageId,

      // ── FIX 2: Hamara calculated timer yahan assign hoga ──
      disappearsAt: calculatedDisappearsAt,
      mediaExpiresAt: args.mediaStorageId
        ? now + 6 * 60 * 60 * 1000
        : undefined,
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
    // ── POINT-IN-TIME FIX: Check user setting exactly when reading ──
    const user = await ctx.db.get(args.userId);
    const sendReceipts = user?.settingReadReceipts !== false;

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
          // ── POINT-IN-TIME FIX: Agar setting OFF thi toh Ghost Mark (-1) lagao ──
          readBy: [...(m.readBy ?? []), { userId: args.userId, time: sendReceipts ? now : -1 }],
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

    const isSender = message.senderId === args.userId;
    const willBeFullyDeleted = isSender
      ? message.deletedForReceiver
      : message.deletedForSender;

    if (willBeFullyDeleted) {
      if (message.mediaStorageId) {
        await ctx.storage.delete(message.mediaStorageId);
      }
      await ctx.db.delete(args.messageId);
    } else {
      if (isSender) {
        await ctx.db.patch(args.messageId, { deletedForSender: true });
      } else {
        await ctx.db.patch(args.messageId, { deletedForReceiver: true });
      }
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

    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - message.sentAt > ONE_HOUR) {
      throw new Error(
        "Time limit exceeded. Cannot delete for everyone after 1 hour.",
      );
    }

    if (message.mediaStorageId) {
      await ctx.storage.delete(message.mediaStorageId);
    }

    await ctx.db.patch(args.messageId, {
      deletedForEveryone: true,
      encryptedContent: "",
      iv: "",
      mediaStorageId: undefined,
      mediaIv: undefined,
      mediaOriginalName: undefined,
      type: "text",
    });
  },
});

export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    encryptedEmoji: v.string(),
    iv: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const reactions = message.reactions ?? [];
    const filtered = reactions.filter((r) => r.userId !== args.userId);

    await ctx.db.patch(args.messageId, {
      reactions: [
        ...filtered,
        {
          userId: args.userId,
          encryptedEmoji: args.encryptedEmoji,
          iv: args.iv,
        },
      ],
    });

    if (message.senderId !== args.userId) {
      await ctx.db.patch(message.conversationId, {
        lastMessageAt: Date.now(),
        lastReaction: {
          messageId: args.messageId,
          encryptedEmoji: args.encryptedEmoji,
          iv: args.iv,
          userId: args.userId,
          timestamp: Date.now(),
        },
      });
    }
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

    const reactions = message.reactions ?? [];
    const filtered = reactions.filter((r) => r.userId !== args.userId);

    await ctx.db.patch(args.messageId, {
      reactions: filtered,
    });

    const conversation = await ctx.db.get(message.conversationId);
    if (
      conversation?.lastReaction &&
      conversation.lastReaction.messageId === args.messageId &&
      conversation.lastReaction.userId === args.userId
    ) {
      await ctx.db.patch(message.conversationId, {
        lastReaction: undefined,
      });
    }
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

    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - message.sentAt > ONE_HOUR) {
      throw new Error("Time limit exceeded. Cannot edit after 1 hour.");
    }

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
