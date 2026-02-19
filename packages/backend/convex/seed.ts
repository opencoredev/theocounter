import { action } from "./_generated/server";
import { internal } from "./_generated/api";

function getUploadsPlaylistId(channelId: string): string {
  return "UULF" + channelId.slice(2);
}

type YouTubeItem = {
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
};

type YouTubeResponse = {
  items?: YouTubeItem[];
  nextPageToken?: string;
};

export const seedHistoricalVideos = action({
  args: {},
  handler: async (ctx) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId = process.env.THEO_CHANNEL_ID ?? "UCbRP3c757lWg9M-U7TyEkXA";

    if (!apiKey) throw new Error("YOUTUBE_API_KEY not set");

    const playlistId = getUploadsPlaylistId(channelId);

    // Fetch up to 100 videos (2 pages of 50)
    const fetched: Array<{
      videoId: string;
      title: string;
      publishedAt: number;
      thumbnailUrl: string;
    }> = [];

    let pageToken: string | undefined;

    for (let page = 0; page < 2; page++) {
      const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      url.searchParams.set("part", "snippet");
      url.searchParams.set("playlistId", playlistId);
      url.searchParams.set("maxResults", "50");
      url.searchParams.set("key", apiKey);
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);

      const data = (await res.json()) as YouTubeResponse;

      for (const item of data.items ?? []) {
        const { snippet } = item;
        const thumbnailUrl =
          snippet.thumbnails.maxres?.url ??
          snippet.thumbnails.high?.url ??
          snippet.thumbnails.medium?.url ??
          `https://i.ytimg.com/vi/${snippet.resourceId.videoId}/maxresdefault.jpg`;

        fetched.push({
          videoId: snippet.resourceId.videoId,
          title: snippet.title,
          publishedAt: new Date(snippet.publishedAt).getTime(),
          thumbnailUrl,
        });
      }

      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }

    // Get existing video IDs for dedup
    const existing = await ctx.runQuery(internal.videos.getAllVideoIds);
    const existingIds = new Set(existing.map((vid) => vid.videoId));

    // Insert new videos
    let videosAdded = 0;
    for (const video of fetched) {
      if (!existingIds.has(video.videoId)) {
        await ctx.runMutation(internal.videos.insertVideo, {
          videoId: video.videoId,
          title: video.title,
          publishedAt: video.publishedAt,
          thumbnailUrl: video.thumbnailUrl,
        });
        videosAdded++;
      }
    }

    // Get all videos sorted asc to compute droughts
    const allVideos = await ctx.runQuery(internal.videos.getAllVideosSorted);

    // Get existing drought pairs for dedup
    const existingDroughts = await ctx.runQuery(internal.videos.getAllDroughtPairs);
    const droughtSet = new Set(
      existingDroughts.map((d) => `${d.startVideoId}:${d.endVideoId}`)
    );

    // Insert missing droughts between consecutive videos
    let droughtsAdded = 0;
    for (let i = 0; i < allVideos.length - 1; i++) {
      const a = allVideos[i];
      const b = allVideos[i + 1];
      const key = `${a.videoId}:${b.videoId}`;
      if (!droughtSet.has(key)) {
        await ctx.runMutation(internal.videos.insertDrought, {
          startVideoId: a.videoId,
          endVideoId: b.videoId,
          startTime: a.publishedAt,
          endTime: b.publishedAt,
        });
        droughtsAdded++;
      }
    }

    return {
      totalFetched: fetched.length,
      videosAdded,
      droughtsAdded,
    };
  },
});
