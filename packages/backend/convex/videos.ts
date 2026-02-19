import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

export const getLatestVideo = query({
  handler: async (ctx) => {
    return await ctx.db.query("videos")
      .withIndex("by_publishedAt")
      .order("desc")
      .first();
  },
});

export const getStats = query({
  handler: async (ctx) => {
    const subscribers = await ctx.db.query("subscribers").collect();
    const subscriberCount = subscribers.length;

    const longestDrought = await ctx.db.query("droughts")
      .withIndex("by_durationMs")
      .order("desc")
      .first();
    const longestDroughtMs = longestDrought?.durationMs ?? 0;

    return { subscriberCount, longestDroughtMs };
  },
});

export const getDroughts = query({
  handler: async (ctx) => {
    return await ctx.db.query("droughts").order("desc").collect();
  },
});

export const getLatestVideoInternal = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("videos")
      .withIndex("by_publishedAt")
      .order("desc")
      .first();
  },
});

export const insertVideo = internalMutation({
  args: {
    videoId: v.string(),
    title: v.string(),
    publishedAt: v.number(),
    thumbnailUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("videos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    if (existing) return;
    await ctx.db.insert("videos", { ...args, detectedAt: Date.now() });
  },
});

export const insertDrought = internalMutation({
  args: {
    startVideoId: v.string(),
    endVideoId: v.string(),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("droughts")
      .withIndex("by_endVideoId", (q) => q.eq("endVideoId", args.endVideoId))
      .first();
    if (existing) return;
    await ctx.db.insert("droughts", {
      ...args,
      durationMs: args.endTime - args.startTime,
    });
  },
});

export const getLatestVideos = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("videos")
      .withIndex("by_publishedAt")
      .order("desc")
      .take(3);
  },
});

export const seedInitialData = internalMutation({
  args: {
    videoId: v.string(),
    title: v.string(),
    publishedAt: v.number(),
    thumbnailUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("videos").first();
    if (existing) return { skipped: true };

    await ctx.db.insert("videos", {
      videoId: args.videoId,
      title: args.title,
      publishedAt: args.publishedAt,
      thumbnailUrl: args.thumbnailUrl,
      detectedAt: Date.now(),
    });
    return { inserted: true };
  },
});

export const getAllVideoIds = internalQuery({
  handler: async (ctx) => {
    const videos = await ctx.db.query("videos").collect();
    return videos.map((v) => ({ videoId: v.videoId }));
  },
});

export const getAllVideosSorted = internalQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("videos")
      .withIndex("by_publishedAt")
      .order("asc")
      .collect();
  },
});

export const getAllDroughtPairs = internalQuery({
  handler: async (ctx) => {
    const droughts = await ctx.db.query("droughts").collect();
    return droughts.map((d) => ({
      startVideoId: d.startVideoId,
      endVideoId: d.endVideoId,
    }));
  },
});
