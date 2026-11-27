import { Clock3, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/store/AuthContext";
import { useComplaints } from "@/store/ComplaintsContext";
import { translate } from "@/lib/i18n";

export default function PendingApproval() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language } = useComplaints();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  const signOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-5 py-10">
      <div className="surface w-full max-w-md p-6 text-center">
        <Logo to="/pending-approval" />
        <span className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <Clock3 size={24} />
        </span>
        <h1 className="mt-4 text-lg font-extrabold">{t("pendingTitle")}</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">{t("pendingBody")}</p>
        <div className="mt-4 rounded-xl border border-line bg-slate-50 p-3 text-left">
          <p className="text-[11px] font-semibold text-slate-700">{user?.name}</p>
          <p className="mt-0.5 text-[10.5px] text-slate-500">
            {user?.designation ?? "Official"} · {user?.department ?? "Department pending"}
          </p>
        </div>
        <button
          onClick={signOut}
          className="focus-ring mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-[12.5px] font-semibold text-slate-600 hover:border-slate-300"
        >
          <LogOut size={14} /> {t("logout")}
        </button>
      </div>
    </div>
  );
}
