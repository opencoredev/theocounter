# theocounter.com

*How long has it been since Theo posted? Too long. Probably.*

A live website tracking the time since [t3dotgg](https://youtube.com/@t3dotgg) last uploaded to YouTube. It polls every minute, shows a dramatic countdown, logs every drought in history, and emails you the moment he's back.

Open source. Dark mode only. Built for fun.

---

## Features

- Live counter (days / hrs / min / sec) since last upload
- Latest 3 video thumbnails with titles
- History page ranking every drought by length
- Email signup with double opt-in confirmation
- Live viewer count showing who else is suffering with you

## Stack

- **Frontend**: React + TanStack Start (SSR), TailwindCSS, Vercel
- **Backend**: Convex (realtime DB, serverless functions, cron jobs)
- **Email**: Resend
- **Spam protection**: Cloudflare Turnstile
- **Analytics**: OneDollarStats
- **Monorepo**: Turborepo + Bun

## Project structure

```
theocounter.com/
├── apps/web/          # React frontend (TanStack Start)
└── packages/backend/  # Convex backend (functions, schema, crons)
```

## Running locally

You'll need Bun and a Convex account.

```bash
git clone https://github.com/opencoredev/theocounter
cd theocounter.com
bun install
bun run dev:setup   # sets up your Convex dev deployment
bun run dev
```

Add these to `apps/web/.env.local`:

```
VITE_CONVEX_URL=https://<your-dev-deployment>.convex.cloud
VITE_TURNSTILE_SITE_KEY=<your-key>
```

Set Convex env vars via `bunx convex env set`:

```
YOUTUBE_API_KEY
RESEND_API_KEY
RESEND_AUDIENCE_ID
TURNSTILE_SECRET_KEY
```

## Deploying

Frontend deploys to Vercel:

```bash
bunx vercel --prod
```

Backend deploys to Convex from `packages/backend/`:

```bash
bunx convex deploy
```

## Contributing

PRs welcome. Keep it simple, keep it dark.

