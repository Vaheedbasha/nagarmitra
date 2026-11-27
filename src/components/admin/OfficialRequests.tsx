import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, ShieldCheck, UserCheck, X } from "lucide-react";
import { Panel } from "@/components/admin/Panel";
import { Tag } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/store/ToastContext";

interface OfficialRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string | null;
  designation: string | null;
  ward: string | null;
  organisation: string | null;
  status: string | null;
  createdAt: string;
}

function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!domain) return value;
  return `${name.slice(0, 2)}${"•".repeat(Math.max(2, name.length - 2))}@${domain}`;
}

export function OfficialRequests() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<OfficialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await api<{ items: OfficialRequest[] }>("/api/admin/official-requests");
      setItems(data.items);
    } catch {
      /* non-admins receive 403; the panel stays hidden */
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isAdmin) return null;

  const decide = async (request: OfficialRequest, decision: "approved" | "rejected") => {
    setBusy(request.id);
    try {
      await api(`/api/admin/official-requests/${request.id}/decision`, {
        method: "POST",
        body: { decision },
      });
      toast({
        title: decision === "approved" ? "Official approved" : "Request declined",
        description: request.name,
        variant: decision === "approved" ? "success" : "info",
      });
      await load();
    } catch (caught) {
      toast({
        title: "Could not update request",
        description: caught instanceof Error ? caught.message : undefined,
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const pending = items.filter((item) => item.status === "pending");

  return (
    <Panel
      title="Official access requests"
      subtitle="Only administrators can approve staff access"
      action={
        <Tag tone={pending.length ? "amber" : "neutral"}>
          <ShieldCheck size={11} /> {pending.length} pending
        </Tag>
      }
    >
      {loading ? (
        <p className="flex items-center gap-2 text-[11.5px] text-slate-400">
          <Loader2 size={13} className="animate-spin" /> Loading requests…
        </p>
      ) : items.length === 0 ? (
        <p className="text-[11.5px] text-slate-400">No official accounts have been requested yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((request) => (
            <li key={request.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[12px] font-semibold text-slate-800">{request.name}</p>
                  <Tag
                    tone={
                      request.status === "approved" ? "teal" : request.status === "rejected" ? "neutral" : "amber"
                    }
                  >
                    {request.status ?? "pending"}
                  </Tag>
                </div>
                <p className="mt-0.5 text-[10.5px] text-slate-500">
                  {request.designation ?? "Official"} · {request.department ?? "Department"} ·{" "}
                  {request.ward ?? "City-wide"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {maskEmail(request.email)} · {request.organisation ?? "Municipal authority"}
                </p>
              </div>
              {request.status === "pending" ? (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => void decide(request, "approved")}
                    disabled={busy === request.id}
                    className="focus-ring inline-flex items-center gap-1 rounded-lg bg-accent-600 px-2.5 py-1.5 text-[10.5px] font-bold text-white hover:bg-accent-700 disabled:opacity-50"
                  >
                    <Check size={12} /> Approve
                  </button>
                  <button
                    onClick={() => void decide(request, "rejected")}
                    disabled={busy === request.id}
                    className="focus-ring inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[10.5px] font-semibold text-slate-500 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                  >
                    <X size={12} /> Decline
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400">
                  <UserCheck size={12} /> {request.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
