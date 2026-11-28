import { useEffect, useRef, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Flame,
  Image,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  Music,
  Navigation,
  Play,
  Plus,
  Send,
  Square,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CityMap } from "@/components/map/CityMap";
import { useComplaints } from "@/store/ComplaintsContext";
import { useToast } from "@/store/ToastContext";
import { uploadMedia } from "@/lib/api";
import { CATEGORIES, categoryMeta } from "@/lib/constants";
import { translate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  getCurrentPosition,
  reverseGeocode,
  getCityCoordinates,
} from "@/lib/location";
import type { CategoryId, Complaint } from "@/types";

interface MessageMedia {
  id: string;
  url: string;
  name: string;
  kind: "photo" | "video" | "audio";
}

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  media?: MessageMedia;
  actionChips?: { label: string; action: () => void }[];
  isReviewCard?: boolean;
}

type Severity = "low" | "medium" | "high" | "critical";

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

const GREETINGS = [
  "hello",
  "hi",
  "hey",
  "namaste",
  "namaskar",
  "vanakkam",
  "good morning",
  "good afternoon",
  "good evening",
  "help",
];

const RULES: { category: CategoryId; words: string[] }[] = [
  { category: "roads", words: ["pothole", "road", "street", "pavement", "divider", "traffic signal", "गड्ढा", "सड़क", "గుంత", "రోడ్డు"] },
  { category: "waste", words: ["garbage", "waste", "trash", "dump", "bin", "litter", "कचरा", "कूड़ा", "చెత్త", "డంప్"] },
  { category: "water", words: ["water", "pipe", "pipeline", "tap", "leak", "drinking water", "पानी", "नल", "నీరు", "పైపు"] },
  { category: "drainage", words: ["drain", "drainage", "sewage", "gutter", "overflow", "flood", "नाला", "सीवर", "మురుగు", "కాలువ"] },
  { category: "electricity", words: ["light", "streetlight", "electric", "power", "wire", "pole", "बिजली", "बत्ती", "విద్యుత్", "దీపం"] },
  { category: "safety", words: ["danger", "accident", "unsafe", "open pit", "fire", "dog", "animal", "खतरा", "दुर्घटना", "ప్రమాదం"] },
];

