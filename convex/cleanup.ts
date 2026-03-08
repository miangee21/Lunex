// convex/cleanup.ts
import { internalMutation } from "./_generated/server";

export const deleteExpiredMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const messages = await ctx.db.query("messages").collect();

    for (const msg of messages) {
      if (
        msg.disappearsAt !== undefined &&
        msg.disappearsAt !== null &&
        msg.disappearsAt !== 0 &&
        msg.disappearsAt <= now
      ) {
        if (msg.mediaStorageId) {
          await ctx.storage.delete(msg.mediaStorageId).catch(() => {});
        }
        await ctx.db.delete(msg._id);
        continue;
      }

      if (
        msg.mediaExpiresAt !== undefined &&
        msg.mediaExpiresAt !== null &&
        msg.mediaExpiresAt !== 0 &&
        msg.mediaExpiresAt <= now
      ) {
        if (msg.mediaStorageId) {
          await ctx.storage.delete(msg.mediaStorageId).catch(() => {});
        }

        await ctx.db.patch(msg._id, {
          mediaStorageId: undefined,
          mediaIv: undefined,
          mediaOriginalName: undefined,
          mediaExpiresAt: undefined,
          mediaDeletedAt: now,
        });
      }
    }
  },
});
