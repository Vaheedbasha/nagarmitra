import { useState } from "react";
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Compass,
  ClipboardList,
  User,
  LayoutDashboard,
  MapPin,
  MessageSquarePlus,
  Languages,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useComplaints } from "@/store/ComplaintsContext";
import { useAuth } from "@/store/AuthContext";
import { translate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CityPickerModal } from "@/components/citizen/CityPickerModal";

const NAV = [
  { to: "/", key: "home" as const, icon: Home, end: true },
  { to: "/explore", key: "explore" as const, icon: Compass },
  { to: "/report/chat", key: "report" as const, icon: MessageSquarePlus, highlight: true },
  { to: "/reports", key: "myReports" as const, icon: ClipboardList },
  { to: "/profile", key: "profile" as const, icon: User },
];

export function CitizenLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedCity, setSelectedCity, language, setLanguage } = useComplaints();
  const { user, isStaff, logout } = useAuth();
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const isChatRoute = location.pathname === "/report" || location.pathname.startsWith("/report/");

  const initials = (user?.name ?? "Citizen")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const signOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-1.5 px-2.5 sm:gap-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-4">
            <Logo />

            {/* Mobile View: Location Icon Only (No Text) */}
            <button
              type="button"
              onClick={() => setCityPickerOpen(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line bg-white/95 text-brand-600 shadow-sm transition hover:border-brand-300 active:scale-95 sm:hidden"
              aria-label={`Current city: ${selectedCity}. Tap to change city.`}
              title={`City: ${selectedCity} (Tap to change)`}
            >
              <MapPin size={15} />
            </button>

            {/* Desktop View: Location Icon + City Name */}
            <button
              type="button"
              onClick={() => setCityPickerOpen(true)}
              className="hidden sm:inline-flex shrink-0 items-center gap-1.5 h-8 rounded-xl border border-line bg-white/95 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 shadow-sm transition hover:border-brand-300 focus:border-brand-500"
              title="Click to change city"
            >
              <MapPin size={12} className="text-brand-600" />
              <span>{selectedCity}</span>
            </button>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Citizen navigation">
              {NAV.filter((item) => !item.highlight).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "focus-ring rounded-lg px-3 py-2 text-[13px] font-medium transition",
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )
                  }
                >
                  {t(item.key)}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-white text-slate-700 shadow-sm transition hover:border-brand-400 hover:text-brand-600 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
              <Languages size={15} />
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as "en" | "hi" | "te")}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label={t("language")}
              >
                <option value="en">English (EN)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </select>
            </div>

            {isStaff ? (
              <Link
                to="/admin"
                className="focus-ring hidden items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-2 text-[12px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 sm:inline-flex"
                title={t("adminConsole")}
              >
                <LayoutDashboard size={14} />
                <span>{t("adminConsole")}</span>
              </Link>
            ) : null}

            {user ? (
              <>
                <Link
                  to="/profile"
                  className="focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700 ring-1 ring-inset ring-brand-100"
                  aria-label={t("profile")}
                  title={user?.name ?? t("profile")}
                >
                  {initials}
                </Link>

                <button
                  onClick={signOut}
                  className="focus-ring rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-red-600"
                  aria-label={t("logout")}
                  title={t("logout")}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="focus-ring inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-xl bg-brand-600 px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main
        className={cn(
          "w-full max-w-full flex-1 overflow-x-hidden",
          isChatRoute
            ? "mx-auto w-full max-w-5xl px-3 pt-3 pb-24 sm:px-6 sm:pt-5 sm:pb-8 md:pb-6"
            : "mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pt-7 md:pb-14 lg:px-8"
        )}
      >
        <Outlet />
      </main>

      {!isChatRoute && (
        <footer className="hidden border-t border-line bg-white/60 py-5 text-center text-[11px] text-slate-400 md:block">
          NagarMitra · civic intelligence · demo records are labelled in the interface
        </footer>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1.5 shadow-lg md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-2">
          {NAV.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : item.to === "/report/chat"
                  ? isChatRoute
                  : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            if (item.highlight) {
              return (
                <NavLink key={item.to} to={item.to} className="relative -top-3 flex flex-col items-center justify-center focus:outline-none">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lift ring-4 ring-white transition active:scale-95">
                    <Icon size={22} strokeWidth={2.4} />
                  </span>
                  <span className="mt-0.5 text-[9.5px] font-bold text-brand-700">{t(item.key)}</span>
                </NavLink>
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition",
                  active ? "text-brand-600" : "text-slate-400"
                )}
              >
                <span className={cn("rounded-lg px-2.5 py-1 transition", active && "bg-brand-50")}>
                  <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                </span>
                {t(item.key)}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <CityPickerModal open={cityPickerOpen} onClose={() => setCityPickerOpen(false)} />
    </div>
  );
}
