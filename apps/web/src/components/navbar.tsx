import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

export function Navbar() {
  return (
    <nav className="px-8 py-6 flex items-center justify-between">
      <Link
        to="/"
        className="text-sm font-mono text-white/40 tracking-widest uppercase hover:text-white/60 transition-colors flex-1"
        onClick={() => track("nav_home")}
      >
        theocounter
      </Link>
      <NavLink to="/about" event="nav_about">About</NavLink>
      <div className="flex-1 flex justify-end items-center gap-4">
        <NavLink to="/history" event="nav_history">History</NavLink>
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
