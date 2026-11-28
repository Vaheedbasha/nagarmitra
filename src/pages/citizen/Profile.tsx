import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  ChevronRight,
  KeyRound,
  Languages,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Trophy,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/store/ToastContext";
import { useComplaints } from "@/store/ComplaintsContext";
import { useAuth } from "@/store/AuthContext";
import { cn } from "@/lib/utils";

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { myComplaints, cities, selectedCity, setSelectedCity } = useComplaints();
  const { user, updateProfile, changePassword, logout } = useAuth();

  // Profile fields state
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [city, setCity] = useState(user?.city || selectedCity || "Hyderabad");
  const [area, setArea] = useState(user?.area || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const myReports = myComplaints.length;
  const resolved = myComplaints.filter((c) => c.status === "resolved").length;
  const upvotes = myComplaints.reduce((sum, c) => sum + c.upvotes, 0);
  const displayName = name || user?.name || "Citizen";
  const displayCity = user?.city || selectedCity || "Hyderabad";
  const displayArea = area || user?.area || user?.ward || "Local Area";

  const handleSignOut = async () => {
    try {
      await logout();
      toast({ title: "Signed out successfully", variant: "info" });
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        area: area.trim(),
      });
      if (city !== selectedCity) {
        setSelectedCity(city);
      }
      toast({ title: "Profile settings saved", variant: "success" });
    } catch (err: any) {
      toast({
        title: "Could not save profile",
        description: err.message || "Try again",
        variant: "error",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast({ title: "Enter your current password", variant: "error" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "New password must be at least 8 characters", variant: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "error" });
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
      toast({ title: "Password updated successfully", variant: "success" });
    } catch (err: any) {
      toast({
        title: "Password change failed",
        description: err.message || "Please check your current password",
        variant: "error",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-12">
      {/* Profile Header Card */}
      <div className="surface overflow-hidden">
        <div className="relative bg-brand-700 px-5 pb-12 pt-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[32px] border-white/[0.06]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-200">
            Citizen Profile & Settings
          </p>
          <h1 className="mt-1 text-xl font-extrabold text-white">{displayName}</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-brand-100">
            <MapPin size={12} /> {displayArea} · {displayCity}
          </p>
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-8 flex items-end justify-between gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-brand-700 shadow-lift ring-4 ring-white">
              {displayName
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-accent-100 bg-accent-50 px-2.5 py-1 text-[10px] font-bold text-accent-700">
              <ShieldCheck size={11} /> Verified Citizen
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-slate-50/50">
            {[
              { label: "My Reports", value: myReports, icon: User },
              { label: "Confirmations", value: upvotes, icon: ThumbsUp },
              { label: "Resolved", value: resolved, icon: Trophy },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-0.5 py-3">
                <span className="font-display text-lg font-extrabold text-slate-900">
                  {stat.value}
                </span>
                <span className="text-[10px] font-medium text-slate-400">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Simple Profile Settings Form */}
        <div className="surface p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 border-b border-line pb-2.5">
            <span className="rounded-lg bg-brand-50 p-1.5 text-brand-600">
              <Settings size={15} />
            </span>
            <div>
              <h2 className="text-[13.5px] font-bold text-slate-800">Personal Details</h2>
              <p className="text-[10.5px] text-slate-400">Update your account information</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label htmlFor="profile-name" className="field-label">Full Name</label>
              <div className="relative">
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field text-xs pl-8"
                  placeholder="Your full name"
                  required
                />
                <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="profile-phone" className="field-label">Phone Number</label>
              <div className="relative">
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="field text-xs pl-8"
                  placeholder="9876543210"
                  required
                />
                <Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="profile-email" className="field-label">Email Address</label>
              <div className="relative">
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field text-xs pl-8"
                  placeholder="citizen@example.com"
                  required
                />
                <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="profile-city" className="field-label">Home City</label>
                <select
                  id="profile-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="field text-xs"
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="profile-area" className="field-label">Area / Ward</label>
                <input
                  id="profile-area"
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="field text-xs"
                  placeholder="e.g. Banjara Hills"
                />
              </div>
            </div>

            <Button type="submit" size="sm" className="w-full mt-2" disabled={savingProfile}>
              {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{savingProfile ? "Saving…" : "Save Profile Details"}</span>
            </Button>
          </form>
        </div>

        {/* Preferences & Security Column */}
        <div className="space-y-4">
          {/* Account Management Card */}
          <div className="surface p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 border-b border-line pb-2.5">
              <span className="rounded-lg bg-brand-50 p-1.5 text-brand-600">
                <User size={15} />
              </span>
              <div>
                <h2 className="text-[13.5px] font-bold text-slate-800">Account Management</h2>
                <p className="text-[10.5px] text-slate-400">Session and operational controls</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {user?.role === "admin" || user?.role === "official" ? (
                <Link
                  to="/admin"
                  className="flex w-full items-center justify-between rounded-xl border border-brand-200 bg-brand-50/80 p-3 text-xs font-bold text-brand-800 shadow-xs transition hover:bg-brand-100 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard size={16} className="text-brand-600" />
                    <span>Open Municipal Admin Console</span>
                  </div>
                  <ChevronRight size={14} className="text-brand-500" />
                </Link>
              ) : null}

              <Button
                type="button"
                variant="outline"
                onClick={handleSignOut}
                className="w-full justify-center border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 active:scale-95"
              >
                <LogOut size={14} />
                <span>Sign Out of NagarMitra</span>
              </Button>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="surface p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-amber-50 p-1.5 text-amber-600">
                  <KeyRound size={15} />
                </span>
                <div>
                  <h2 className="text-[13.5px] font-bold text-slate-800">Password & Security</h2>
                  <p className="text-[10.5px] text-slate-400">Keep your account protected</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordOpen(!passwordOpen)}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                {passwordOpen ? "Cancel" : "Change"}
              </button>
            </div>

            {passwordOpen ? (
              <form onSubmit={handleChangePassword} className="mt-3 space-y-2.5 animate-scale-in">
                <div>
                  <label htmlFor="current-pw" className="field-label">Current Password</label>
                  <input
                    id="current-pw"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="field text-xs"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="new-pw" className="field-label">New Password (8+ characters)</label>
                  <input
                    id="new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="field text-xs"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirm-pw" className="field-label">Confirm New Password</label>
                  <input
                    id="confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="field text-xs"
                    required
                  />
                </div>
                <Button type="submit" size="sm" className="w-full mt-2" disabled={savingPassword}>
                  {savingPassword ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  <span>{savingPassword ? "Updating…" : "Update Password"}</span>
                </Button>
              </form>
            ) : (
              <p className="mt-2.5 text-[11px] text-slate-500 leading-relaxed">
                Password is encrypted. Click &quot;Change&quot; above to set a new password.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
