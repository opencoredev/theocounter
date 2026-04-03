import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

// ============================================================
// STOP WORDS — only basic structural words; filler words like
// "like", "just", "right", "actually" are kept intentionally
// because they're the interesting part of Theo's speech patterns
// ============================================================

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "into",
  "about",
  "between",
  "through",
  "during",
  "above",
  "below",
  "up",
  "down",
  "out",
  "off",
  "over",
  "under",
  "i",
  "me",
  "my",
  "mine",
  "myself",
  "we",
  "us",
  "our",
  "ours",
  "ourselves",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "he",
  "him",
  "his",
  "himself",
  "she",
  "her",
  "hers",
  "herself",
  "it",
  "its",
  "itself",
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "having",
  "do",
  "does",
  "did",
  "doing",
  "will",
  "would",
  "could",
  "should",
  "can",
  "may",
  "might",
  "shall",
  "must",
  "this",
  "that",
  "these",
  "those",
  "what",
  "which",
  "who",
  "whom",
  "whose",
  "where",
  "when",
  "how",
  "why",
  "not",
  "no",
  "nor",
  "if",
  "than",
  "because",
  "while",
  "although",
]);

const BATCH_SIZE = 10;
const WORD_BATCH_SIZE = 500;

// ============================================================
// HELPERS
// ============================================================

function processWords(text: string): Map<string, number> {
  const words = text
    .toLowerCase()
    .replace(/\[.*?\]/g, " ")
    .replace(/[^a-z'\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return counts;
}

// Uses YouTube's InnerTube API with Android client context to get caption
// track URLs, then fetches + parses the transcript XML.
const INNERTUBE_URL =
  "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const ANDROID_VERSION = "20.10.38";
const ANDROID_UA = `com.google.android.youtube/${ANDROID_VERSION} (Linux; U; Android 14)`;
const WEB_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)";

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10)),
    );
}

function parseTranscriptXml(xml: string): string | null {
  const texts: string[] = [];

  // Try new format: <p t="offset" d="duration"><s>text</s></p>
  const pRegex = /<p\s+t="\d+"\s+d="\d+"[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(xml)) !== null) {
    const inner = match[1];
    let text = "";
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
    let sMatch;
    while ((sMatch = sRegex.exec(inner)) !== null) {
      text += sMatch[1];
    }
    if (!text) text = inner.replace(/<[^>]+>/g, "");
    text = decodeEntities(text).trim();
    if (text) texts.push(text);
  }

  // Fallback: <text start="..." dur="...">content</text>
  if (texts.length === 0) {
    const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/g;
    while ((match = textRegex.exec(xml)) !== null) {
      const text = decodeEntities(match[1]).replace(/\n/g, " ").trim();
      if (text) texts.push(text);
    }
  }

  return texts.length > 0 ? texts.join(" ") : null;
}

