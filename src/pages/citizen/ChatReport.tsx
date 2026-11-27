import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Mic,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CityMap } from "@/components/map/CityMap";
import { useComplaints } from "@/store/ComplaintsContext";
import { useToast } from "@/store/ToastContext";
import { api, uploadMedia } from "@/lib/api";
import { CATEGORIES, categoryMeta } from "@/lib/constants";
import { translate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CategoryId, Complaint } from "@/types";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
}

type Severity = "low" | "medium" | "high" | "critical";

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  Riverton: { lat: 17.4, lng: 78.47 },
  "Metro Heights": { lat: 17.47, lng: 78.38 },
  "Bay City": { lat: 17.34, lng: 78.56 },
};

const RULES: { category: CategoryId; words: string[] }[] = [
  { category: "roads", words: ["pothole", "road", "street", "गड्ढा", "सड़क", "గుంత"] },
  { category: "waste", words: ["garbage", "waste", "trash", "कचरा", "చెత్త"] },
  { category: "water", words: ["water", "pipe", "leak", "पानी", "నీరు"] },
  { category: "drainage", words: ["drain", "sewage", "flood", "नाला", "मुरుగు"] },
  { category: "electricity", words: ["light", "power", "electric", "बिजली", "విద్యుత్"] },
  { category: "safety", words: ["danger", "unsafe", "accident", "खतरा", "ప్రమాదం"] },
];

