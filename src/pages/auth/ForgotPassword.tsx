import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { api } from "@/lib/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ message: string; token?: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: { email },
        anonymous: true,
      });
      setMessage(data.message);
      if (data.token) setToken(data.token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: { token, password },
        anonymous: true,
      });
      navigate("/login", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center justify-between">
          <Logo />
          <Link to="/login" className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600">
            <ArrowLeft size={13} /> Sign in
          </Link>
        </div>
        <div className="surface p-5 sm:p-6">
          <h1 className="text-lg font-extrabold">Reset your password</h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
            Email delivery is not configured in this deployment. In development the reset token is
            shown here; in production connect an email provider as described in the README.
          </p>

          {!token ? (
            <form onSubmit={request} className="mt-5 space-y-4">
              <div>
                <label htmlFor="email" className="field-label">Email address</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
              </div>
              {error ? <p className="text-[11.5px] font-medium text-red-600">{error}</p> : null}
              {message ? <p className="text-[11.5px] text-slate-600">{message}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[12.5px] font-bold text-white disabled:opacity-60"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                Request reset
              </button>
            </form>
          ) : (
            <form onSubmit={reset} className="mt-5 space-y-4">
              <div>
                <label htmlFor="new-password" className="field-label">New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field"
                  autoComplete="new-password"
                />
              </div>
              {error ? <p className="text-[11.5px] font-medium text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[12.5px] font-bold text-white disabled:opacity-60"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                Set new password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
