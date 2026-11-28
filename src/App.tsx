import { useEffect, lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, Link } from "react-router-dom";
import { Compass, Loader2, ShieldAlert } from "lucide-react";
import { ComplaintsProvider } from "@/store/ComplaintsContext";
import { AuthProvider, useAuth } from "@/store/AuthContext";
import { ToastProvider } from "@/store/ToastContext";
import { CitizenLayout } from "@/components/citizen/CitizenLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/Button";
import { useComplaints } from "@/store/ComplaintsContext";
import { translate } from "@/lib/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Core Citizen Routes (bundled for instant, zero-delay navigation)
import Home from "@/pages/citizen/Home";
import Explore from "@/pages/citizen/Explore";
import ChatReport from "@/pages/citizen/ChatReport";
import MyReports from "@/pages/citizen/MyReports";
import Profile from "@/pages/citizen/Profile";
import ComplaintDetail from "@/pages/citizen/ComplaintDetail";
import Login from "@/pages/auth/Login";
import ReportHub from "@/pages/citizen/ReportHub";

// Secondary & Admin Routes (code-split & lazy-loaded)
const Register = lazy(() => import("@/pages/auth/Register"));
const OfficialRegister = lazy(() => import("@/pages/auth/OfficialRegister"));
const PendingApproval = lazy(() => import("@/pages/auth/PendingApproval"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const VoiceReport = lazy(() => import("@/pages/citizen/VoiceReport"));
const ManualReport = lazy(() => import("@/pages/citizen/ManualReport"));

const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminComplaints = lazy(() => import("@/pages/admin/AdminComplaints"));
const AdminComplaintDetail = lazy(() => import("@/pages/admin/AdminComplaintDetail"));
const AdminMap = lazy(() => import("@/pages/admin/AdminMap"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminVerification = lazy(() => import("@/pages/admin/AdminVerification"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminProfile = lazy(() => import("@/pages/admin/AdminProfile"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={26} className="animate-spin text-brand-600" />
        <p className="text-[12px] font-medium text-slate-400">Loading NagarMitra…</p>
      </div>
    </div>
  );
}

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}

function RequireStaff() {
  const { user, loading, isStaff } = useAuth();
  const { language } = useComplaints();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <span className="rounded-2xl bg-amber-50 p-4 text-amber-600">
          <ShieldAlert size={26} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold">{t("accessDenied")}</h1>
          <p className="mt-1 text-[12.5px] text-slate-500">
            Staff tools require an approved municipal official or administrator account.
          </p>
        </div>
        <Link to="/">
          <Button>{t("backHome")}</Button>
        </Link>
      </div>
    );
  }
  return <Outlet />;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <span className="rounded-2xl bg-brand-50 p-4 text-brand-600">
        <Compass size={28} />
      </span>
      <div>
        <h1 className="text-2xl font-extrabold">Page not found</h1>
        <p className="mt-1 text-sm text-slate-500">This screen is not part of NagarMitra.</p>
      </div>
      <Link to="/">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}

function AppRoutes() {
  // Idle prefetching of secondary routes
  useEffect(() => {
    const timer = setTimeout(() => {
      void import("@/pages/auth/Register");
      void import("@/pages/citizen/ManualReport");
      void import("@/pages/citizen/VoiceReport");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/official-register" element={<OfficialRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Public Citizen Pages */}
          <Route element={<CitizenLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/reports/:id" element={<ComplaintDetail />} />
            <Route path="/complaint/:id" element={<ComplaintDetail />} />

            {/* Authenticated Citizen Actions */}
            <Route element={<RequireAuth />}>
              <Route path="/report" element={<ReportHub />} />
              <Route path="/report/chat" element={<ChatReport />} />
              <Route path="/report/voice" element={<VoiceReport />} />
              <Route path="/report/manual" element={<ManualReport />} />
              <Route path="/reports" element={<MyReports />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/pending-approval" element={<PendingApproval />} />
          </Route>

          <Route element={<RequireStaff />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="complaints" element={<AdminComplaints />} />
              <Route path="complaints/:id" element={<AdminComplaintDetail />} />
              <Route path="map" element={<AdminMap />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="verification" element={<AdminVerification />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <ComplaintsProvider>
            <AppRoutes />
          </ComplaintsProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