async function fetchTranscriptText(
  videoId: string,
): Promise<string | null> {
  // Strategy 0: Use the proxy API route on Vercel (avoids cloud IP blocking)
  const proxyUrl = process.env.TRANSCRIPT_PROXY_URL;
  if (proxyUrl) {
    try {
      const res = await fetch(
        `${proxyUrl}/api/fetch-transcript/${videoId}`,
      );
      if (res.ok) {
        const data = (await res.json()) as { text?: string };
        if (data.text) return data.text;
      } else if (res.status !== 404) {
        console.warn(`Proxy returned ${res.status} for ${videoId}`);
      }
    } catch (err) {
      console.warn(`Proxy fetch failed for ${videoId}:`, err);
    }
  }

  // Strategy 1: InnerTube API with Android client (bypasses bot detection)
  try {
    const res = await fetch(INNERTUBE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": ANDROID_UA,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: ANDROID_VERSION,
          },
        },
        videoId,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        playabilityStatus?: { status?: string; reason?: string };
        captions?: {
          playerCaptionsTracklistRenderer?: {
            captionTracks?: Array<{
              baseUrl: string;
              languageCode: string;
            }>;
          };
        };
      };

      const tracks =
        data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!tracks || tracks.length === 0) {
        console.warn(
          `InnerTube: no tracks for ${videoId} (status: ${data?.playabilityStatus?.status}, reason: ${data?.playabilityStatus?.reason ?? "none"})`,
        );
      }
      if (tracks && tracks.length > 0) {
        const track =
          tracks.find((t) => t.languageCode === "en") ??
          tracks.find((t) => t.languageCode?.startsWith("en")) ??
          tracks[0];

        if (track?.baseUrl) {
          const transcriptRes = await fetch(track.baseUrl, {
            headers: { "User-Agent": WEB_UA },
          });
          if (transcriptRes.ok) {
            const xml = await transcriptRes.text();
            const text = parseTranscriptXml(xml);
            if (text) return text;
          }
        }
      }
    }
  } catch (err) {
    console.warn(`InnerTube failed for ${videoId}, trying web fallback`);
  }

  // Strategy 2: Web page scraping fallback
  try {
    const pageRes = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": WEB_UA,
        },
      },
    );
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    if (html.includes('class="g-recaptcha"')) return null;

    // Parse ytInitialPlayerResponse
    const marker = "var ytInitialPlayerResponse = ";
    const start = html.indexOf(marker);
    if (start === -1) return null;

    const jsonStart = start + marker.length;
    let depth = 0;
    let end = jsonStart;
    for (let i = jsonStart; i < html.length; i++) {
      if (html[i] === "{") depth++;
      else if (html[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }

    const playerResponse = JSON.parse(html.slice(jsonStart, end)) as {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: Array<{
            baseUrl: string;
            languageCode: string;
          }>;
        };
      };
    };

    const tracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer
        ?.captionTracks;
    if (!tracks || tracks.length === 0) return null;

    const track =
      tracks.find((t) => t.languageCode === "en") ??
      tracks.find((t) => t.languageCode?.startsWith("en")) ??
      tracks[0];
    if (!track?.baseUrl) return null;

    const transcriptRes = await fetch(track.baseUrl, {
      headers: { "User-Agent": WEB_UA },
    });
    if (!transcriptRes.ok) return null;
    return parseTranscriptXml(await transcriptRes.text());
  } catch (err) {
    console.error(`Transcript fetch failed for ${videoId}:`, err);
    return null;
  }
}

// ============================================================
// QUERIES (PUBLIC)
// ============================================================

export const getTopWords = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vocabWords")
      .withIndex("by_totalCount")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const searchWords = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, { searchTerm }) => {
    if (searchTerm.length < 2) return [];
    return await ctx.db
      .query("vocabWords")
      .withSearchIndex("search_word", (q) => q.search("word", searchTerm))
      .take(50);
  },
});

export const getVocabStats = query({
  handler: async (ctx) => {
    return await ctx.db.query("vocabMeta").first();
  },
});

export const getTopWordsSimple = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    // Fetch all, sort in JS to avoid index issues during backfill
    const all = await ctx.db.query("vocabWords").collect();
    all.sort((a, b) => b.totalCount - a.totalCount);
    return all.slice(0, limit ?? 200);
  },
});

// ============================================================
// PUBLIC MUTATIONS (for external scripts / CI)
// ============================================================

export const listUnprocessedVideos = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const allVideos = await ctx.db.query("videos").collect();
    const result: Array<{ videoId: string; title: string }> = [];
    for (const video of allVideos) {
      if (result.length >= (limit ?? 50)) break;
      const transcript = await ctx.db
        .query("transcripts")
        .withIndex("by_videoId", (q) => q.eq("videoId", video.videoId))
        .first();
      if (!transcript) {
        result.push({ videoId: video.videoId, title: video.title });
      }
    }
    return result;
  },
});

