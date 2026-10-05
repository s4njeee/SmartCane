type LatLng = { latitude: number; longitude: number };

export type TravelMode = "driving" | "foot" | "motorcycle";
export type TravelProfile = "driving" | "foot" | "cycling";

export type RoadRouteResult = {
  points: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  turnPoints: LatLng[];
};

const FETCH_TIMEOUT_MS = 12000;

/** Urban averages (km/h). Caregiver trips to a nearby cane are city-scale. */
const SPEED_KMH: Record<TravelMode, number> = {
  driving: 32,
  motorcycle: 45,
  foot: 5,
};

/** OSRM has no motorcycle profile — moto uses the same roads as a car. */
export function osrmProfileForMode(mode: TravelMode): TravelProfile {
  return mode === "foot" ? "foot" : "driving";
}

/** Minutes come from road (or map) distance × typical speed for the mode. */
export function durationFromDistance(
  meters: number,
  mode: TravelMode
): number {
  if (!Number.isFinite(meters) || meters <= 0) return 0;
  return (meters / 1000) * (3600 / SPEED_KMH[mode]);
}

function roundCoord(value: number, digits = 4) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function osrmUrl(
  hostPath: string,
  from: LatLng,
  to: LatLng,
  profile: TravelProfile,
  alternatives: boolean
) {
  return (
    `${hostPath}${profile}/` +
    `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=full&geometries=geojson&steps=true` +
    (alternatives ? "&alternatives=true" : "")
  );
}

function parseOsrmRoute(data: any, routeIndex = 0): RoadRouteResult | null {
  const route = data?.routes?.[routeIndex];
  const coords: number[][] | undefined = route?.geometry?.coordinates;
  if (!coords || coords.length < 3) return null;

  const points = coords.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));

  const turnPoints: LatLng[] = [];
  const legs = route?.legs ?? [];
  legs.forEach((leg: any) => {
    (leg.steps ?? []).forEach((step: any) => {
      const man = step?.maneuver;
      const loc = man?.location;
      const type = String(man?.type ?? "");
      if (!loc || type === "depart" || type === "arrive") return;
      turnPoints.push({ latitude: loc[1], longitude: loc[0] });
    });
  });

  return {
    points,
    distanceMeters: Number(route.distance ?? 0),
    durationSeconds: Number(route.duration ?? 0),
    turnPoints,
  };
}

async function fetchJson(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.code && data.code !== "Ok") return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function osmDeHost(profile: TravelProfile) {
  const routed =
    profile === "foot"
      ? "routed-foot"
      : profile === "cycling"
        ? "routed-bike"
        : "routed-car";
  return `https://routing.openstreetmap.de/${routed}/route/v1/`;
}

async function requestOsrm(
  from: LatLng,
  to: LatLng,
  profile: TravelProfile,
  alternatives = false
): Promise<{ primary: RoadRouteResult | null; alternatives: RoadRouteResult[] }> {
  const urls = [
    osrmUrl("https://router.project-osrm.org/route/v1/", from, to, profile, alternatives),
    osrmUrl(osmDeHost(profile), from, to, profile, false),
  ];

  for (const url of urls) {
    const data = await fetchJson(url);
    if (!data) continue;
    const primary = parseOsrmRoute(data, 0);
    if (!primary?.points || primary.points.length < 3) continue;

    const alts: RoadRouteResult[] = [];
    const routes = data?.routes ?? [];
    for (let i = 1; i < Math.min(routes.length, 3); i++) {
      const alt = parseOsrmRoute(data, i);
      if (alt?.points && alt.points.length > 2) alts.push(alt);
    }
    return { primary, alternatives: alts };
  }

  return { primary: null, alternatives: [] };
}

/** Road route between two GPS points for a travel mode. */
export async function fetchRoadRoute(
  from: LatLng,
  to: LatLng,
  mode: TravelMode = "driving"
): Promise<RoadRouteResult | null> {
  const profile = osrmProfileForMode(mode);
  let primary = (await requestOsrm(from, to, profile, false)).primary;

  if (!primary?.points || primary.points.length <= 2) {
    if (profile !== "driving") {
      primary = (await requestOsrm(from, to, "driving", false)).primary;
    }
  }
  if (!primary?.points || primary.points.length <= 2) {
    if (profile !== "foot") {
      primary = (await requestOsrm(from, to, "foot", false)).primary;
    }
  }
  if (!primary?.points || primary.points.length <= 2) return null;

  return {
    ...primary,
    durationSeconds: durationFromDistance(primary.distanceMeters, mode),
  };
}

/** Primary + up to 2 alternate routes. */
export async function fetchRoadRoutes(
  from: LatLng,
  to: LatLng,
  mode: TravelMode = "driving"
): Promise<{ primary: RoadRouteResult | null; alternatives: RoadRouteResult[] }> {
  const single = await fetchRoadRoute(from, to, mode);
  if (single?.points && single.points.length > 2) {
    return { primary: single, alternatives: [] };
  }
  return { primary: null, alternatives: [] };
}

export function pickWaypoints(points: LatLng[], maxDots = 12): LatLng[] {
  if (points.length <= 2) return [];
  if (points.length <= maxDots + 2) return points.slice(1, -1);

  const step = Math.max(1, Math.floor((points.length - 2) / maxDots));
  const dots: LatLng[] = [];
  for (let i = step; i < points.length - 1; i += step) {
    dots.push(points[i]);
    if (dots.length >= maxDots) break;
  }
  return dots;
}

export function routeCacheKey(
  from: LatLng,
  to: LatLng,
  mode: TravelMode = "driving"
) {
  const profile = osrmProfileForMode(mode);
  return `${profile}:${roundCoord(from.latitude)},${roundCoord(from.longitude)}->${roundCoord(to.latitude)},${roundCoord(to.longitude)}`;
}

/** Coarser key so GPS jitter does not cancel an in-flight road fetch. */
export function routeFetchKey(
  from: LatLng,
  to: LatLng,
  mode: TravelMode = "driving"
) {
  const profile = osrmProfileForMode(mode);
  return `${profile}:${roundCoord(from.latitude, 3)},${roundCoord(from.longitude, 3)}->${roundCoord(to.latitude, 3)},${roundCoord(to.longitude, 3)}`;
}

export function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "—";
  const sec = Math.max(1, Math.round(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const parts: string[] = [];
  if (h > 0) parts.push(`${h} Hr`);
  if (m > 0) parts.push(`${m} Mins`);
  if (s > 0) parts.push(`${s} Sec`);
  if (parts.length === 0) return "1 Sec";
  return parts.join(" ");
}

/** Midpoint along a path (for ETA callout). */
export function pathMidpoint(points: LatLng[]): LatLng | null {
  if (!points.length) return null;
  if (points.length === 1) return points[0];
  const mid = Math.floor(points.length / 2);
  return points[mid];
}
