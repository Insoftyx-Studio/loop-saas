import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileCheck2,
  Inbox,
  ReceiptText,
  Megaphone,
  Contact,
  LogOut,
  KeyRound,
  Menu,
  X,
  Loader2,
} from "lucide-react";
import { Logo } from "../../components/Logo";
import { ThemeToggle } from "../../components/ThemeToggle";
import { Avatar } from "../../components/ui/primitives";
import { projectProgress } from "../../lib/store";
import { useAuth } from "../../lib/auth";
import { getOverview } from "../../lib/api";
import { cn } from "../../lib/cn";
import { easeOut } from "../../components/motion";

const nav = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/clients", label: "Clients", icon: Users },
  { to: "/app/accounts", label: "Accounts", icon: Contact },
  { to: "/app/projects", label: "Projects", icon: FolderKanban },
  { to: "/app/deliverables", label: "Deliverables", icon: FileCheck2 },
  { to: "/app/requests", label: "Requests", icon: Inbox },
  { to: "/app/invoices", label: "Invoices", icon: ReceiptText },
  { to: "/app/updates", label: "Updates", icon: Megaphone },
];

function NavItems({ onNavigate, counts }: { onNavigate?: () => void; counts: Record<string, number> }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] transition-colors duration-150",
              isActive
                ? "bg-sunk font-medium text-ink"
                : "text-ink-mute hover:bg-sunk/60 hover:text-ink",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="agency-nav-active"
                  className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                  transition={{ duration: 0.25, ease: easeOut }}
                />
              )}
              <n.icon size={17} className="shrink-0" />
              <span className="flex-1">{n.label}</span>
              {counts[n.to] > 0 && (
                <span className="tnum rounded-full bg-accent/12 px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                  {counts[n.to]}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  const initials =
    (profile?.full_name || "?")
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  return (
    <div className="flex items-center gap-2 rounded-md border border-edge bg-raised p-2.5">
      <Avatar initials={initials} size={34} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{profile?.full_name}</p>
        <p className="truncate text-[11.5px] text-ink-faint">Agency admin</p>
      </div>
      <button
        aria-label="Change password"
        title="Change password"
        onClick={() => nav("/change-password")}
        className="grid h-8 w-8 place-items-center rounded text-ink-faint transition-colors hover:bg-sunk hover:text-ink"
      >
        <KeyRound size={16} />
      </button>
      <button
        aria-label="Sign out"
        title="Sign out"
        onClick={() => {
          signOut().then(() => nav("/login"));
        }}
        className="grid h-8 w-8 place-items-center rounded text-ink-faint transition-colors hover:bg-sunk hover:text-ink"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}

export function AgencyShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sidebar badges reflect REAL data (pending approvals / open requests) via
  // the agency_overview RPC — not the legacy mock store. Refetched on route
  // change so, e.g., approving a deliverable or closing a request updates the
  // count when you navigate back.
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    getOverview()
      .then((o) => {
        if (!cancelled)
          setCounts({ "/app/deliverables": o.pending_approvals, "/app/requests": o.open_requests });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col justify-between border-r border-edge px-4 py-5 lg:flex">
        <div>
          <div className="px-2 pb-6">
            <Logo />
          </div>
          <NavItems counts={counts} />
        </div>
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: easeOut }}
              className="fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col justify-between border-r border-edge bg-paper px-4 py-5 lg:hidden"
            >
              <div>
                <div className="flex items-center justify-between px-2 pb-6">
                  <Logo />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded text-ink-mute hover:bg-sunk"
                  >
                    <X size={18} />
                  </button>
                </div>
                <NavItems counts={counts} onNavigate={() => setMobileOpen(false)} />
              </div>
              <SidebarFooter />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-edge bg-paper/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-md border border-edge text-ink-mute lg:hidden"
          >
            <Menu size={18} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {/* Keyed motion.div (no AnimatePresence "wait") so each page reliably
             replays its initial→animate fade without the exit-transition race
             that could leave the content stuck at opacity 0. A local Suspense
             keeps the sidebar visible while a lazy page chunk loads. */}
          <motion.div
            key={location.pathname}
            initial={{ y: 8 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.28, ease: easeOut }}
            className="mx-auto max-w-6xl"
          >
            <Suspense fallback={<div className="grid place-items-center py-24"><Loader2 className="animate-spin text-ink-mute" /></div>}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

/* re-export for convenience */
export { projectProgress };
