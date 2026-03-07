//convex/presence.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ── Privacy settings update karo ──
export const updatePrivacySettings = mutation({
  args: {
    userId: v.id("users"),
    settingOnlineStatus: v.optional(v.boolean()),
    settingTyping: v.optional(v.boolean()),
    settingReadReceipts: v.optional(v.boolean()),
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

    if (settings.settingOnlineStatus !== undefined)
      patch.settingOnlineStatus = settings.settingOnlineStatus;

    if (settings.settingTyping !== undefined)
      patch.settingTyping = settings.settingTyping;

    if (settings.settingReadReceipts !== undefined)
      patch.settingReadReceipts = settings.settingReadReceipts;

    if (settings.settingDisappearing !== undefined)
      patch.settingDisappearing =
        settings.settingDisappearing === "off"
          ? undefined
          : settings.settingDisappearing;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(userId, patch);
    }

    // ── FIX 1: Toggle ON ya OFF hone par isOnline ko foran update karo ──
    if (settings.settingOnlineStatus === false) {
      await ctx.db.patch(userId, { isOnline: false, lastSeen: Date.now() });
    } else if (settings.settingOnlineStatus === true) {
      await ctx.db.patch(userId, { isOnline: true, lastSeen: Date.now() });
    }

    return { success: true };
  },
});

// ── User ki privacy settings fetch karo ──
export const getUserSettings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    return {
      settingOnlineStatus: user.settingOnlineStatus ?? true,
      settingTyping: user.settingTyping ?? true,
      settingReadReceipts: user.settingReadReceipts ?? true,
      settingDisappearing: user.settingDisappearing ?? "off",
    };
  },
});