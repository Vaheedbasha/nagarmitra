import { useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Copy,
  ImagePlus,
  Info,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  Send,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CityMap } from "@/components/map/CityMap";
import { PriorityChip } from "@/components/ui/Badge";
import { useComplaints } from "@/store/ComplaintsContext";
import { useToast } from "@/store/ToastContext";
import { CATEGORIES, TOP_CATEGORY_IDS, categoryMeta } from "@/lib/constants";
import { SEVERITY_FACTORS, priorityFromScore, scoreFromFactors } from "@/data/complaints";
import { uploadMedia } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { CategoryId, Complaint, PriorityFactors } from "@/types";

const SEVERITIES = [
  { id: "low", label: "Low", description: "Minor nuisance, no immediate risk" },
  { id: "medium", label: "Medium", description: "Needs attention but not urgent" },
  { id: "high", label: "High", description: "Affects many people every day" },
  { id: "critical", label: "Critical", description: "Immediate safety or health risk" },
] as const;

type SeverityId = (typeof SEVERITIES)[number]["id"];

interface UploadItem {
  id: string;
  url: string;
  kind: "photo" | "video";
  name: string;
  size: number;
  progress: number;
}

interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  Riverton: { lat: 17.4, lng: 78.47 },
  "Metro Heights": { lat: 17.47, lng: 78.38 },
  "Bay City": { lat: 17.34, lng: 78.56 },
};

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { accept: "application/json" } }
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

