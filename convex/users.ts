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

    // ── PRO FIX: Agar privacy 'nobody' hai tou hamesha offline physical state ──
    const effectiveOnline = user.privacyOnline === "nobody" ? false : args.isOnline;

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
  args: { 
    userId: v.id("users"),
    viewerId: v.optional(v.id("users")) // Viewer ID zaroori hai
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // ── PRO FIX: 4-Option Privacy Logic (Whitelist & Blacklist) ──
    let canSee = true;
    const privacy = user.privacyOnline ?? "everyone";
    const exceptions = user.onlineExceptions ?? [];

    if (privacy === "nobody") {
      canSee = false;
    } else if (privacy === "only_these") {
      // Whitelist: Sirf unko dikhao jo list mein hain
      canSee = args.viewerId ? exceptions.includes(args.viewerId) : false;
    } else if (privacy === "all_except") {
      // Blacklist: Unko chhupao jo list mein hain
      canSee = args.viewerId ? !exceptions.includes(args.viewerId) : true;
    }

    return {
      ...user,
      isOnline: canSee ? user.isOnline : false,
      lastSeen: canSee ? user.lastSeen : undefined,
    };
  },
});

// ── Get user online status real-time (lightweight query) ──
export const getUserOnlineStatus = query({
  args: { 
    userId: v.id("users"),
    viewerId: v.optional(v.id("users")) 
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // ── PRO FIX: 4-Option Privacy Logic (Whitelist & Blacklist) ──
    let canSee = true;
    const privacy = user.privacyOnline ?? "everyone";
    const exceptions = user.onlineExceptions ?? [];

    if (privacy === "nobody") {
      canSee = false;
    } else if (privacy === "only_these") {
      canSee = args.viewerId ? exceptions.includes(args.viewerId) : false;
    } else if (privacy === "all_except") {
      canSee = args.viewerId ? !exceptions.includes(args.viewerId) : true;
    }

    return {
      userId: user._id,
      isOnline: canSee ? user.isOnline : false,
      lastSeen: canSee ? user.lastSeen : undefined,
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

    // ── PRO FIX: 'nobody' par hamesha false rakho ──
    const effectiveOnline = user.privacyOnline === "nobody" ? false : args.isOnline;

    await ctx.db.patch(args.userId, {
      isOnline: effectiveOnline,
      lastSeen: Date.now(),
    });
  },
});

// ── PRO FIX: Global Disappearing Messages Setting (Settings Panel ke liye) ──
export const updateGlobalDisappearingSetting = mutation({
  args: {
    userId: v.id("users"),
    timer: v.optional(
      v.union(
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
    // Agar timer pass hoga tou set ho jayega, undefined hoga tou OFF ho jayega
    await ctx.db.patch(args.userId, {
      settingDisappearing: args.timer,
    });
  },
});


// ── STEP 16: Pin / Unpin Chat (Max 3) ──
export const togglePinChat = mutation({
  args: {
    userId: v.id("users"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    let currentPins = user.pinnedChats ?? [];
    const isPinned = currentPins.includes(args.conversationId);

    if (isPinned) {
      // Unpin: array se nikal do
      currentPins = currentPins.filter((id) => id !== args.conversationId);
    } else {
      // Pin: limit check karo (Max 3)
      if (currentPins.length >= 3) {
        return { success: false, error: "Maximum 3 chats can be pinned." };
      }
      currentPins.push(args.conversationId);
    }

    await ctx.db.patch(args.userId, { pinnedChats: currentPins });
    return { success: true, isPinned: !isPinned };
  },
});