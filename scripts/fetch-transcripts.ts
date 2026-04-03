#!/usr/bin/env bun
/**
 * Local transcript fetcher. Runs on your machine (not blocked by YouTube's
 * cloud IP detection) and sends transcripts to Convex.
 *
 * Usage:
 *   bun scripts/fetch-transcripts.ts           # Process 50 videos
 *   bun scripts/fetch-transcripts.ts 200       # Process 200 videos
 */

const limit = parseInt(process.argv[2] || "50");
const CONVEX_URL =
  process.env.CONVEX_URL ?? "https://amiable-marmot-44.convex.cloud";

// ---- YouTube transcript fetching ----

const INNERTUBE_URL =
  "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const ANDROID_VERSION = "20.10.38";
const ANDROID_UA = `com.google.android.youtube/${ANDROID_VERSION} (Linux; U; Android 14)`;
const WEB_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36";

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, d: string) =>
      String.fromCodePoint(parseInt(d, 10)),
    );
}

function parseTranscriptXml(xml: string): string | null {
  const texts: string[] = [];
  let match;
  const pRegex = /<p\s+t="\d+"\s+d="\d+"[^>]*>([\s\S]*?)<\/p>/g;
  while ((match = pRegex.exec(xml)) !== null) {
    const inner = match[1];
    let text = "";
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
    let sMatch;
    while ((sMatch = sRegex.exec(inner)) !== null) text += sMatch[1];
    if (!text) text = inner.replace(/<[^>]+>/g, "");
    text = decodeEntities(text).trim();
    if (text) texts.push(text);
  }
  if (texts.length === 0) {
    const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/g;
    while ((match = textRegex.exec(xml)) !== null) {
      const text = decodeEntities(match[1]).replace(/\n/g, " ").trim();
      if (text) texts.push(text);
    }
  }
  return texts.length > 0 ? texts.join(" ") : null;
}

type Track = { baseUrl: string; languageCode: string };

async function fetchTranscript(videoId: string): Promise<string | null> {
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
    if (!res.ok) return null;
    const data = (await res.json()) as {
      captions?: {
        playerCaptionsTracklistRenderer?: { captionTracks?: Track[] };
      };
    };
    const tracks =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks?.length) return null;
    const track =
      tracks.find((t) => t.languageCode === "en") ??
      tracks.find((t) => t.languageCode?.startsWith("en")) ??
      tracks[0];
    if (!track?.baseUrl) return null;
    const tRes = await fetch(track.baseUrl, {
      headers: { "User-Agent": WEB_UA },
    });
    if (!tRes.ok) return null;
    return parseTranscriptXml(await tRes.text());
  } catch {
    return null;
  }
}

// ---- Stop words ----

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","as","into","about","between","through","during","above","below","up",
  "down","out","off","over","under","i","me","my","mine","myself","we","us",
  "our","ours","ourselves","you","your","yours","yourself","yourselves","he",
  "him","his","himself","she","her","hers","herself","it","its","itself","they",
  "them","their","theirs","themselves","am","is","are","was","were","be","been",
  "being","have","has","had","having","do","does","did","doing","will","would",
  "could","should","can","may","might","shall","must","this","that","these",
  "those","what","which","who","whom","whose","where","when","how","why","not",
  "no","nor","if","than","because","while","although",
]);

function processWords(
  text: string,
): Array<{ word: string; count: number }> {
  const words = text
    .toLowerCase()
    .replace(/\[.*?\]/g, " ")
    .replace(/[^a-z'\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
  return Array.from(counts.entries()).map(([word, count]) => ({ word, count }));
}

// ---- Convex helpers ----

const CONVEX_HEADERS = {
  "Content-Type": "application/json",
  "Convex-Client": "actions-1.31.6",
};

async function convexQuery(fn: string, args: object) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: CONVEX_HEADERS,
    body: JSON.stringify({ path: fn, args, format: "json" }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex query ${fn} failed (${res.status}): ${text}`);
  }
  const json = await res.json() as { value: unknown; status: string };
  if (json.status !== "success") {
    throw new Error(`Convex query ${fn} returned status: ${json.status}`);
  }
  return json.value;
}

async function convexMutation(fn: string, args: object) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: CONVEX_HEADERS,
    body: JSON.stringify({ path: fn, args, format: "json" }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex mutation ${fn} failed (${res.status}): ${text}`);
  }
  const json = await res.json() as { status: string };
  if (json.status !== "success") {
    throw new Error(`Convex mutation ${fn} returned status: ${json.status}`);
  }
}

// ---- Main ----

console.log(`Fetching up to ${limit} unprocessed videos...\n`);

const unprocessed = (await convexQuery("vocab:listUnprocessedVideos", {
  limit,
})) as Array<{ videoId: string; title: string }>;

if (unprocessed.length === 0) {
  console.log("All videos have been processed!");
  process.exit(0);
}

console.log(`Found ${unprocessed.length} unprocessed videos\n`);

let success = 0;
let noCaption = 0;

for (let i = 0; i < unprocessed.length; i++) {
  const video = unprocessed[i];
  const progress = `[${i + 1}/${unprocessed.length}]`;

  const text = await fetchTranscript(video.videoId);

  if (text) {
    const wordCounts = processWords(text);

    // Ingest via public mutation (chunks of 300 to stay within limits)
    const CHUNK = 300;
    for (let j = 0; j < wordCounts.length; j += CHUNK) {
      const isFirst = j === 0;
      await convexMutation("vocab:ingestTranscript", {
        videoId: video.videoId,
        text: isFirst ? text : undefined,
        status: "success",
        wordCounts: wordCounts.slice(j, j + CHUNK),
      });
    }

    if (wordCounts.length === 0) {
      await convexMutation("vocab:ingestTranscript", {
        videoId: video.videoId,
        text,
        status: "success",
      });
    }

    console.log(
      `${progress} ✓ "${video.title}" (${wordCounts.length} words)`,
    );
    success++;
  } else {
    await convexMutation("vocab:ingestTranscript", {
      videoId: video.videoId,
      status: "no_captions",
    });
    console.log(`${progress} ✗ "${video.title}" (no captions)`);
    noCaption++;
  }

  // Small delay to be nice to YouTube
  if (i < unprocessed.length - 1) {
    await new Promise((r) => setTimeout(r, 800));
  }
}

// Stats are now updated incrementally per ingestTranscript call

console.log(`
Done!
  ✓ ${success} transcripts fetched
  ✗ ${noCaption} no captions
`);
