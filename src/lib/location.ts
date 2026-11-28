export interface GeoLocationResult {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface GeocodeResult {
  fullAddress: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  state?: string;
  postcode?: string;
}

export const PRESEEDED_INDIAN_CITIES = [
  "Hyderabad",
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Bhopal",
  "Patna",
  "Indore",
  "Visakhapatnam",
  "Surat",
  "Nagpur",
  "Coimbatore",
  "Varanasi",
  "Kanpur",
  "Vadodara",
  "Kochi",
  "Bhubaneswar",
  "Guwahati",
  "Agra",
  "Nashik",
  "Amritsar",
  "Vijayawada",
  "Warangal",
  "Tirupati",
  "Mysore",
  "Dehradun",
  "Ranchi",
  "Noida",
  "Gurugram",
] as const;

export const INDIAN_CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Chandigarh: { lat: 30.7333, lng: 76.7794 },
  Bhopal: { lat: 23.2599, lng: 77.4126 },
  Patna: { lat: 25.5941, lng: 85.1376 },
  Indore: { lat: 22.7196, lng: 75.8577 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  Surat: { lat: 21.1702, lng: 72.8311 },
  Nagpur: { lat: 21.1458, lng: 79.0882 },
  Coimbatore: { lat: 11.0168, lng: 76.9558 },
  Varanasi: { lat: 25.3176, lng: 82.9739 },
  Kanpur: { lat: 26.4499, lng: 80.3319 },
  Vadodara: { lat: 22.3072, lng: 73.1812 },
  Kochi: { lat: 9.9312, lng: 76.2673 },
  Bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  Guwahati: { lat: 26.1445, lng: 91.7362 },
  Agra: { lat: 27.1767, lng: 78.0081 },
  Nashik: { lat: 19.9975, lng: 73.7898 },
  Amritsar: { lat: 31.634, lng: 74.8723 },
  Vijayawada: { lat: 16.5062, lng: 80.648 },
  Warangal: { lat: 17.9689, lng: 79.5941 },
  Tirupati: { lat: 13.6288, lng: 79.4192 },
  Mysore: { lat: 12.2958, lng: 76.6394 },
  Dehradun: { lat: 30.3165, lng: 78.0322 },
  Ranchi: { lat: 23.3441, lng: 85.3096 },
  Noida: { lat: 28.5355, lng: 77.391 },
  Gurugram: { lat: 28.4595, lng: 77.0266 },
};

export function getCityCoordinates(city: string): { lat: number; lng: number } {
  const normalized = city.trim();
  const matched = Object.keys(INDIAN_CITY_COORDINATES).find(
    (c) => c.toLowerCase() === normalized.toLowerCase()
  );
  if (matched) return INDIAN_CITY_COORDINATES[matched];
  // Default to Hyderabad / central India
  return { lat: 17.385, lng: 78.4867 };
}

/**
 * Requests device GPS position with high accuracy.
 */
export async function getCurrentPosition(): Promise<GeoLocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        let msg = "Could not retrieve GPS location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied. Please allow location access in your browser.";
        } else if (err.code === err.TIMEOUT) {
          msg = "GPS request timed out.";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Reverse geocodes latitude and longitude into human-readable Indian street address.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`Geocoding HTTP ${res.status}`);
    }
    const data = await res.json();
    const addr = data.address || {};

    const road = addr.road || addr.street || addr.pedestrian || addr.lane || "";
    const suburb = addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict || "";
    const city = addr.city || addr.town || addr.city_district || addr.district || addr.state_district || "";
    const state = addr.state || "";
    const postcode = addr.postcode || "";

    const parts = [road, suburb, city, state, postcode].filter(Boolean);
    const fullAddress = parts.join(", ") || data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    return {
      fullAddress,
      road,
      suburb,
      city,
      state,
      postcode,
    };
  } catch {
    return {
      fullAddress: `Near GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    };
  }
}
