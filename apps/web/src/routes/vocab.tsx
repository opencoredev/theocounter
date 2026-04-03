import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@theocounter.com/backend/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/vocab")({
  head: () => ({
    meta: [
      { title: "Vocab | theocounter" },
      {
        name: "description",
        content:
          "Every word Theo has ever said on YouTube, ranked by frequency.",
      },
    ],
  }),
  component: VocabPage,
});

// Stop words are ~50% of natural speech, so total spoken ≈ content words × 2
const STOP_WORD_MULTIPLIER = 2;
const WORDS_PER_NOVEL = 80_000;
const WORDS_PER_MINUTE_SPEAKING = 150;
const WORDS_PER_TWEET = 40;
const WORDS_PER_PAGE = 250;

function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function VocabPage() {
  const [search, setSearch] = useState("");
  const stats = useQuery(api.vocab.getVocabStats);
  const topWords = useQuery(api.vocab.getTopWordsSimple, { limit: 200 });

  // DEBUG: log query results to diagnose production issue
  if (typeof window !== "undefined") {
    console.log("[VOCAB]", {
      stats: stats === undefined ? "loading" : stats,
      topWordsCount: topWords === undefined ? "loading" : topWords.length,
      firstWord: topWords?.[0]?.word ?? "none",
    });
  }
  const searchResults = useQuery(
    api.vocab.searchWords,
    search.length >= 2 ? { searchTerm: search } : "skip",
  );

  const displayWords =
    search.length >= 2
      ? [...(searchResults ?? [])].sort((a, b) => b.totalCount - a.totalCount)
      : (topWords ?? []);

  if (topWords === undefined) return <Skeleton />;

  const topWord = topWords[0];

  // Fun analytics
  const estimatedTotalWords = stats
    ? stats.totalWordOccurrences * STOP_WORD_MULTIPLIER
    : 0;
  const novelEquivalent = estimatedTotalWords / WORDS_PER_NOVEL;
  const speakingHours = estimatedTotalWords / WORDS_PER_MINUTE_SPEAKING / 60;
  const tweetEquivalent = estimatedTotalWords / WORDS_PER_TWEET;
  const pageEquivalent = estimatedTotalWords / WORDS_PER_PAGE;

  return (
    <div className="flex-1 px-6 sm:px-10 py-8 sm:py-12 max-w-3xl mx-auto w-full">
      {/* Top word highlight */}
      {topWord && !search && (
        <div className="mb-8 border border-primary/20 bg-primary/[0.04] rounded-2xl p-6 sm:p-8">
          <p className="text-xs font-mono text-primary/60 tracking-widest uppercase mb-3">
            Most said word
          </p>
          <p className="font-mono text-5xl sm:text-6xl font-bold text-primary tabular-nums tracking-tight">
            &ldquo;{topWord.word}&rdquo;
          </p>
          <p className="text-xs font-mono text-white/30 mt-3 tracking-wide">
            {topWord.totalCount.toLocaleString()} times across{" "}
            {topWord.videoCount.toLocaleString()} videos
          </p>
        </div>
      )}

      {/* Stats row */}
      {stats && (
        <div className="flex flex-wrap gap-x-6 gap-y-3 mb-6">
          <StatBlock label="Videos" value={stats.totalVideosWithTranscripts.toLocaleString()} />
          <StatBlock label="Unique words" value={stats.totalUniqueWords.toLocaleString()} />
          <StatBlock label="Est. total spoken" value={formatBigNumber(estimatedTotalWords)} />
        </div>
      )}

      {/* Fun comparisons */}
      {stats && estimatedTotalWords > 0 && !search && (
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ComparisonCard
            value={novelEquivalent.toFixed(1)}
            label="novels worth of words"
            sublabel="~80K words each"
          />
          <ComparisonCard
            value={Math.round(speakingHours).toLocaleString()}
            label="hours of talking"
            sublabel="~150 wpm"
          />
          <ComparisonCard
            value={formatBigNumber(Math.round(pageEquivalent))}
            label="pages of text"
            sublabel="~250 words/page"
          />
          <ComparisonCard
            value={formatBigNumber(Math.round(tweetEquivalent))}
            label="tweets"
            sublabel="~40 words each"
          />
        </div>
      )}

      {/* Progress bar during backfill */}
      {stats &&
        stats.totalVideosProcessed < stats.totalChannelVideos && (
          <div className="mb-6">
            <div className="flex justify-between text-[10px] font-mono text-white/30 mb-1.5">
              <span>
                Analyzing {stats.totalVideosProcessed.toLocaleString()} of{" "}
                {stats.totalChannelVideos.toLocaleString()} videos...
              </span>
              <span>
                {Math.round(
                  (stats.totalVideosProcessed / stats.totalChannelVideos) * 100,
                )}
                %
              </span>
            </div>
            <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/40 rounded-full transition-all duration-1000"
                style={{
                  width: `${(stats.totalVideosProcessed / stats.totalChannelVideos) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search words..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-primary/30 transition-colors"
        />
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] font-mono text-white/15 mb-4 tracking-wide">
        Based on YouTube auto-captions — may not be 100% accurate
      </p>

      {/* Word table */}
      {displayWords.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm font-mono text-white/30">
            {search ? "No words found." : "No vocab data yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[2.5rem_1fr_5rem_4rem] gap-0 px-4 py-2 border-b border-white/[0.06]">
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                #
              </span>
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                Word
              </span>
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest text-right">
                Count
              </span>
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest text-right">
                Videos
              </span>
            </div>
            {displayWords.map((word, i) => (
              <div
                key={word._id}
                className={cn(
                  "grid grid-cols-[2.5rem_1fr_5rem_4rem] gap-0 px-4 py-3 border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.02]",
                  i === 0 && !search && "bg-primary/[0.03]",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-xs tabular-nums pt-px",
                    i === 0 && !search
                      ? "text-primary/60 font-bold"
                      : "text-white/20",
                  )}
                >
                  {search ? "\u2014" : i + 1}
                </span>
                <span
                  className={cn(
                    "font-mono text-sm font-bold",
                    i === 0 && !search ? "text-primary" : "text-white/80",
                  )}
                >
                  {word.word}
                </span>
                <span className="font-mono text-xs text-white/40 tabular-nums text-right pt-px">
                  {word.totalCount.toLocaleString()}
                </span>
                <span className="font-mono text-xs text-white/25 tabular-nums text-right pt-px">
                  {word.videoCount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {!search && displayWords.length >= 200 && (
            <p className="text-center mt-4 text-xs font-mono text-white/15 tracking-widest">
              Showing top 200 words
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-mono text-white/25 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-lg font-mono font-bold text-white/70 tabular-nums">
        {value}
      </p>
    </div>
  );
}

function ComparisonCard({
  value,
  label,
  sublabel,
}: {
  value: string;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="border border-white/[0.06] rounded-xl p-3 sm:p-4 bg-white/[0.01]">
      <p className="font-mono text-xl sm:text-2xl font-bold text-white/70 tabular-nums">
        {value}
      </p>
      <p className="text-[10px] font-mono text-white/30 mt-1 leading-tight">
        {label}
      </p>
      <p className="text-[9px] font-mono text-white/15 mt-0.5">{sublabel}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex-1 px-6 sm:px-10 py-8 sm:py-12 max-w-3xl mx-auto w-full animate-pulse">
      <div className="rounded-2xl border border-white/[0.06] p-6 sm:p-8 mb-8">
        <div className="h-3 w-32 bg-white/[0.04] rounded mb-4" />
        <div className="h-14 w-40 bg-white/[0.04] rounded mb-3" />
        <div className="h-3 w-52 bg-white/[0.04] rounded" />
      </div>
      <div className="flex gap-6 mb-6">
        <div className="h-8 w-16 bg-white/[0.04] rounded" />
        <div className="h-8 w-16 bg-white/[0.04] rounded" />
        <div className="h-8 w-20 bg-white/[0.04] rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-white/[0.06] rounded-xl p-4">
            <div className="h-7 w-12 bg-white/[0.04] rounded mb-2" />
            <div className="h-3 w-20 bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>
      <div className="h-12 w-full bg-white/[0.04] rounded-xl mb-6" />
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[2.5rem_1fr_5rem_4rem] gap-0 px-4 py-3 border-b border-white/[0.04] last:border-0"
          >
            <div className="h-4 w-4 bg-white/[0.04] rounded" />
            <div className="h-4 w-24 bg-white/[0.04] rounded" />
            <div className="h-4 w-12 bg-white/[0.04] rounded ml-auto" />
            <div className="h-4 w-8 bg-white/[0.04] rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
