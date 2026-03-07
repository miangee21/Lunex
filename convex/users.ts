// convex/users.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const isUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    return existing === null;
  },
});

export const getUserByPublicKey = query({
  args: { publicKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_public_key", (q) => q.eq("publicKey", args.publicKey))
      .unique();
  },
});

export const createUser = mutation({
  args: {
    username: v.string(),
    publicKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (existing !== null) {
      throw new Error("Username already taken");
    }

    const usernameRegex = /^[a-z0-9]{3,10}$/;
    const hasNumber = /[0-9]/.test(args.username);

    if (!usernameRegex.test(args.username) || !hasNumber) {
      throw new Error("Invalid username format");
    }

    return await ctx.db.insert("users", {
      username: args.username,
      publicKey: args.publicKey,
      isOnline: true,
      lastSeen: Date.now(),
    });
  },
});

export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    profilePicStorageId: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {};
    if (args.profilePicStorageId !== undefined)
      patch.profilePicStorageId = args.profilePicStorageId;
    if (args.bio !== undefined) patch.bio = args.bio;
    await ctx.db.patch(args.userId, patch);
  },
});

export const updateThemeSettings = mutation({
  args: {
    userId: v.id("users"),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
    globalPreset: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {};
    if (args.theme !== undefined) patch.theme = args.theme;
    if (args.globalPreset !== undefined) patch.globalPreset = args.globalPreset;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.userId, patch);
    }
  },
});

export const setOnlineStatus = mutation({
  args: {
    userId: v.id("users"),
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // ── PRO FIX: Agar privacy setting OFF hai tou zabardasti offline rakho ──
    const effectiveOnline = user.settingOnlineStatus === false ? false : args.isOnline;

    await ctx.db.patch(args.userId, {
      isOnline: effectiveOnline,
      lastSeen: Date.now(),
    });

    return { success: true, isOnline: effectiveOnline };
  },
});

export const getProfilePicUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// ── Get user online status real-time (lightweight query) ──
export const getUserOnlineStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      userId: user._id,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    };
  },
});

export const removeProfilePic = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { profilePicStorageId: undefined });
  },
});

// ── Online status setting respect karo ──
export const setOnlineStatusWithSetting = mutation({
  args: {
    userId: v.id("users"),
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    // ── Agar settingOnlineStatus false hai tu hamesha offline dikhao ──
    const effectiveOnline =
      user.settingOnlineStatus === false ? false : args.isOnline;

    await ctx.db.patch(args.userId, {
      isOnline: effectiveOnline,
      lastSeen: Date.now(),
    });
  },
});
