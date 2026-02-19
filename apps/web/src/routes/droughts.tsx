import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@theocounter.com/backend/convex/_generated/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/droughts")({
  head: () => ({
    meta: [{ title: "Drought History | theocounter" }],
  }),
  component: DroughtsPage,
});

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days === 0 && minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push("< 1m");
  return parts.join(" ");
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DroughtsPage() {
  const droughts = useQuery(api.videos.getDroughts);

  if (droughts === undefined) return <Skeleton />;

  if (droughts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm font-mono text-white/30">No droughts yet.</p>
      </div>
    );
  }

  const sorted = [...droughts].sort((a, b) => b.durationMs - a.durationMs);
  const longest = sorted[0];
  const avgMs = droughts.reduce((sum, d) => sum + d.durationMs, 0) / droughts.length;

  return (
    <div className="flex-1 px-6 sm:px-10 py-8 sm:py-12 max-w-3xl mx-auto w-full">
      <div className="mb-8 border border-primary/20 bg-primary/[0.04] rounded-2xl p-6 sm:p-8">
        <p className="text-xs font-mono text-primary/60 tracking-widest uppercase mb-3">
          Longest drought on record
        </p>
        <p className="font-mono text-5xl sm:text-6xl font-bold text-primary tabular-nums tracking-tight">
          {formatDuration(longest.durationMs)}
        </p>
        <p className="text-xs font-mono text-white/30 mt-3 tracking-wide">
          {formatDate(longest.startTime)} → {formatDate(longest.endTime)}
        </p>
      </div>

      <div className="flex gap-6 mb-6">
        <div>
          <p className="text-xs font-mono text-white/25 uppercase tracking-widest mb-1">Total</p>
          <p className="text-lg font-mono font-bold text-white/70 tabular-nums">{droughts.length}</p>
        </div>
        <div>
          <p className="text-xs font-mono text-white/25 uppercase tracking-widest mb-1">Average</p>
          <p className="text-lg font-mono font-bold text-white/70 tabular-nums">{formatDuration(avgMs)}</p>
        </div>
      </div>

      <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_1fr] gap-0 px-4 py-2 border-b border-white/[0.06]">
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">#</span>
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Duration</span>
          <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Period</span>
        </div>
        {sorted.map((drought, i) => (
          <div
            key={drought._id}
            className={cn(
              "grid grid-cols-[2rem_1fr_1fr] gap-0 px-4 py-3 border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.02]",
              i === 0 && "bg-primary/[0.03]",
            )}
          >
            <span className={cn(
              "font-mono text-xs tabular-nums pt-px",
              i === 0 ? "text-primary/60 font-bold" : "text-white/20",
            )}>
              {i + 1}
            </span>
            <span className={cn(
              "font-mono text-sm font-bold tabular-nums",
              i === 0 ? "text-primary" : "text-white/80",
            )}>
              {formatDuration(drought.durationMs)}
            </span>
            <span className="font-mono text-xs text-white/30 tabular-nums pt-px">
              {formatDate(drought.startTime)} → {formatDate(drought.endTime)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex-1 px-6 sm:px-10 py-8 sm:py-12 max-w-3xl mx-auto w-full animate-pulse">
      <div className="rounded-2xl border border-white/[0.06] p-6 sm:p-8 mb-8">
        <div className="h-3 w-40 bg-white/[0.04] rounded mb-4" />
        <div className="h-14 w-48 bg-white/[0.04] rounded mb-3" />
        <div className="h-3 w-56 bg-white/[0.04] rounded" />
      </div>
      <div className="flex gap-6 mb-6">
        <div className="h-8 w-16 bg-white/[0.04] rounded" />
        <div className="h-8 w-20 bg-white/[0.04] rounded" />
      </div>
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="grid grid-cols-[2rem_1fr_1fr] gap-0 px-4 py-3 border-b border-white/[0.04] last:border-0">
            <div className="h-4 w-4 bg-white/[0.04] rounded" />
            <div className="h-4 w-16 bg-white/[0.04] rounded" />
            <div className="h-4 w-32 bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
