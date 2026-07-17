import { Suspense, lazy, type ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./lib/auth";

// Eager: tiny, first-paint routes
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import { AgencyShell } from "./pages/agency/AgencyShell";

// A fresh deploy renames chunk files, so a tab left open across a deploy will
// 404 on the old hashed filename the next time it navigates to a lazy route.
// Retry once with a full reload (which fetches the new index.html + manifest)
// instead of leaving the click looking dead until the user refreshes by hand.
function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  const RELOAD_KEY = "loop-chunk-retry";
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {}); // reload takes over
      }
      sessionStorage.removeItem(RELOAD_KEY);
      throw err;
    }
  });
}

// Lazy: split the dashboard + portal into separate chunks
const ChangePassword = lazyWithRetry(() => import("./pages/ChangePassword"));
const Overview = lazyWithRetry(() => import("./pages/agency/Overview"));
const Clients = lazyWithRetry(() => import("./pages/agency/Clients"));
const ClientDetail = lazyWithRetry(() => import("./pages/agency/ClientDetail"));
const Projects = lazyWithRetry(() => import("./pages/agency/Projects"));
const Deliverables = lazyWithRetry(() => import("./pages/agency/Deliverables"));
const Requests = lazyWithRetry(() => import("./pages/agency/Requests"));
const Invoices = lazyWithRetry(() => import("./pages/agency/Invoices"));
const Updates = lazyWithRetry(() => import("./pages/agency/Updates"));
const Accounts = lazyWithRetry(() => import("./pages/agency/Accounts"));
const PortalReal = lazyWithRetry(() => import("./pages/client/PortalReal"));

function Loading() {
  return <div className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-ink-mute" /></div>;
}

function RequireAgency({ children }: { children: React.ReactNode }) {
  const { loading, session, profile } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <Loading />;
  if (profile.role === "client") return <Navigate to="/portal" replace />;
  return <>{children}</>;
}
function RequireClient({ children }: { children: React.ReactNode }) {
  const { loading, session, profile } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <Loading />;
  if (profile.role !== "client") return <Navigate to="/app" replace />;
  return <>{children}</>;
}
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  // NOTE: no route-level <AnimatePresence mode="wait"> here. Wrapping <Routes>
  // in a "wait" transition races with the <Navigate> redirects the route
  // guards fire on logout/auth changes — the redirect lands mid-exit and
  // AnimatePresence ends up with no child mounted, blanking #root until a
  // manual reload. Routes render synchronously; pages keep their own
  // initial/animate fade-ins.
  return (
    <div className="grain min-h-screen">
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />

          <Route path="/app" element={<RequireAgency><AgencyShell /></RequireAgency>}>
            <Route index element={<Overview />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="projects" element={<Projects />} />
            <Route path="deliverables" element={<Deliverables />} />
            <Route path="requests" element={<Requests />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="updates" element={<Updates />} />
          </Route>

          <Route path="/portal/*" element={<RequireClient><PortalReal /></RequireClient>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