export default function ManualReport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createComplaint, selectedCity } = useComplaints();
  const [searchParams] = useSearchParams();
  const routeLocation = useLocation();
  const prefill = (routeLocation.state ?? {}) as {
    title?: string;
    description?: string;
    category?: CategoryId;
    aiSummary?: string;
    aiSource?: string;
  };
  const center = CITY_CENTERS[selectedCity] ?? CITY_CENTERS.Riverton;

  const initialCategory = (prefill.category ?? searchParams.get("category") ?? "") as CategoryId | "";
  const [title, setTitle] = useState(prefill.title ?? "");
  const [description, setDescription] = useState(prefill.description ?? "");
  const [category, setCategory] = useState<CategoryId | "">(initialCategory);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [severity, setSeverity] = useState<SeverityId>("medium");
  const [address, setAddress] = useState("");
  const [ward, setWard] = useState("");
  const [pin, setPin] = useState({ lat: center.lat, lng: center.lng });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<"details" | "review">("details");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Complaint | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const factors = SEVERITY_FACTORS[severity] as PriorityFactors;
  const score = useMemo(() => scoreFromFactors(factors), [factors]);
  const priority = priorityFromScore(score);
  const visibleCategories = showAllCategories
    ? CATEGORIES
    : CATEGORIES.filter((item) => TOP_CATEGORY_IDS.includes(item.id));

  const setLocation = async (lat: number, lng: number, label?: string) => {
    setPin({ lat, lng });
    setErrors((current) => ({ ...current, address: "" }));
    if (label) {
      setAddress(label);
      return;
    }
    const resolved = await reverseGeocode(lat, lng);
    if (resolved) setAddress(resolved);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location is not available in this browser", variant: "error" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await setLocation(position.coords.latitude, position.coords.longitude);
        setLocating(false);
        toast({ title: "Location captured", description: "Adjust the pin if needed.", variant: "success" });
      },
      (error) => {
        setLocating(false);
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Search for the address instead."
            : error.code === error.TIMEOUT
              ? "Location request timed out. Search for the address instead."
              : "Could not get your location. Search for the address instead.";
        toast({ title: "Location unavailable", description: message, variant: "error" });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const searchAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim().length < 3) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(
          `${searchQuery}, ${selectedCity}`
        )}`,
        { headers: { accept: "application/json" } }
      );
      if (!response.ok) throw new Error("Address search failed");
      const data = (await response.json()) as { display_name: string; lat: string; lon: string }[];
      setSearchResults(
        data.map((item) => ({
          label: item.display_name,
          lat: Number(item.lat),
          lng: Number(item.lon),
        }))
      );
      if (data.length === 0) toast({ title: "No matching address found", variant: "info" });
    } catch {
      toast({
        title: "Address search is unavailable",
        description: "You can still tap the map to choose the location manually.",
        variant: "error",
      });
    } finally {
      setSearching(false);
    }
  };

  const onFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files.slice(0, 3)) {
      const isVideo = file.type.startsWith("video/");
      if (!isVideo && !file.type.startsWith("image/")) {
        toast({ title: `${file.name} is not an image or video`, variant: "error" });
        continue;
      }
      if (isVideo && file.size > 40 * 1024 * 1024) {
        toast({ title: `${file.name} is larger than 40 MB`, variant: "error" });
        continue;
      }
      if (!isVideo && file.size > 8 * 1024 * 1024) {
        toast({ title: `${file.name} is larger than 8 MB`, variant: "error" });
        continue;
      }
      const tempId = `${Date.now()}-${file.name}`;
      try {
        const result = await uploadMedia(file, (progress) => {
          setUploads((current) => [
            ...current.filter((item) => item.id !== tempId),
            {
              id: tempId,
              url: URL.createObjectURL(file),
              kind: isVideo ? "video" : "photo",
              name: file.name,
              size: file.size,
              progress,
            },
          ]);
        });
        setUploads((current) =>
          current.map((item) =>
            item.id === tempId
              ? { ...item, id: result.id, url: result.url, progress: 100 }
              : item
          )
        );
        toast({ title: "Evidence uploaded", description: file.name, variant: "success" });
      } catch (caught) {
        setUploads((current) => current.filter((item) => item.id !== tempId));
        toast({
          title: "Upload failed",
          description: caught instanceof Error ? caught.message : file.name,
          variant: "error",
        });
      }
    }
    setUploading(false);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (title.trim().length < 8) next.title = "Add a title of at least 8 characters.";
    if (description.trim().length < 25) next.description = "Describe the issue in at least 25 characters.";
    if (!category) next.category = "Select the category that fits best.";
    if (address.trim().length < 4) next.address = "Add the area or street, or tap the map.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goToReview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      toast({ title: "Check the highlighted fields", variant: "error" });
      return;
    }
    if (uploading) {
      toast({ title: "Wait for the upload to finish", variant: "info" });
      return;
    }
    setStep("review");
    window.scrollTo({ top: 0 });
  };

  const submit = async () => {
    if (!validate()) {
      setStep("details");
      return;
    }
    setSubmitting(true);
    try {
      const complaint = await createComplaint({
        title: title.trim(),
        description: description.trim(),
        category: category as CategoryId,
        severity,
        location: address.trim(),
        area: address.split(",")[0]?.trim(),
        ward: ward || undefined,
        city: selectedCity,
        lat: pin.lat,
        lng: pin.lng,
        mediaIds: uploads.map((item) => item.id),
        aiSummary: prefill.aiSummary,
        aiSource: prefill.aiSource,
      });
      setCreated(complaint);
      toast({ title: "Complaint submitted", description: `${complaint.id} saved to NagarMitra.`, variant: "success" });
    } catch (caught) {
      toast({
        title: "Submission failed",
        description: caught instanceof Error ? caught.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="mx-auto max-w-lg animate-fade-up">
        <div className="surface overflow-hidden">
          <div className="border-b border-line bg-gradient-to-b from-accent-50 to-white px-6 pb-6 pt-9 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg shadow-accent-500/25">
              <CheckCircle2 size={32} strokeWidth={2.2} />
            </span>
            <h1 className="mt-4 text-xl font-extrabold">Report submitted</h1>
            <p className="mx-auto mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-slate-500">
              Your complaint is saved in the municipal database and queued for ward review.
            </p>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-xl border border-line bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Complaint ID</span>
                <button
                  onClick={() => {
                    void navigator.clipboard?.writeText(created.id);
                    toast({ title: "Complaint ID copied", variant: "info" });
                  }}
                  className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand-600"
                >
                  <Copy size={11} /> Copy
                </button>
              </div>
              <p className="mt-1 font-mono text-lg font-bold tracking-tight text-slate-900">{created.id}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <PriorityChip priority={created.priority} score={created.score} size="sm" />
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-line">
                  {formatDate(created.date)}
                </span>
                {created.photo || created.video ? (
                  <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-line">
                    {created.photo ? "Photo" : ""}
                    {created.photo && created.video ? " + " : ""}
                    {created.video ? "Video" : ""} attached
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-900">{created.title}</p>
              <p className="mt-1 flex items-center gap-1 text-[11.5px] text-slate-500">
                <MapPin size={11} /> {created.location}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => navigate(`/reports/${created.id}`)}>
                View complaint <ChevronRight size={15} />
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/reports")}>
                My reports
              </Button>
            </div>
            <p className="text-center text-[10.5px] leading-relaxed text-slate-400">
              Saved to the NagarMitra database. This record survives refresh and restart.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft size={14} /> Back to home
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold sm:text-2xl">
            {step === "details" ? "Report an issue" : "Review your report"}
          </h1>
          <p className="mt-1 text-[12.5px] text-slate-500">
            {step === "details"
              ? "A few details help the right team find and fix it faster."
              : "Check everything before it is sent to the municipal queue."}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[10.5px] font-medium text-slate-500">
          {step === "details" ? "Step 1 of 2" : "Step 2 of 2"} · {selectedCity}
        </div>
      </div>

      {step === "review" ? (
        <div className="space-y-4">
          <section className="surface p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Draft complaint</p>
                <h2 className="mt-1 text-[16px] font-bold text-slate-900">{title}</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{description}</p>
              </div>
              <PriorityChip priority={priority} score={score} size="sm" />
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-slate-400">Category</dt>
                <dd className="mt-0.5 text-[12px] font-semibold text-slate-700">{categoryMeta(category as CategoryId).label}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-slate-400">Severity</dt>
                <dd className="mt-0.5 text-[12px] font-semibold text-slate-700">{severity}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-wide text-slate-400">Location</dt>
                <dd className="mt-0.5 text-[12px] font-semibold text-slate-700">{address}</dd>
                <dd className="text-[10.5px] font-mono text-slate-400">{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</dd>
              </div>
            </dl>
            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              <CityMap complaints={[]} pin={pin} className="h-52" autoFit={false} showLegend={false} />
            </div>
            {uploads.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {uploads.map((item) =>
                  item.kind === "photo" ? (
                    <img key={item.id} src={item.url} alt={item.name} className="h-20 w-24 rounded-lg object-cover ring-1 ring-line" />
                  ) : (
                    <span key={item.id} className="flex h-20 w-24 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Video size={18} />
                    </span>
                  )
                )}
              </div>
            ) : null}
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-brand-50/60 px-3 py-2 text-[10.5px] leading-relaxed text-brand-800">
              <Info size={12} className="mt-0.5 shrink-0" />
              Priority is calculated with a transparent rule-based model (severity 35%, impact 25%,
              recurrence 20%, urgency 20%). Your identity stays hidden from public views.
            </p>
          </section>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={() => setStep("details")} disabled={submitting}>
              <ArrowLeft size={15} /> Edit details
            </Button>
            <Button className="flex-1" onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {submitting ? "Submitting…" : "Confirm & submit"}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={goToReview} className="space-y-4" noValidate>
          <section className="surface p-4 sm:p-5">
            <h2 className="mb-3 text-[14px] font-bold">Issue details</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="field-label">
                  Issue title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setErrors((current) => ({ ...current, title: "" }));
                  }}
                  placeholder="e.g. Deep pothole outside the school gate"
                  maxLength={90}
                  className={cn("field", errors.title && "border-red-300")}
                />
                {errors.title ? <p className="mt-1 text-[11px] font-medium text-red-500">{errors.title}</p> : null}
              </div>

              <div>
                <label htmlFor="description" className="field-label">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setErrors((current) => ({ ...current, description: "" }));
                  }}
                  rows={4}
                  placeholder="What is the issue, how long has it been there, and who does it affect?"
                  className={cn("field resize-none", errors.description && "border-red-300")}
                />
                {errors.description ? (
                  <p className="mt-1 text-[11px] font-medium text-red-500">{errors.description}</p>
                ) : null}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="field-label mb-0">
                    Category <span className="text-red-500">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((value) => !value)}
                    className="text-[11px] font-semibold text-brand-600"
                  >
                    {showAllCategories ? "Show top 6" : `All ${CATEGORIES.length} categories`}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {visibleCategories.map((item) => {
                    const Icon = item.icon;
                    const active = category === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setCategory(item.id);
                          setErrors((current) => ({ ...current, category: "" }));
                        }}
                        className={cn(
                          "focus-ring flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[11.5px] font-semibold transition",
                          active
                            ? "border-brand-300 bg-brand-50 text-brand-800 ring-1 ring-brand-200"
                            : "border-line bg-white text-slate-600 hover:border-slate-300"
                        )}
                        aria-pressed={active}
                      >
                        <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg", item.tile)}>
                          <Icon size={13} />
                        </span>
                        {item.short}
                      </button>
                    );
                  })}
                </div>
                {errors.category ? (
                  <p className="mt-1 text-[11px] font-medium text-red-500">{errors.category}</p>
                ) : null}
              </div>

              <div>
                <span className="field-label">How severe is it?</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SEVERITIES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSeverity(option.id)}
                      aria-pressed={severity === option.id}
                      className={cn(
                        "focus-ring rounded-xl border px-2.5 py-2 text-left transition",
                        severity === option.id
                          ? "border-brand-300 bg-brand-50"
                          : "border-line bg-white hover:border-slate-300"
                      )}
                    >
                      <span className="block text-[12px] font-bold text-slate-800">{option.label}</span>
                      <span className="mt-0.5 block text-[9.5px] leading-snug text-slate-500">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="surface p-4 sm:p-5">
            <h2 className="mb-1 text-[14px] font-bold">Location</h2>
            <p className="mb-3 text-[11px] text-slate-500">
              Tap the map, search an address, or use your current position. You can adjust the pin.
            </p>

            <form onSubmit={searchAddress} className="mb-3 flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search street, landmark or area"
                  className="field pl-9"
                  aria-label="Search address"
                />
              </div>
              <Button type="submit" variant="outline" disabled={searching}>
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </Button>
              <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating}>
                {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                <span className="hidden sm:inline">My location</span>
              </Button>
            </form>

            {searchResults.length > 0 ? (
              <ul className="mb-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                {searchResults.map((result) => (
                  <li key={`${result.lat}-${result.lng}`}>
                    <button
                      type="button"
                      onClick={() => {
                        void setLocation(result.lat, result.lng, result.label);
                        setSearchResults([]);
                      }}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left text-[11.5px] text-slate-600 hover:bg-slate-50"
                    >
                      <MapPin size={13} className="mt-0.5 shrink-0 text-brand-500" />
                      {result.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-line">
              <CityMap
                complaints={[]}
                pin={pin}
                onMapClick={(coords) => void setLocation(coords.lat, coords.lng)}
                className="h-64"
                autoFit={false}
                showLegend={false}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="address" className="field-label">
                  Address or area <span className="text-red-500">*</span>
                </label>
                <input
                  id="address"
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setErrors((current) => ({ ...current, address: "" }));
                  }}
                  placeholder="Street, landmark, ward"
                  className={cn("field", errors.address && "border-red-300")}
                />
                {errors.address ? (
                  <p className="mt-1 text-[11px] font-medium text-red-500">{errors.address}</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="ward" className="field-label">Ward</label>
                <input id="ward" value={ward} onChange={(event) => setWard(event.target.value)} placeholder="Ward 4" className="field" />
              </div>
              <div>
                <span className="field-label">Coordinates</span>
                <div className="flex h-10 items-center rounded-xl border border-line bg-slate-50 px-3 font-mono text-[11px] text-slate-500">
                  {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                </div>
              </div>
            </div>
          </section>

          <section className="surface p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-bold">Photo or video evidence</h2>
                <p className="text-[11px] text-slate-500">Optional · images up to 8 MB, videos up to 40 MB</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => fileInput.current?.click()} disabled={uploading}>
                <ImagePlus size={14} /> Add
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                multiple
                className="hidden"
                onChange={onFiles}
              />
            </div>

            {uploads.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-line bg-slate-50/60 px-4 py-6 text-slate-400 hover:border-brand-300 hover:text-brand-600"
              >
                <UploadCloud size={20} />
                <span className="text-[11.5px] font-semibold">Upload evidence</span>
                <span className="text-[10px]">Stored on the server, attached to your complaint</span>
              </button>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {uploads.map((item) => (
                  <li key={item.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-white p-2">
                    {item.kind === "photo" ? (
                      <img src={item.url} alt={item.name} className="h-12 w-14 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-12 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <Video size={16} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-slate-700">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{(item.size / 1024 / 1024).toFixed(1)} MB</p>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-brand-500 transition-all" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploads((current) => current.filter((entry) => entry.id !== item.id))}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={uploading || submitting}>
              Review report <ArrowRight size={15} />
            </Button>
            <Link
              to="/report/voice"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[12px] font-semibold text-slate-600 hover:border-slate-300"
            >
              <Camera size={14} /> Use voice instead
            </Link>
            <span className="text-[10.5px] text-slate-400">
              <X size={11} className="mr-1 inline" /> Nothing is submitted until you confirm.
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
