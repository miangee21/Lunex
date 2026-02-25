import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ── QUERIES ──

export const searchUsers = query({
  args: { username: v.string(), currentUserId: v.id("users") },
  handler: async (ctx, args) => {
    if (args.username.length < 2) return [];
    const users = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.gte("username", args.username).lt("username", args.username + "\uffff")
      )
      .take(30);
    return users.filter((u) => u._id !== args.currentUserId);
  },
});

export const getFriends = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;

    // Records where current user sent the request and it was accepted
    const sent = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user", (q) =>
        q.eq("fromUserId", args.userId).eq("status", "accepted")
      )
      .take(limit);

    // Records where current user received the request and it was accepted
    const received = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user", (q) =>
        q.eq("toUserId", args.userId).eq("status", "accepted")
      )
      .take(limit);

    const sentFriends = await Promise.all(
      sent.map(async (r) => {
        const user = await ctx.db.get(r.toUserId);
        if (!user) return null;

        // Did they block me?
        const theyBlockedMe = await ctx.db
          .query("friendRequests")
          .withIndex("by_pair", (q) =>
            q.eq("fromUserId", r.toUserId).eq("toUserId", args.userId)
          )
          .filter((q) => q.eq(q.field("status"), "blocked"))
          .unique();

        // Did I block them?
        const iBlockedThem = await ctx.db
          .query("friendRequests")
          .withIndex("by_pair", (q) =>
            q.eq("fromUserId", args.userId).eq("toUserId", r.toUserId)
          )
          .filter((q) => q.eq(q.field("status"), "blocked"))
          .unique();

        return {
          friendshipId: r._id,
          userId: user._id,
          username: user.username,
          profilePicStorageId: user.profilePicStorageId ?? null,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          hasBlockedMe: !!theyBlockedMe,
          iBlockedThem: !!iBlockedThem,
        };
      })
    );

    const receivedFriends = await Promise.all(
      received.map(async (r) => {
        const user = await ctx.db.get(r.fromUserId);
        if (!user) return null;

        const theyBlockedMe = await ctx.db
          .query("friendRequests")
          .withIndex("by_pair", (q) =>
            q.eq("fromUserId", r.fromUserId).eq("toUserId", args.userId)
          )
          .filter((q) => q.eq(q.field("status"), "blocked"))
          .unique();

        const iBlockedThem = await ctx.db
          .query("friendRequests")
          .withIndex("by_pair", (q) =>
            q.eq("fromUserId", args.userId).eq("toUserId", r.fromUserId)
          )
          .filter((q) => q.eq(q.field("status"), "blocked"))
          .unique();

        return {
          friendshipId: r._id,
          userId: user._id,
          username: user.username,
          profilePicStorageId: user.profilePicStorageId ?? null,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          hasBlockedMe: !!theyBlockedMe,
          iBlockedThem: !!iBlockedThem,
        };
      })
    );

    // Combine — include everyone (blocked by me shows in friends with iBlockedThem flag)
    // But if iBlockedThem — they appear in BOTH friends and blocked list
    return [...sentFriends, ...receivedFriends].filter(Boolean);
  },
});

export const getIncomingRequests = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user", (q) =>
        q.eq("toUserId", args.userId).eq("status", "pending")
      )
      .take(limit);

    return Promise.all(
      requests.map(async (r) => {
        const user = await ctx.db.get(r.fromUserId);
        return {
          requestId: r._id,
          userId: r.fromUserId,
          username: user?.username ?? "Unknown",
          profilePicStorageId: user?.profilePicStorageId ?? null,
        };
      })
    );
  },
});

export const getSentRequests = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user", (q) =>
        q.eq("fromUserId", args.userId).eq("status", "pending")
      )
      .take(limit);

    return Promise.all(
      requests.map(async (r) => {
        const user = await ctx.db.get(r.toUserId);
        return {
          requestId: r._id,
          userId: r.toUserId,
          username: user?.username ?? "Unknown",
          profilePicStorageId: user?.profilePicStorageId ?? null,
        };
      })
    );
  },
});

