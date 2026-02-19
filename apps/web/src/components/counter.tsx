import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@theocounter.com/backend/convex/_generated/api";
import { cn } from "@/lib/utils";

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function Counter() {
  const video = useQuery(api.videos.getLatestVideo);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (video === undefined) {
    return <CounterSkeleton />;
  }

  if (video === null) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Waiting for first video detection...
      </div>
    );
  }

  const elapsed = now - video.publishedAt;
  const { days, hours, minutes, seconds } = formatDuration(Math.max(0, elapsed));

  return (
    <div className="w-full">
      <p className="text-xs font-mono tracking-[0.4em] uppercase text-white/20 mb-8 text-center">
        It has been
      </p>
      <div className="grid grid-cols-4 divide-x divide-white/[0.06] tabular-nums">
        <TimeUnit value={days} label="days" />
        <TimeUnit value={hours} label="hrs" />
        <TimeUnit value={minutes} label="min" />
        <TimeUnit value={seconds} label="sec" />
      </div>
      <p className="mt-6 text-sm font-mono text-white/25 tracking-wide text-center">
        since{" "}
        <a
          href="https://www.youtube.com/@t3dotgg"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/40 hover:text-white/60 transition-colors underline underline-offset-4 decoration-white/20"
        >
          Theo
        </a>
        {" "}posted
      </p>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-end pb-1 px-4 sm:px-8">
      <span
        className={cn(
          "font-mono font-bold tracking-tighter leading-none text-foreground",
          "text-[18vw] sm:text-[14vw] md:text-[12vw]",
          "tabular-nums [font-variant-numeric:tabular-nums]",
        )}
      >
        {pad(value)}
      </span>
      <span className="mt-2 text-xs font-mono tracking-[0.3em] uppercase text-white/30">
        {label}
      </span>
    </div>
  );
}

function CounterSkeleton() {
  return (
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
      <div className="mt-6 h-4 w-48 bg-white/[0.04] rounded mx-auto" />
    </div>
  );
}
