import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Construction,
  Droplets,
  FolderKanban,
  Lightbulb,
  Loader2,
  MapPin,
  Mic,
  Navigation,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  Square,
  Trash2,
  Volume2,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/store/ToastContext";
import { useComplaints } from "@/store/ComplaintsContext";
import { CATEGORIES, categoryMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getCurrentPosition, reverseGeocode, getCityCoordinates } from "@/lib/location";
import type { CategoryId } from "@/types";

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg",
    "audio/wav",
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function getAudioExtension(mime: string): string {
  if (mime.includes("mp4") || mime.includes("aac") || mime.includes("m4a")) return ".m4a";
  if (mime.includes("ogg")) return ".ogg";
  if (mime.includes("wav")) return ".wav";
  return ".webm";
}

const CATEGORY_ITEMS: { id: CategoryId; label: string; icon: typeof Construction }[] = [
  { id: "roads", label: "Roads & Potholes", icon: Construction },
  { id: "waste", label: "Garbage & Waste", icon: Trash2 },
  { id: "water", label: "Water Supply", icon: Droplets },
  { id: "drainage", label: "Drainage & Sewage", icon: Waves },
  { id: "electricity", label: "Streetlights & Power", icon: Lightbulb },
  { id: "safety", label: "Safety & Hazards", icon: ShieldAlert },
  { id: "other", label: "Other Civic Issue", icon: FolderKanban },
];