function nowLabel() {
  return new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function ChatReport() {
  const navigate = useNavigate();
  const { language, selectedCity, createComplaint } = useComplaints();
  const { toast } = useToast();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  const initialCityCenter = useMemo(() => getCityCoordinates(selectedCity), [selectedCity]);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    description: string;
    category: CategoryId;
    severity: Severity;
    source: "rule-based";
  } | null>(null);

  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(initialCityCenter.lat);
  const [lng, setLng] = useState(initialCityCenter.lng);
  const [locating, setLocating] = useState(false);

  const [photo, setPhoto] = useState<{ id: string; url: string; name: string } | null>(null);
  const [attachedMedia, setAttachedMedia] = useState<MessageMedia | null>(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Complaint | null>(null);

  // In-place Voice Recorder State
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Hidden File Inputs
  const liveCameraInputRef = useRef<HTMLInputElement>(null);
  const photoUploadInputRef = useRef<HTMLInputElement>(null);
  const liveVideoInputRef = useRef<HTMLInputElement>(null);
  const videoUploadInputRef = useRef<HTMLInputElement>(null);
  const audioUploadInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);
  const [listening, setListening] = useState(false);

  // Initial welcome message
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Namaste! I am your NagarMitra civic assistant. What issue would you like to report? You can describe it in words, record a voice note, or click a live photo.",
      time: nowLabel(),
    },
  ]);

  // Click outside to close Plus menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update map coordinates when city changes (if user hasn't pinpointed GPS)
  useEffect(() => {
    if (!address) {
      const coords = getCityCoordinates(selectedCity);
      setLat(coords.lat);
      setLng(coords.lng);
    }
  }, [selectedCity, address]);

  // Auto scroll chat to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, draft, attachedMedia, recordingVoice]);

  // Fetch real device GPS coordinates with reverse geocoding
  const fetchCurrentLocation = async (silent = false): Promise<{ lat: number; lng: number; address: string } | null> => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setLat(pos.lat);
      setLng(pos.lng);
      const geo = await reverseGeocode(pos.lat, pos.lng);
      setAddress(geo.fullAddress);
      if (!silent) {
        toast({
          title: "Live location detected",
          description: geo.fullAddress,
          variant: "success",
        });
      }
      return { lat: pos.lat, lng: pos.lng, address: geo.fullAddress };
    } catch (err: any) {
      if (!silent) {
        toast({
          title: "Location error",
          description: err.message || "Please allow location access in your browser.",
          variant: "error",
        });
      }
      return null;
    } finally {
      setLocating(false);
    }
  };

  const pushMessage = (message: Omit<Message, "id" | "time">) =>
    setMessages((current) => [
      ...current,
      { ...message, id: `${Date.now()}-${Math.random()}`, time: nowLabel() },
    ]);

  // General media upload handler
  const handleMediaUpload = async (
    file: File | Blob | undefined,
    kind: "photo" | "video" | "audio",
    isLiveCamera = false
  ) => {
    setShowPlusMenu(false);
    if (!file) return;

    const fileName =
      file instanceof File
        ? file.name
        : `${kind === "audio" ? "Voice_Recording" : "Live_Media"}_${Date.now()}.${
            kind === "audio" ? "webm" : "jpg"
          }`;

    if (kind === "video" && file.size > 40 * 1024 * 1024) {
      toast({ title: "Video too large", description: "Video must be under 40 MB (up to 1 minute).", variant: "error" });
      return;
    }
    if (kind === "photo" && file.size > 10 * 1024 * 1024) {
      toast({ title: "Photo too large", description: "Image must be under 10 MB.", variant: "error" });
      return;
    }

    setUploading(true);
    try {
      // Create a File object if a Blob was supplied from MediaRecorder
      const uploadable = file instanceof File ? file : new File([file], fileName, { type: file.type || "audio/webm" });
      const result = await uploadMedia(uploadable);

      const mediaItem: MessageMedia = {
        id: result.id,
        url: result.url,
        name: fileName,
        kind,
      };

      setAttachedMedia(mediaItem);
      setPhoto(mediaItem);

      // If user snapped a LIVE CAMERA photo: Option B - 1-Tap Review with auto GPS
      if (isLiveCamera) {
        toast({ title: "Capturing live location…", variant: "info" });
        const loc = await fetchCurrentLocation(true);
        const resolvedAddress = loc?.address || `${selectedCity}`;

        const photoDraft = {
          title: `Civic issue reported via live photo`,
          description: `Citizen photo evidence captured at ${resolvedAddress}.`,
          category: "roads" as CategoryId,
          severity: "medium" as Severity,
          source: "rule-based" as const,
        };

        setDraft(photoDraft);

        pushMessage({
          sender: "user",
          text: "Captured live photo at current location.",
          media: mediaItem,
        });

        pushMessage({
          sender: "bot",
          text: `Live photo and GPS location detected (${resolvedAddress}). Review details below or tap 'Confirm & Submit'.`,
          isReviewCard: true,
        });
      } else {
        toast({
          title: `${kind === "photo" ? "Photo" : kind === "video" ? "Video" : "Audio"} attached`,
          description: fileName,
          variant: "success",
        });
      }
    } catch (caught: any) {
      toast({
        title: "Upload failed",
        description: caught instanceof Error ? caught.message : "Try another file.",
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  // In-place Voice Recording logic
  const startVoiceRecording = async () => {
    setShowPlusMenu(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({ title: "Voice recording not supported in this browser", variant: "error" });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
        if (audioChunksRef.current.length > 0) {
          void handleMediaUpload(audioBlob, "audio");
        }
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setRecordingVoice(true);
      setRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((sec) => {
          if (sec >= 59) {
            stopVoiceRecording();
            return 60;
          }
          return sec + 1;
        });
      }, 1000);
    } catch (err: any) {
      toast({ title: "Microphone permission needed", description: "Please allow microphone access to record voice.", variant: "error" });
    }
  };

  const stopVoiceRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecordingVoice(false);
  };

  const cancelVoiceRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecordingVoice(false);
    setRecordSeconds(0);
    toast({ title: "Voice recording cancelled", variant: "info" });
  };

  // Conversational message processing (fast, reliable, zero AI-outage risk)
  const processMessage = (rawText: string) => {
    const text = rawText.trim();
    if (!text && !attachedMedia) return;

    const promptText = text || (attachedMedia ? `Report issue with attached ${attachedMedia.kind} evidence.` : "");
    pushMessage({ sender: "user", text: promptText, media: attachedMedia ?? undefined });
    setAttachedMedia(null);
    setInput("");

    const lower = text.toLowerCase();

    // 1. Check for greetings ("hello", "hi", "namaste", etc.)
    const isGreeting = GREETINGS.some((g) => lower === g || lower.startsWith(`${g} `) || lower.endsWith(` ${g}`));

    if (isGreeting && text.length < 25) {
      pushMessage({
        sender: "bot",
        text: "Namaste! How can I assist you today? You can select an issue category below, describe the problem, or attach a photo or voice clip.",
        actionChips: [
          { label: "Pothole / Road", action: () => selectCategoryIssue("roads", "Pothole on road") },
          { label: "Garbage Pile", action: () => selectCategoryIssue("waste", "Garbage accumulation on roadside") },
          { label: "Streetlight Broken", action: () => selectCategoryIssue("electricity", "Streetlight not working") },
          { label: "Water Leakage", action: () => selectCategoryIssue("water", "Water pipeline leakage") },
          { label: "Drain Overflow", action: () => selectCategoryIssue("drainage", "Drainage overflow / sewage blockage") },
          { label: "Detect GPS Location", action: () => void fetchCurrentLocation() },
        ],
      });
      return;
    }

    // 2. Deterministic civic categorization
    setThinking(true);
    setTimeout(() => {
      const match = RULES.find((entry) => entry.words.some((word) => lower.includes(word)));
      const category: CategoryId = match?.category ?? "other";

      const sentence = text.split(/[.!?]/)[0].trim() || "Civic report";
      const cleanTitle =
        sentence.length > 60
          ? (sentence.slice(0, sentence.lastIndexOf(" ", 60)).trim() || sentence.slice(0, 60))
          : sentence;

      const capitalizedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

      setDraft({
        title: capitalizedTitle,
        description: text,
        category,
        severity: /(danger|accident|child|electric|fire|खतरा|ప్రమాదం|death|spark)/i.test(text) ? "high" : "medium",
        source: "rule-based",
      });

      pushMessage({
        sender: "bot",
        text: `I have prepared a draft report under "${categoryMeta(category).label}". Please review the location and details, then click "Submit complaint".`,
      });

      setThinking(false);
    }, 200);
  };

  const selectCategoryIssue = (category: CategoryId, sampleTitle: string) => {
    setDraft({
      title: sampleTitle,
      description: `${sampleTitle} observed in ${selectedCity}.`,
      category,
      severity: "medium",
      source: "rule-based",
    });

    pushMessage({
      sender: "bot",
      text: `Draft set to "${categoryMeta(category).label}". Please check or pinpoint your location on the map, then submit.`,
    });
  };

  // Fixed speech recognition (eliminates duplicate word bug)
  const toggleMic = () => {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const Ctor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
    if (!Ctor) {
      toast({ title: "Speech recognition not supported in this browser", variant: "error" });
      return;
    }
    const instance = new Ctor();
    instance.lang = language === "hi" ? "hi-IN" : language === "te" ? "te-IN" : "en-IN";
    instance.interimResults = true;
    instance.continuous = false;

    let finalTranscript = "";

    instance.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const combined = (finalTranscript + (interim ? ` ${interim}` : "")).trim();
      if (combined) {
        setInput(combined);
      }
    };

    instance.onerror = () => {
      setListening(false);
    };

    instance.onend = () => {
      setListening(false);
    };

    recognition.current = instance;
    instance.start();
    setListening(true);
  };

  // Submission handler
  const submit = async () => {
    if (!draft) return;
    setSubmitting(true);
    try {
      const result = await createComplaint({
        title: draft.title,
        description: draft.description,
        category: draft.category,
        severity: draft.severity,
        city: selectedCity,
        location: address || `${selectedCity} (pinpoint on map)`,
        area: selectedCity,
        lat,
        lng,
        mediaIds: photo ? [photo.id] : [],
      });
      setCreated(result);
      pushMessage({
        sender: "bot",
        text: `Success! Complaint #${result.id} is officially logged and tracked in ${selectedCity}.`,
      });
      toast({ title: "Complaint filed", description: `#${result.id}`, variant: "success" });
    } catch (caught) {
      toast({
        title: "Could not submit complaint",
        description: caught instanceof Error ? caught.message : "Try again",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Post-submission Success Screen
  if (created) {
    return (
      <div className="mx-auto max-w-xl py-6 animate-fade-in">
        <div className="surface p-6 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="mt-3 text-xl font-extrabold sm:text-2xl">Complaint Registered</h1>
          <p className="mt-1 text-sm text-slate-500">
            Reference ID: <span className="font-mono font-bold text-slate-800">{created.id}</span>
          </p>
          <div className="mt-5 rounded-2xl border border-line bg-slate-50/70 p-4 text-left text-xs text-slate-600 space-y-1.5">
            <p className="font-bold text-slate-800">{created.title}</p>
            <p className="text-slate-500">{created.description}</p>
            <p className="flex items-center gap-1.5 pt-1 text-slate-700">
              <MapPin size={13} className="text-brand-600" /> {created.location} ({selectedCity})
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to={`/reports/${created.id}`}>
              <Button className="w-full sm:w-auto">Track Status</Button>
            </Link>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setCreated(null);
                setDraft(null);
                setPhoto(null);
                setAttachedMedia(null);
                setAddress("");
              }}
            >
              Report Another Issue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-white text-slate-600 hover:bg-slate-50 transition"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold sm:text-xl">AI & Civic Assistant</h1>
            <p className="text-[11px] text-slate-400">
              Instant complaint reporting in {selectedCity} · Educated & uneducated citizen friendly
            </p>
          </div>
        </div>
        <Link to="/report/manual" className="text-[11.5px] font-semibold text-brand-600 hover:underline">
          Use form instead
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Chat Conversation Box */}
        <div className="surface flex min-h-[460px] flex-col overflow-hidden">
          <div className="flex-1 space-y-3.5 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex flex-col", message.sender === "user" ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed shadow-sm",
                    message.sender === "user"
                      ? "rounded-br-sm bg-brand-600 text-white"
                      : "rounded-bl-sm border border-line bg-white text-slate-700"
                  )}
                >
                  {/* Inline Attached Media Rendering */}
                  {message.media ? (
                    <div className="mb-2 overflow-hidden rounded-xl bg-black/10 p-1">
                      {message.media.kind === "photo" ? (
                        <img
                          src={message.media.url}
                          alt={message.media.name}
                          className="max-h-52 w-full rounded-lg object-cover"
                        />
                      ) : message.media.kind === "video" ? (
                        <video
                          src={message.media.url}
                          controls
                          className="max-h-52 w-full rounded-lg bg-black"
                        />
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg bg-purple-50 border border-purple-100 p-2 text-purple-900">
                          <Music size={16} className="shrink-0 text-purple-600" />
                          <audio src={message.media.url} controls className="h-8 w-full max-w-[220px]" />
                        </div>
                      )}
                      <p className="mt-1 px-1 text-[9.5px] opacity-80 truncate">{message.media.name}</p>
                    </div>
                  ) : null}

                  {message.text}

                  <span
                    className={cn(
                      "mt-1 block text-[9px]",
                      message.sender === "user" ? "text-brand-200" : "text-slate-400"
                    )}
                  >
                    {message.time}
                  </span>
                </div>

                {/* Quick-tap Category Action Chips */}
                {message.actionChips ? (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                    {message.actionChips.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={chip.action}
                        className="rounded-xl border border-brand-200 bg-brand-50/80 px-2.5 py-1 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-100 active:scale-95 shadow-xs"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* Option B: 1-Tap Review Action Banner in Chat */}
                {message.isReviewCard && draft ? (
                  <div className="mt-2.5 w-full max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 shadow-sm animate-scale-in">
                    <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Ready to Submit</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 line-clamp-1">{draft.title}</p>
                    <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-emerald-600 shrink-0" />
                      {address || `${selectedCity}`}
                    </p>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={submitting}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      <span>Confirm & Submit Complaint</span>
                    </button>
                  </div>
                ) : null}
              </div>
            ))}

            {thinking ? (
              <div className="flex items-center gap-2 text-[11.5px] text-slate-400">
                <Loader2 size={13} className="animate-spin text-brand-600" /> Preparing your report draft…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          {/* Bottom Chat Bar */}
          <div className="border-t border-line bg-white p-3">
            {/* Hidden native inputs */}
            {/* 1. Live Camera (capture="environment") */}
            <input
              ref={liveCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void handleMediaUpload(f, "photo", true);
              }}
            />

            {/* 2. Photo Upload */}
            <input
              ref={photoUploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void handleMediaUpload(f, "photo", false);
              }}
            />

            {/* 3. Live Video (capture="environment") */}
            <input
              ref={liveVideoInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void handleMediaUpload(f, "video", false);
              }}
            />

            {/* 4. Video Upload */}
            <input
              ref={videoUploadInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void handleMediaUpload(f, "video", false);
              }}
            />

            {/* 5. Audio File Upload */}
            <input
              ref={audioUploadInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.weba"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void handleMediaUpload(f, "audio", false);
              }}
            />

            {/* Attached media preview pill */}
            {attachedMedia ? (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50/80 px-3 py-2 text-[11.5px] text-brand-900 animate-fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  {attachedMedia.kind === "photo" ? (
                    <img src={attachedMedia.url} alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-brand-300" />
                  ) : attachedMedia.kind === "video" ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                      <Video size={16} />
                    </span>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                      <Music size={16} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{attachedMedia.name}</p>
                    <p className="text-[9.5px] text-brand-600 capitalize">
                      {attachedMedia.kind === "video" ? "Video evidence attached" : `${attachedMedia.kind} attached`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachedMedia(null);
                    setPhoto(null);
                  }}
                  className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-red-500"
                  aria-label="Remove attachment"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}

            {/* In-place Live Voice Recorder Bar */}
            {recordingVoice ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-2.5 animate-scale-in">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-red-600 animate-ping" />
                  <span className="text-xs font-bold text-red-700">
                    Recording Voice: 0:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds} / 1:00
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 hover:text-red-600 border border-line"
                    title="Cancel recording"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-red-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-red-700"
                    title="Stop & Attach Voice Note"
                  >
                    <Square size={13} className="fill-current" />
                    <span>Attach Note</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Standard Input Form */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  processMessage(input);
                }}
                className="relative flex items-end gap-2"
              >
                {/* Plus (+) Menu Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                    className={cn(
                      "focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition",
                      showPlusMenu
                        ? "border-brand-500 bg-brand-50 text-brand-600 rotate-45 shadow-sm"
                        : "border-line text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    )}
                    aria-label="Add media attachment"
                    title="Attach photo, video or audio (+)"
                  >
                    <Plus size={18} />
                  </button>

                  {/* 6-Option Media Attachment Drawer */}
                  {showPlusMenu ? (
                    <div
                      ref={menuRef}
                      className="absolute bottom-12 left-0 z-30 w-64 rounded-2xl border border-line bg-white p-2 shadow-2xl animate-scale-in divide-y divide-slate-100"
                    >
                      {/* Section 1: Photos */}
                      <div className="pb-1.5">
                        <div className="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                          Photos & Camera
                        </div>
                        <button
                          type="button"
                          onClick={() => liveCameraInputRef.current?.click()}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <Camera size={15} />
                          </span>
                          <div>
                            <div>Take Live Photo</div>
                            <div className="text-[9px] font-normal text-slate-400">Auto-detects GPS location</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => photoUploadInputRef.current?.click()}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <Image size={15} />
                          </span>
                          <div>
                            <div>Upload Photo</div>
                            <div className="text-[9px] font-normal text-slate-400">From phone gallery</div>
                          </div>
                        </button>
                      </div>

                      {/* Section 2: Video Evidence */}
                      <div className="py-1.5">
                        <div className="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                          Video Evidence
                        </div>
                        <button
                          type="button"
                          onClick={() => liveVideoInputRef.current?.click()}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                            <Video size={15} />
                          </span>
                          <div>
                            <div>Record Video</div>
                            <div className="text-[9px] font-normal text-slate-400">Up to 1 min evidence</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => videoUploadInputRef.current?.click()}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                            <Upload size={15} />
                          </span>
                          <div>
                            <div>Upload Video File</div>
                            <div className="text-[9px] font-normal text-slate-400">MP4, WebM, MOV</div>
                          </div>
                        </button>
                      </div>

                      {/* Section 3: Voice & Audio */}
                      <div className="pt-1.5">
                        <div className="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                          Voice & Sound
                        </div>
                        <button
                          type="button"
                          onClick={startVoiceRecording}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-[12px] font-semibold text-purple-700 hover:bg-purple-50 transition"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                            <Mic size={15} />
                          </span>
                          <div>
                            <div>Record Voice Note</div>
                            <div className="text-[9px] font-normal text-slate-400">Record in-place right now</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => audioUploadInputRef.current?.click()}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                            <Music size={15} />
                          </span>
                          <div>
                            <div>Upload Audio File</div>
                            <div className="text-[9px] font-normal text-slate-400">MP3, WAV, M4A, OGG</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Dictation Mic Button */}
                <button
                  type="button"
                  onClick={toggleMic}
                  className={cn(
                    "focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition",
                    listening
                      ? "border-red-300 bg-red-50 text-red-600 shadow-sm animate-pulse"
                      : "border-line text-slate-500 hover:border-slate-300"
                  )}
                  aria-label={listening ? "Stop voice dictation" : "Dictate with voice"}
                  title="Voice to text dictation"
                >
                  <Mic size={16} />
                </button>

                {/* Chat Input Field */}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      processMessage(input);
                    }
                  }}
                  rows={2}
                  placeholder="Describe civic issue or use + for camera/video/audio..."
                  className="field min-h-[52px] flex-1 resize-none py-2 leading-relaxed text-[12px]"
                />

                <Button type="submit" disabled={thinking || (!input.trim() && !attachedMedia)}>
                  <Send size={15} />
                </Button>
              </form>
            )}

            <div className="mt-1.5 flex items-center justify-between text-[9.5px] text-slate-400">
              <span>All evidence formats accepted · Direct officer dispatch</span>
              <button
                type="button"
                onClick={() => void fetchCurrentLocation()}
                disabled={locating}
                className="inline-flex items-center gap-1 text-brand-600 hover:underline font-semibold"
              >
                {locating ? <Loader2 size={10} className="animate-spin" /> : <Navigation size={10} />}
                <span>{locating ? "Detecting GPS…" : "Use My Live Location"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Structured Draft & Map Pinpoint */}
        <div className="space-y-3">
          {!draft ? (
            <div className="surface p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <Info size={12} /> How NagarMitra Works
              </p>
              <ol className="mt-2.5 space-y-2 text-[11.5px] leading-relaxed text-slate-600">
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-brand-600">1.</span> Describe any issue or take a live photo.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-brand-600">2.</span> Live GPS automatically resolves your exact street.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-bold text-brand-600">3.</span> Review the draft card and tap Confirm to dispatch crews.
                </li>
              </ol>

              <div className="mt-4 border-t border-line/60 pt-3">
                <button
                  type="button"
                  onClick={() => liveCameraInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-50 border border-brand-200 py-2.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition shadow-xs"
                >
                  <Camera size={15} />
                  <span>Take Live Photo (1-Click)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="surface p-4 animate-scale-in">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
                  <CheckCircle2 size={13} className="text-brand-600" />
                  Structured Complaint Draft
                </span>
                <button
                  onClick={() => setDraft(null)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
                  aria-label="Discard draft"
                >
                  <X size={13} />
                </button>
              </div>

              <label htmlFor="draft-title" className="field-label mt-2.5">
                Issue Title
              </label>
              <input
                id="draft-title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="field text-[12px]"
              />

              <label htmlFor="draft-description" className="field-label mt-2">
                Description
              </label>
              <textarea
                id="draft-description"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                rows={2}
                className="field resize-none text-[11.5px]"
              />

              <label htmlFor="draft-category" className="field-label mt-2">
                Category
              </label>
              <select
                id="draft-category"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value as CategoryId })}
                className="field text-[12px]"
              >
                {CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>

              <span className="field-label mt-2 block">Severity Level</span>
              <div className="grid grid-cols-4 gap-1">
                {SEVERITIES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDraft({ ...draft, severity: level })}
                    className={cn(
                      "rounded-lg border px-1 py-1 text-[10px] font-semibold capitalize transition",
                      draft.severity === level
                        ? "border-brand-300 bg-brand-50 text-brand-700 shadow-xs"
                        : "border-line bg-white text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>

              {/* Location with Live GPS Button */}
              <div className="mt-3 flex items-center justify-between">
                <label htmlFor="draft-address" className="field-label">
                  Location ({selectedCity})
                </label>
                <button
                  type="button"
                  onClick={() => void fetchCurrentLocation()}
                  disabled={locating}
                  className="flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:underline"
                >
                  {locating ? <Loader2 size={10} className="animate-spin" /> : <Navigation size={10} />}
                  <span>Live GPS</span>
                </button>
              </div>

              <input
                id="draft-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Street address or GPS detected location"
                className="field text-[12px]"
              />

              {/* Interactive City Map Pin */}
              <div className="mt-2 overflow-hidden rounded-xl border border-line">
                <CityMap
                  complaints={[]}
                  pin={{ lat, lng }}
                  onMapClick={(coords) => {
                    setLat(coords.lat);
                    setLng(coords.lng);
                    void reverseGeocode(coords.lat, coords.lng).then((res) => {
                      if (res.fullAddress) setAddress(res.fullAddress);
                    });
                  }}
                  className="h-36"
                  autoFit={false}
                  showLegend={false}
                />
              </div>

              {/* Evidence Attachment inside Draft */}
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => liveCameraInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />} Photo
                </Button>
                {photo ? (
                  <span className="flex min-w-0 items-center gap-1.5 text-[10.5px] text-slate-600 bg-slate-50 border border-line rounded-lg px-2 py-1">
                    <img src={photo.url} alt="" className="h-6 w-6 rounded object-cover" />
                    <span className="truncate max-w-[120px]">{photo.name}</span>
                    <button
                      onClick={() => setPhoto(null)}
                      aria-label="Remove photo"
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={11} />
                    </button>
                  </span>
                ) : null}
              </div>

              {/* Confirm & Submit Button */}
              <Button className="mt-3.5 w-full" onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {submitting ? "Submitting to Municipal Portal…" : "Confirm & Submit Complaint"}
              </Button>

              <p className="mt-1.5 flex items-center gap-1 text-[9.5px] text-slate-400">
                <MapPin size={9} /> GPS Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
