import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, ChevronRight, ExternalLink, MapPin, MessageSquare, Navigation, Share2, ThumbsUp } from "lucide-react";
import { StatusChip, PriorityChip } from "@/components/ui/Badge";
import { useComplaints } from "@/store/ComplaintsContext";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/store/ToastContext";
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
  const { upvote, myComplaints } = useComplaints();
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const isOwnReport = Boolean(
    complaint.isMine ||
    myComplaints.some((c) => c.id === complaint.id) ||
    (user && complaint.reporterId && complaint.reporterId === user.id)
  );

  const category = categoryMeta(complaint.category);
  const Icon = category.icon;
  const completed = complaint.timeline.filter((event) => event.done);
  const latest = completed[completed.length - 1];

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOwnReport) return;
    upvote(complaint.id);
    setHasConfirmed(true);
    toast({
      title: "Confirmed",
      description: `You verified this issue. Total confirmations: ${complaint.upvotes + 1}`,
      variant: "success",
    });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const reportUrl = `${window.location.origin}/reports/${complaint.id}`;
    const shareData = {
      title: `Civic Alert: ${complaint.title}`,
      text: `Civic Alert in ${complaint.location}: "${complaint.title}". Track progress on NagarMitra:`,
      url: reportUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    // Fallback: clipboard copy
    navigator.clipboard?.writeText(reportUrl);
    toast({
      title: "Link copied to clipboard",
      description: "Paste and share with your neighbors across any app.",
      variant: "success",
    });
  };

  return (
    <Link
      to={`/reports/${complaint.id}`}
      className={cn(
        "surface surface-hover group flex h-full flex-col justify-between gap-3 overflow-hidden p-3.5 sm:gap-4 sm:p-4",
        className
      )}
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="relative h-[78px] w-[78px] shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-[92px] sm:w-[92px]">
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

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusChip status={complaint.status} size="sm" className="sm:hidden" />
            <PriorityChip priority={complaint.priority} score={complaint.score} size="sm" />
            <span className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 sm:inline">
              {complaint.id}
            </span>
          </div>
        </div>
      </div>

      {/* Social Post Action Footer */}
      <div className="flex items-center justify-between gap-1 border-t border-line/60 pt-2 text-[11.5px] text-slate-600">
        {isOwnReport ? (
          <span
            className="inline-flex items-center gap-1 rounded-lg bg-brand-50/80 px-2 py-1 font-semibold text-brand-700 text-[11px]"
            title="You reported this issue"
          >
            <Check size={12} className="text-brand-600" />
            <span>Your Report</span>
            <span className="font-mono text-[10px] text-brand-600">({complaint.upvotes})</span>
          </span>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={hasConfirmed}
            className={cn(
              "focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold transition active:scale-95",
              hasConfirmed
                ? "bg-emerald-50 text-emerald-700 font-bold cursor-default"
                : "hover:bg-slate-100 hover:text-slate-900"
            )}
            title="Confirm / verify this report"
          >
            <ThumbsUp size={13} className={hasConfirmed ? "fill-emerald-600 text-emerald-600" : "text-slate-400"} />
            <span>{hasConfirmed ? "Confirmed" : "Confirm"}</span>
            <span className="font-mono text-[10px] text-slate-500">({complaint.upvotes})</span>
          </button>
        )}

        {/* Google Maps Directions */}
        {complaint.lat && complaint.lng ? (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${complaint.lat},${complaint.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-50 transition"
            title="Open turn-by-turn directions in Google Maps"
          >
            <Navigation size={12} className="text-emerald-600" />
            <span className="text-[10.5px]">Directions</span>
          </a>
        ) : null}

        <span
          className="hidden sm:inline-flex items-center gap-1 rounded-lg px-2 py-1 text-slate-500"
          title="Comments on this issue"
        >
          <MessageSquare size={13} className="text-slate-400" />
          <span>{complaint.comments?.length ?? 0}</span>
        </span>

        <button
          onClick={handleShare}
          className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-brand-600 active:scale-95"
          title="Share across social apps"
        >
          <Share2 size={13} className="text-slate-400" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <span className="flex items-center gap-0.5 text-[10.5px] text-slate-400">
          {timeAgo(complaint.updated)}
          <ChevronRight size={13} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
        </span>
      </div>
    </Link>
  );
}
