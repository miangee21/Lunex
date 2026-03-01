// convex/friends.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const searchUsers = query({
  args: { username: v.string(), currentUserId: v.id("users") },
  handler: async (ctx, args) => {
    if (args.username.length < 2) return [];
    const users = await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q
          .gte("username", args.username)
          .lt("username", args.username + "\uffff"),
      )
      .take(30);
    return users.filter((u) => u._id !== args.currentUserId);
  },
});

export const getFriends = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;

    const sentRecords = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user", (q) =>
        q.eq("fromUserId", args.userId).eq("status", "accepted"),
      )
      .take(limit);

    const receivedRecords = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user", (q) =>
        q.eq("toUserId", args.userId).eq("status", "accepted"),
      )
      .take(limit);

    async function getBlockFlags(otherUserId: string) {
      const iBlockedRecord = await ctx.db
        .query("blockedUsers")
        .withIndex("by_pair", (q) =>
          q.eq("blockerId", args.userId).eq("blockedId", otherUserId as never),
        )
        .unique();

      const theyBlockedRecord = await ctx.db
        .query("blockedUsers")
        .withIndex("by_pair", (q) =>
          q.eq("blockerId", otherUserId as never).eq("blockedId", args.userId),
        )
        .unique();

      return {
        iBlockedThem: !!iBlockedRecord,
        hasBlockedMe: !!theyBlockedRecord,
      };
    }

    const sentFriends = await Promise.all(
      sentRecords.map(async (r) => {
        const user = await ctx.db.get(r.toUserId);
        if (!user) return null;
        const { iBlockedThem, hasBlockedMe } = await getBlockFlags(user._id);
        return {
          friendshipId: r._id,
          userId: user._id,
          username: user.username,
          profilePicStorageId: user.profilePicStorageId ?? null,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          hasBlockedMe,
          iBlockedThem,
        };
      }),
    );

    const receivedFriends = await Promise.all(
      receivedRecords.map(async (r) => {
        const user = await ctx.db.get(r.fromUserId);
        if (!user) return null;
        const { iBlockedThem, hasBlockedMe } = await getBlockFlags(user._id);
        return {
          friendshipId: r._id,
          userId: user._id,
          username: user.username,
          profilePicStorageId: user.profilePicStorageId ?? null,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          hasBlockedMe,
          iBlockedThem,
        };
      }),
    );

    const all = [...sentFriends, ...receivedFriends].filter(Boolean);

    const seen = new Set<string>();
    return all.filter((f) => {
      if (!f || seen.has(f.userId)) return false;
      seen.add(f.userId);
      return true;
    });
  },
});

export const getIncomingRequests = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user", (q) =>
        q.eq("toUserId", args.userId).eq("status", "pending"),
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
      }),
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
        q.eq("fromUserId", args.userId).eq("status", "pending"),
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
      }),
    );
  },
});

export const getBlockedUsers = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    const blocked = await ctx.db
      .query("blockedUsers")
      .withIndex("by_blocker", (q) => q.eq("blockerId", args.userId))
      .take(limit);

    return Promise.all(
      blocked.map(async (r) => {
        const user = await ctx.db.get(r.blockedId);
        return {
          recordId: r._id,
          userId: r.blockedId,
          username: user?.username ?? "Unknown",
          profilePicStorageId: user?.profilePicStorageId ?? null,
        };
      }),
    );
  },
});

export const getIncomingRequestsCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user", (q) =>
        q.eq("toUserId", args.userId).eq("status", "pending"),
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
        q.eq("fromUserId", args.currentUserId).eq("toUserId", args.otherUserId),
      )
      .unique();

    const sentByThem = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", args.otherUserId).eq("toUserId", args.currentUserId),
      )
      .unique();

    if (sentByMe)
      return {
        status: sentByMe.status,
        direction: "sent",
        recordId: sentByMe._id,
      };
    if (sentByThem)
      return {
        status: sentByThem.status,
        direction: "received",
        recordId: sentByThem._id,
      };
    return null;
  },
});

export const sendFriendRequest = mutation({
  args: { fromUserId: v.id("users"), toUserId: v.id("users") },
  handler: async (ctx, args) => {
    if (args.fromUserId === args.toUserId)
      throw new Error("Cannot send request to yourself");

    const iBlockedThem = await ctx.db
      .query("blockedUsers")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", args.fromUserId).eq("blockedId", args.toUserId),
      )
      .unique();

    const theyBlockedMe = await ctx.db
      .query("blockedUsers")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", args.toUserId).eq("blockedId", args.fromUserId),
      )
      .unique();

    if (iBlockedThem || theyBlockedMe) throw new Error("Cannot send request");

    const existing = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", args.fromUserId).eq("toUserId", args.toUserId),
      )
      .unique();

    if (existing) {
      if (existing.status === "pending")
        throw new Error("Request already sent");
      if (existing.status === "accepted") throw new Error("Already friends");
      if (existing.status === "rejected") {
        await ctx.db.patch(existing._id, {
          status: "pending",
          createdAt: Date.now(),
        });
        return;
      }
    }

    const reverse = await ctx.db
      .query("friendRequests")
      .withIndex("by_pair", (q) =>
        q.eq("fromUserId", args.toUserId).eq("toUserId", args.fromUserId),
      )
      .unique();

    if (reverse) {
      if (reverse.status === "pending")
        throw new Error("They already sent you a request");
      if (reverse.status === "accepted") throw new Error("Already friends");
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
  args: { blockerId: v.id("users"), blockedId: v.id("users") },
  handler: async (ctx, args) => {
    if (args.blockerId === args.blockedId)
      throw new Error("Cannot block yourself");

    const existing = await ctx.db
      .query("blockedUsers")
      .withIndex("by_pair", (q) =>
        q.eq("blockerId", args.blockerId).eq("blockedId", args.blockedId),
      )
      .unique();

    if (existing) throw new Error("Already blocked");

    await ctx.db.insert("blockedUsers", {
      blockerId: args.blockerId,
      blockedId: args.blockedId,
      createdAt: Date.now(),
    });
  },
});

export const unblockUser = mutation({
  args: { recordId: v.id("blockedUsers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.recordId);
  },
});
