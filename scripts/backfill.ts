#!/usr/bin/env bun
import { $ } from "bun";
import { resolve } from "path";

const backendDir = resolve(import.meta.dirname, "../packages/backend");

console.log("🎬 Fetching Theo's last 100 videos...");

await $`bunx convex run seed:seedHistoricalVideos`
  .cwd(backendDir)
  .env({ ...process.env, CONVEX_DEPLOYMENT: "dev:successful-bobcat-813" });

console.log("✅ Done!");
