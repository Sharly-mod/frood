"use client";

import { useCallback, useEffect, useState } from "react";
import { LocationService } from "../services/locationService";
import type { LocationStatus } from "../services/locationService";
import type { Coordinates } from "../types/filters";

interface UseLocationResult {
  status: LocationStatus;
  coordinates: Coordinates | null;
  request: () => Promise<{ status: LocationStatus; coordinates: Coordinates | null }>;
  geocode: (query: string) => Promise<Coordinates | null>;
}

export function useLocation(): UseLocationResult {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  const request = useCallback(async () => {
    const result = await LocationService.getCurrentPosition();
    setStatus(result.status);
    if (result.coordinates) {
      setCoordinates(result.coordinates);
    }
    return result;
  }, []);

  const geocode = useCallback(async (query: string) => {
    const coords = await LocationService.geocode(query);
    if (coords) {
      setCoordinates(coords);
      setStatus("granted");
    }
    return coords;
  }, []);

  useEffect(() => {
    void request();
  }, [request]);

  return { status, coordinates, request, geocode };
}