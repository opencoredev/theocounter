import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { api } from "@theocounter.com/backend/convex/_generated/api";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/confirm")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [{ title: "Confirm subscription | theocounter" }],
  }),
  component: ConfirmPage,
});

type Status = "loading" | "confirmed" | "already_confirmed" | "expired" | "invalid" | "no_token";

function ConfirmPage() {
  const { token } = Route.useSearch();
  const confirmSubscription = useAction(api.subscribers.confirmSubscription);
  const [status, setStatus] = useState<Status>(token ? "loading" : "no_token");

  useEffect(() => {
    if (!token) return;
    confirmSubscription({ token })
      .then((res) => setStatus(res.status as Status))
      .catch(() => setStatus("invalid"));
  }, [token, confirmSubscription]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      {status === "loading" && (
        <>
          <p className="font-mono text-sm text-white/30 animate-pulse">confirming...</p>
        </>
      )}

      {status === "confirmed" && (
        <>
          <p className="font-mono text-2xl font-bold text-primary mb-3">you&apos;re in.</p>
          <p className="font-sans text-sm text-white/40 mb-8">
            we&apos;ll email you the moment theo posts.
          </p>
          <Link to="/" className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors">
            ← back to the counter
          </Link>
        </>
      )}

      {status === "already_confirmed" && (
        <>
          <p className="font-mono text-lg font-bold text-white/70 mb-3">already confirmed.</p>
          <p className="font-sans text-sm text-white/40 mb-8">you&apos;re already on the list.</p>
          <Link to="/" className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors">
            ← back to the counter
          </Link>
        </>
      )}

      {status === "expired" && (
        <>
          <p className="font-mono text-lg font-bold text-white/70 mb-3">link expired.</p>
          <p className="font-sans text-sm text-white/40 mb-8">
            confirmation links expire after 24 hours. sign up again to get a new one.
          </p>
          <Link to="/" className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors">
            ← back to the counter
          </Link>
        </>
      )}

      {(status === "invalid" || status === "no_token") && (
        <>
          <p className="font-mono text-lg font-bold text-white/70 mb-3">link not valid.</p>
          <p className="font-sans text-sm text-white/40 mb-8">
            this confirmation link doesn&apos;t look right.
          </p>
          <Link to="/" className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors">
            ← back to the counter
          </Link>
        </>
      )}
    </div>
  );
}
