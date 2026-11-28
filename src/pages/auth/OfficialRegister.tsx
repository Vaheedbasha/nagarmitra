import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/store/AuthContext";
import { useComplaints, CITIES } from "@/store/ComplaintsContext";
import { translate } from "@/lib/i18n";

export default function OfficialRegister() {
  const { registerOfficial } = useAuth();
  const { language } = useComplaints();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    ward: "",
    organisation: "",
    city: "Hyderabad",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ status: string; message: string } | null>(null);

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.name || !form.email || !form.phone || !form.department || !form.designation || !form.password) {
      setError(t("requiredFields"));
      return;
    }
    if (form.password !== form.confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await registerOfficial({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        city: form.city,
        department: form.department,
        designation: form.designation,
        ward: form.ward,
        organisation: form.organisation,
        language,
      });
      setDone(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
        <div className="surface w-full max-w-md p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-600">
            <CheckCircle2 size={26} />
          </span>
          <h1 className="mt-4 text-lg font-extrabold">{t("pendingTitle")}</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">{done.message}</p>
          <Link
            to="/login"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-4 text-[12.5px] font-bold text-white"
          >
            {t("backToSignIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-7 flex items-center justify-between">
          <Logo />
          <Link to="/login" className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600">
            <ArrowLeft size={13} /> {t("backToSignIn")}
          </Link>
        </div>

        <div className="surface p-5 sm:p-7">
          <h1 className="font-display text-xl font-extrabold text-slate-900 sm:text-2xl">{t("officialTitle")}</h1>
          <p className="mt-1.5 flex items-start gap-2 text-[12.5px] leading-relaxed text-slate-500">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-500" />
            {t("officialSubtitle")}
          </p>

          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
            <div className="sm:col-span-2">
              <label htmlFor="name" className="field-label">{t("fullName")} *</label>
              <input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} className="field" />
            </div>
            <div>
              <label htmlFor="email" className="field-label">{t("email")} *</label>
              <input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="field" />
            </div>
            <div>
              <label htmlFor="phone" className="field-label">{t("phone")} *</label>
              <input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} className="field" />
            </div>
            <div>
              <label htmlFor="department" className="field-label">{t("department")} *</label>
              <input id="department" value={form.department} onChange={(e) => update("department", e.target.value)} className="field" placeholder="Roads & Public Works" />
            </div>
            <div>
              <label htmlFor="designation" className="field-label">{t("designation")} *</label>
              <input id="designation" value={form.designation} onChange={(e) => update("designation", e.target.value)} className="field" placeholder="Ward Engineer" />
            </div>
            <div>
              <label htmlFor="ward" className="field-label">{t("ward")}</label>
              <input id="ward" value={form.ward} onChange={(e) => update("ward", e.target.value)} className="field" placeholder="Ward 4" />
            </div>
            <div>
              <label htmlFor="city" className="field-label">{t("city")}</label>
              <select id="city" value={form.city} onChange={(e) => update("city", e.target.value)} className="field">
                {CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="organisation" className="field-label">{t("organisation")}</label>
              <input id="organisation" value={form.organisation} onChange={(e) => update("organisation", e.target.value)} className="field" placeholder="Greater Hyderabad Municipal Corporation (GHMC)" />
            </div>
            <div>
              <label htmlFor="password" className="field-label">{t("password")} *</label>
              <input id="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} className="field" autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="confirm" className="field-label">{t("confirmPassword")} *</label>
              <input id="confirm" type="password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} className="field" autoComplete="new-password" />
            </div>

            {error ? (
              <p role="alert" className="sm:col-span-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11.5px] font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[13px] font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {submitting ? t("submitting") : t("submitRequest")}
              </button>
              <p className="mt-2 text-center text-[10.5px] text-slate-400">
                Requests are recorded in the audit log and reviewed by an administrator.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