export const ingestTranscript = mutation({
  args: {
    videoId: v.string(),
    text: v.optional(v.string()),
    status: v.string(),
    wordCounts: v.optional(
      v.array(v.object({ word: v.string(), count: v.number() })),
    ),
  },
  handler: async (ctx, args) => {
    // Save transcript (idempotent, but allows upgrading no_captions → success)
    const existing = await ctx.db
      .query("transcripts")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    if (existing) {
      if (existing.status === "success" || args.status !== "success") {
        return { skipped: true };
      }
      // Overwrite a failed/no_captions record with a successful one
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("transcripts", {
      videoId: args.videoId,
      status: args.status,
      processedAt: Date.now(),
    });

    // Update vocab words if provided
    let newWords = 0;
    let totalOccurrences = 0;
    if (args.wordCounts) {
      for (const { word, count } of args.wordCounts) {
        totalOccurrences += count;
        const existingWord = await ctx.db
          .query("vocabWords")
          .withIndex("by_word", (q) => q.eq("word", word))
          .first();
        if (existingWord) {
          await ctx.db.patch(existingWord._id, {
            totalCount: existingWord.totalCount + count,
            videoCount: existingWord.videoCount + 1,
          });
        } else {
          newWords++;
          await ctx.db.insert("vocabWords", {
            word,
            totalCount: count,
            videoCount: 1,
          });
        }
      }
    }

    // Incremental meta update
    const meta = await ctx.db.query("vocabMeta").first();
    if (meta) {
      await ctx.db.patch(meta._id, {
        totalUniqueWords: meta.totalUniqueWords + newWords,
        totalWordOccurrences: meta.totalWordOccurrences + totalOccurrences,
        totalVideosProcessed: meta.totalVideosProcessed + 1,
        totalVideosWithTranscripts:
          meta.totalVideosWithTranscripts +
          (args.status === "success" ? 1 : 0),
        lastUpdatedAt: Date.now(),
      });
    }

    return { ingested: true };
  },
});

// ============================================================
// QUERIES (INTERNAL)
// ============================================================

export const getUnprocessedVideos = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const allVideos = await ctx.db.query("videos").collect();
    const result = [];
    for (const video of allVideos) {
      if (result.length >= limit) break;
      const transcript = await ctx.db
        .query("transcripts")
        .withIndex("by_videoId", (q) => q.eq("videoId", video.videoId))
        .first();
      if (!transcript) result.push(video);
    }
    return result;
  },
});

// ============================================================
// MUTATIONS (INTERNAL)
// ============================================================

export const saveTranscript = internalMutation({
  args: {
    videoId: v.string(),
    text: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("transcripts")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    if (existing) return;
    await ctx.db.insert("transcripts", {
      videoId: args.videoId,
      status: args.status,
      processedAt: Date.now(),
    });
  },
});

export const updateVocabFromTranscript = internalMutation({
  args: {
    wordCounts: v.array(
      v.object({
        word: v.string(),
        count: v.number(),
      }),
    ),
  },
  handler: async (ctx, { wordCounts }) => {
    for (const { word, count } of wordCounts) {
      const existing = await ctx.db
        .query("vocabWords")
        .withIndex("by_word", (q) => q.eq("word", word))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          totalCount: existing.totalCount + count,
          videoCount: existing.videoCount + 1,
        });
      } else {
        await ctx.db.insert("vocabWords", {
          word,
          totalCount: count,
          videoCount: 1,
        });
      }
    }
  },
});

export const refreshVocabMeta = internalMutation({
  args: {
    incrementWords: v.optional(v.number()),
    incrementOccurrences: v.optional(v.number()),
    incrementProcessed: v.optional(v.number()),
    incrementWithTranscripts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("vocabMeta").first();

    if (existing && !args.incrementWords) {
      // Just touch lastUpdatedAt without full recalculation
      await ctx.db.patch(existing._id, { lastUpdatedAt: Date.now() });
      return;
    }

    if (existing && args.incrementWords !== undefined) {
      // Incremental update
      await ctx.db.patch(existing._id, {
        totalUniqueWords:
          existing.totalUniqueWords + (args.incrementWords ?? 0),
        totalWordOccurrences:
          existing.totalWordOccurrences + (args.incrementOccurrences ?? 0),
        totalVideosProcessed:
          existing.totalVideosProcessed + (args.incrementProcessed ?? 0),
        totalVideosWithTranscripts:
          existing.totalVideosWithTranscripts +
          (args.incrementWithTranscripts ?? 0),
        lastUpdatedAt: Date.now(),
      });
      return;
    }

    // Initial creation - use lightweight counts
    const totalVideos = (await ctx.db.query("videos").collect()).length;

    await ctx.db.insert("vocabMeta", {
      totalChannelVideos: totalVideos,
      totalVideosProcessed: 0,
      totalVideosWithTranscripts: 0,
      totalUniqueWords: 0,
      totalWordOccurrences: 0,
      lastUpdatedAt: Date.now(),
    });
  },
});

