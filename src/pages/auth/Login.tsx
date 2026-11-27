import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/store/AuthContext";
import { useComplaints } from "@/store/ComplaintsContext";
import { translate } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Portal = "citizen" | "staff";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();
  const { language } = useComplaints();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  const [portal, setPortal] = useState<Portal>("citizen");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError(t("requiredFields"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await login(identifier.trim(), password);
      const staff = result.user.role === "admin" || (result.user.role === "official" && result.user.officialStatus === "approved");
      if (portal === "staff" && !staff) {
        await logout();
        setError("This account does not have municipal staff access. Sign in as a citizen or request official access.");
        return;
      }
      if (portal === "citizen" && result.user.role !== "citizen") {
        navigate("/admin", { replace: true });
        return;
      }
      if (result.pendingApproval) {
        navigate("/pending-approval", { replace: true });
        return;
      }
      navigate(from && from !== "/login" ? from : result.user.role === "citizen" ? "/" : "/admin", {
        replace: true,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const useDemo = (role: "admin" | "citizen") => {
    setPortal(role === "admin" ? "staff" : "citizen");
    setIdentifier(role === "admin" ? "admin@nagarmitra.local" : "ananya@nagarmitra.local");
    setPassword(role === "admin" ? "Admin@12345" : "Citizen@12345");
    setError(null);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — existing NagarMitra identity is preserved */}
      <div className="relative hidden overflow-hidden bg-[#0B1220] p-10 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(900px 420px at 12% 8%, rgba(79,70,229,0.45), transparent 60%), radial-gradient(700px 500px at 88% 92%, rgba(20,184,166,0.28), transparent 62%)",
          }}
        />
        <div className="relative">
          <Logo variant="light" size="lg" />
        </div>
        <div className="relative max-w-md">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-300">
            {t("tagline")}
          </p>
          <h1 className="mt-4 font-display text-4xl font-black leading-[1.1] text-white">
            Report it once.
            <br />
            Track it until
            <br />
            it is fixed.
          </h1>
          <p className="mt-4 text-[13.5px] leading-relaxed text-slate-400">
            NagarMitra connects citizens and municipal teams on one accountable record: every
            complaint, every verification, every repair.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {[
              { icon: UserRoundCheck, label: "Citizen reporting", body: "Voice, photo and map-based complaints" },
              { icon: ShieldCheck, label: "Verified by residents", body: "Community confirmation on every report" },
              { icon: Building2, label: "Municipal operations", body: "Triage, assignment and resolution tracking" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <item.icon size={16} className="text-brand-300" />
                <p className="mt-2 text-[12px] font-semibold text-white">{item.label}</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-[10.5px] text-slate-500">
          NagarMitra civic platform · demo data is labelled throughout
        </p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col justify-center bg-canvas px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo />
          </div>

          <h2 className="font-display text-2xl font-extrabold text-slate-900">{t("signIn")}</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{t("signInSubtitle")}</p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-line bg-white p-1">
            {(
              [
                { id: "citizen", label: t("citizen"), icon: UserRoundCheck },
                { id: "staff", label: t("municipal"), icon: Building2 },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPortal(option.id)}
                aria-pressed={portal === option.id}
                className={cn(
                  "focus-ring flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition",
                  portal === option.id
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <option.icon size={14} />
                {option.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <div>
              <label htmlFor="identifier" className="field-label">
                {t("emailOrPhone")}
              </label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="identifier"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  className="field pl-9"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="password" className="field-label mb-0">
                  {t("password")}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="field pl-9 pr-10"
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error ? (
              <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11.5px] font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[13px] font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {submitting ? t("signingIn") : t("signInBtn")}
              {!submitting ? <ArrowRight size={15} /> : null}
            </button>
          </form>

          <div className="mt-5 flex flex-col gap-2 text-center text-[11.5px] text-slate-500">
            <p>
              {t("noAccount")}{" "}
              <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
                {t("createAccount")}
              </Link>
            </p>
            <Link to="/official-register" className="font-semibold text-slate-600 hover:text-slate-900">
              {t("officialRequest")}
            </Link>
          </div>

          {import.meta.env.DEV ? (
            <div className="mt-7 rounded-xl border border-dashed border-line bg-white/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t("demoAccounts")} · dev only
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => useDemo("citizen")}
                  className="focus-ring rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
                >
                  {t("demoCitizen")}: ananya@nagarmitra.local
                </button>
                <button
                  type="button"
                  onClick={() => useDemo("admin")}
                  className="focus-ring rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
                >
                  {t("demoAdmin")}: admin@nagarmitra.local
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
