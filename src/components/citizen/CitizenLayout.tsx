import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { Home, Compass, ClipboardList, User, LayoutDashboard, Plus, MapPin, MessageSquarePlus } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useComplaints } from "@/store/ComplaintsContext";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/report/chat", label: "Report", icon: MessageSquarePlus, highlight: true },
  { to: "/reports", label: "My Reports", icon: ClipboardList },
  { to: "/profile", label: "Profile", icon: User },
];

export function CitizenLayout() {
  const location = useLocation();
  const { selectedCity, setSelectedCity } = useComplaints();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-3 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <Logo />

            {/* City Selector Pill */}
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-2 text-brand-600">
                <MapPin size={12} />
              </span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="h-8 rounded-xl border border-line bg-white/95 pl-6 pr-2 text-[11px] font-bold text-slate-700 outline-none transition hover:border-brand-300 focus:border-brand-500 shadow-sm"
                aria-label="Select City"
              >
                <option value="Riverton">Riverton</option>
                <option value="Metro Heights">Metro Heights</option>
                <option value="Bay City">Bay City</option>
              </select>
            </div>

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
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/report/chat"
              className="focus-ring flex items-center gap-1.5 rounded-xl bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:px-3.5 sm:py-2 sm:text-[12.5px]"
            >
              <MessageSquarePlus size={15} strokeWidth={2.4} />
              <span className="hidden xs:inline sm:inline">AI Report</span>
            </Link>
            <Link
              to="/admin"
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-2 text-[12px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
              title="Open the admin demo"
            >
              <LayoutDashboard size={14} />
              <span className="hidden sm:inline">Admin demo</span>
            </Link>
            <Link
              to="/profile"
              className="focus-ring ml-0.5 hidden h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-inset ring-brand-100 sm:flex"
              aria-label="Your profile"
            >
              AR
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pt-7 md:pb-14">
        <Outlet />
      </main>

      <footer className="hidden border-t border-line bg-white/60 py-5 text-center text-[11px] text-slate-400 md:block">
        CityFix prototype · Phase 1 · All data and AI summaries on this screen are simulated.
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-2">
          {NAV.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            if (item.highlight) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="relative -top-3 flex flex-col items-center justify-center focus:outline-none"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lift ring-4 ring-white transition active:scale-95">
                    <Icon size={22} strokeWidth={2.4} />
                  </span>
                  <span className="mt-0.5 text-[9.5px] font-bold text-brand-700">Report</span>
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
                <span
                  className={cn(
                    "rounded-lg px-2.5 py-1 transition",
                    active && "bg-brand-50"
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                </span>
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
