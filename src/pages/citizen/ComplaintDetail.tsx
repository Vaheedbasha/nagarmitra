import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  MessageSquare,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  User,
} from "lucide-react";
import { useComplaint, useComplaints } from "@/store/ComplaintsContext";
import { useToast } from "@/store/ToastContext";
import { PriorityScorePanel } from "@/components/complaint/PriorityScore";
import { StatusTimeline } from "@/components/complaint/StatusTimeline";
import { StatusChip, PriorityChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Avatar";
import { CityMap } from "@/components/map/CityMap";
import { Modal } from "@/components/ui/Modal";
import { categoryMeta, statusMeta } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/utils";

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { upvote, complaints, addComment } = useComplaints();
  const complaint = useComplaint(id);

  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [copiedStory, setCopiedStory] = useState(false);

  if (!complaint) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <EmptyState
          icon={MapPin}
          title="Complaint not found"
          description="This complaint ID isn't in the demo dataset. It may have been removed."
          action={<Button onClick={() => navigate("/reports")}>Back to my reports</Button>}
        />
      </div>
    );
  }

  const category = categoryMeta(complaint.category);
  const Icon = category.icon;
  const status = statusMeta(complaint.status);

  const copyId = () => {
    navigator.clipboard?.writeText(complaint.id);
    toast({ title: "Complaint ID copied", description: complaint.id, variant: "info" });
  };

  const copyPostLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast({
      title: "Link copied to clipboard",
      description: "You can now paste and share this report link anywhere.",
      variant: "success",
    });
  };

  const shareWhatsApp = () => {
    const text = `🚨 Civic Issue Reported on CityFix: ${complaint.title} in ${complaint.location}.\n\nTrack progress or verify this report here: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(complaint.id, commentText.trim(), "Ananya Rao");
    setCommentText("");
    toast({
      title: "Update posted",
      description: "Your comment is now visible to the community.",
      variant: "success",
    });
  };

  const oneLineStoryText = `🚨 Civic Alert in ${complaint.location}: "${complaint.title}" remains unaddressed (${status.label}). Support this issue on CityFix: ${window.location.href}`;

  const copyStoryText = () => {
    navigator.clipboard?.writeText(oneLineStoryText);
    setCopiedStory(true);
    setTimeout(() => setCopiedStory(false), 2000);
    toast({
      title: "Story text copied",
      description: "Ready to paste into your Instagram Story or WhatsApp status.",
      variant: "success",
    });
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${category.tint}`}>
              <Icon size={11} />
              {category.label}
            </span>
            <StatusChip status={complaint.status} size="sm" />
            <PriorityChip priority={complaint.priority} score={complaint.score} size="sm" />
          </div>
          <h1 className="text-[21px] font-extrabold leading-tight sm:text-[26px]">
            {complaint.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-slate-500">
            <button
              onClick={copyId}
              className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-slate-500 transition hover:text-brand-600"
            >
              {complaint.id}
              <Copy size={11} />
            </button>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} className="text-slate-400" />
              {complaint.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={12} className="text-slate-400" />
              Submitted {formatDate(complaint.date)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              upvote(complaint.id);
              toast({
                title: "Verification recorded",
                description: "Your confirmation helps this issue get prioritised.",
                variant: "success",
              });
            }}
          >
            <ThumbsUp size={14} />
            Confirm issue
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              {complaint.upvotes}
            </span>
          </Button>

          {/* Social Share actions */}
          <button
            onClick={shareWhatsApp}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            title="Share on WhatsApp"
          >
            <Share2 size={13} />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          <button
            onClick={() => setStoryModalOpen(true)}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:border-brand-400 hover:text-brand-600"
            title="Generate One-Line Story Card"
          >
            <Camera size={13} className="text-brand-600" />
            <span className="hidden sm:inline">Story Card</span>
          </button>

          <button
            onClick={copyPostLink}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 text-[12px] font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
            title="Copy Report Link"
          >
            <Copy size={13} />
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          {complaint.photo ? (
            <div className="surface overflow-hidden">
              <div className="relative">
                <img
                  src={complaint.photo}
                  alt={`Evidence for ${complaint.title}`}
                  className="h-56 w-full object-cover sm:h-80"
                />
                <div className="absolute left-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm backdrop-blur">
                  Photo evidence · 1 image
                </div>
                <div className="absolute right-3 top-3 rounded-lg bg-slate-900/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                  {category.short}
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <p className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
                  <ShieldCheck size={12} />
                  Uploaded by the reporter
                </p>
                <span className="text-[10px] text-slate-400">Demo image</span>
              </div>
            </div>
          ) : null}

          <div className="surface p-4 sm:p-5">
            <h2 className="text-[14px] font-bold">Description</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{complaint.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Category", value: category.short },
                { label: "Area", value: complaint.area },
                { label: "Reported", value: formatDate(complaint.date, { month: "short", day: "numeric" }) },
                { label: "Confirmations", value: `${complaint.upvotes}` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-slate-50 px-2.5 py-2">
                  <p className="text-[9.5px] font-medium uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] font-semibold text-slate-700">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-card sm:p-5">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-brand-50 p-1.5 text-brand-600">
                <Sparkles size={15} />
              </span>
              <div>
                <h2 className="text-[13.5px] font-bold">AI-generated summary</h2>
                <p className="text-[10px] text-slate-400">Sample output · not a live AI service</p>
              </div>
            </div>
            <p className="mt-3 rounded-xl bg-brand-50/60 p-3.5 text-[13px] leading-relaxed text-slate-700">
              {complaint.aiSummary}
            </p>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              This summary is illustrative demo content included with the complaint record.
            </p>
          </div>

          <div className="surface p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[14px] font-bold">Status timeline</h2>
              <span className="text-[10.5px] text-slate-400">
                Updated {formatDate(complaint.updated)}
              </span>
            </div>
            <StatusTimeline complaint={complaint} />
          </div>

          {/* Community Comments & On-Site Updates */}
          <div className="surface p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-brand-50 p-1.5 text-brand-600">
                  <MessageSquare size={16} />
                </span>
                <h2 className="text-[14px] font-bold">
                  Community Discussion & Updates ({complaint.comments?.length ?? 0})
                </h2>
              </div>
              <span className="text-[10px] text-slate-400">Public civic record</span>
            </div>

            {/* Comment post form */}
            <form onSubmit={handlePostComment} className="mb-4 space-y-2.5">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Share an on-site update, note whether work has started, or add helpful context..."
                rows={2}
                className="field resize-none text-[12.5px]"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400">
                  Posting as <span className="font-semibold text-slate-600">Ananya Rao</span> (Ward 4 Resident)
                </p>
                <Button type="submit" size="sm" disabled={!commentText.trim()}>
                  <Send size={12} />
                  Post update
                </Button>
              </div>
            </form>

            {/* Comment Feed */}
            <div className="space-y-3 divide-y divide-line/60">
              {complaint.comments && complaint.comments.length > 0 ? (
                complaint.comments.map((comm) => (
                  <div key={comm.id} className="pt-3 first:pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                          {comm.author.charAt(0)}
                        </span>
                        <span className="text-[12px] font-bold text-slate-800">{comm.author}</span>
                        {comm.badge && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9.5px] font-semibold text-brand-700">
                            {comm.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{timeAgo(comm.date)}</span>
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600 pl-8">
                      {comm.text}
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-3 text-center text-xs text-slate-400">
                  No community updates yet. Be the first neighbor to post an on-site confirmation!
                </p>
              )}
            </div>

            <div className="mt-4 border-t border-line/60 pt-3">
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                🛡️ Comments are subject to CityFix community guidelines and civil moderation. Private personal contact information is strictly prohibited.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface overflow-hidden">
            <div className="border-b border-line bg-slate-50/60 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Current status
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[15px] font-bold text-slate-900">{status.label}</p>
                <StatusChip status={complaint.status} size="sm" />
              </div>
            </div>
            <div className="space-y-2.5 px-4 py-3.5">
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-slate-500">Complaint ID</span>
                <span className="font-mono font-semibold text-slate-700">{complaint.id}</span>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-slate-500">Priority</span>
                <PriorityChip priority={complaint.priority} score={complaint.score} size="sm" />
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-slate-500">Last update</span>
                <span className="font-medium text-slate-700">
                  {formatDate(complaint.updated, { month: "short", day: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-slate-500">Reported by</span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                  <User size={11} /> You
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 border-t border-line pt-2.5 text-[11.5px]">
                <span className="text-slate-500">Location</span>
                <span className="text-right font-medium text-slate-700">{complaint.location}</span>
              </div>
            </div>
            {complaint.status !== "resolved" ? (
              <div className="border-t border-line bg-brand-50/40 px-4 py-3">
                <p className="text-[11px] leading-relaxed text-brand-800">
                  You'll be notified when the ward team updates this report.
                </p>
              </div>
            ) : (
              <div className="border-t border-line bg-accent-50/60 px-4 py-3">
                <p className="text-[11px] leading-relaxed text-accent-800">
                  This issue was resolved. Thank you for helping improve your neighbourhood.
                </p>
              </div>
            )}
          </div>

          <PriorityScorePanel complaint={complaint} />

          <div className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <h3 className="text-[12px] font-bold">Location</h3>
              <span className="text-[10px] text-slate-400">{complaint.area}</span>
            </div>
            <CityMap
              complaints={complaints.filter((item) => item.id === complaint.id)}
              selectedId={complaint.id}
              showLegend={false}
              className="h-[190px] rounded-none border-0"
            />
          </div>

          <Link
            to="/explore"
            className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-[11.5px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            See other issues nearby
            <MapPin size={13} />
          </Link>
        </div>
      </div>

      {/* 9:16 One-Line Story Card Modal */}
      <Modal
        open={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        title="Share One-Line Civic Story"
        description="Share this report as a high-impact story card on Instagram or WhatsApp status."
        size="sm"
      >
        <div className="space-y-4">
          {/* 9:16 Preview Card */}
          <div className="mx-auto aspect-[9/16] w-full max-w-[270px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#0B1220] via-slate-900 to-brand-950 p-4 text-white shadow-2xl relative flex flex-col justify-between border border-white/10">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-brand-200">
                  CityFix Civic Alert
                </span>
              </div>
              <span className="rounded bg-white/10 px-2 py-0.5 text-[9px] font-mono font-medium backdrop-blur">
                {complaint.id}
              </span>
            </div>

            {/* Media Image */}
            <div className="my-auto overflow-hidden rounded-xl border border-white/15 bg-black/40 shadow-inner">
              {complaint.photo ? (
                <img
                  src={complaint.photo}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-800 text-slate-400">
                  <Icon size={32} />
                </div>
              )}
              <div className="bg-black/75 p-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-brand-300">
                  <MapPin size={11} /> {complaint.location}
                </div>
                <h4 className="mt-1 text-xs font-bold leading-snug line-clamp-2 text-white">
                  "{complaint.title}"
                </h4>
              </div>
            </div>

            {/* Story Impact Footer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-brand-100">
                  {category.short}
                </span>
                <span className="font-mono text-amber-300">
                  Priority {complaint.score}/100
                </span>
              </div>

              {/* Link Sticker */}
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-center text-xs font-bold text-slate-900 shadow-lg">
                <ExternalLink size={13} className="text-brand-600" />
                <span>Tap to Support & Track</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={copyStoryText}
              className="focus-ring flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              {copiedStory ? <Check size={14} /> : <Copy size={14} />}
              {copiedStory ? "Story Text Copied!" : "Copy One-Line Caption"}
            </button>
            <button
              onClick={shareWhatsApp}
              className="focus-ring flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Share2 size={13} className="text-emerald-600" />
              Share to WhatsApp Status / Story
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
