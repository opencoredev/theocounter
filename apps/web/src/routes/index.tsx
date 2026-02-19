import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@theocounter.com/backend/convex/_generated/api";
import { Counter } from "@/components/counter";
import { Celebration } from "@/components/celebration";
import { EmailSignup } from "@/components/email-signup";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "theocounter — how long since Theo posted?" },
      {
        name: "description",
        content:
          "A live counter tracking how long it's been since Theo (t3.gg) last posted on YouTube.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const latestVideo = useQuery(api.videos.getLatestVideo);
  const droughts = useQuery(api.videos.getDroughts);
  const viewerCount = useQuery(api.presence.getViewerCount);
  const latestVideos = useQuery(api.videos.getLatestVideos);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevVideoIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!latestVideo) return;
    const prevVideoId = prevVideoIdRef.current;
    prevVideoIdRef.current = latestVideo.videoId;
    if (prevVideoId !== undefined && prevVideoId !== latestVideo.videoId) {
      setShowCelebration(true);
    }
  }, [latestVideo]);

  if (latestVideo === undefined) {
    return (
      <div className="flex-1 flex flex-col justify-between py-8 sm:py-12 px-6 sm:px-10">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full animate-pulse">
            <div className="h-3 w-20 bg-white/[0.04] rounded mx-auto mb-8" />
            <div className="grid grid-cols-4 divide-x divide-white/[0.06]">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center justify-end pb-1 px-4 sm:px-8 gap-2">
                  <div className="h-[18vw] sm:h-[14vw] w-full bg-white/[0.04] rounded" />
                  <div className="h-3 w-8 bg-white/[0.04] rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="h-12 w-full max-w-2xl bg-white/[0.04] rounded-full" />
        </div>
      </div>
    );
  }

  if (latestVideo === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/30 font-mono text-sm">Waiting for first video...</p>
      </div>
    );
  }

  const mostRecentDroughtMs = droughts?.[0]?.durationMs ?? 0;

  return (
    <div className="flex-1 flex flex-col justify-between py-8 sm:py-12 px-6 sm:px-10">
      <div className="flex-1 flex items-center justify-center">
        {showCelebration ? (
          <Celebration
            video={{
              videoId: latestVideo.videoId,
              title: latestVideo.title,
              thumbnailUrl: latestVideo.thumbnailUrl,
              publishedAt: latestVideo.publishedAt,
            }}
            droughtDurationMs={mostRecentDroughtMs}
            onShowCounter={() => setShowCelebration(false)}
          />
        ) : (
          <Counter />
        )}
      </div>

      {latestVideos && latestVideos.length > 0 && (
        <div className="w-full max-w-2xl mx-auto pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {latestVideos.map((video) => (
              <a
                key={video._id}
                href={`https://youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white/[0.05] rounded-xl overflow-hidden hover:border-white/10 transition-colors flex flex-col"
              >
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="aspect-video object-cover w-full"
                />
                <p className="text-xs font-mono text-white/40 px-3 py-2 truncate">
                  {video.title}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-6 pt-10">
        <EmailSignup />
        {viewerCount !== undefined && viewerCount > 0 && (
          <p className="text-xs font-mono text-white/20 tracking-wide text-center">
            {viewerCount} watching
          </p>
        )}
      </div>
    </div>
  );
}