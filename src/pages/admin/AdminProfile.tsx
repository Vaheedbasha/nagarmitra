import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, KeyRound, LogOut, Mail, MapPin, Phone, Save, ShieldCheck, User } from "lucide-react";
import { Panel } from "@/components/admin/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/store/ToastContext";
import { cn } from "@/lib/utils";

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}${"•".repeat(Math.max(2, name.length - 2))}@${domain}`;
}

function maskPhone(phone: string) {
  if (phone.length < 5) return phone;
  return `${phone.slice(0, 3)}${"•".repeat(Math.max(2, phone.length - 5))}${phone.slice(-2)}`;
}

export default function AdminProfile() {
  const navigate = useNavigate();
  const { user, updateProfile, changePassword, logout } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [language, setLanguage] = useState(user?.language ?? "en");
  const [notify, setNotify] = useState(user?.notifyEmail ?? true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name, language, notifyEmail: notify });
    } catch (caught) {
      toast({
        title: caught instanceof Error ? caught.message : "Could not save profile",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 10) {
      toast({ title: "Password must be at least 10 characters", variant: "error" });
      return;
    }
    setChanging(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
    } catch (caught) {
      toast({
        title: caught instanceof Error ? caught.message : "Could not change password",
        variant: "error",
      });
    } finally {
      setChanging(false);
    }
  };

  const signOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900">{user.name}</h2>
              <Tag tone="teal">
                <ShieldCheck size={11} /> {user.role === "admin" ? "Administrator" : "Approved official"}
              </Tag>
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {user.designation ?? "Staff"} · {user.department ?? "Municipal operations"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut size={14} /> Sign out
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Panel title="Account details" subtitle="Contact details are masked in shared views">
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="profile-name" className="field-label">Full name</label>
                  <div className="relative">
                    <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="profile-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="field pl-9"
                    />
                  </div>
                </div>
                <div>
                  <span className="field-label">Official email</span>
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-line bg-slate-50 px-3 text-[12px] text-slate-600">
                    <Mail size={14} className="text-slate-400" /> {maskEmail(user.email)}
                  </div>
                </div>
                <div>
                  <span className="field-label">Phone</span>
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-line bg-slate-50 px-3 text-[12px] text-slate-600">
                    <Phone size={14} className="text-slate-400" /> {maskPhone(user.phone)}
                  </div>
                </div>
                <div>
                  <span className="field-label">Department</span>
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-line bg-slate-50 px-3 text-[12px] text-slate-600">
                    <Building2 size={14} className="text-slate-400" /> {user.department ?? "—"}
                  </div>
                </div>
                <div>
                  <span className="field-label">Assigned area</span>
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-line bg-slate-50 px-3 text-[12px] text-slate-600">
                    <MapPin size={14} className="text-slate-400" /> {user.ward ?? user.area ?? "City-wide"}
                  </div>
                </div>
              </div>

              <div className="border-t border-line pt-4">
                <label htmlFor="profile-language" className="field-label">Language preference</label>
                <select
                  id="profile-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as "en" | "hi" | "te")}
                  className="field"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                </select>

                <label className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={notify}
                    onChange={(event) => setNotify(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                  <span>
                    <span className="block text-[12px] font-semibold text-slate-800">Notification preference</span>
                    <span className="block text-[10.5px] text-slate-500">
                      Receive in-app alerts for new, critical and escalated complaints.
                    </span>
                  </span>
                </label>
              </div>

              <Button type="submit" disabled={saving}>
                <Save size={14} /> {saving ? "Saving…" : "Save profile"}
              </Button>
            </form>
          </Panel>

          <Panel title="Change password" subtitle="Changing your password signs out other sessions">
            <form onSubmit={submitPassword} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="current-password" className="field-label">Current password</label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="field"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="field-label">New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="field"
                  autoComplete="new-password"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="outline" disabled={changing}>
                  <KeyRound size={14} /> {changing ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Access & audit" subtitle="Your permissions on this platform">
            <ul className="space-y-2.5 text-[11.5px] text-slate-600">
              {[
                "View city-wide complaints and evidence",
                "Record verification and field-check decisions",
                "Assign departments, SLAs and escalations",
                "Update status and resolution notes",
                user.role === "admin" ? "Approve official access requests" : "Staff access is limited to operations",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", "bg-accent-500")} />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[10.5px] leading-relaxed text-slate-500">
              Every verification, assignment and escalation is written to the audit log with your
              account as the actor.
            </p>
          </Panel>

          <Panel title="Trust score" subtitle="Aggregate, never personally identifying">
            <p className="font-display text-3xl font-black text-slate-900">{user.trustScore}</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-slate-500">
              Reporter trust scores are derived from report volume and community confirmations. They
              never expose identity.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
