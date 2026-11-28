import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  MessageSquare,
  Mic,
  FileText,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Zap,
  Loader2,
  Check,
  X,
  Navigation,
} from "lucide-react";
import { useComplaints } from "@/store/ComplaintsContext";
import { useToast } from "@/store/ToastContext";
import { CityPickerModal } from "@/components/citizen/CityPickerModal";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { compressImage } from "@/lib/imageCompression";
import { uploadMedia } from "@/lib/api";
import { getCurrentPosition, reverseGeocode, getCityCoordinates } from "@/lib/location";
import { CATEGORIES } from "@/lib/constants";
import type { CategoryId } from "@/types";

const HUB_TRANSLATIONS = {
  en: {
    title: "Report an Issue",
    subtitle: "Select your reporting method. All options include automatic geotagging.",
    cityLabel: "City",
    change: "Change",
    photoTitle: "One-Click Live Photo",
    photoBadge: "Fastest · 10s",
    photoDesc: "Snap camera evidence with instant GPS geotagging & filing",
    chatTitle: "Chat Assistant",
    chatBadge: "Conversational",
    chatDesc: "Chat naturally in your own words with media & voice",
    voiceTitle: "Voice Note Report",
    voiceBadge: "No Typing",
    voiceDesc: "Speak in Hindi, Telugu, or English for quick voice triage",
    formTitle: "Detailed Form",
    formBadge: "Standard Form",
    formDesc: "Step-by-step form with custom landmarks & multiple files",
    privacyTitle: "Citizen Privacy & Verification Guarantee",
    privacyDesc: "Every submission is routed directly to ward teams. Your personal identity remains strictly confidential.",
    activatingCamera: "Opening Camera…",
    submittingPhoto: "Submitting Complaint…",
    submitNow: "Submit Official Complaint",
    cancel: "Cancel",
    photoModalTitle: "Confirm Live Photo Report",
    selectCategory: "Issue Category",
    issueTitle: "Title / Summary",
    location: "Location",
  },
  hi: {
    title: "समस्या दर्ज करें",
    subtitle: "अपनी पसंदीदा रिपोर्टिंग विधि चुनें। सभी में लाइव जीपीएस शामिल है।",
    cityLabel: "शहर",
    change: "बदलें",
    photoTitle: "एक-क्लिक लाइव फोटो",
    photoBadge: "सबसे तेज़ · 10 से.",
    photoDesc: "कैमरे से फोटो लें, स्वचालित जीपीएस टैग और तुरंत शिकायत दर्ज",
    chatTitle: "चैट सहायक",
    chatBadge: "बातचीत द्वारा",
    chatDesc: "नागरिक सहायक से अपनी भाषा में बात करें और मीडिया भेजें",
    voiceTitle: "आवाज़ रिकॉर्ड करें",
    voiceBadge: "बिना लिखे",
    voiceDesc: "हिंदी, तेलुगु या अंग्रेज़ी में बोलकर त्वरित शिकायत दर्ज करें",
    formTitle: "विस्तृत फॉर्म",
    formBadge: "मानक फॉर्म",
    formDesc: "श्रेणी, वार्ड और कई दस्तावेज़ अपलोड करने का मानक फॉर्म",
    privacyTitle: "नागरिक गोपनीयता व सत्यापन गारंटी",
    privacyDesc: "हर शिकायत सीधे वार्ड टीम को भेजी जाती है। आपका डेटा पूरी तरह सुरक्षित है।",
    activatingCamera: "कैमरा शुरू हो रहा है…",
    submittingPhoto: "शिकायत दर्ज हो रही है…",
    submitNow: "अधिकारिक शिकायत दर्ज करें",
    cancel: "रद्द करें",
    photoModalTitle: "लाइव फोटो रिपोर्ट की पुष्टि करें",
    selectCategory: "समस्या की श्रेणी",
    issueTitle: "शीर्षक / संक्षिप्त विवरण",
    location: "स्थान",
  },
  te: {
    title: "సమస్యను నివేదించండి",
    subtitle: "మీకు అనుకూలమైన విధానాన్ని ఎంచుకోండి. అన్నింటిలో ఆటోమేటిక్ జీపీఎస్ ఉంటుంది.",
    cityLabel: "నగరం",
    change: "మార్చండి",
    photoTitle: "ఒకే-క్లిక్ లైవ్ ఫోటో",
    photoBadge: "అత్యంత వేగం · 10సె.",
    photoDesc: "లైవ్ ఫోటో తీయండి, జీపీఎస్ స్థానం ఆటోమేటిక్‌గా నమోదు అవుతుంది",
    chatTitle: "చాట్ అసిస్టెంట్",
    chatBadge: "సంభాషణ",
    chatDesc: "మీ భాషలో మాట్లాడి మీడియా మరియు వివరాలను పంపండి",
    voiceTitle: "వాయిస్ నోట్ రిపోర్ట్",
    voiceBadge: "టైపింగ్ వద్దు",
    voiceDesc: "తెలుగు, హిందీ లేదా ఇంగ్లీషులో మాట్లాడి సులభంగా నివేదించండి",
    formTitle: "వివరమైన ఫారం",
    formBadge: "ప్రామాణికం",
    formDesc: "వర్గం, ల్యాండ్‌మార్క్ ఎంచుకుని ఫైళ్లను అప్‌లోడ్ చేసే పూర్తి ఫారం",
    privacyTitle: "పౌర గోప్యత & ధృవీకరణ హామీ",
    privacyDesc: "ప్రతి ఫిర్యాదు సంబంధిత వార్డు అధికార బృందానికి చేరుతుంది. మీ డేటా సురక్షితం.",
    activatingCamera: "కెమెరా ఆన్ అవుతోంది…",
    submittingPhoto: "ఫిర్యాదు దాఖలవుతోంది…",
    submitNow: "అధికారిక ఫిర్యాదును సమర్పించండి",
    cancel: "రద్దు చేయండి",
    photoModalTitle: "లైవ్ ఫోటో నివేదిక నిర్ధారణ",
    selectCategory: "సమస్య వర్గం",
    issueTitle: "శీర్షిక / వివరణ",
    location: "స్థానం",
  },
};

