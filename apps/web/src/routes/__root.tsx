import { ConvexProvider, ConvexReactClient } from "convex/react";
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { Navbar } from '@/components/navbar'
import { ErrorBoundary } from '@/components/error-boundary'
import { usePresence } from '@/hooks/use-presence'

import appCss from '../styles.css?url'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'theocounter — how long since Theo posted?' },
      { name: 'description', content: 'A live counter tracking how long it\'s been since Theo (t3.gg) last posted on YouTube.' },
      { property: 'og:title', content: 'theocounter — how long since Theo posted?' },
      { property: 'og:description', content: 'A live counter tracking how long it\'s been since Theo (t3.gg) last posted on YouTube.' },
      { property: 'og:image', content: 'https://theocounter.com/og-img.png' },
      { property: 'og:url', content: 'https://theocounter.com' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'theocounter — how long since Theo posted?' },
      { name: 'twitter:description', content: 'A live counter tracking how long it\'s been since Theo (t3.gg) last posted on YouTube.' },
      { name: 'twitter:image', content: 'https://theocounter.com/og-img.png' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'icon', href: '/logo192.png', type: 'image/png', sizes: '192x192' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
  }),

  component: RootLayout,
  shellComponent: RootDocument,
})

function PresenceTracker() {
  usePresence();
  return null;
}

function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <PresenceTracker />
      <div className="m-4 sm:m-6 h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] overflow-y-auto border border-white/[0.08] rounded-[2rem] flex flex-col bg-background">
        <Navbar />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
    </ConvexProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script defer src="https://assets.onedollarstats.com/stonks.js" />
      </head>
      <body>
        <noscript>This site requires JavaScript to work.</noscript>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
