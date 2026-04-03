import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

export function Navbar() {
  return (
    <nav className="px-6 sm:px-8 py-6 flex items-center gap-4">
      <Link
        to="/"
        className="text-sm font-mono text-white/40 tracking-widest uppercase hover:text-white/60 transition-colors"
        onClick={() => track("nav_home")}
      >
        theocounter
      </Link>

      <div className="flex-1 flex items-center justify-center gap-6 sm:gap-8">
        <NavLink to="/about" event="nav_about">About</NavLink>
        <NavLink to="/vocab" event="nav_vocab">Vocab</NavLink>
        <NavLink to="/history" event="nav_history">History</NavLink>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="https://x.com/leodev"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("nav_x")}
          className="text-white/20 hover:text-white/50 transition-colors"
          aria-label="X (Twitter)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        <a
          href="https://github.com/opencoredev/theocounter"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("nav_github")}
          className="text-white/20 hover:text-white/50 transition-colors"
          aria-label="GitHub"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
              <path fill="currentColor" d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5c.08-1.25-.27-2.48-1-3.5c.28-1.15.28-2.35 0-3.5c0 0-1 0-3 1.5c-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5c-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"/>
              <path fill="currentColor" d="M9 18c-4.51 2-5-2-7-2"/>
            </g>
          </svg>
        </a>
      </div>
    </nav>
  );
}

function NavLink({
  to,
  event,
  children,
}: {
  to: string;
  event: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "text-sm font-mono tracking-wide text-white/30 hover:text-white/60 transition-colors",
      )}
      activeProps={{
        className: "text-primary",
      }}
      onClick={() => track(event)}
    >
      {children}
    </Link>
  );
}
