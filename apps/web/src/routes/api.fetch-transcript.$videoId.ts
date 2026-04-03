import { createFileRoute } from "@tanstack/react-router";

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
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)),
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

type CaptionTrack = { baseUrl: string; languageCode: string };

async function fetchTranscript(videoId: string): Promise<string | null> {
  // Strategy 1: InnerTube Android API
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
        captions?: {
          playerCaptionsTracklistRenderer?: {
            captionTracks?: CaptionTrack[];
          };
        };
      };
      const tracks =
        data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks && tracks.length > 0) {
        const track =
          tracks.find((t) => t.languageCode === "en") ??
          tracks.find((t) => t.languageCode?.startsWith("en")) ??
          tracks[0];
        if (track?.baseUrl) {
          const tRes = await fetch(track.baseUrl, {
            headers: { "User-Agent": WEB_UA },
          });
          if (tRes.ok) {
            const text = parseTranscriptXml(await tRes.text());
            if (text) return text;
          }
        }
      }
    }
  } catch {
    /* fall through */
  }

  // Strategy 2: Web page scrape
  try {
    const pageRes = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      { headers: { "Accept-Language": "en-US,en;q=0.9", "User-Agent": WEB_UA } },
    );
    if (!pageRes.ok) return null;
    const html = await pageRes.text();
    if (html.includes('class="g-recaptcha"')) return null;

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
        if (depth === 0) { end = i + 1; break; }
      }
    }
    const player = JSON.parse(html.slice(jsonStart, end)) as {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: CaptionTrack[];
        };
      };
    };
    const tracks =
      player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
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

export const Route = createFileRoute("/api/fetch-transcript/$videoId")({
  server: {
    handlers: {
      GET: async ({
        params,
      }: {
        request: Request;
        params: { videoId: string };
      }) => {
        const { videoId } = params;
        if (!videoId || videoId.length !== 11) {
          return Response.json({ error: "Invalid videoId" }, { status: 400 });
        }

        const text = await fetchTranscript(videoId);
        if (!text) {
          return Response.json(
            { error: "No transcript found" },
            { status: 404 },
          );
        }
        return Response.json({ text });
      },
    },
  },
});
