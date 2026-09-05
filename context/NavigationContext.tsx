import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { formatDistance } from '../utils/geoDistance';
import { formatDuration } from '../utils/osrmRoute';

export type TravelMode = 'driving' | 'foot' | 'cycling';

type LatLng = { latitude: number; longitude: number };

type NavigationContextValue = {
  directionsOpen: boolean;
  openDirections: () => void;
  closeDirections: () => void;

  followDirection: boolean;
  setFollowDirection: (enabled: boolean) => void;

  isNavigating: boolean;
  startGo: () => void;
  endGo: () => void;
  /** Hard reset — clears sheet, route, and Go session. */
  resetNavigation: () => void;

  travelMode: TravelMode;
  setTravelMode: (mode: TravelMode) => void;
  travelModeLabel: string;

  destinationName: string;
  setDestinationName: (name: string) => void;

  routeDistanceMeters: number;
  routeDurationSeconds: number;
  setRouteMetrics: (distanceMeters: number, durationSeconds: number) => void;

  distanceLabel: string;
  durationLabel: string;

  goBannerExpanded: boolean;
  setGoBannerExpanded: React.Dispatch<React.SetStateAction<boolean>>;

  phoneLocation: LatLng | null;
  caneLocation: LatLng | null;
  setEndpoints: (phone: LatLng | null, cane: LatLng | null) => void;

  /** Snapped road polyline — survives leaving Home until End. */
  savedRoutePoints: LatLng[];
  setSavedRoute: (
    points: LatLng[],
    distanceMeters: number,
    durationSeconds: number
  ) => void;
};

const TRAVEL_MODE_LABELS: Record<TravelMode, string> = {
  driving: 'Drive',
  foot: 'Walk',
  cycling: 'Cycle',
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [followDirection, setFollowDirectionState] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  const [destinationName, setDestinationName] = useState('SmartCane');
  const [routeDistanceMeters, setRouteDistanceMeters] = useState(0);
  const [routeDurationSeconds, setRouteDurationSeconds] = useState(0);
  const [goBannerExpanded, setGoBannerExpanded] = useState(true);
  const [phoneLocation, setPhoneLocation] = useState<LatLng | null>(null);
  const [caneLocation, setCaneLocation] = useState<LatLng | null>(null);
  const [savedRoutePoints, setSavedRoutePoints] = useState<LatLng[]>([]);

  const resetNavigation = useCallback(() => {
    setIsNavigating(false);
    setFollowDirectionState(false);
    setDirectionsOpen(false);
    setGoBannerExpanded(false);
    setRouteDistanceMeters(0);
    setRouteDurationSeconds(0);
    setSavedRoutePoints([]);
  }, []);

  const openDirections = useCallback(() => {
    setDirectionsOpen(true);
  }, []);

  const closeDirections = useCallback(() => {
    setDirectionsOpen(false);
  }, []);

  const setFollowDirection = useCallback((enabled: boolean) => {
    setFollowDirectionState(enabled);
    if (!enabled) {
      setIsNavigating(false);
    }
  }, []);

  const startGo = useCallback(() => {
    setFollowDirectionState(true);
    setIsNavigating(true);
    setDirectionsOpen(false);
    setGoBannerExpanded(true);
  }, []);

  const endGo = useCallback(() => {
    resetNavigation();
  }, [resetNavigation]);

  const setRouteMetrics = useCallback(
    (distanceMeters: number, durationSeconds: number) => {
      setRouteDistanceMeters(distanceMeters);
      setRouteDurationSeconds(durationSeconds);
    },
    []
  );

  const setEndpoints = useCallback((phone: LatLng | null, cane: LatLng | null) => {
    setPhoneLocation(phone);
    setCaneLocation(cane);
  }, []);

  const setSavedRoute = useCallback(
    (points: LatLng[], distanceMeters: number, durationSeconds: number) => {
      if (points.length > 2) {
        setSavedRoutePoints(points);
        setRouteDistanceMeters(distanceMeters);
        setRouteDurationSeconds(durationSeconds);
      }
    },
    []
  );

  const value = useMemo<NavigationContextValue>(
    () => ({
      directionsOpen,
      openDirections,
      closeDirections,
      followDirection,
      setFollowDirection,
      isNavigating,
      startGo,
      endGo,
      resetNavigation,
      travelMode,
      setTravelMode,
      travelModeLabel: TRAVEL_MODE_LABELS[travelMode],
      destinationName,
      setDestinationName,
      routeDistanceMeters,
      routeDurationSeconds,
      setRouteMetrics,
      distanceLabel: formatDistance(routeDistanceMeters),
      durationLabel:
        routeDurationSeconds > 0 ? formatDuration(routeDurationSeconds) : '—',
      goBannerExpanded,
      setGoBannerExpanded,
      phoneLocation,
      caneLocation,
      setEndpoints,
      savedRoutePoints,
      setSavedRoute,
    }),
    [
      directionsOpen,
      openDirections,
      closeDirections,
      followDirection,
      setFollowDirection,
      isNavigating,
      startGo,
      endGo,
      resetNavigation,
      travelMode,
      destinationName,
      routeDistanceMeters,
      routeDurationSeconds,
      setRouteMetrics,
      goBannerExpanded,
      phoneLocation,
      caneLocation,
      setEndpoints,
      savedRoutePoints,
      setSavedRoute,
    ]
  );

  return (
    <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return ctx;
}
