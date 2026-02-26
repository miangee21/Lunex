import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ── SET TYPING STATUS ──
export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isTyping: args.isTyping,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId: args.userId,
        isTyping: args.isTyping,
        updatedAt: Date.now(),
      });
    }
  },
});

// ── GET TYPING USERS ──
// Returns list of userIds who are currently typing (excluding current user)
export const getTypingUsers = query({
  args: {
    conversationId: v.id("conversations"),
    currentUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Sirf wahi return karo jo:
    // 1. Is typing (isTyping: true)
    // 2. Current user nahi hai
    // 3. 10 seconds se zyada purana nahi (stale typing indicator clean karo)
    const tenSecondsAgo = Date.now() - 10000;

    return indicators
      .filter(
        (t) =>
          t.isTyping &&
          t.userId !== args.currentUserId &&
          t.updatedAt > tenSecondsAgo
      )
      .map((t) => t.userId);
  },
});

// ── CLEAR TYPING (call on blur or send) ──
export const clearTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isTyping: false,
        updatedAt: Date.now(),
      });
    }
  },
});