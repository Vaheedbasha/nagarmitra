import { useEffect } from "react";
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

import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import OfficialRegister from "@/pages/auth/OfficialRegister";
import PendingApproval from "@/pages/auth/PendingApproval";
import ForgotPassword from "@/pages/auth/ForgotPassword";

import Home from "@/pages/citizen/Home";
import VoiceReport from "@/pages/citizen/VoiceReport";
import ManualReport from "@/pages/citizen/ManualReport";
import ChatReport from "@/pages/citizen/ChatReport";
import Explore from "@/pages/citizen/Explore";
import MyReports from "@/pages/citizen/MyReports";
import ComplaintDetail from "@/pages/citizen/ComplaintDetail";
import Profile from "@/pages/citizen/Profile";

import AdminOverview from "@/pages/admin/AdminOverview";
import AdminComplaints from "@/pages/admin/AdminComplaints";
import AdminComplaintDetail from "@/pages/admin/AdminComplaintDetail";
import AdminMap from "@/pages/admin/AdminMap";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminVerification from "@/pages/admin/AdminVerification";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminProfile from "@/pages/admin/AdminProfile";

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
  return (
    <>
      <ScrollToTop />
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

          {/* Authenticated Citizen Actions */}
          <Route element={<RequireAuth />}>
            <Route path="/report" element={<ChatReport />} />
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
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ComplaintsProvider>
          <AppRoutes />
        </ComplaintsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