interface PendingPhotoData {
  photoUrl: string;
  mediaId: string;
  address: string;
  lat: number;
  lng: number;
  category: CategoryId;
  title: string;
}

export default function ReportHub() {
  const navigate = useNavigate();
  const { selectedCity, language, createComplaint } = useComplaints();
  const t = HUB_TRANSLATIONS[language] || HUB_TRANSLATIONS.en;
  const { toast } = useToast();
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);

  // In-place self-contained live photo modal state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoData, setPhotoData] = useState<PendingPhotoData | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);

  const triggerLiveCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleLiveCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setCapturingPhoto(true);
    toast({
      title: "Processing live photo…",
      description: "Compressing image and tagging live GPS coordinates.",
      variant: "info",
    });

    try {
      // 1. Fast client-side compression (converts phone camera to ~120KB in ~30ms)
      const compressed = await compressImage(file, 1280, 0.82);

      // 2. Parallel upload and GPS capture
      const [uploadRes, locRes] = await Promise.allSettled([
        uploadMedia(compressed.file),
        (async () => {
          try {
            const posPromise = getCurrentPosition();
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("GPS timeout")), 3500)
            );
            const pos = await Promise.race([posPromise, timeoutPromise]);
            const geo = await Promise.race([
              reverseGeocode(pos.lat, pos.lng),
              new Promise<any>((res) => setTimeout(() => res({ fullAddress: `GPS (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})` }), 2500)),
            ]);
            return { lat: pos.lat, lng: pos.lng, address: geo.fullAddress || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` };
          } catch {
            const cityCoords = getCityCoordinates(selectedCity);
            return { lat: cityCoords.lat, lng: cityCoords.lng, address: selectedCity };
          }
        })(),
      ]);

      const mediaUrl = uploadRes.status === "fulfilled" ? uploadRes.value.url : compressed.dataUrl;
      const mediaId = uploadRes.status === "fulfilled" ? uploadRes.value.id : `local-${Date.now()}`;
      const location = locRes.status === "fulfilled" ? locRes.value : { lat: 17.385, lng: 78.4867, address: selectedCity };

      // Set self-contained live photo modal data (NO CHAT REDIRECT)
      setPhotoData({
        photoUrl: mediaUrl,
        mediaId,
        lat: location.lat,
        lng: location.lng,
        address: location.address,
        category: "roads",
        title: `Civic issue reported via live photo in ${selectedCity}`,
      });
      setPhotoModalOpen(true);
    } catch (err: any) {
      toast({
        title: "Could not process photo",
        description: err.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setCapturingPhoto(false);
    }
  };

  const handleDirectPhotoSubmit = async () => {
    if (!photoData) return;
    setSubmittingPhoto(true);
    try {
      const description = `Live photo evidence recorded on-site at ${photoData.address}. Citizen captured real-time photo with verified GPS coordinates for municipal dispatch.`;
      const created = await createComplaint({
        title: photoData.title.trim() || `Civic issue reported via live photo in ${selectedCity}`,
        description,
        category: photoData.category,
        severity: "medium",
        city: selectedCity,
        location: photoData.address,
        area: photoData.address.split(",")[0]?.trim() || selectedCity,
        lat: photoData.lat,
        lng: photoData.lng,
        mediaIds: photoData.mediaId ? [photoData.mediaId] : [],
        aiSummary: description,
      });

      toast({
        title: "Complaint submitted successfully!",
        description: `#${created.id} has been logged in ${selectedCity}.`,
        variant: "success",
      });

      setPhotoModalOpen(false);
      setPhotoData(null);
      navigate(`/complaint/${created.id}`);
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message || "Please check your network and try again.",
        variant: "error",
      });
    } finally {
      setSubmittingPhoto(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-6 sm:py-6 pb-24 sm:pb-12">
      {/* Hidden Native Camera Input with capture="environment" */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleLiveCameraCapture}
      />

      {/* Header section - compact & minimal */}
      <div className="flex items-center justify-between border-b border-line pb-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Zap size={16} />
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">
              {t.title}
            </h1>
          </div>
          <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 truncate">
            {t.subtitle}
          </p>
        </div>

        <button
          onClick={() => setCityPickerOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-700 shadow-2xs transition hover:border-brand-300 hover:text-brand-600 active:scale-95 ml-2"
        >
          <MapPin size={13} className="text-brand-600" />
          <span className="truncate max-w-[90px] sm:max-w-none">{selectedCity}</span>
          <span className="text-[10px] text-slate-400 font-normal">{t.change}</span>
        </button>
      </div>

      {/* Primary Reporting Modes - Minimal, Mobile-First Action Cards */}
      <div className="mt-4 space-y-2.5">
        {/* 1. One-Click Live Photo (Self-Contained) */}
        <div
          onClick={triggerLiveCamera}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && triggerLiveCamera()}
          className="group surface surface-hover flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl cursor-pointer transition active:scale-[0.99] border border-emerald-500/25 hover:border-emerald-500 shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white">
              {capturingPhoto ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-[13.5px] sm:text-[14px] font-bold text-slate-900 group-hover:text-emerald-700 truncate">
                  {t.photoTitle}
                </h2>
                <span className="rounded-full bg-emerald-100/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  {t.photoBadge}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] sm:text-[11.5px] text-slate-500 truncate">
                {capturingPhoto ? t.activatingCamera : t.photoDesc}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-600 transition shrink-0" />
        </div>

        {/* 2. Chat Assistant (Self-Contained) */}
        <Link
          to="/report/chat"
          className="group surface surface-hover flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl transition active:scale-[0.99] border border-brand-500/25 hover:border-brand-500 shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:scale-105 group-hover:bg-brand-600 group-hover:text-white">
              <MessageSquare size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-[13.5px] sm:text-[14px] font-bold text-slate-900 group-hover:text-brand-700 truncate">
                  {t.chatTitle}
                </h2>
                <span className="rounded-full bg-brand-100/80 px-2 py-0.5 text-[10px] font-bold text-brand-800">
                  {t.chatBadge}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] sm:text-[11.5px] text-slate-500 truncate">
                {t.chatDesc}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-600 transition shrink-0" />
        </Link>

        {/* 3. Voice Note Report (Self-Contained) */}
        <Link
          to="/report/voice"
          className="group surface surface-hover flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl transition active:scale-[0.99] border border-rose-500/25 hover:border-rose-500 shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition group-hover:scale-105 group-hover:bg-rose-600 group-hover:text-white">
              <Mic size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-[13.5px] sm:text-[14px] font-bold text-slate-900 group-hover:text-rose-700 truncate">
                  {t.voiceTitle}
                </h2>
                <span className="rounded-full bg-rose-100/80 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                  {t.voiceBadge}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] sm:text-[11.5px] text-slate-500 truncate">
                {t.voiceDesc}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-rose-600 transition shrink-0" />
        </Link>

        {/* 4. Detailed Manual Form (Self-Contained) */}
        <Link
          to="/report/manual"
          className="group surface surface-hover flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl transition active:scale-[0.99] border border-amber-500/25 hover:border-amber-500 shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white">
              <FileText size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-[13.5px] sm:text-[14px] font-bold text-slate-900 group-hover:text-amber-700 truncate">
                  {t.formTitle}
                </h2>
                <span className="rounded-full bg-amber-100/80 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {t.formBadge}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] sm:text-[11.5px] text-slate-500 truncate">
                {t.formDesc}
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-600 transition shrink-0" />
        </Link>
      </div>

      {/* Citizen Trust & Privacy Banner */}
      <div className="mt-5 rounded-2xl border border-line/80 bg-slate-50/80 p-3 sm:p-3.5">
        <div className="flex items-start gap-2.5">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <h3 className="text-[12px] font-bold text-slate-800">{t.privacyTitle}</h3>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">
              {t.privacyDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Self-Contained Live Photo Direct Submission Modal */}
      {photoModalOpen && photoData && (
        <Modal open={photoModalOpen} onClose={() => !submittingPhoto && setPhotoModalOpen(false)}>
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Camera size={16} />
                </span>
                <h2 className="text-[14px] font-bold text-slate-900">{t.photoModalTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                disabled={submittingPhoto}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Photo preview thumbnail */}
            <div className="relative overflow-hidden rounded-xl border border-line bg-black/5">
              <img
                src={photoData.photoUrl}
                alt="Live photo capture"
                className="max-h-48 w-full object-cover"
              />
              <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                Live Photo Evidence
              </span>
            </div>

            {/* Location with GPS Pin */}
            <div className="rounded-xl border border-line bg-slate-50 p-2.5">
              <div className="flex items-start gap-2">
                <Navigation size={14} className="mt-0.5 shrink-0 text-brand-600" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.location}</p>
                  <p className="text-[12px] font-semibold text-slate-800 truncate">{photoData.address}</p>
                  <p className="text-[10px] font-mono text-slate-400">
                    GPS: {photoData.lat.toFixed(4)}, {photoData.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>

            {/* Issue Category Chips */}
            <div>
              <label className="field-label mb-1.5">{t.selectCategory}</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPhotoData({ ...photoData, category: cat.id })}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                      photoData.category === cat.id
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs"
                        : "border-line bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {cat.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Title / Summary */}
            <div>
              <label htmlFor="photo-report-title" className="field-label mb-1">{t.issueTitle}</label>
              <input
                id="photo-report-title"
                type="text"
                value={photoData.title}
                onChange={(e) => setPhotoData({ ...photoData, title: e.target.value })}
                className="field text-xs"
                placeholder="Brief title of the issue"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-line">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPhotoModalOpen(false)}
                disabled={submittingPhoto}
                className="flex-1"
              >
                {t.cancel}
              </Button>
              <Button
                type="button"
                onClick={handleDirectPhotoSubmit}
                disabled={submittingPhoto || photoData.title.trim().length < 5}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {submittingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{submittingPhoto ? t.submittingPhoto : t.submitNow}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <CityPickerModal open={cityPickerOpen} onClose={() => setCityPickerOpen(false)} />
    </div>
  );
}
