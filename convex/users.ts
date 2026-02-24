import { v } from "convex/values";
import { query, mutation } from "./_generated/server";


// Check if a username is available (returns true if available)
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

// Get user by their public key (used during login)
export const getUserByPublicKey = query({
  args: { publicKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_public_key", (q) => q.eq("publicKey", args.publicKey))
      .unique();
  },
});

// Create a new user after signup
export const createUser = mutation({
  args: {
    username: v.string(),
    publicKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Double check username is still available
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (existing !== null) {
      throw new Error("Username already taken");
    }

    // Validate username format
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

// Update user profile (pic and bio) — called from MyProfilePanel
export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    profilePicStorageId: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {};
    if (args.profilePicStorageId !== undefined) patch.profilePicStorageId = args.profilePicStorageId;
    if (args.bio !== undefined) patch.bio = args.bio;
    await ctx.db.patch(args.userId, patch);
  },
});

export const setOnlineStatus = mutation({
  args: {
    userId: v.id("users"),
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      isOnline: args.isOnline,
      lastSeen: Date.now(),
    });
  },
});

export const getProfilePicUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});