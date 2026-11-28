import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  MessageSquare,
  Mic,
  FileText,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Zap,
  Loader2,
} from "lucide-react";
import { useComplaints } from "@/store/ComplaintsContext";
import { useToast } from "@/store/ToastContext";
import { CityPickerModal } from "@/components/citizen/CityPickerModal";
import { compressImage } from "@/lib/imageCompression";
import { uploadMedia } from "@/lib/api";
import { getCurrentPosition, reverseGeocode, getCityCoordinates } from "@/lib/location";

const HUB_TRANSLATIONS = {
  en: {
    title: "Report an Issue",
    subtitle: "Select your preferred reporting method. All options include automatic geotagging.",
    cityLabel: "City",
    change: "Change",
    photoTitle: "One-Click Live Photo",
    photoBadge: "Fastest (10 sec)",
    photoDesc: "Snap photo evidence on-site. Your camera captures the issue and automatically tags live GPS coordinates.",
    photoBtn: "Snap & Submit",
    liveGps: "Live GPS",
    chatTitle: "Chat Assistant",
    chatBadge: "Conversational",
    chatDesc: "Chat naturally with our civic assistant. Describe what you see in Hindi, Telugu, or English, attach media, and review before filing.",
    chatBtn: "Start Chat Report",
    chatMeta: "Multi-lingual",
    voiceTitle: "Voice Note Report",
    voiceBadge: "No Typing",
    voiceDesc: "Record a quick 30-second voice note. Real-time speech recognition transcribes your words into an official complaint.",
    voiceBtn: "Record Voice",
    voiceMeta: "Audio Speech",
    formTitle: "Detailed Form",
    formBadge: "Standard Form",
    formDesc: "Step-by-step form to manually select category, ward, address landmark, and attach multiple supporting files.",
    formBtn: "Open Form",
    formMeta: "Document Upload",
    privacyTitle: "Citizen Privacy & Verification Guarantee",
    privacyDesc: "Every submission is forwarded to the designated ward officer. Your name, email, and mobile number remain strictly confidential.",
    activatingCamera: "Activating Camera…",
  },
  hi: {
    title: "समस्या दर्ज करें",
    subtitle: "अपनी पसंदीदा रिपोर्टिंग विधि चुनें। सभी विकल्पों में लाइव जीपीएस लोकेशन शामिल है।",
    cityLabel: "शहर",
    change: "बदलें",
    photoTitle: "एक-क्लिक लाइव फोटो",
    photoBadge: "सबसे तेज़ (10 सेकंड)",
    photoDesc: "समस्या का सीधा फोटो खींचें। कैमरा अपने आप आपकी सटीक जीपीएस लोकेशन जोड़ देगा।",
    photoBtn: "फोटो खींचें और भेजें",
    liveGps: "लाइव जीपीएस",
    chatTitle: "चैट सहायक",
    chatBadge: "बातचीत द्वारा",
    chatDesc: "हमारे नागरिक सहायक से अपनी भाषा में बात करें। विवरण लिखें, मीडिया संलग्न करें और पुष्टि करके भेजें।",
    chatBtn: "चैट शुरू करें",
    chatMeta: "बहुभाषी",
    voiceTitle: "आवाज़ रिकॉर्ड करें",
    voiceBadge: "बिना लिखे",
    voiceDesc: "30 सेकंड का वॉयस नोट रिकॉर्ड करें। आपकी आवाज़ सुनकर तुरंत शिकायत तैयार हो जाएगी।",
    voiceBtn: "आवाज़ रिकॉर्ड करें",
    voiceMeta: "ऑडियो आवाज़",
    formTitle: "विस्तृत फॉर्म",
    formBadge: "मानक फॉर्म",
    formDesc: "श्रेणी, वार्ड, पता व लैंडमार्क चुनकर कई दस्तावेज़ व फोटो अपलोड करने के लिए मानक फॉर्म।",
    formBtn: "फॉर्म खोलें",
    formMeta: "दस्तावेज़ अपलोड",
    privacyTitle: "नागरिक गोपनीयता व सत्यापन गारंटी",
    privacyDesc: "हर शिकायत संबंधित वार्ड अधिकारी को भेजी जाती है। आपका नाम, ईमेल और मोबाइल नंबर पूरी तरह सुरक्षित रहेगा।",
    activatingCamera: "कैमरा शुरू हो रहा है…",
  },
  te: {
    title: "సమస్యను నివేదించండి",
    subtitle: "మీకు అనుకూలమైన నివేదన విధానాన్ని ఎంచుకోండి. అన్నింటిలో ఆటోమేటిక్ జీపీఎస్ ఉంటుంది.",
    cityLabel: "నగరం",
    change: "మార్చండి",
    photoTitle: "ఒకే-క్లిక్ లైవ్ ఫోటో",
    photoBadge: "అత్యంత వేగవంతమైనది (10 సెక)",
    photoDesc: "సమస్య వద్ద లైవ్ ఫోటో తీయండి. కెమెరా స్వయంచాలకంగా మీ ఖచ్చితమైన జీపీఎస్ స్థానాన్ని రికార్డు చేస్తుంది.",
    photoBtn: "ఫోటో తీసి పంపండి",
    liveGps: "లైవ్ జీపీఎస్",
    chatTitle: "చాట్ అసిస్టెంట్",
    chatBadge: "సంభాషణ ద్వారా",
    chatDesc: "మీ భాషలో సహాయకుడితో మాట్లాడండి. సమస్యను వివరించండి, ఫోటోలు జతచేయండి మరియు సమీక్షించండి.",
    chatBtn: "చాట్ ప్రారంభించండి",
    chatMeta: "బహుభాషా",
    voiceTitle: "వాయిస్ నోట్ రిపోర్ట్",
    voiceBadge: "టైప్ చేయనవసరం లేదు",
    voiceDesc: "30 సెకన్ల వాయిస్ రికార్డ్ చేయండి. మీ మాటలను గుర్తించి వెంటనే ఫిర్యాదును సిద్ధం చేస్తుంది.",
    voiceBtn: "వాయిస్ రికార్డ్ చేయండి",
    voiceMeta: "ఆడియో మాటలు",
    formTitle: "వివరమైన ఫారం",
    formBadge: "ప్రామాణిక ఫారం",
    formDesc: "వర్గం, వార్డు, ల్యాండ్‌మార్క్ ఎంచుకుని ఫైళ్లను అప్‌లోడ్ చేయడానికి స్టెప్ బై స్టెప్ ఫారం.",
    formBtn: "ఫారం తెరవండి",
    formMeta: "ఫైళ్ల అప్‌లోడ్",
    privacyTitle: "పౌర గోప్యత & ధృవీకరణ హామీ",
    privacyDesc: "ప్రతి ఫిర్యాదు సంబంధిత వార్డు అధికారికి వెళ్తుంది. మీ పేరు, ఇమెయిల్, మొబైల్ నంబర్ పూర్తిగా సురక్షితంగా ఉంటాయి.",
    activatingCamera: "కెమెరా ఆన్ అవుతోంది…",
  },
};

