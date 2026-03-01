// convex/chatThemes.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getChatTheme = query({
  args: {
    userId: v.id("users"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatThemes")
      .withIndex("by_user_and_other", (q) =>
        q.eq("userId", args.userId).eq("otherUserId", args.otherUserId),
      )
      .unique();
  },
});

export const setChatTheme = mutation({
  args: {
    userId: v.id("users"),
    otherUserId: v.id("users"),
    chatPresetName: v.optional(v.string()),
    chatBgColor: v.optional(v.string()),
    myBubbleColor: v.optional(v.string()),
    otherBubbleColor: v.optional(v.string()),
    myTextColor: v.optional(v.string()),
    otherTextColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chatThemes")
      .withIndex("by_user_and_other", (q) =>
        q.eq("userId", args.userId).eq("otherUserId", args.otherUserId),
      )
      .unique();

    const themeData = {
      chatPresetName: args.chatPresetName,
      chatBgColor: args.chatBgColor,
      myBubbleColor: args.myBubbleColor,
      otherBubbleColor: args.otherBubbleColor,
      myTextColor: args.myTextColor,
      otherTextColor: args.otherTextColor,
    };

    if (existing) {
      await ctx.db.patch(existing._id, themeData);
    } else {
      await ctx.db.insert("chatThemes", {
        userId: args.userId,
        otherUserId: args.otherUserId,
        ...themeData,
      });
    }
  },
});
