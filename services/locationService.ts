import type { Coordinates } from "../types/filters";

export type LocationStatus = "granted" | "denied" | "unavailable" | "idle";

export interface LocationResult {
  status: LocationStatus;
  coordinates: Coordinates | null;
}

const CITY_COORDS: Record<string, Coordinates> = {
  paris: { lat: 48.8566, lng: 2.3522 },
  lyon: { lat: 45.764, lng: 4.8357 },
  marseille: { lat: 43.2965, lng: 5.3698 },
  lille: { lat: 50.6292, lng: 3.0573 },
  nantes: { lat: 47.2184, lng: -1.5536 },
  bordeaux: { lat: 44.8378, lng: -0.5792 },
  toulouse: { lat: 43.6047, lng: 1.4442 },
  nice: { lat: 43.7102, lng: 7.262 },
  strasbourg: { lat: 48.5734, lng: 7.7521 },
  rennes: { lat: 48.1173, lng: -1.6778 },
};

/**
 * Location abstraction. Swap this implementation for a real geocoding / places API later.
 */
export const LocationService = {
  async getCurrentPosition(): Promise<LocationResult> {
    if (!("geolocation" in navigator)) {
      return { status: "unavailable", coordinates: null };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            status: "granted",
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              label: "Ma position",
            },
          });
        },
        (error) => {
          resolve({
            status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
            coordinates: null,
          });
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });
  },

  /**
   * Geocoding: small local list first (offline / instant), then the free
   * Nominatim proxy at /api/geocode for any other city or district.
   */
  async geocode(query: string): Promise<Coordinates | null> {
    const normalized = query
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const entry = Object.entries(CITY_COORDS).find(([city]) => normalized.includes(city) || city.includes(normalized));
    if (entry) {
      const [city, coords] = entry;
      return { ...coords, label: city.charAt(0).toUpperCase() + city.slice(1) };
    }

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      if (response.ok) {
        const data = (await response.json()) as Coordinates | null;
        if (data && typeof data.lat === "number" && typeof data.lng === "number") {
          return data;
        }
      }
    } catch {
      // offline or geocoder down → fall through
    }

    return null;
  },

  getDefaultLocation(): Coordinates {
    return { ...CITY_COORDS.paris, label: "Paris" };
  },
};