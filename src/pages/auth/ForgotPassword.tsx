import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { api } from "@/lib/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [token, setToken] = useState(queryToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (queryToken) {
      setToken(queryToken);
    }
  }, [queryToken]);

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api<{ message: string; token?: string; emailSent?: boolean }>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: { email: email.trim() },
          anonymous: true,
        }
      );
      setMessage(
        data.message ||
          "If an account exists with that email, a password reset link has been dispatched to your inbox."
      );
      setSuccess(true);
      if (data.token) {
        setToken(data.token);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one letter and one number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setBusy(true);
    try {
      await api<{ ok: boolean; message?: string }>("/api/auth/reset-password", {
        method: "POST",
        body: { token, password },
        anonymous: true,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "This reset link is invalid or expired. Please request a new one."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center justify-between">
          <Logo />
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
          >
            <ArrowLeft size={13} /> Back to Sign in
          </Link>
        </div>

        <div className="surface p-6 sm:p-7 shadow-sm border border-line">
          {token ? (
            /* Set New Password Form */
            <div>
              <div className="mb-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-3">
                  <KeyRound size={20} />
                </div>
                <h1 className="text-lg font-extrabold text-slate-900">Set New Password</h1>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Enter a secure new password for your NagarMitra account.
                </p>
              </div>

              {success ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-center">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-2" />
                  <h3 className="text-sm font-bold text-emerald-900">Password Reset Complete</h3>
                  <p className="mt-1 text-xs text-emerald-700">
                    Your password has been securely updated. Redirecting you to sign in…
                  </p>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label htmlFor="new-password" className="field-label">
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="field text-xs"
                      placeholder="At least 8 characters (letters + numbers)"
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="field-label">
                      Confirm New Password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="field text-xs"
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  {error ? (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-600 border border-red-200">
                      <ShieldAlert size={14} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-xs font-bold text-white shadow-sm hover:bg-brand-700 active:scale-[0.99] transition disabled:opacity-60"
                  >
                    {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                    Save New Password
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Request Password Reset Form */
            <div>
              <div className="mb-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-3">
                  <Mail size={20} />
                </div>
                <h1 className="text-lg font-extrabold text-slate-900">Forgot Password</h1>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Enter your registered citizen or official email address. We will dispatch a secure link to reset your password.
                </p>
              </div>

              {success ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-center">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-2" />
                    <h3 className="text-sm font-bold text-emerald-900">Check Your Email</h3>
                    <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                      {message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSuccess(false);
                      setMessage(null);
                    }}
                    className="w-full text-center text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Didn't receive an email? Click here to resend
                  </button>
                </div>
              ) : (
                <form onSubmit={requestReset} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="field-label">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="field text-xs pl-8"
                        placeholder="e.g. name@example.com"
                        required
                      />
                      <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {error ? (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-600 border border-red-200">
                      <ShieldAlert size={14} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-xs font-bold text-white shadow-sm hover:bg-brand-700 active:scale-[0.99] transition disabled:opacity-60"
                  >
                    {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                    Send Password Reset Link
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
