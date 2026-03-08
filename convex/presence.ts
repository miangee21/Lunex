//convex/presence.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const updatePrivacySettings = mutation({
  args: {
    userId: v.id("users"),

    privacyOnline: v.optional(
      v.union(
        v.literal("everyone"),
        v.literal("nobody"),
        v.literal("only_these"),
        v.literal("all_except"),
      ),
    ),
    onlineExceptions: v.optional(v.array(v.id("users"))),

    privacyTyping: v.optional(
      v.union(
        v.literal("everyone"),
        v.literal("nobody"),
        v.literal("only_these"),
        v.literal("all_except"),
      ),
    ),
    typingExceptions: v.optional(v.array(v.id("users"))),

    privacyReadReceipts: v.optional(
      v.union(
        v.literal("everyone"),
        v.literal("nobody"),
        v.literal("only_these"),
        v.literal("all_except"),
      ),
    ),
    readReceiptsExceptions: v.optional(v.array(v.id("users"))),

    privacyNotifications: v.optional(
      v.union(
        v.literal("everyone"),
        v.literal("nobody"),
        v.literal("only_these"),
        v.literal("all_except"),
      ),
    ),
    notificationExceptions: v.optional(v.array(v.id("users"))),

    settingDisappearing: v.optional(
      v.union(
        v.literal("off"),
        v.literal("1h"),
        v.literal("6h"),
        v.literal("12h"),
        v.literal("1d"),
        v.literal("3d"),
        v.literal("7d"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, ...settings } = args;

    const patch: Record<string, unknown> = {};

    if (settings.privacyOnline !== undefined)
      patch.privacyOnline = settings.privacyOnline;
    if (settings.onlineExceptions !== undefined)
      patch.onlineExceptions = settings.onlineExceptions;

    if (settings.privacyTyping !== undefined)
      patch.privacyTyping = settings.privacyTyping;
    if (settings.typingExceptions !== undefined)
      patch.typingExceptions = settings.typingExceptions;

    if (settings.privacyReadReceipts !== undefined)
      patch.privacyReadReceipts = settings.privacyReadReceipts;
    if (settings.readReceiptsExceptions !== undefined)
      patch.readReceiptsExceptions = settings.readReceiptsExceptions;

    if (settings.privacyNotifications !== undefined)
      patch.privacyNotifications = settings.privacyNotifications;
    if (settings.notificationExceptions !== undefined)
      patch.notificationExceptions = settings.notificationExceptions;

    if (settings.settingDisappearing !== undefined)
      patch.settingDisappearing =
        settings.settingDisappearing === "off"
          ? undefined
          : settings.settingDisappearing;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(userId, patch);
    }

    if (settings.privacyOnline === "nobody") {
      await ctx.db.patch(userId, { isOnline: false, lastSeen: Date.now() });
    } else if (
      settings.privacyOnline === "everyone" ||
      settings.privacyOnline === "only_these" ||
      settings.privacyOnline === "all_except"
    ) {
      await ctx.db.patch(userId, { isOnline: true, lastSeen: Date.now() });
    }

    return { success: true };
  },
});

export const getUserSettings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    return {
      privacyOnline: user.privacyOnline ?? "everyone",
      onlineExceptions: user.onlineExceptions ?? [],

      privacyTyping: user.privacyTyping ?? "everyone",
      typingExceptions: user.typingExceptions ?? [],

      privacyReadReceipts: user.privacyReadReceipts ?? "everyone",
      readReceiptsExceptions: user.readReceiptsExceptions ?? [],

      privacyNotifications: user.privacyNotifications ?? "everyone",
      notificationExceptions: user.notificationExceptions ?? [],

      settingDisappearing: user.settingDisappearing ?? "off",
    };
  },
});