export default function VoiceReport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedCity, createComplaint } = useComplaints();

  // Recording states
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [category, setCategory] = useState<CategoryId>("roads");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [address, setAddress] = useState(selectedCity);
  const [lat, setLat] = useState(() => getCityCoordinates(selectedCity).lat);
  const [lng, setLng] = useState(() => getCityCoordinates(selectedCity).lng);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (recorder.current && recorder.current.state !== "inactive") {
        recorder.current.stop();
      }
      stream.current?.getTracks().forEach((track) => track.stop());
      if (timer.current) window.clearInterval(timer.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Auto-fetch location on mount
  useEffect(() => {
    let active = true;
    const fetchGps = async () => {
      try {
        const pos = await Promise.race([
          getCurrentPosition(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3500)),
        ]);
        if (!active) return;
        setLat(pos.lat);
        setLng(pos.lng);
        const geo = await Promise.race([
          reverseGeocode(pos.lat, pos.lng),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500)),
        ]).catch(() => null);
        if (!active) return;
        if (geo?.fullAddress) setAddress(geo.fullAddress);
      } catch {
        // Fallback already pre-set to selected city
      }
    };
    fetchGps();
    return () => {
      active = false;
    };
  }, [selectedCity]);

  const stopTimer = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };

  const handleStartRecording = async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported on this browser. Please use a modern browser.");
      return;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      stream.current = media;
      chunks.current = [];

      const detectedMime = getSupportedMimeType();
      const options = detectedMime ? { mimeType: detectedMime } : undefined;
      const mediaRecorder = new MediaRecorder(media, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (chunks.current.length > 0) {
          const finalMime = mediaRecorder.mimeType || detectedMime || "audio/webm";
          const blob = new Blob(chunks.current, { type: finalMime });
          setAudioBlob(blob);
          setMimeType(finalMime);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          const newUrl = URL.createObjectURL(blob);
          setAudioUrl(newUrl);
        }
        media.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // 1-second chunks for smooth buffer
      recorder.current = mediaRecorder;
      setRecording(true);
      setSeconds(0);
      setAudioUrl(null);
      setAudioBlob(null);

      timer.current = window.setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 180) {
            handleStopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        setError("Microphone permission was denied. Please allow microphone access in your browser settings to record.");
      } else {
        setError("Could not access microphone. Please check that your device microphone is connected and enabled.");
      }
    }
  };

  const handleStopRecording = () => {
    if (recorder.current && recorder.current.state !== "inactive") {
      recorder.current.stop();
    }
    setRecording(false);
    stopTimer();
  };

  const handleResetRecording = () => {
    if (recorder.current && recorder.current.state !== "inactive") {
      recorder.current.stop();
    }
    setRecording(false);
    stopTimer();
    setSeconds(0);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setError(null);
  };

  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setLat(pos.lat);
      setLng(pos.lng);
      const geo = await reverseGeocode(pos.lat, pos.lng);
      if (geo.fullAddress) {
        setAddress(geo.fullAddress);
        toast({ title: "Live GPS resolved", description: geo.fullAddress, variant: "success" });
      }
    } catch {
      toast({ title: "Location detection timed out", description: `Defaulted to ${selectedCity}`, variant: "info" });
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob) {
      toast({ title: "Please record your voice note first", variant: "error" });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload audio file to media endpoint
      const ext = getAudioExtension(mimeType);
      const file = new File([audioBlob], `voice_report_${Date.now()}${ext}`, {
        type: mimeType || "audio/webm",
      });

      const formData = new FormData();
      formData.append("file", file);

      const mediaRes = await fetch("/api/complaints/media", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (!mediaRes.ok) {
        const errJson = await mediaRes.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to upload audio recording.");
      }

      const mediaData = (await mediaRes.json()) as { id: string; url: string };
      const mediaId = mediaData.id;

      // 2. Submit complaint with audio attached
      const catMeta = categoryMeta(category);
      const cleanNote = note.trim();
      const title = cleanNote
        ? `Voice: ${cleanNote.slice(0, 70)}`
        : `Voice Report: ${catMeta.label} issue`;
      const description = cleanNote
        ? `Official citizen voice note regarding ${catMeta.label}. Note: "${cleanNote}". Recorded on-site in ${address}. Audio evidence attached.`
        : `Official citizen voice note recorded for ${catMeta.label} at ${address}. Verified audio evidence attached.`;

      const newComplaint = await createComplaint({
        title,
        description,
        category,
        severity: "medium",
        city: selectedCity,
        location: address,
        lat,
        lng,
        mediaIds: [mediaId],
      });

      toast({
        title: "Voice report submitted",
        description: `Official complaint ${newComplaint.id} logged with your audio recording.`,
        variant: "success",
      });

      navigate(`/reports/${newComplaint.id}`);
    } catch (err) {
      toast({
        title: "Could not submit report",
        description: err instanceof Error ? err.message : "Submission failed. Please check network and try again.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-3 py-4 sm:px-4 sm:py-6">
      {/* Back button */}
      <div>
        <Link
          to="/report"
          className="focus-ring inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft size={14} /> Back to Report Options
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Voice Note Report
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Record your civic issue directly. Listen to the preview, choose a category, and submit instantly.
        </p>
      </div>

      {/* Main Recording Surface */}
      <div className="surface p-5 sm:p-6 text-center space-y-4">
        {/* State 1: Ready to record / Recording */}
        {!audioUrl ? (
          <div className="space-y-4">
            <div className="relative inline-flex items-center justify-center">
              {recording && (
                <span className="absolute -inset-3 rounded-full bg-red-400/25 animate-ping" />
              )}
              <button
                type="button"
                onClick={recording ? handleStopRecording : handleStartRecording}
                className={cn(
                  "relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full transition shadow-lg active:scale-95 focus-ring",
                  recording
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                )}
                aria-label={recording ? "Stop recording voice note" : "Start recording voice note"}
              >
                {recording ? (
                  <Square size={36} className="fill-current" />
                ) : (
                  <Mic size={40} />
                )}
              </button>
            </div>

            <div>
              <p className="font-mono text-2xl font-bold text-slate-900 sm:text-3xl">
                {timeFormatted}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {recording ? "Recording audio... Tap stop when finished." : "Tap microphone to start recording"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Maximum recording length: 3 minutes</p>
            </div>

            {recording && (
              <Button
                variant="danger"
                size="md"
                onClick={handleStopRecording}
                className="w-full sm:w-auto"
              >
                <Square size={16} className="fill-current mr-1.5" />
                Stop & Preview Recording
              </Button>
            )}
          </div>
        ) : (
          /* State 2: Preview & Controls */
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 size={13} /> Voice Note Recorded ({timeFormatted})
              </span>
              <button
                type="button"
                onClick={handleResetRecording}
                className="focus-ring inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 transition"
              >
                <RotateCcw size={12} /> Re-record
              </button>
            </div>

            {/* Audio Player */}
            <div className="rounded-xl border border-line bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Volume2 size={15} className="text-brand-600" />
                <span>Listen to preview</span>
              </div>
              <audio controls src={audioUrl} className="w-full h-11" />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Details & Submission card (visible once recorded) */}
      {audioUrl && (
        <div className="surface p-4 sm:p-5 space-y-4">
          {/* Category selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Civic Department / Category *
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORY_ITEMS.map((item) => {
                const Icon = item.icon;
                const isSelected = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={cn(
                      "focus-ring flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition",
                      isSelected
                        ? "border-brand-600 bg-brand-50/80 text-brand-900 shadow-xs"
                        : "border-line bg-white text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <Icon size={16} className={isSelected ? "text-brand-600" : "text-slate-400"} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Location Geotag *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street name or ward area"
                className="field flex-1 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDetectLocation}
                disabled={locating}
                className="shrink-0 text-xs"
              >
                {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                <span>Live GPS</span>
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          </div>

          {/* Optional landmark note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Landmark or Note (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Near Community Park Gate 2, Main Road"
              className="field text-xs"
            />
          </div>

          {/* Direct Submission Button */}
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full justify-center text-sm font-bold shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Submitting Official Voice Report...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Submit Official Voice Report
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
