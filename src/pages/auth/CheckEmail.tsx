import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, ArrowRight, RefreshCw, CheckCircle2, ShieldCheck, Sparkles, ExternalLink } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/store/ToastContext";

interface LocationState {
  email?: string;
  name?: string;
  emailSent?: boolean;
  previewUrl?: string;
}

export default function CheckEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, resendVerification, logout } = useAuth();
  const { toast } = useToast();

  const state = (location.state as LocationState) || {};
  const email = state.email || user?.email || "";
  const previewUrl = state.previewUrl;

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | undefined>(previewUrl);
  const [resentSuccess, setResentSuccess] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending || !email) return;
    setResending(true);
    setResentSuccess(false);
    try {
      const res = await resendVerification(email);
      setCooldown(60);
      setResentSuccess(true);
      if (res.previewUrl) {
        setLocalPreviewUrl(res.previewUrl);
      }
      toast({
        title: "Verification email sent",
        description: `A new link has been dispatched to ${email}`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Failed to resend",
        description: err?.message || "Please wait a moment before trying again.",
        variant: "error",
      });
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-lg">
        {/* Top Header */}
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <button
            onClick={handleSignOut}
            className="text-[12px] font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            Sign out
          </button>
        </div>

        {/* Main Card */}
        <div className="surface overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            {/* Mail Icon with animated ring */}
            <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-sm border border-brand-100">
              <Mail size={32} className="stroke-[1.75]" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-600"></span>
              </span>
            </div>

            <h1 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight sm:text-3xl">
              Check your inbox
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600 max-w-sm">
              We sent a one-click verification link to:
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1 text-[12.5px] font-semibold text-slate-800 border border-slate-200">
              <span>{email || "your email address"}</span>
            </div>

            <p className="mt-4 text-[12px] leading-relaxed text-slate-500 max-w-sm">
              Click the button inside the email to verify your citizen account and activate direct ward reporting.
            </p>
          </div>

          {/* Fallback Preview Activation Box (Active in Preview or before Resend API key setup) */}
          {localPreviewUrl && (
            <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50/70 p-4 text-left">
              <div className="flex items-start gap-2.5">
                <Sparkles size={16} className="mt-0.5 shrink-0 text-brand-600" />
                <div className="flex-1">
                  <h2 className="text-[12.5px] font-bold text-brand-900">
                    Instant One-Click Activation
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-brand-700">
                    You can activate your account immediately by clicking the button below:
                  </p>
                  <a
                    href={localPreviewUrl}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-brand-700 transition"
                  >
                    <span>Activate Account Now</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Verification steps */}
          <div className="mt-6 space-y-2.5 rounded-xl bg-slate-50 p-4 border border-slate-100 text-[12px] text-slate-600 text-left">
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-[10px] text-slate-700">
                1
              </span>
              <span>Open the email sent from <strong>NagarMitra</strong>.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-[10px] text-slate-700">
                2
              </span>
              <span>Click <strong>"Verify Email Address"</strong>.</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-[10px] text-slate-700">
                3
              </span>
              <span>Your account is immediately verified and ready for civic reporting.</span>
            </div>
          </div>

          {/* Feedback banner */}
          {resentSuccess && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-[12px] font-medium text-emerald-800">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>A fresh verification link has been sent. Please check your spam folder if it doesn't arrive.</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="focus-ring inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
            >
              <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
              {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend verification email"}
            </button>

            <Link
              to="/"
              className="focus-ring inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-[13px] font-bold text-white shadow-sm hover:bg-brand-700 transition"
            >
              <span>Go to Home</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
            <ShieldCheck size={13} className="text-slate-400" />
            <span>NagarMitra uses secure token verification to protect citizen accounts.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
