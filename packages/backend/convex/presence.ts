import { mutation, query } from "./_generated/server";
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
    const cutoff = Date.now() - 90_000;
    const active = await ctx.db
      .query("presence")
      .withIndex("by_lastSeen", (q) => q.gt("lastSeen", cutoff))
      .collect();
    return active.length;
  },
});
