import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Flag,
  Loader2,
  ShieldCheck,
  ShieldX,
  ThumbsUp,
  Users,
} from "lucide-react";
import { Panel } from "@/components/admin/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Badge";
import { PriorityChip } from "@/components/ui/Badge";
import { useToast } from "@/store/ToastContext";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import type { Complaint, VerificationDecision } from "@/types";

type Tab = "pending" | "approved" | "field_check" | "rejected";

interface DecisionRecord {
  id: string;
  complaintId: string;
  decision: VerificationDecision;
  note: string;
  admin: string;
  createdAt: string;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "field_check", label: "Field check" },
  { id: "rejected", label: "Rejected" },
];

export default function AdminVerification() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<Complaint[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{
        items: Complaint[];
        counts: Record<string, number>;
        decisions: DecisionRecord[];
      }>(`/api/admin/verification?tab=${tab}`);
      setItems(data.items);
      setCounts(data.counts);
      setDecisions(data.decisions);
    } catch (caught) {
      toast({
        title: "Could not load verification queue",
        description: caught instanceof Error ? caught.message : undefined,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (complaint: Complaint, decision: VerificationDecision) => {
    setBusyId(complaint.id);
    try {
      await api(`/api/admin/complaints/${complaint.id}/verification`, {
        method: "POST",
        body: { decision, note: "" },
      });
      toast({
        title:
          decision === "approved"
            ? "Report approved"
            : decision === "field_check"
              ? "Field check requested"
              : "Report marked invalid",
        description: `${complaint.id} · decision saved to the database`,
        variant: decision === "rejected" ? "info" : "success",
      });
      await load();
    } catch (caught) {
      toast({
        title: "Could not save decision",
        description: caught instanceof Error ? caught.message : undefined,
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const totalPending = counts.pending ?? 0;
  const options = useMemo(
    () =>
      TABS.map((entry) => ({
        id: entry.id,
        label: entry.label,
        count: counts[entry.id] ?? 0,
      })),
    [counts]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold sm:text-xl">Community verification</h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Review crowdsourced reports and confirmations before crews are dispatched. Decisions
            persist in the database.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[10.5px] font-bold text-brand-700">
          <ShieldCheck size={12} /> {totalPending} awaiting review
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <div className="surface flex flex-wrap items-center justify-between gap-2 p-3">
            <Segmented options={options} value={tab} onChange={(value) => setTab(value as Tab)} size="sm" />
            <span className="px-1 text-[10.5px] text-slate-400">Decisions are audited with your account</span>
          </div>

          {loading ? (
            <div className="surface flex items-center gap-2 p-5 text-[12px] text-slate-400">
              <Loader2 size={15} className="animate-spin" /> Loading queue…
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title={tab === "pending" ? "Verification queue is clear" : "Nothing in this tab"}
              description={
                tab === "pending"
                  ? "Every complaint has a recorded verification decision."
                  : "Decisions you record will appear here and survive a refresh."
              }
            />
          ) : (
            <div className="space-y-3">
              {items.map((complaint) => (
                <div key={complaint.id} className="surface overflow-hidden">
                  <div className="flex flex-col gap-3 p-4 sm:flex-row">
                    <Link
                      to={`/admin/complaints/${complaint.id}`}
                      className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-28"
                    >
                      {complaint.photo ? (
                        <img src={complaint.photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-slate-300">
                          <ShieldCheck size={20} />
                        </span>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Tag tone="neutral">{complaint.id}</Tag>
                        <PriorityChip priority={complaint.priority} size="sm" />
                        <Tag tone="brand">{complaint.city || "Verified"}</Tag>
                      </div>
                      <Link
                        to={`/admin/complaints/${complaint.id}`}
                        className="mt-1 block text-[13px] font-semibold text-slate-900 hover:text-brand-700"
                      >
                        {complaint.title}
                      </Link>
                      <p className="mt-0.5 text-[10.5px] text-slate-400">
                        {complaint.location} · {timeAgo(complaint.date)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10.5px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp size={11} /> {complaint.upvotes} confirmations
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users size={11} /> {complaint.reporter.reports} reports by this citizen
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ShieldCheck size={11} /> trust {complaint.reporter.trust}%
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:flex-col sm:items-stretch">
                      <button
                        onClick={() => void decide(complaint, "approved")}
                        disabled={busyId === complaint.id}
                        className={cn(
                          "focus-ring inline-flex items-center justify-center gap-1 rounded-lg bg-accent-600 px-2.5 py-1.5 text-[10.5px] font-bold text-white transition hover:bg-accent-700 disabled:opacity-50"
                        )}
                      >
                        <Check size={12} /> Approve
                      </button>
                      <button
                        onClick={() => void decide(complaint, "field_check")}
                        disabled={busyId === complaint.id}
                        className="focus-ring inline-flex items-center justify-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10.5px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                      >
                        <Flag size={12} /> Field check
                      </button>
                      <button
                        onClick={() => void decide(complaint, "rejected")}
                        disabled={busyId === complaint.id}
                        className="focus-ring inline-flex items-center justify-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[10.5px] font-semibold text-slate-500 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                      >
                        <ShieldX size={12} /> Invalid
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Panel title="Decision history" subtitle="Latest 50 recorded decisions">
            {decisions.length === 0 ? (
              <p className="text-[11.5px] text-slate-400">No decisions recorded yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {decisions.slice(0, 12).map((decision) => (
                  <li key={decision.id} className="rounded-lg border border-line bg-slate-50/60 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to={`/admin/complaints/${decision.complaintId}`}
                        className="font-mono text-[10.5px] font-semibold text-brand-700"
                      >
                        {decision.complaintId}
                      </Link>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                          decision.decision === "approved"
                            ? "bg-accent-100 text-accent-700"
                            : decision.decision === "field_check"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-200 text-slate-600"
                        )}
                      >
                        {decision.decision.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {decision.admin} · {timeAgo(decision.createdAt.slice(0, 10))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="How verification works" subtitle="Transparency">
            <ul className="space-y-2 text-[11px] leading-relaxed text-slate-600">
              <li>Approved reports move to Under Review and can be assigned.</li>
              <li>Field check keeps the report open and records the request.</li>
              <li>Invalid reports keep their history and are marked rejected.</li>
              <li>Every action is stored with the staff account in the audit log.</li>
            </ul>
            <Link
              to="/admin/complaints"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600"
            >
              Open all complaints <ArrowRight size={12} />
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
