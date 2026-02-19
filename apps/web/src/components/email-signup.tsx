import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { api } from "@theocounter.com/backend/convex/_generated/api";
import { track } from "@/lib/analytics";

export function EmailSignup() {
  const subscribe = useAction(api.subscribers.subscribe);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const pendingSubmit = useRef(false);

  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function doSubmit(t: string) {
    setStatus("loading");
    try {
      await subscribe({ email, turnstileToken: t });
      track("signup");
      setStatus("success");
      setEmail("");
      setToken(null);
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setToken(null);
      turnstileRef.current?.reset();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      pendingSubmit.current = true;
      setStatus("loading");
      return;
    }
    await doSubmit(token);
  }

  async function handleTurnstileSuccess(t: string) {
    setToken(t);
    if (pendingSubmit.current) {
      pendingSubmit.current = false;
      await doSubmit(t);
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-4">
        <p className="text-sm font-mono text-primary">check your email</p>
        <p className="text-xs font-mono text-white/30 mt-1">
          we sent you a confirmation link. click it and you&apos;re in.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex w-full rounded-full border border-white/10 bg-white/[0.03] overflow-hidden p-1">
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="flex-1 bg-transparent px-6 py-3 text-sm font-mono text-white placeholder:text-white/20 outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-mono font-medium disabled:opacity-50 transition-opacity"
        >
          {status === "loading" ? "..." : "Notify me"}
        </button>
      </form>

      {status === "error" && (
        <p className="text-xs font-mono text-destructive">{errorMessage}</p>
      )}

      <Turnstile
        ref={turnstileRef}
        siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY as string}
        options={{ execution: "render", appearance: "interaction-only" }}
        onSuccess={handleTurnstileSuccess}
        onExpire={() => { setToken(null); turnstileRef.current?.reset(); }}
        onError={() => { setToken(null); turnstileRef.current?.reset(); }}
      />
    </div>
  );
}