function nowLabel() {
  return new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function ChatReport() {
  const navigate = useNavigate();
  const { language, selectedCity, createComplaint } = useComplaints();
  const { toast } = useToast();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: `${t("report")}: describe the civic issue in your own words. I will turn it into a structured complaint you can review before submitting.`,
      time: nowLabel(),
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    description: string;
    category: CategoryId;
    severity: Severity;
    source: "ai" | "rule-based";
  } | null>(null);
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(CITY_CENTERS[selectedCity]?.lat ?? 17.4);
  const [lng, setLng] = useState(CITY_CENTERS[selectedCity]?.lng ?? 78.47);
  const [photo, setPhoto] = useState<{ id: string; url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Complaint | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, draft]);

  const pushMessage = (message: Omit<Message, "id" | "time">) =>
    setMessages((current) => [
      ...current,
      { ...message, id: `${Date.now()}-${Math.random()}`, time: nowLabel() },
    ]);

  const analyze = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = input.trim();
    if (text.length < 10) {
      toast({ title: "Add a little more detail (10+ characters)", variant: "error" });
      return;
    }
    pushMessage({ sender: "user", text });
    setInput("");
    setThinking(true);
    try {
      const response = await api<{
        configured: boolean;
        result: { title: string; summary: string; category: string; severity: string; clarifyingQuestions: string[] };
      }>("/api/ai/triage", { method: "POST", body: { text, language, city: selectedCity } });

      setDraft({
        title: response.result.title,
        description: response.result.summary || text,
        category: (response.result.category as CategoryId) ?? "other",
        severity: ["low", "medium", "high", "critical"].includes(response.result.severity)
          ? (response.result.severity as Severity)
          : "medium",
        source: "ai",
      });
      pushMessage({
        sender: "bot",
        text: response.result.clarifyingQuestions[0]
          ? `${response.result.clarifyingQuestions[0]} You can edit the draft on the right, then submit.`
          : "I structured your report below. Check the category, severity and location, then submit.",
      });
    } catch (caught) {
      const lower = text.toLowerCase();
      const match = RULES.find((entry) => entry.words.some((word) => lower.includes(word)));
      setDraft({
        title: text.split(/[.!?]/)[0].slice(0, 80),
        description: text,
        category: match?.category ?? "other",
        severity: /(danger|accident|child|electric|fire|खतरा|ప్రమాదం)/i.test(text) ? "high" : "medium",
        source: "rule-based",
      });
      pushMessage({
        sender: "bot",
        text:
          caught instanceof Error && caught.message.includes("not configured")
            ? "AI is not configured on this server, so I used a transparent rule-based draft. Review it below."
            : "The AI service is unavailable right now, so I used a rule-based draft. Review it below.",
      });
    } finally {
      setThinking(false);
    }
  };

  const toggleMic = () => {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const Ctor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
    if (!Ctor) {
      toast({ title: "Speech input is not supported in this browser", variant: "error" });
      return;
    }
    const instance = new Ctor();
    instance.lang = language === "hi" ? "hi-IN" : language === "te" ? "te-IN" : "en-IN";
    instance.interimResults = true;
    instance.continuous = false;
    instance.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
      }
      setInput((current) => `${current}${current ? " " : ""}${text}`.trim());
    };
    instance.onend = () => setListening(false);
    instance.onerror = () => setListening(false);
    recognition.current = instance;
    instance.start();
    setListening(true);
  };

  const attach = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadMedia(file);
      setPhoto({ id: result.id, url: result.url, name: file.name });
      toast({ title: "Evidence attached", description: file.name, variant: "success" });
    } catch (caught) {
      toast({
        title: "Upload failed",
        description: caught instanceof Error ? caught.message : "Try a smaller file.",
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!draft) return;
    if (address.trim().length < 4) {
      toast({ title: "Add the area or street", variant: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const complaint = await createComplaint({
        title: draft.title,
        description: draft.description,
        category: draft.category,
        severity: draft.severity,
        location: address.trim(),
        city: selectedCity,
        lat,
        lng,
        mediaIds: photo ? [photo.id] : [],
        aiSummary: draft.description,
        aiSource: draft.source === "ai" ? "ai" : "rule-based",
      });
      setCreated(complaint);
      pushMessage({ sender: "bot", text: `Complaint ${complaint.id} has been submitted and queued for review.` });
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
      <div className="mx-auto mt-6 max-w-lg">
        <div className="surface p-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-500 text-white">
            <CheckCircle2 size={30} />
          </span>
          <h1 className="mt-4 text-xl font-extrabold">Complaint submitted</h1>
          <p className="mt-1 text-[12px] text-slate-500">Saved to the NagarMitra database.</p>
          <p className="mt-3 font-mono text-lg font-bold text-slate-900">{created.id}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => navigate(`/reports/${created.id}`)}>
              View complaint <ChevronRight size={15} />
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate("/reports")}>
              My reports
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft size={14} /> Back to home
      </Link>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold">
            <span className="rounded-lg bg-brand-50 p-1.5 text-brand-600"><Sparkles size={16} /></span>
            AI reporting assistant
          </h1>
          <p className="mt-1 text-[12px] text-slate-500">
            {selectedCity} · describe the issue and review the structured draft
          </p>
        </div>
        <Link to="/report/manual" className="text-[11.5px] font-semibold text-brand-600">
          Use the form instead
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="surface flex min-h-[440px] flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex", message.sender === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed",
                    message.sender === "user"
                      ? "rounded-br-md bg-brand-600 text-white"
                      : "rounded-bl-md border border-line bg-slate-50 text-slate-700"
                  )}
                >
                  {message.text}
                  <span className={cn("mt-1 block text-[9px]", message.sender === "user" ? "text-brand-200" : "text-slate-400")}>
                    {message.time}
                  </span>
                </div>
              </div>
            ))}
            {thinking ? (
              <div className="flex items-center gap-2 text-[11.5px] text-slate-400">
                <Loader2 size={13} className="animate-spin" /> Preparing a structured draft…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="border-t border-line bg-white p-3">
            <form onSubmit={analyze} className="flex items-end gap-2">
              <button
                type="button"
                onClick={toggleMic}
                className={cn(
                  "focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                  listening ? "border-red-200 bg-red-50 text-red-600" : "border-line text-slate-500 hover:border-slate-300"
                )}
                aria-label={listening ? "Stop dictation" : "Dictate with speech recognition"}
                title="Dictate (browser speech recognition)"
              >
                <Mic size={16} />
              </button>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void analyze();
                  }
                }}
                rows={2}
                placeholder="e.g. There is a large pothole outside the school gate and bikers keep falling."
                className="field min-h-[44px] flex-1 resize-none py-2.5 text-[12px]"
              />
              <Button type="submit" disabled={thinking || input.trim().length < 10}>
                <Send size={15} />
              </Button>
            </form>
            <p className="mt-1.5 text-[9.5px] text-slate-400">
              {language === "en"
                ? "AI suggestions are drafts, not verified facts. Nothing is submitted until you confirm."
                : "AI సూచనలు ముసాయిదాలు మాత్రమే. మీరు నిర్ధారించే వరకు ఏదీ సమర్పించబడదు."}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {!draft ? (
            <div className="surface p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <Info size={12} /> How this works
              </p>
              <ol className="mt-2 space-y-2 text-[11.5px] leading-relaxed text-slate-600">
                <li>1. Describe the issue in any supported language.</li>
                <li>2. The server sends it to the configured AI model.</li>
                <li>3. You review title, category, severity and location.</li>
                <li>4. Only your confirmation creates the complaint.</li>
              </ol>
            </div>
          ) : (
            <div className="surface p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                  <Sparkles size={11} /> {draft.source === "ai" ? "AI draft" : "Rule-based draft"}
                </span>
                <button onClick={() => setDraft(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Discard draft">
                  <X size={13} />
                </button>
              </div>

              <label htmlFor="draft-title" className="field-label mt-2.5">Title</label>
              <input
                id="draft-title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="field text-[12px]"
              />

              <label htmlFor="draft-description" className="field-label mt-2">Description</label>
              <textarea
                id="draft-description"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                rows={3}
                className="field resize-none text-[11.5px]"
              />

              <label htmlFor="draft-category" className="field-label mt-2">Category</label>
              <select
                id="draft-category"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value as CategoryId })}
                className="field text-[12px]"
              >
                {CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>

              <span className="field-label mt-2">Severity</span>
              <div className="grid grid-cols-4 gap-1">
                {SEVERITIES.map((level) => (
                  <button
                    key={level}
                    onClick={() => setDraft({ ...draft, severity: level })}
                    className={cn(
                      "rounded-lg border px-1 py-1.5 text-[10px] font-semibold capitalize",
                      draft.severity === level
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-line bg-white text-slate-500"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>

              <label htmlFor="draft-address" className="field-label mt-3">Location</label>
              <input
                id="draft-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Street, landmark, ward"
                className="field text-[12px]"
              />
              <div className="mt-2 overflow-hidden rounded-xl border border-line">
                <CityMap
                  complaints={[]}
                  pin={{ lat, lng }}
                  onMapClick={(coords) => {
                    setLat(coords.lat);
                    setLng(coords.lng);
                  }}
                  className="h-40"
                  autoFit={false}
                  showLegend={false}
                />
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />} Photo
                </Button>
                <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={attach} />
                {photo ? (
                  <span className="flex min-w-0 items-center gap-1 text-[10.5px] text-slate-500">
                    <img src={photo.url} alt="" className="h-7 w-8 rounded object-cover" />
                    <span className="truncate">{photo.name}</span>
                    <button onClick={() => setPhoto(null)} aria-label="Remove photo" className="text-slate-400 hover:text-red-500">
                      <Trash2 size={11} />
                    </button>
                  </span>
                ) : null}
              </div>

              <Button className="mt-3 w-full" onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {submitting ? "Submitting…" : "Submit complaint"}
              </Button>
              <p className="mt-1.5 flex items-center gap-1 text-[9.5px] text-slate-400">
                <MapPin size={9} /> {categoryMeta(draft.category).short} · {lat.toFixed(4)}, {lng.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
