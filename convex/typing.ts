// convex/typing.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    // ── PRO FIX: 4-Option Typing Privacy Logic ──
    let canSendTyping = true;
    const privacy = user.privacyTyping ?? "everyone";
    const exceptions = user.typingExceptions ?? [];

    if (privacy === "nobody") {
      canSendTyping = false;
    } else if (privacy === "only_these" || privacy === "all_except") {
      // Humein dekhna hoga ke doosra banda (viewer) kaun hai
      const conv = await ctx.db.get(args.conversationId);
      if (conv) {
        const otherUserId = conv.participantIds.find((id) => id !== args.userId);
        
        if (otherUserId) {
          if (privacy === "only_these") {
            // Whitelist: Sirf tab bhejo agar doosra banda list mein HAI
            canSendTyping = exceptions.includes(otherUserId);
          } else if (privacy === "all_except") {
            // Blacklist: Sirf tab bhejo agar doosra banda list mein NAHI hai
            canSendTyping = !exceptions.includes(otherUserId);
          }
        }
      }
    }

    // Agar privacy allow nahi karti, tou typing event send hi mat karo
    if (!canSendTyping) return;

    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    // ── PRO FIX: Zombie data ko delete karo bajaye 'false' set karne ke ──
    if (existing) {
      if (args.isTyping) {
        await ctx.db.patch(existing._id, {
          isTyping: true,
          updatedAt: Date.now(),
        });
      } else {
        // Typing ruki tou row hi delete kar do
        await ctx.db.delete(existing._id);
      }
    } else if (args.isTyping) {
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId: args.userId,
        isTyping: true,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getTypingUsers = query({
  args: {
    conversationId: v.id("conversations"),
    currentUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    const tenSecondsAgo = Date.now() - 10000;

    return indicators
      .filter(
        (t) =>
          t.isTyping &&
          t.userId !== args.currentUserId &&
          t.updatedAt > tenSecondsAgo,
      )
      .map((t) => t.userId);
  },
});

export const clearTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
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
