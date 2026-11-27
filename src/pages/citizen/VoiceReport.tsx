import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  Languages,
  Loader2,
  Mic,
  Pencil,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/store/ToastContext";
import { useComplaints } from "@/store/ComplaintsContext";
import { api } from "@/lib/api";
import { CATEGORIES, categoryMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CategoryId } from "@/types";
import type { Language } from "@/lib/translations";

/* The Web Speech API is not in TypeScript's DOM library. */
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

const LANGUAGES: { id: Language; label: string; tag: string }[] = [
  { id: "en", label: "English (India)", tag: "en-IN" },
  { id: "hi", label: "हिंदी (Hindi)", tag: "hi-IN" },
  { id: "te", label: "తెలుగు (Telugu)", tag: "te-IN" },
];

/** Rule-based fallback used only when the AI service is not configured. */
const CATEGORY_KEYWORDS: { category: CategoryId; words: string[] }[] = [
  { category: "roads", words: ["pothole", "road", "gadha", "गड्ढा", "सड़क", "గుంత", "రోడ్డు"] },
  { category: "waste", words: ["garbage", "waste", "trash", "कचरा", "చెత్త"] },
  { category: "water", words: ["water", "pipe", "leak", "पानी", "नल", "నీరు", "పైపు"] },
  { category: "drainage", words: ["drain", "sewage", "flood", "नाला", "जलभराव", "మురుగు", "వరద"] },
  { category: "electricity", words: ["streetlight", "light", "power", "बिजली", "स्ट्रीटलाइट", "విద్యుత్", "దీపం"] },
];

function ruleBasedDraft(text: string, language: Language) {
  const lower = text.toLowerCase();
  const match = CATEGORY_KEYWORDS.find((entry) => entry.words.some((word) => lower.includes(word)));
  const severity = /(accident|injur|danger|electric|child|school|आग|खतरा|ప్రమాదం|పిల్లల)/i.test(text)
    ? "high"
    : "medium";
  return {
    title: text.trim().split(/[.!?]/)[0].slice(0, 80) || "Civic issue reported by voice",
    summary: text.trim().slice(0, 400),
    category: (match?.category ?? "other") as CategoryId,
    severity: severity as "low" | "medium" | "high" | "critical",
    language,
  };
}

