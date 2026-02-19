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

export default crons;
