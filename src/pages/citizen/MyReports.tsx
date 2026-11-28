import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Plus, Search } from "lucide-react";
import { ComplaintCard } from "@/components/complaint/ComplaintCard";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/Avatar";
import { useComplaints } from "@/store/ComplaintsContext";
import { translate } from "@/lib/i18n";
import type { StatusId } from "@/types";

type Tab = StatusId | "all";

export default function MyReports() {
  const { myComplaints, loading, language } = useComplaints();
  const t = (k: Parameters<typeof translate>[1]) => translate(language, k);
  const [tab, setTab] = useState<Tab>("all");

  const mine = useMemo(
    () => [...myComplaints].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [myComplaints]
  );

  const filtered = tab === "all" ? mine : mine.filter((complaint) => complaint.status === tab);

  const counts = {
    all: mine.length,
    submitted: mine.filter((c) => c.status === "submitted").length,
    progress: mine.filter((c) => c.status === "progress").length,
    resolved: mine.filter((c) => c.status === "resolved").length,
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-brand-50 p-1.5 text-brand-600">
              <ClipboardList size={16} />
            </span>
            <h1 className="text-[22px] font-extrabold sm:text-2xl">{t("myReports")}</h1>
          </div>
          <p className="mt-1 text-[12.5px] text-slate-500">
            {counts.all} complaints you've submitted · {counts.resolved} resolved
          </p>
        </div>
        <Link
          to="/report"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Plus size={14} />
          {t("newReport")}
        </Link>
      </div>

      <div className="surface mb-4 flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Mobile dropdown selector (zero horizontal overflow on small screens) */}
        <div className="w-full sm:hidden">
          <label htmlFor="my-reports-filter" className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Filter by status
          </label>
          <select
            id="my-reports-filter"
            value={tab}
            onChange={(e) => setTab(e.target.value as Tab)}
            className="h-10 w-full rounded-xl border border-line bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">{t("allReports")} ({counts.all})</option>
            <option value="submitted">{t("submitted")} ({counts.submitted})</option>
            <option value="progress">{t("inProgress")} ({counts.progress})</option>
            <option value="resolved">{t("resolved")} ({counts.resolved})</option>
          </select>
        </div>

        {/* Tablet and Desktop Segmented Tab buttons */}
        <div className="hidden sm:block">
          <Segmented
            options={[
              { id: "all", label: t("allReports"), count: counts.all },
              { id: "submitted", label: t("submitted"), count: counts.submitted },
              { id: "progress", label: t("inProgress"), count: counts.progress },
              { id: "resolved", label: t("resolved"), count: counts.resolved },
            ]}
            value={tab}
            onChange={(value) => setTab(value as Tab)}
            className="w-auto"
          />
        </div>
        <div className="grid grid-cols-3 gap-3 sm:hidden">
          {[
            { label: "Submitted", value: counts.submitted },
            { label: "In progress", value: counts.progress },
            { label: "Resolved", value: counts.resolved },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-base font-extrabold text-slate-900">{stat.value}</p>
              <p className="text-[9.5px] text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="hidden text-[11px] text-slate-400 sm:block">
          Newest first · tap a report to track it
        </p>
      </div>

      {loading && mine.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="surface h-36 rounded-2xl bg-white/60 p-4 border border-line" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={`No ${tab === "all" ? "" : tab} reports`}
          description="Nothing here yet. Reports you submit will appear in this list with live status updates."
          action={
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus size={14} /> Report an issue
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {filtered.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} showUpdate />
          ))}
        </div>
      )}

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3">
        <span className="mt-0.5 rounded-lg bg-brand-50 p-1.5 text-brand-600">
          <ClipboardList size={13} />
        </span>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Each report carries an official municipal complaint ID. Quote this reference when contacting your ward office or monitoring field resolution.
        </p>
      </div>
    </div>
  );
}