export const bulkInsertVideos = internalMutation({
  args: {
    videos: v.array(
      v.object({
        videoId: v.string(),
        title: v.string(),
        publishedAt: v.number(),
        thumbnailUrl: v.string(),
      }),
    ),
  },
  handler: async (ctx, { videos }) => {
    let inserted = 0;
    for (const video of videos) {
      const existing = await ctx.db
        .query("videos")
        .withIndex("by_videoId", (q) => q.eq("videoId", video.videoId))
        .first();
      if (!existing) {
        await ctx.db.insert("videos", { ...video, detectedAt: Date.now() });
        inserted++;
      }
    }
    return inserted;
  },
});

// ============================================================
// ACTIONS (INTERNAL)
// ============================================================

export const processUnprocessedVideos = internalAction({
  handler: async (ctx) => {
    const unprocessed = await ctx.runQuery(
      internal.vocab.getUnprocessedVideos,
      { limit: BATCH_SIZE },
    );

    if (unprocessed.length === 0) {
      return;
    }

    console.info(`Processing ${unprocessed.length} video transcripts`);

    for (const video of unprocessed) {
      try {
        const text = await fetchTranscriptText(video.videoId);

        if (text) {
          await ctx.runMutation(internal.vocab.saveTranscript, {
            videoId: video.videoId,
            text,
            status: "success",
          });

          const wordCounts = processWords(text);
          const wordArray = Array.from(wordCounts.entries()).map(
            ([word, count]) => ({ word, count }),
          );

          for (let i = 0; i < wordArray.length; i += WORD_BATCH_SIZE) {
            await ctx.runMutation(internal.vocab.updateVocabFromTranscript, {
              wordCounts: wordArray.slice(i, i + WORD_BATCH_SIZE),
            });
          }

          console.info(
            `✓ "${video.title}" — ${wordCounts.size} unique words`,
          );
        } else {
          await ctx.runMutation(internal.vocab.saveTranscript, {
            videoId: video.videoId,
            status: "no_captions",
          });
          console.info(`✗ No captions for "${video.title}"`);
        }

        // Small delay to avoid YouTube rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (err) {
        console.error(`Error processing ${video.videoId}:`, err);
        await ctx.runMutation(internal.vocab.saveTranscript, {
          videoId: video.videoId,
          status: "failed",
        });
      }
    }

    await ctx.runMutation(internal.vocab.refreshVocabMeta);
  },
});

export const backfillAllChannelVideos = internalAction({
  handler: async (ctx) => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const channelId =
      process.env.THEO_CHANNEL_ID ?? "UCbRP3c757lWg9M-U7TyEkXA";

    if (!apiKey) {
      console.error("YOUTUBE_API_KEY not set");
      return;
    }

    const playlistId = "UULF" + channelId.slice(2);
    let nextPageToken: string | undefined;
    let totalFetched = 0;
    let totalInserted = 0;

    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50${nextPageToken ? `&pageToken=${nextPageToken}` : ""}&key=${apiKey}`;

      const res = await fetch(url);
      if (!res.ok) {
        console.error(`YouTube API error: ${res.status}`);
        break;
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
        nextPageToken?: string;
      };

      const videos = (data.items ?? []).map((item) => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        publishedAt: new Date(item.snippet.publishedAt).getTime(),
        thumbnailUrl:
          item.snippet.thumbnails?.maxres?.url ??
          item.snippet.thumbnails?.high?.url ??
          item.snippet.thumbnails?.medium?.url ??
          "",
      }));

      const inserted = await ctx.runMutation(
        internal.vocab.bulkInsertVideos,
        { videos },
      );

      totalFetched += videos.length;
      totalInserted += inserted as number;
      nextPageToken = data.nextPageToken;

      console.info(
        `Fetched page: ${videos.length} videos (${totalFetched} total, ${totalInserted} new)`,
      );
    } while (nextPageToken);

    console.info(
      `Backfill complete: ${totalFetched} videos fetched, ${totalInserted} new`,
    );

    await ctx.runMutation(internal.vocab.refreshVocabMeta);
  },
});
// force redeploy 1775240173
