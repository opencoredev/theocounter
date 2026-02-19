import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Navbar() {
  return (
    <nav className="px-8 py-6 flex items-center justify-between">
      <Link
        to="/"
        className="text-sm font-mono text-white/40 tracking-widest uppercase hover:text-white/60 transition-colors flex-1"
      >
        theocounter
      </Link>
      <NavLink to="/">Counter</NavLink>
      <div className="flex-1 flex justify-end">
        <NavLink to="/droughts">Droughts</NavLink>
      </div>
    </nav>
  );
}

function NavLink({
  to,
  children,
}: {
  to: string;
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
    >
      {children}
    </Link>
  );
}
