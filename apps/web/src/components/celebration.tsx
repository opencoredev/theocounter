import { useEffect } from "react";
import confetti from "canvas-confetti";

type Video = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: number;
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0 && days === 0) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);

  return parts.join(", ");
}

export function Celebration({
  video,
  droughtDurationMs,
  onShowCounter,
}: {
  video: Video;
  droughtDurationMs: number;
  onShowCounter: () => void;
}) {
  useEffect(() => {
    const lastSeenVideoId = localStorage.getItem("lastSeenVideoId");

    if (lastSeenVideoId !== video.videoId) {
      localStorage.setItem("lastSeenVideoId", video.videoId);

      const fire = (opts: confetti.Options) => confetti({ ...opts, disableForReducedMotion: true });

      fire({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => fire({ particleCount: 80, spread: 100, origin: { y: 0.5, x: 0.2 } }), 200);
      setTimeout(() => fire({ particleCount: 80, spread: 100, origin: { y: 0.5, x: 0.8 } }), 400);
    }

    const autoTransition = setTimeout(onShowCounter, 5000);
    return () => clearTimeout(autoTransition);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.videoId]);

  const droughtText =
    droughtDurationMs > 0 ? `After ${formatDuration(droughtDurationMs)}` : "A new video!";

  return (
    <div className="text-center w-full max-w-2xl mx-auto">
      <p className="text-xs font-mono tracking-[0.4em] uppercase text-white/30 mb-3">
        {droughtText}
      </p>
      <h1 className="text-5xl sm:text-7xl font-mono font-bold text-foreground tracking-tight mb-8">
        HE POSTED! 🎉
      </h1>

      <div className="relative w-full mb-6 border border-white/[0.06] rounded-2xl overflow-hidden" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={`https://www.youtube.com/embed/${video.videoId}?autoplay=0&rel=0`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>

      <p className="text-sm font-mono text-white/50 mb-2">{video.title}</p>
      <a
        href={`https://www.youtube.com/watch?v=${video.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-mono text-white/25 hover:text-white/50 transition-colors underline underline-offset-4"
      >
        Watch on YouTube →
      </a>
      <div className="mt-8 pt-6 border-t border-white/[0.06]">
        <button
          onClick={onShowCounter}
          className="text-xs font-mono text-white/20 hover:text-white/50 transition-colors"
        >
          see how long it's been since last video →
        </button>
      </div>
    </div>
  );
}
