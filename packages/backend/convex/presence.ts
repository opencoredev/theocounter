import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsertPresence = mutation({
  args: { visitorId: v.string() },
  handler: async (ctx, { visitorId }) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_visitorId", (q) => q.eq("visitorId", visitorId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: Date.now() });
    } else {
      await ctx.db.insert("presence", { visitorId, lastSeen: Date.now() });
    }
  },
});

export const getViewerCount = query({
  handler: async (ctx) => {
    const cutoff = Date.now() - 60_000;
    const active = await ctx.db
      .query("presence")
      .withIndex("by_lastSeen", (q) => q.gt("lastSeen", cutoff))
      .collect();
    return active.length;
  },
});

export const deleteStale = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - 120_000;
    const stale = await ctx.db
      .query("presence")
      .withIndex("by_lastSeen", (q) => q.lt("lastSeen", cutoff))
      .collect();
    await Promise.all(stale.map((entry) => ctx.db.delete(entry._id)));
  },
});
