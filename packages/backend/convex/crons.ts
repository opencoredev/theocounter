import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check youtube",
  { seconds: 30 },
  internal.youtube.checkForNewVideo,
);

crons.interval(
  "cleanup stale presence",
  { minutes: 2 },
  internal.presence.deleteStale,
);

// Transcript processing is handled by local/CI scripts since YouTube
// blocks cloud server IPs. The cron will be re-enabled once a working
// proxy is available.
// crons.interval(
//   "process video transcripts",
//   { minutes: 2 },
//   internal.vocab.processUnprocessedVideos,
// );

export default crons;
