type LatLng = { latitude: number; longitude: number };

export type TravelProfile = "driving" | "foot" | "cycling";

export type RoadRouteResult = {
  points: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  turnPoints: LatLng[];
};

const FETCH_TIMEOUT_MS = 12000;

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
  profile: TravelProfile = "driving"
): Promise<RoadRouteResult | null> {
  const { primary } = await requestOsrm(from, to, profile, false);
  if (primary?.points && primary.points.length > 2) return primary;

  if (profile !== "driving") {
    const drive = await requestOsrm(from, to, "driving", false);
    if (drive.primary?.points && drive.primary.points.length > 2) {
      return drive.primary;
    }
  }
  if (profile !== "foot") {
    const foot = await requestOsrm(from, to, "foot", false);
    if (foot.primary?.points && foot.primary.points.length > 2) {
      return foot.primary;
    }
  }
  return null;
}

/** Primary + up to 2 alternate routes. */
export async function fetchRoadRoutes(
  from: LatLng,
  to: LatLng,
  profile: TravelProfile = "driving"
): Promise<{ primary: RoadRouteResult | null; alternatives: RoadRouteResult[] }> {
  const single = await fetchRoadRoute(from, to, profile);
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
  profile: TravelProfile = "driving"
) {
  return `${profile}:${roundCoord(from.latitude)},${roundCoord(from.longitude)}->${roundCoord(to.latitude)},${roundCoord(to.longitude)}`;
}

/** Coarser key so GPS jitter does not cancel an in-flight road fetch. */
export function routeFetchKey(
  from: LatLng,
  to: LatLng,
  profile: TravelProfile = "driving"
) {
  return `${profile}:${roundCoord(from.latitude, 3)},${roundCoord(from.longitude, 3)}->${roundCoord(to.latitude, 3)},${roundCoord(to.longitude, 3)}`;
}

export function formatDuration(seconds: number) {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** Midpoint along a path (for ETA callout). */
export function pathMidpoint(points: LatLng[]): LatLng | null {
  if (!points.length) return null;
  if (points.length === 1) return points[0];
  const mid = Math.floor(points.length / 2);
  return points[mid];
}
