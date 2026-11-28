import { useState, useMemo } from "react";
import { Check, Loader2, MapPin, Navigation, Plus, Search, X } from "lucide-react";
import { useComplaints } from "@/store/ComplaintsContext";
import { useToast } from "@/store/ToastContext";
import { getCurrentPosition, reverseGeocode } from "@/lib/location";

interface CityPickerModalProps {
  open: boolean;
  onClose: () => void;
}

export function CityPickerModal({ open, onClose }: CityPickerModalProps) {
  const { cities, selectedCity, setSelectedCity, addCustomCity } = useComplaints();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [detectingGps, setDetectingGps] = useState(false);

  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.toLowerCase().includes(q));
  }, [cities, search]);

  const exactMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cities.some((c) => c.toLowerCase() === q);
  }, [cities, search]);

  if (!open) return null;

  const handleSelect = (city: string) => {
    setSelectedCity(city);
    onClose();
  };

  const handleAddCustom = () => {
    const name = search.trim();
    if (name) {
      addCustomCity(name);
      onClose();
    }
  };

  const handleAutoDetectLocation = async () => {
    setDetectingGps(true);
    try {
      const pos = await getCurrentPosition();
      const geo = await reverseGeocode(pos.lat, pos.lng);
      const detectedCity = geo.city || geo.suburb;
      if (detectedCity) {
        const matched = cities.find((c) => c.toLowerCase() === detectedCity.toLowerCase());
        if (matched) {
          setSelectedCity(matched);
          toast({ title: "City detected", description: matched, variant: "success" });
        } else {
          addCustomCity(detectedCity);
        }
        onClose();
      } else {
        toast({ title: "Could not identify city from GPS coordinates", variant: "error" });
      }
    } catch (err: any) {
      toast({
        title: "GPS location error",
        description: err.message || "Please allow location access in your browser.",
        variant: "error",
      });
    } finally {
      setDetectingGps(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col w-full max-w-sm max-h-[85vh] rounded-3xl border border-line bg-white shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <MapPin size={16} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Select Indian City</h2>
              <p className="text-[11px] text-slate-400">Current: {selectedCity}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* GPS Live Location Auto-Detect Button */}
        <div className="p-3 bg-brand-50/50 border-b border-line">
          <button
            type="button"
            onClick={handleAutoDetectLocation}
            disabled={detectingGps}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-brand-200 py-2.5 px-3 text-xs font-bold text-brand-700 shadow-xs hover:bg-brand-50 transition active:scale-98"
          >
            {detectingGps ? (
              <Loader2 size={15} className="animate-spin text-brand-600" />
            ) : (
              <Navigation size={15} className="text-brand-600" />
            )}
            <span>{detectingGps ? "Detecting GPS location…" : "Auto-Detect My City via GPS"}</span>
          </button>
        </div>

        {/* Search & Custom Input */}
        <div className="p-4 border-b border-line/60">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or type new city..."
              className="w-full rounded-xl border border-line bg-slate-50 pl-9 pr-4 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              autoFocus
            />
          </div>

          {search.trim().length > 1 && !exactMatch ? (
            <button
              type="button"
              onClick={handleAddCustom}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-50 border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
            >
              <Plus size={14} />
              <span>Add & Select &quot;{search.trim()}&quot;</span>
            </button>
          ) : null}
        </div>

        {/* Cities List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
          {filteredCities.map((city) => {
            const isSelected = city.toLowerCase() === selectedCity.toLowerCase();
            return (
              <button
                key={city}
                type="button"
                onClick={() => handleSelect(city)}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-medium transition ${
                  isSelected
                    ? "bg-brand-50 text-brand-700 font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{city}</span>
                {isSelected ? <Check size={15} className="text-brand-600" /> : null}
              </button>
            );
          })}

          {filteredCities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching city found. Click above to add it.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
