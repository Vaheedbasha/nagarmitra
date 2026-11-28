import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/store/AuthContext";
import { useComplaints, CITIES } from "@/store/ComplaintsContext";
import { translate } from "@/lib/i18n";
import type { Language } from "@/lib/translations";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { language, setLanguage } = useComplaints();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "Hyderabad",
    area: "",
    password: "",
    confirm: "",
    language,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      setError(t("requiredFields"));
      return;
    }
    if (form.password.length < 10) {
      setError(t("passwordHint"));
      return;
    }
    if (form.password !== form.confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        city: form.city,
        area: form.area,
        language: form.language as Language,
      });
      setLanguage(form.language as Language);
      navigate("/check-email", {
        replace: true,
        state: {
          email: form.email,
          name: form.name,
          emailSent: result?.emailSent,
          previewUrl: result?.previewUrl,
        },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-7 flex items-center justify-between">
          <Logo />
          <Link to="/login" className="text-[12px] font-semibold text-brand-600 hover:text-brand-700">
            {t("backToSignIn")}
          </Link>
        </div>

        <div className="surface p-5 sm:p-7">
          <h1 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">
            {t("registerTitle")}
          </h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{t("registerSubtitle")}</p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="field-label">
                  {t("fullName")} *
                </label>
                <input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} className="field" autoComplete="name" />
              </div>
              <div>
                <label htmlFor="email" className="field-label">
                  {t("email")} *
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="field"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="phone" className="field-label">
                  {t("phone")} *
                </label>
                <input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="field"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label htmlFor="city" className="field-label">
                  {t("city")}
                </label>
                <select id="city" value={form.city} onChange={(e) => update("city", e.target.value)} className="field">
                  {CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="area" className="field-label">
                  {t("area")}
                </label>
                <input id="area" value={form.area} onChange={(e) => update("area", e.target.value)} className="field" />
              </div>
              <div>
                <label htmlFor="password" className="field-label">
                  {t("password")} *
                </label>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  className="field"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="field-label">
                  {t("confirmPassword")} *
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={form.confirm}
                  onChange={(e) => update("confirm", e.target.value)}
                  className="field"
                  autoComplete="new-password"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="language" className="field-label">
                  {t("preferredLanguage")}
                </label>
                <select
                  id="language"
                  value={form.language}
                  onChange={(e) => update("language", e.target.value)}
                  className="field"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                </select>
                <p className="mt-1 text-[10.5px] text-slate-400">{t("passwordHint")}</p>
              </div>
            </div>

            {error ? (
              <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11.5px] font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={submitting}
                className="focus-ring inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-[13px] font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {submitting ? t("registering") : t("registerBtn")}
                {!submitting ? <ArrowRight size={15} /> : null}
              </button>
            </div>

            <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10.5px] leading-relaxed text-slate-500">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-accent-600" />
              Your name, phone and email are never shown on public complaints. Only aggregate signals
              such as your report count and trust score are visible.
            </p>
          </form>

          <p className="mt-5 text-center text-[11.5px] text-slate-500">
            {t("alreadyAccount")}{" "}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              {t("signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
