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
      { title: 'theocounter' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
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