export default function ReportHub() {
  const navigate = useNavigate();
  const { selectedCity, language } = useComplaints();
  const t = HUB_TRANSLATIONS[language] || HUB_TRANSLATIONS.en;
  const { toast } = useToast();
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);

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
      // 1. Fast client-side compression (converts 15MB to ~120KB in 30ms)
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

      // Store in session storage so ChatReport can immediately load it as active draft
      sessionStorage.setItem(
        "nagarmitra_pending_photo_report",
        JSON.stringify({
          mediaUrl,
          mediaId,
          lat: location.lat,
          lng: location.lng,
          address: location.address,
        })
      );

      navigate("/report/chat?source=live_photo");
    } catch (err: any) {
      toast({
        title: "Could not process photo",
        description: err.message || "Please try again or use the chat assistant.",
        variant: "error",
      });
      setCapturingPhoto(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-3 py-4 sm:px-6 sm:py-6">
      {/* Hidden Native Camera Input with capture="environment" */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleLiveCameraCapture}
      />

      {/* Header section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Zap size={16} />
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              {t.title}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {t.subtitle}
          </p>
        </div>

        <button
          onClick={() => setCityPickerOpen(true)}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-brand-300 hover:text-brand-600 sm:self-auto"
        >
          <MapPin size={13} className="text-brand-600" />
          <span>{t.cityLabel}: {selectedCity}</span>
          <span className="text-[10px] text-slate-400">{t.change}</span>
        </button>
      </div>

      {/* Primary Reporting Modes Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* 1. One-Click Live Photo */}
        <div
          onClick={triggerLiveCamera}
          className="group surface surface-hover relative flex cursor-pointer flex-col justify-between overflow-hidden p-5 transition active:scale-[0.99] border-2 border-emerald-500/20 hover:border-emerald-500"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white">
                <Camera size={24} />
              </span>
              <span className="rounded-full bg-emerald-100/70 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-800">
                {t.photoBadge}
              </span>
            </div>

            <div>
              <h2 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-700">
                {t.photoTitle}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {t.photoDesc}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between pt-3 border-t border-line/60">
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              {capturingPhoto ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>{t.activatingCamera}</span>
                </>
              ) : (
                <>
                  <span>{t.photoBtn}</span>
                  <ArrowRight size={13} className="transition group-hover:translate-x-1" />
                </>
              )}
            </span>
            <span className="text-[10.5px] text-slate-400">{t.liveGps}</span>
          </div>
        </div>

        {/* 2. AI Chat Assistant */}
        <Link
          to="/report/chat"
          className="group surface surface-hover relative flex flex-col justify-between overflow-hidden p-5 transition active:scale-[0.99] border-2 border-brand-500/20 hover:border-brand-500"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:scale-105 group-hover:bg-brand-600 group-hover:text-white">
                <MessageSquare size={24} />
              </span>
              <span className="rounded-full bg-brand-100/70 px-2.5 py-0.5 text-[10.5px] font-bold text-brand-800">
                {t.chatBadge}
              </span>
            </div>

            <div>
              <h2 className="text-base font-extrabold text-slate-900 group-hover:text-brand-700">
                {t.chatTitle}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {t.chatDesc}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between pt-3 border-t border-line/60">
            <span className="text-[11px] font-bold text-brand-700 flex items-center gap-1">
              <span>{t.chatBtn}</span>
              <ArrowRight size={13} className="transition group-hover:translate-x-1" />
            </span>
            <span className="text-[10.5px] text-slate-400">{t.chatMeta}</span>
          </div>
        </Link>

        {/* 3. Voice Report */}
        <Link
          to="/report/voice"
          className="group surface surface-hover relative flex flex-col justify-between overflow-hidden p-5 transition active:scale-[0.99] border-2 border-rose-500/20 hover:border-rose-500"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition group-hover:scale-105 group-hover:bg-rose-600 group-hover:text-white">
                <Mic size={24} />
              </span>
              <span className="rounded-full bg-rose-100/70 px-2.5 py-0.5 text-[10.5px] font-bold text-rose-800">
                {t.voiceBadge}
              </span>
            </div>

            <div>
              <h2 className="text-base font-extrabold text-slate-900 group-hover:text-rose-700">
                {t.voiceTitle}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {t.voiceDesc}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between pt-3 border-t border-line/60">
            <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
              <span>{t.voiceBtn}</span>
              <ArrowRight size={13} className="transition group-hover:translate-x-1" />
            </span>
            <span className="text-[10.5px] text-slate-400">{t.voiceMeta}</span>
          </div>
        </Link>

        {/* 4. Detailed Form */}
        <Link
          to="/report/manual"
          className="group surface surface-hover relative flex flex-col justify-between overflow-hidden p-5 transition active:scale-[0.99] border-2 border-slate-300/40 hover:border-slate-500"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:scale-105 group-hover:bg-slate-700 group-hover:text-white">
                <FileText size={24} />
              </span>
              <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[10.5px] font-bold text-slate-700">
                {t.formBadge}
              </span>
            </div>

            <div>
              <h2 className="text-base font-extrabold text-slate-900 group-hover:text-slate-800">
                {t.formTitle}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {t.formDesc}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between pt-3 border-t border-line/60">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span>{t.formBtn}</span>
              <ArrowRight size={13} className="transition group-hover:translate-x-1" />
            </span>
            <span className="text-[10.5px] text-slate-400">{t.formMeta}</span>
          </div>
        </Link>
      </div>

      {/* Assurance banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 text-xs text-slate-600">
        <ShieldCheck size={18} className="text-brand-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-800">{t.privacyTitle}</p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            {t.privacyDesc}
          </p>
        </div>
      </div>

      <CityPickerModal open={cityPickerOpen} onClose={() => setCityPickerOpen(false)} />
    </div>
  );
}