export const getBlockedUsers = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    const blocked = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user", (q) =>
        q.eq("fromUserId", args.userId).eq("status", "blocked")
      )
      .take(limit);

    return Promise.all(
      blocked.map(async (r) => {
        const user = await ctx.db.get(r.toUserId);
        return {
          recordId: r._id,
          userId: r.toUserId,
          username: user?.username ?? "Unknown",
          profilePicStorageId: user?.profilePicStorageId ?? null,
        };
      })
    );
  },
});

export const getIncomingRequestsCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user", (q) =>
        q.eq("toUserId", args.userId).eq("status", "pending")
      )
      .collect();
    return requests.length;
  },
});

export const getRelationshipStatus = query({
  args: { currentUserId: v.id("users"), otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const sentByMe = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", args.currentUserId).eq("toUserId", args.otherUserId)
      )
      .unique();

    const sentByThem = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", args.otherUserId).eq("toUserId", args.currentUserId)
      )
      .unique();

    if (sentByMe) return { status: sentByMe.status, direction: "sent", recordId: sentByMe._id };
    if (sentByThem) return { status: sentByThem.status, direction: "received", recordId: sentByThem._id };
    return null;
  },
});

// ── MUTATIONS ──

export const sendFriendRequest = mutation({
  args: { fromUserId: v.id("users"), toUserId: v.id("users") },
  handler: async (ctx, args) => {
    if (args.fromUserId === args.toUserId) throw new Error("Cannot send request to yourself");

    const existing = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", args.fromUserId).eq("toUserId", args.toUserId)
      )
      .unique();

    if (existing) {
      if (existing.status === "pending") throw new Error("Request already sent");
      if (existing.status === "accepted") throw new Error("Already friends");
      if (existing.status === "blocked") throw new Error("Cannot send request");
      if (existing.status === "rejected") {
        await ctx.db.patch(existing._id, { status: "pending", createdAt: Date.now() });
        return;
      }
    }

    const reverse = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", args.toUserId).eq("toUserId", args.fromUserId)
      )
      .unique();

    if (reverse) {
      if (reverse.status === "pending") throw new Error("They already sent you a request");
      if (reverse.status === "accepted") throw new Error("Already friends");
      if (reverse.status === "blocked") throw new Error("Cannot send request");
    }

    await ctx.db.insert("friendRequests", {
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const acceptFriendRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    await ctx.db.patch(args.requestId, { status: "accepted" });
  },
});

export const rejectFriendRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, { status: "rejected" });
  },
});

export const unsendFriendRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.requestId);
  },
});

export const unfriend = mutation({
  args: { friendshipId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.friendshipId);
  },
});

export const blockUser = mutation({
  args: { fromUserId: v.id("users"), toUserId: v.id("users") },
  handler: async (ctx, args) => {
    // Check if friendship exists from my side
    const myRecord = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", args.fromUserId).eq("toUserId", args.toUserId)
      )
      .unique();

    if (myRecord) {
      // Update my record to blocked
      await ctx.db.patch(myRecord._id, { status: "blocked" });
      return;
    }

    // Check if friendship exists from their side
    const theirRecord = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", args.toUserId).eq("toUserId", args.fromUserId)
      )
      .unique();

    if (theirRecord && theirRecord.status === "accepted") {
      // Keep their accepted record intact — friendship still visible on their side
      // Create new block record from my side
      await ctx.db.insert("friendRequests", {
        fromUserId: args.fromUserId,
        toUserId: args.toUserId,
        status: "blocked",
        createdAt: Date.now(),
      });
      return;
    }

    // No existing record — create block
    await ctx.db.insert("friendRequests", {
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      status: "blocked",
      createdAt: Date.now(),
    });
  },
});

export const unblockUser = mutation({
  args: {
    recordId: v.id("friendRequests"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Delete the block record
    await ctx.db.delete(args.recordId);

    // Check if friendship record still exists from their side
    const theirRecord = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", args.toUserId).eq("toUserId", args.fromUserId)
      )
      .unique();

    // If their accepted record exists — friendship is restored automatically
    // If not — create accepted record so they are friends again
    if (!theirRecord) {
      await ctx.db.insert("friendRequests", {
        fromUserId: args.fromUserId,
        toUserId: args.toUserId,
        status: "accepted",
        createdAt: Date.now(),
      });
    }
  },
});