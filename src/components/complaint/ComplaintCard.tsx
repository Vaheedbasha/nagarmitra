import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight, MapPin, ThumbsUp } from "lucide-react";
import { StatusChip, PriorityChip } from "@/components/ui/Badge";
import { categoryMeta } from "@/lib/constants";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import type { Complaint } from "@/types";

export function ComplaintCard({
  complaint,
  className,
  showUpdate = false,
}: {
  complaint: Complaint;
  className?: string;
  showUpdate?: boolean;
}) {
  const category = categoryMeta(complaint.category);
  const Icon = category.icon;
  const completed = complaint.timeline.filter((event) => event.done);
  const latest = completed[completed.length - 1];

  return (
    <Link
      to={`/reports/${complaint.id}`}
      className={cn(
        "surface surface-hover group flex gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4",
        className
      )}
    >
      <div className="relative h-[74px] w-[74px] shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-[92px] sm:w-[92px]">
        {complaint.photo ? (
          <img
            src={complaint.photo}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <Icon size={24} />
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-md bg-white/95 p-1 text-slate-600 shadow-sm backdrop-blur">
          <Icon size={11} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 pr-1 text-[13.5px] font-semibold leading-snug text-slate-900 transition group-hover:text-brand-700 sm:text-sm">
            {complaint.title}
          </h3>
          <StatusChip status={complaint.status} size="sm" className="hidden shrink-0 sm:inline-flex" />
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} className="text-slate-400" />
            {complaint.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={11} className="text-slate-400" />
            {formatDate(complaint.date, { month: "short", day: "numeric" })}
          </span>
        </div>

        {showUpdate && latest ? (
          <p className="mt-1.5 line-clamp-1 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-600">Latest:</span> {latest.note}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <StatusChip status={complaint.status} size="sm" className="sm:hidden" />
            <PriorityChip priority={complaint.priority} score={complaint.score} size="sm" />
            <span className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 sm:inline">
              {complaint.id}
            </span>
          </div>
          <span className="flex items-center gap-1 text-[10.5px] text-slate-400">
            <ThumbsUp size={10} />
            {complaint.upvotes}
            <span className="mx-0.5 text-slate-300">·</span>
            {timeAgo(complaint.updated)}
            <ChevronRight size={13} className="ml-0.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
          </span>
        </div>
      </div>
    </Link>
  );
}
