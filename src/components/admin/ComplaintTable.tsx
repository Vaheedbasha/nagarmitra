import { Link, useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { PriorityChip, StatusChip } from "@/components/ui/Badge";
import { categoryMeta } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Complaint } from "@/types";

export function ComplaintTable({
  complaints,
  compact = false,
}: {
  complaints: Complaint[];
  compact?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr className="border-y border-line bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="whitespace-nowrap px-4 py-2.5">Complaint ID</th>
            <th className="px-4 py-2.5">Issue</th>
            <th className="px-4 py-2.5">Category</th>
            <th className="px-4 py-2.5">Location</th>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">Priority</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {complaints.map((complaint) => {
            const category = categoryMeta(complaint.category);
            const Icon = category.icon;
            return (
              <tr
                key={complaint.id}
                onClick={() => navigate(`/admin/complaints/${complaint.id}`)}
                className="group cursor-pointer text-[12.5px] transition hover:bg-brand-50/40"
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] font-medium text-slate-500">
                  {complaint.id}
                </td>
                <td className="max-w-[260px] px-4 py-3">
                  <Link
                    to={`/admin/complaints/${complaint.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="line-clamp-1 font-semibold text-slate-800 transition group-hover:text-brand-700"
                  >
                    {complaint.title}
                  </Link>
                  {!compact ? (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                      {complaint.area} · {complaint.upvotes} confirmations
                    </p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <Icon size={13} className="text-slate-400" />
                    {category.short}
                  </span>
                </td>
                <td className="max-w-[180px] truncate px-4 py-3 text-slate-500">
                  {complaint.location}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                  {formatDate(complaint.date, { month: "short", day: "numeric" })}
                </td>
                <td className="px-4 py-3">
                  <PriorityChip priority={complaint.priority} score={complaint.score} size="sm" />
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={complaint.status} size="sm" />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/admin/complaints/${complaint.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                    aria-label={`View ${complaint.id}`}
                  >
                    <Eye size={12} />
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