export default function VoiceReport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, setLanguage, selectedCity } = useComplaints();

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [editing, setEditing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    summary: string;
    category: CategoryId;
    severity: string;
    source: "ai" | "rule-based";
  } | null>(null);

  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const stoppedByUser = useRef(false);

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
    return () => {
      recognition.current?.abort();
      recorder.current?.state !== "inactive" && recorder.current?.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  const stopTimer = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };

  const start = async () => {
    setError(null);
    setDraft(null);
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      setError("This browser does not support live speech recognition. Use Chrome or Edge, or type your report instead.");
      return;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      chunks.current = [];
      const mediaRecorder = new MediaRecorder(media);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        if (chunks.current.length > 0) {
          const blob = new Blob(chunks.current, { type: mediaRecorder.mimeType || "audio/webm" });
          setAudioUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return URL.createObjectURL(blob);
          });
        }
        media.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      recorder.current = mediaRecorder;
    } catch (caught) {
      setError(
        caught instanceof DOMException && caught.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access in your browser, then try again."
          : "Could not start audio recording. Check that a microphone is connected."
      );
      return;
    }

    const instance = new Ctor();
    instance.lang = LANGUAGES.find((item) => item.id === language)?.tag ?? "en-IN";
    instance.continuous = true;
    instance.interimResults = true;
    instance.maxAlternatives = 1;
    instance.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) final += `${text} `;
        else interim += text;
      }
      if (final) {
        setFinalText((current) => `${current}${final}`);
        setTranscript((current) => `${current}${final}`);
      }
      setInterimText(interim);
    };
    instance.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone or speech service permission was denied by the browser.");
      } else if (event.error === "no-speech") {
        setError("No speech was detected. Try speaking closer to the microphone.");
      } else if (event.error === "network") {
        setError("Speech recognition needs a network connection in this browser.");
      } else if (event.error !== "aborted") {
        setError(`Speech recognition error: ${event.error}`);
      }
    };
    instance.onend = () => {
      setRecording(false);
      setInterimText("");
      stopTimer();
      if (!stoppedByUser.current) {
        // The browser ends recognition after silence; keep the capture the user already made.
      }
      stoppedByUser.current = false;
    };

    stoppedByUser.current = false;
    recognition.current = instance;
    instance.start();
    setRecording(true);
    setSeconds(0);
    setFinalText("");
    setTranscript("");
    setInterimText("");
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    timer.current = window.setInterval(() => setSeconds((value) => Math.min(180, value + 1)), 1000);
  };

  const stop = () => {
    stoppedByUser.current = true;
    recognition.current?.stop();
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    setRecording(false);
    stopTimer();
    setTranscript((current) => `${current}${interimText ? `${interimText} ` : ""}`.trim());
    setInterimText("");
  };

  const reset = () => {
    stop();
    setTranscript("");
    setFinalText("");
    setSeconds(0);
    setDraft(null);
    setError(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  };

  const analyze = async () => {
    const text = transcript.trim();
    if (text.length < 12) {
      toast({ title: "Speak or type a little more detail first", variant: "error" });
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const response = await api<{
        configured: boolean;
        result: { title: string; summary: string; category: string; severity: string };
      }>("/api/ai/triage", {
        method: "POST",
        body: { text, language, city: selectedCity },
      });
      setDraft({
        title: response.result.title,
        summary: response.result.summary,
        category: (response.result.category as CategoryId) ?? "other",
        severity: response.result.severity,
        source: "ai",
      });
      toast({ title: "AI draft ready", description: "Review and edit before continuing.", variant: "success" });
    } catch (caught) {
      const fallback = ruleBasedDraft(text, language);
      setDraft({ ...fallback, source: "rule-based" });
      toast({
        title: "AI is not configured",
        description:
          caught instanceof Error && caught.message.includes("not configured")
            ? "Using a transparent rule-based draft instead. Add AI_API_KEY to enable AI."
            : "AI request failed, so a rule-based draft was created.",
        variant: "info",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const proceed = () => {
    if (!draft) return;
    navigate("/report/manual", {
      state: {
        title: draft.title,
        description: draft.summary,
        category: draft.category,
        aiSummary: draft.summary,
        aiSource: draft.source,
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft size={14} /> Back to home
      </Link>

      <div className="mb-5">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-brand-50 p-1.5 text-brand-600">
            <Mic size={16} />
          </span>
          <h1 className="text-[22px] font-extrabold sm:text-2xl">Voice report</h1>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
          Speak naturally. Your browser transcribes your actual speech, which you can edit before
          creating the complaint.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-[11.5px] text-slate-500">
          <Languages size={14} className="text-slate-400" />
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
            className="rounded-lg border border-line bg-white px-2 py-1 text-[11.5px] font-semibold text-slate-700"
            aria-label="Speech recognition language"
            disabled={recording}
          >
            {LANGUAGES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-700">
          Browser speech recognition
        </span>
      </div>

      {!supported ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-[11.5px] leading-relaxed text-amber-800">
            Live transcription is not available in this browser. Use Chrome or Edge, or{" "}
            <Link to="/report/manual" className="font-semibold underline">
              type the report instead
            </Link>
            .
          </div>
        </div>
      ) : null}

      <div className="surface overflow-hidden">
        <div className="border-b border-line bg-slate-50/60 px-5 pb-5 pt-7">
          <div className="flex flex-col items-center">
            <div className="relative flex h-[132px] w-[132px] items-center justify-center">
              {recording ? (
                <>
                  <span className="absolute inset-0 rounded-full bg-red-300/40 animate-pulse-ring" />
                  <span className="absolute inset-4 rounded-full bg-red-200/40 animate-pulse-ring [animation-delay:0.6s]" />
                </>
              ) : (
                <>
                  <span className="absolute inset-2 rounded-full border border-brand-100" />
                  <span className="absolute inset-6 rounded-full border border-brand-100/70" />
                </>
              )}
              <button
                onClick={recording ? stop : start}
                disabled={!supported}
                className={cn(
                  "focus-ring relative flex h-[96px] w-[96px] items-center justify-center rounded-full text-white shadow-lift transition hover:scale-[1.03] active:scale-95 disabled:opacity-50",
                  recording ? "bg-red-500 hover:bg-red-600" : "bg-brand-600 hover:bg-brand-700"
                )}
                aria-label={recording ? "Stop recording" : "Start recording"}
              >
                {recording ? <Square size={26} fill="currentColor" strokeWidth={0} /> : <Mic size={34} strokeWidth={1.9} />}
              </button>
            </div>

            <p className="mt-3 text-center text-[12.5px] font-semibold text-slate-700">
              {recording ? "Listening… speak clearly" : transcript ? "Recording complete" : "Tap the microphone to start"}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
              00:{String(seconds).padStart(2, "0")} / 03:00
            </p>

            {recording && interimText ? (
              <p className="mt-2 max-w-sm text-center text-[12px] italic text-slate-400">{interimText}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          {error ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[11.5px] text-red-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {error}
            </p>
          ) : null}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Transcript (editable)
              </span>
              <div className="flex items-center gap-2">
                {audioUrl ? <audio controls src={audioUrl} className="h-8 max-w-[190px]" /> : null}
                {transcript ? (
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 hover:text-red-600"
                  >
                    <Trash2 size={11} /> Retry
                  </button>
                ) : null}
              </div>
            </div>
            {editing || !transcript ? (
              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                rows={5}
                placeholder="Your speech appears here in the language you selected. You can also type if transcription is unavailable."
                className="field resize-none text-[12.5px] leading-relaxed"
              />
            ) : (
              <div className="rounded-xl border border-line bg-slate-50/70 p-3">
                <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-700">{transcript}</p>
                <button
                  onClick={() => setEditing(true)}
                  className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand-600"
                >
                  <Pencil size={11} /> Edit transcript
                </button>
              </div>
            )}
            {editing ? (
              <button onClick={() => setEditing(false)} className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-accent-600">
                <Check size={11} /> Done editing
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={analyze} disabled={analyzing || transcript.trim().length < 12}>
              {analyzing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {analyzing ? "Preparing draft…" : "Create complaint draft"}
            </Button>
            {recording ? (
              <Button variant="outline" onClick={stop}>
                <Square size={14} /> Stop
              </Button>
            ) : transcript ? (
              <Button variant="outline" onClick={start}>
                <RotateCcw size={14} /> Record again
              </Button>
            ) : null}
          </div>

          <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10.5px] leading-relaxed text-slate-500">
            <Info size={12} className="mt-0.5 shrink-0" />
            Transcription runs in your browser using the Web Speech API. Chrome and Edge send audio
            to their speech service; Firefox does not support this API. If speech recognition is
            unavailable, type your report — nothing is ever replaced with demo text.
          </p>

          {draft ? (
            <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                  <Sparkles size={11} /> {draft.source === "ai" ? "AI draft" : "Rule-based draft"}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[9.5px] font-semibold text-slate-500">
                  {categoryMeta(draft.category).label}
                </span>
              </div>
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="mt-2 w-full rounded-lg border border-brand-100 bg-white px-2.5 py-2 text-[12.5px] font-semibold text-slate-800"
                aria-label="Draft title"
              />
              <textarea
                value={draft.summary}
                onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                rows={3}
                className="mt-2 w-full resize-none rounded-lg border border-brand-100 bg-white px-2.5 py-2 text-[11.5px] text-slate-600"
                aria-label="Draft description"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setDraft({ ...draft, category: item.id })}
                    className={cn(
                      "rounded-lg border px-2 py-1 text-[10px] font-semibold",
                      draft.category === item.id
                        ? "border-brand-300 bg-white text-brand-700"
                        : "border-transparent bg-white/60 text-slate-500 hover:bg-white"
                    )}
                  >
                    {item.short}
                  </button>
                ))}
              </div>
              <Button className="mt-3 w-full" onClick={proceed}>
                Continue to location & evidence <ArrowRight size={15} />
              </Button>
              <p className="mt-1.5 text-[9.5px] leading-relaxed text-brand-700/70">
                {draft.source === "ai"
                  ? "AI suggested this draft from your transcript. It is a suggestion, not a verified fact."
                  : "AI is not configured on this server, so this draft uses a transparent keyword rule."}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
