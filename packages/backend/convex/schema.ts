import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  videos: defineTable({
    videoId: v.string(),
    title: v.string(),
    publishedAt: v.number(),
    thumbnailUrl: v.string(),
    detectedAt: v.number(),
  })
    .index("by_publishedAt", ["publishedAt"])
    .index("by_videoId", ["videoId"]),

  droughts: defineTable({
    startVideoId: v.string(),
    endVideoId: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    durationMs: v.number(),
  })
    .index("by_durationMs", ["durationMs"])
    .index("by_endVideoId", ["endVideoId"]),

  subscribers: defineTable({
    email: v.string(),
    subscribedAt: v.number(),
  }).index("by_email", ["email"]),

  presence: defineTable({
    visitorId: v.string(),
    lastSeen: v.number(),
  })
    .index("by_visitorId", ["visitorId"])
    .index("by_lastSeen", ["lastSeen"]),
});
