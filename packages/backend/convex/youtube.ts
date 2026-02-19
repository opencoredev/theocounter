import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

function getUploadsPlaylistId(channelId: string): string {
  return "UULF" + channelId.slice(2);
}

type VideoItem = {
  videoId: string;
  title: string;
  publishedAt: number;
  thumbnailUrl: string;
};

const videoItemValidator = v.object({
  videoId: v.string(),
  title: v.string(),
  publishedAt: v.number(),
  thumbnailUrl: v.string(),
});

export const fetchRecentVideos = internalAction({
  args: {},
  returns: v.array(videoItemValidator),
  handler: async (): Promise<VideoItem[]> => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.THEO_CHANNEL_ID ?? "UCbRP3c757lWg9M-U7TyEkXA";

    if (!apiKey) {
      console.error("YOUTUBE_API_KEY not set");
      return [];
    }

    const playlistId = getUploadsPlaylistId(channelId);
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=10&key=${apiKey}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`YouTube API error: ${res.status} ${res.statusText}`);
        return [];
      }

      const data = (await res.json()) as {
        items?: Array<{
          snippet: {
            resourceId: { videoId: string };
            title: string;
            publishedAt: string;
            thumbnails: {
              maxres?: { url: string };
              high?: { url: string };
              medium?: { url: string };
            };
          };
        }>;
      };

      return (data.items ?? []).map((item) => {
        const { snippet } = item;
        return {
          videoId: snippet.resourceId.videoId,
          title: snippet.title,
          publishedAt: new Date(snippet.publishedAt).getTime(),
          thumbnailUrl:
            snippet.thumbnails.maxres?.url ??
            snippet.thumbnails.high?.url ??
            snippet.thumbnails.medium?.url ??
            `https://i.ytimg.com/vi/${snippet.resourceId.videoId}/maxresdefault.jpg`,
        };
      });
    } catch (err) {
      console.error("YouTube fetch error:", err);
      return [];
    }
  },
});

export const checkForNewVideo = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const recent = await ctx.runAction(internal.youtube.fetchRecentVideos);
    if (recent.length === 0) return null;

    const existing = await ctx.runQuery(internal.videos.getAllVideoIds);
    const existingIds = new Set(existing.map((v) => v.videoId));

    const newVideos = recent
      .filter((v) => !existingIds.has(v.videoId))
      .sort((a, b) => a.publishedAt - b.publishedAt);

    if (newVideos.length === 0) return null;

    const latestStored = await ctx.runQuery(internal.videos.getLatestVideoInternal);

    for (let i = 0; i < newVideos.length; i++) {
      const video = newVideos[i];

      await ctx.runMutation(internal.videos.insertVideo, {
        videoId: video.videoId,
        title: video.title,
        publishedAt: video.publishedAt,
        thumbnailUrl: video.thumbnailUrl,
      });

      const prev = i === 0 ? latestStored : newVideos[i - 1];
      if (prev) {
        await ctx.runMutation(internal.videos.insertDrought, {
          startVideoId: prev.videoId,
          endVideoId: video.videoId,
          startTime: prev.publishedAt,
          endTime: video.publishedAt,
        });
      }
    }

    const latestNew = newVideos[newVideos.length - 1];
    const prevForEmail =
      newVideos.length > 1 ? newVideos[newVideos.length - 2] : latestStored;

    if (prevForEmail) {
      try {
        await ctx.runAction(internal.emails.sendNewVideoBroadcast, {
          videoId: latestNew.videoId,
          title: latestNew.title,
          thumbnailUrl: latestNew.thumbnailUrl,
          droughtDurationMs: latestNew.publishedAt - prevForEmail.publishedAt,
        });
      } catch (err) {
        console.error("Broadcast failed (non-critical):", err);
      }
    }

    console.info(
      `${newVideos.length} new video(s) detected: ${newVideos.map((v) => v.title).join(", ")}`,
    );

    return null;
  },
});
