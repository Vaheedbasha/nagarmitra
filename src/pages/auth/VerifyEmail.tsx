import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { api, setToken } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import type { SessionUser } from "@/types";

type VerifyStatus = "loading" | "success" | "already_verified" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing from the link. Please check your email.");
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const data = await api<{
          ok: boolean;
          alreadyVerified?: boolean;
          message?: string;
          token?: string;
          user?: SessionUser;
        }>(`/api/auth/verify-email?token=${encodeURIComponent(token!)}`, {
          anonymous: true,
        });

        if (!isMounted) return;

        if (data.token) {
          setToken(data.token);
          await refreshUser();
        }

        if (data.alreadyVerified) {
          setStatus("already_verified");
          setMessage(data.message || "Your email address has already been verified.");
        } else {
          setStatus("success");
          setMessage(data.message || "Your email address was successfully verified!");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatus("error");
        setMessage(err?.message || "This verification link is invalid or has expired.");
      }
    }

    void verify();

    return () => {
      isMounted = false;
    };
  }, [token, refreshUser]);

  // Auto redirect countdown on success
  useEffect(() => {
    if (status !== "success" && status !== "already_verified") return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          navigate("/", { replace: true });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        {/* Top Header */}
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <Link to="/" className="text-[12px] font-semibold text-brand-600 hover:text-brand-700">
            Back to Home
          </Link>
        </div>

        {/* Status Card */}
        <div className="surface p-6 sm:p-8 text-center">
          {status === "loading" && (
            <div className="flex flex-col items-center py-6">
              <Loader2 size={36} className="animate-spin text-brand-600" />
              <h1 className="mt-4 font-display text-xl font-bold text-slate-900">
                Verifying your email…
              </h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Please wait while we confirm your account token with municipal records.
              </p>
            </div>
          )}

          {(status === "success" || status === "already_verified") && (
            <div className="flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                <CheckCircle2 size={36} className="stroke-[2]" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-extrabold text-slate-900">
                {status === "already_verified" ? "Already Verified!" : "Email Verified!"}
              </h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600 max-w-xs">
                {message}
              </p>

              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3 text-[12px] text-slate-500 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Your citizen privileges are active. Redirecting in {countdown}s…</span>
              </div>

              <div className="mt-6 w-full flex flex-col gap-2">
                <Link
                  to="/"
                  className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[13px] font-bold text-white shadow-sm hover:bg-brand-700 transition"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/report"
                  className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  <span>Report an Issue</span>
                </Link>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100 shadow-sm">
                <AlertCircle size={36} className="stroke-[2]" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-extrabold text-slate-900">
                Verification Failed
              </h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600 max-w-xs">
                {message}
              </p>

              <div className="mt-6 w-full flex flex-col gap-2">
                <Link
                  to="/check-email"
                  className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[13px] font-bold text-white shadow-sm hover:bg-brand-700 transition"
                >
                  <Mail size={15} />
                  <span>Request a New Link</span>
                </Link>
                <Link
                  to="/login"
                  className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  <span>Back to Sign in</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
