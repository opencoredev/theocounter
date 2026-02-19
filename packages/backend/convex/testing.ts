import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const resetTestData = internalMutation({
  handler: async (ctx) => {
    const videos = await ctx.db.query("videos").collect();
    for (const video of videos) {
      await ctx.db.delete(video._id);
    }

    const droughts = await ctx.db.query("droughts").collect();
    for (const drought of droughts) {
      await ctx.db.delete(drought._id);
    }

    const subscribers = await ctx.db.query("subscribers").collect();
    for (const subscriber of subscribers) {
      await ctx.db.delete(subscriber._id);
    }

    return {
      cleared: {
        videos: videos.length,
        droughts: droughts.length,
        subscribers: subscribers.length,
      },
    };
  },
});

export const seedInitialData = internalMutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("videos").first();
    if (existing) return { skipped: true, reason: "Data already exists" };

    await ctx.db.insert("videos", {
      videoId: "cNJyE0OvEz0",
      title: "I'm Switching Back",
      publishedAt: new Date("2026-01-31T00:00:00Z").getTime(),
      thumbnailUrl: "https://i.ytimg.com/vi/cNJyE0OvEz0/maxresdefault.jpg",
      detectedAt: Date.now(),
    });

    return { inserted: true };
  },
});

export const simulateNewVideo = internalAction({
  args: {
    videoId: v.string(),
    title: v.string(),
    thumbnailUrl: v.optional(v.string()),
  },
  returns: v.object({
    videoId: v.string(),
    droughtCreated: v.boolean(),
  }),
  handler: async (ctx, args): Promise<{ videoId: string; droughtCreated: boolean }> => {
    const thumbnailUrl =
      args.thumbnailUrl ??
      `https://i.ytimg.com/vi/${args.videoId}/maxresdefault.jpg`;
    const publishedAt = Date.now();

    const prevVideo = await ctx.runQuery(internal.videos.getLatestVideoInternal);

    await ctx.runMutation(internal.videos.insertVideo, {
      videoId: args.videoId,
      title: args.title,
      publishedAt,
      thumbnailUrl,
    });

    if (prevVideo) {
      await ctx.runMutation(internal.videos.insertDrought, {
        startVideoId: prevVideo.videoId,
        endVideoId: args.videoId,
        startTime: prevVideo.publishedAt,
        endTime: publishedAt,
      });
    }

    return { videoId: args.videoId, droughtCreated: !!prevVideo };
  },
});
