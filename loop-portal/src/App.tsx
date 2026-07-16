import { Suspense, lazy } from "react";
import { AnimatePresence } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./lib/auth";

// Eager: tiny, first-paint routes
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import { AgencyShell } from "./pages/agency/AgencyShell";

// Lazy: split the dashboard + portal into separate chunks
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Overview = lazy(() => import("./pages/agency/Overview"));
const Clients = lazy(() => import("./pages/agency/Clients"));
const ClientDetail = lazy(() => import("./pages/agency/ClientDetail"));
const Projects = lazy(() => import("./pages/agency/Projects"));
const Deliverables = lazy(() => import("./pages/agency/Deliverables"));
const Requests = lazy(() => import("./pages/agency/Requests"));
const Invoices = lazy(() => import("./pages/agency/Invoices"));
const Updates = lazy(() => import("./pages/agency/Updates"));
const Accounts = lazy(() => import("./pages/agency/Accounts"));
const PortalReal = lazy(() => import("./pages/client/PortalReal"));

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
  const location = useLocation();
  return (
    <div className="grain min-h-screen">
      <Suspense fallback={<Loading />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname.split("/").slice(0, 2).join("/")}>
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
        </AnimatePresence>
      </Suspense>
    </div>
  );
}
