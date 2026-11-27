import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { categoryMeta, priorityMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Complaint } from "@/types";

interface LatLng {
  lat: number;
  lng: number;
}

interface CityMapProps {
  complaints: Complaint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMapClick?: (coords: LatLng) => void;
  pin?: LatLng | null;
  density?: boolean;
  showLegend?: boolean;
  className?: string;
  children?: React.ReactNode;
  /** When false, the map does not auto-fit to the markers. */
  autoFit?: boolean;
}

const CITY_CENTERS: Record<string, LatLng> = {
  Riverton: { lat: 17.4, lng: 78.47 },
  "Metro Heights": { lat: 17.47, lng: 78.38 },
  "Bay City": { lat: 17.34, lng: 78.56 },
};

const TILE_URL =
  (import.meta.env.VITE_MAP_TILE_URL as string | undefined) ??
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  (import.meta.env.VITE_MAP_ATTRIBUTION as string | undefined) ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const PRIORITY_HEX: Record<string, string> = {
  low: "#94a3b8",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

function categoryIcon(complaint: Complaint, active: boolean) {
  const meta = priorityMeta(complaint.priority);
  const category = categoryMeta(complaint.category);
  const color = PRIORITY_HEX[complaint.priority] ?? PRIORITY_HEX.low;
  const icon = category.icon;
  // Render the preserved category glyph inside a priority-coloured marker.
  const svg = renderIconSvg(icon, active);
  return L.divIcon({
    html: `<div class="nm-marker ${active ? "nm-marker-active" : ""}" style="background:${color}">${svg}</div>`,
    className: "nm-marker-wrap",
    iconSize: active ? [38, 38] : [30, 30],
    iconAnchor: active ? [19, 19] : [15, 15],
  });
}

/** Minimal inline SVG for the lucide glyph, so markers stay crisp without extra DOM. */
function renderIconSvg(icon: unknown, active: boolean) {
  const paths = lucidePaths(icon);
  return `<svg viewBox="0 0 24 24" width="${active ? 18 : 14}" height="${active ? 18 : 14}"
    fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"
    style="filter: drop-shadow(0 1px 1px rgba(0,0,0,.25))">${paths}</svg>`;
}

/**
 * Lucide icons are React components; their rendered markup is not accessible as a string.
 * We therefore map the category to a compact set of known glyph paths.
 */
function lucidePaths(icon: unknown): string {
  const name =
    (icon as { displayName?: string; name?: string } | undefined)?.displayName ??
    (icon as { name?: string } | undefined)?.name ??
    "";
  const map: Record<string, string> = {
    Construction: '<path d="M2 20h20"/><path d="M6 20V8l6-4 6 4v12"/><path d="M9 20v-6h6v6"/>',
    Trash2: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v5"/><path d="M14 11v5"/>',
    Droplets: '<path d="M12 2.7 6.5 9.2a7 7 0 1 0 11 0Z"/>',
    Waves: '<path d="M2 6c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M2 12c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M2 18c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2"/>',
    Zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
    Landmark: '<path d="M3 21h18"/><path d="M5 21V10"/><path d="M19 21V10"/><path d="M9 21v-7h6v7"/><path d="M12 2 3 8h18Z"/>',
    Leaf: '<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-5 16-9 16Z"/><path d="M4 21c2-6 5-9 9-11"/>',
    HeartPulse: '<path d="M20.8 5.6a5.4 5.4 0 0 0-7.7 0L12 6.7l-1.1-1.1a5.4 5.4 0 1 0-7.7 7.7L12 22l8.8-8.7a5.4 5.4 0 0 0 0-7.7Z"/><path d="M3 12h4l2 3 3-6 2 3h4"/>',
    ShieldAlert: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    FileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
    Scale: '<path d="M12 3v18"/><path d="M5 7h14"/><path d="m5 7-2 6a3 3 0 0 0 6 0Z"/><path d="m19 7 2 6a3 3 0 0 1-6 0Z"/>',
    GraduationCap: '<path d="M22 10 12 5 2 10l10 5Z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/>',
    HelpCircle: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-.8.6-1.5 1-1.5 2"/><path d="M12 17h.01"/>',
  };
  return map[name] ?? map.HelpCircle;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (coords: LatLng) => void }) {
  useMapEvents({
    click(event) {
      onMapClick?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

function FitBounds({ complaints, autoFit }: { complaints: Complaint[]; autoFit: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!autoFit || complaints.length === 0) return;
    const bounds = L.latLngBounds(complaints.map((item) => [item.lat, item.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
  }, [autoFit, complaints, map]);
  return null;
}

function FlyToSelected({ complaint }: { complaint?: Complaint }) {
  const map = useMap();
  useEffect(() => {
    if (!complaint) return;
    map.flyTo([complaint.lat, complaint.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [complaint, map]);
  return null;
}

export function CityMap({
  complaints,
  selectedId,
  onSelect,
  onMapClick,
  pin,
  density = false,
  showLegend = true,
  className,
  children,
  autoFit = true,
}: CityMapProps) {
  const center = useMemo<LatLng>(() => {
    if (pin) return pin;
    if (complaints.length > 0) {
      const lat = complaints.reduce((sum, item) => sum + item.lat, 0) / complaints.length;
      const lng = complaints.reduce((sum, item) => sum + item.lng, 0) / complaints.length;
      return { lat, lng };
    }
    const city = complaints[0]?.city ?? "Riverton";
    return CITY_CENTERS[city] ?? CITY_CENTERS.Riverton;
  }, [complaints, pin]);

  const selected = complaints.find((item) => item.id === selectedId);

  return (
    <div
      className={cn(
        "relative min-h-[320px] overflow-hidden rounded-2xl border border-line bg-[#EDF0F6]",
        className
      )}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
        style={{ position: "absolute", inset: 0 }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
        <MapClickHandler onMapClick={onMapClick} />
        <FitBounds complaints={complaints} autoFit={autoFit && !pin} />
        <FlyToSelected complaint={selected} />

        {density
          ? complaints.map((complaint) => (
              <Circle
                key={`density-${complaint.id}`}
                center={[complaint.lat, complaint.lng]}
                radius={complaint.priority === "critical" ? 420 : 300}
                pathOptions={{
                  color: PRIORITY_HEX[complaint.priority],
                  fillColor: PRIORITY_HEX[complaint.priority],
                  fillOpacity: 0.13,
                  weight: 0,
                }}
              />
            ))
          : null}

        {complaints.map((complaint) => {
          const meta = priorityMeta(complaint.priority);
          const category = categoryMeta(complaint.category);
          return (
            <Marker
              key={complaint.id}
              position={[complaint.lat, complaint.lng]}
              icon={categoryIcon(complaint, complaint.id === selectedId)}
              eventHandlers={{ click: () => onSelect?.(complaint.id) }}
              title={`${complaint.title} · ${meta.label} priority`}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                <span style={{ fontWeight: 600 }}>{category.short}</span>
                <br />
                {complaint.title.slice(0, 60)}
                <br />
                <span style={{ color: PRIORITY_HEX[complaint.priority], fontWeight: 700 }}>
                  {meta.label} priority
                </span>
              </Tooltip>
            </Marker>
          );
        })}

        {pin ? (
          <Marker
            position={[pin.lat, pin.lng]}
            icon={L.divIcon({
              html: `<div class="nm-pin"><span></span></div>`,
              className: "nm-pin-wrap",
              iconSize: [26, 26],
              iconAnchor: [13, 26],
            })}
          >
            <Tooltip permanent direction="top" offset={[0, -24]} opacity={1}>
              Issue location
            </Tooltip>
          </Marker>
        ) : null}
      </MapContainer>

      {children}

      {showLegend ? (
        <div className="absolute bottom-3 left-3 z-[1000] rounded-xl border border-line bg-white/95 px-3 py-2 shadow-card backdrop-blur">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">Priority</p>
          <div className="flex items-center gap-2.5">
            {(["low", "medium", "high", "critical"] as const).map((id) => {
              const meta = priorityMeta(id);
              return (
                <span key={id} className="flex items-center gap-1 text-[10px] font-medium text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_HEX[id] }} />
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      <span className="pointer-events-none absolute right-3 top-3 z-[1000] rounded-md bg-white/90 px-2 py-0.5 text-[9px] font-medium text-slate-500 shadow-sm backdrop-blur">
        Leaflet · OpenStreetMap
      </span>
    </div>
  );
}
