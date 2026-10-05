import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import {
  addUserCane,
  CaneDeviceTelemetry,
  CaneItem,
  createAlert,
  deactivateAlerts,
  deleteUserCane,
  getCurrentUserId,
  RoutePoint,
  subscribeCaneDevices,
  subscribeUserCanes,
  syncCaneState,
} from '../firebase/appData';
import StatusSheet from '../components/ui/StatusSheet';
import StatusTabOverlay from '../components/ui/StatusTabOverlay';
import { TabKey } from '../components/ui/BottomTabBar';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  notifyEmergency,
  requestEmergencyNotificationPermission,
} from '../utils/emergencyNotifications';
import { analyzeCaneEvent } from '../utils/cloudEventIntelligence';
import {
  displayPlace,
  formatBarangayCity,
  looksLikeCoordinates,
  placeKey,
} from '../utils/geoPlace';
import {
  getCaneTelemetry,
  getDedicatedEyeglass,
  isCaneActive,
  isEyeglassActive,
} from '../utils/eyeglassStatus';
import {
  loadOfflineCaneSnapshot,
  saveOfflineCaneSnapshot,
} from '../utils/offlineCaneCache';

const GEOCODE_INTERVAL_MS = 60000;
const ROUTE_SAVE_DEBOUNCE_MS = 8000;
const MAX_ROUTE_POINTS = 60;
const PHONE_MOVE_THRESHOLD = 0.00002;

type LatLng = { latitude: number; longitude: number };

type CaneStatusContextValue = {
  canes: CaneItem[];
  selectedCane: CaneItem | null;
  setSelectedCane: (cane: CaneItem | null) => void;
  location: Location.LocationObjectCoords | null;
  caneAddress: string;
  phoneLocation: LatLng | null;
  phoneTrail: LatLng[];
  isOffline: boolean;
  isStatusOpen: boolean;
  originTab: TabKey;
  openStatus: (fromTab: TabKey) => void;
  closeStatus: () => void;
  handleAddCane: (cane: Omit<CaneItem, 'id' | 'routes'>) => Promise<boolean>;
  handleRemoveCane: (id: string) => Promise<void>;
};

const CaneStatusContext = createContext<CaneStatusContextValue | null>(null);

function movedEnough(last: RoutePoint | undefined, latitude: number, longitude: number) {
  if (!last) return true;
  const dLat = last.latitude - latitude;
  const dLng = last.longitude - longitude;
  return Math.sqrt(dLat * dLat + dLng * dLng) > 0.00002;
}

function hasValidCoords(latitude?: number, longitude?: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

function resolvePlace(
  latitude: number,
  longitude: number,
  existing: string | undefined,
  places: Record<string, string>
) {
  if (existing && !looksLikeCoordinates(existing)) return existing;
  return places[placeKey(latitude, longitude)];
}

function pickEyeglassPercent(glass?: CaneDeviceTelemetry | null) {
  const named = glass?.eyeglassBattery;
  const generic = glass?.battery;
  if (Number.isFinite(named) && (named ?? 0) > 0) return Math.round(named as number);
  if (Number.isFinite(generic) && (generic ?? 0) > 0) return Math.round(generic as number);
  if (Number.isFinite(named)) return Math.round(named as number);
  if (Number.isFinite(generic)) return Math.round(generic as number);
  return 0;
}

function mergeCanesWithDevices(
  stored: CaneItem[],
  devices: Record<string, CaneDeviceTelemetry>,
  places: Record<string, string> = {}
): CaneItem[] {
  const nowSec = Date.now() / 1000;

  return stored.map((cane) => {
    const glass = getDedicatedEyeglass(cane.caneID, devices);
    const caneTelemetry = getCaneTelemetry(cane.caneID, devices);
    const eyeglassConnected = isEyeglassActive(cane.caneID, devices, nowSec);
    const online = isCaneActive(cane.caneID, devices, nowSec);

    const eyeglassFields = {
      eyeglassConnected,
      eyeglassVoice: eyeglassConnected ? glass?.voiceCommand || 'On' : 'Off',
      eyeglassObstacle: eyeglassConnected
        ? Boolean(glass?.eyeglassObstacle || glass?.obstacle)
        : false,
      eyeglassBattery: eyeglassConnected ? pickEyeglassPercent(glass) : 0,
    };

    // Glass "stolen" / eyeglass SOS only while glasses are live.
    // Sticky Firebase flags must not alert when eyeglass is offline.
    const stolenLive =
      eyeglassConnected &&
      Boolean(
        glass?.stolen ||
          glass?.eyeglassSos ||
          caneTelemetry?.stolen ||
          caneTelemetry?.eyeglassSos
      );
    const glassEmergencyLive =
      eyeglassConnected && Boolean(glass?.sos) && !stolenLive;
    const caneEmergencyLive = online && Boolean(caneTelemetry?.sos);
    const sosActive = stolenLive || glassEmergencyLive || caneEmergencyLive;

    if (!caneTelemetry) {
      return {
        ...cane,
        ...eyeglassFields,
        connected: online,
        gps: false,
        obstacle: false,
        motion: false,
        fall: false,
        sos: sosActive,
        stolen: stolenLive,
        frontCm: undefined,
        upperCm: undefined,
        holeCm: undefined,
        accel: undefined,
        gyro: undefined,
        routes: cane.routes.map((route) => ({
          ...route,
          address: resolvePlace(
            route.latitude,
            route.longitude,
            route.address,
            places
          ),
        })),
      };
    }

    const deviceHasGps = hasValidCoords(caneTelemetry.latitude, caneTelemetry.longitude);

    let routes = cane.routes;
    const lastPlace = resolvePlace(
      routes[0]?.latitude ?? caneTelemetry.latitude,
      routes[0]?.longitude ?? caneTelemetry.longitude,
      routes[0]?.address,
      places
    );
    // Only append live GPS points while the device is online
    if (online && deviceHasGps) {
      const livePlace =
        resolvePlace(
          caneTelemetry.latitude,
          caneTelemetry.longitude,
          undefined,
          places
        ) || lastPlace;
      if (movedEnough(routes[0], caneTelemetry.latitude, caneTelemetry.longitude)) {
        routes = [
          {
            latitude: caneTelemetry.latitude,
            longitude: caneTelemetry.longitude,
            time: new Date().toLocaleTimeString(),
            address: livePlace,
          },
          ...routes.slice(0, MAX_ROUTE_POINTS - 1),
        ];
      } else if (routes[0]) {
        routes = [
          {
            ...routes[0],
            latitude: caneTelemetry.latitude,
            longitude: caneTelemetry.longitude,
            address: livePlace,
          },
          ...routes.slice(1),
        ];
      } else {
        routes = [
          {
            latitude: caneTelemetry.latitude,
            longitude: caneTelemetry.longitude,
            time: new Date().toLocaleTimeString(),
            address: livePlace,
          },
        ];
      }
    }

    routes = routes.map((route) => ({
      ...route,
      address: resolvePlace(
        route.latitude,
        route.longitude,
        route.address,
        places
      ),
    }));

    return {
      ...cane,
      ...eyeglassFields,
      connected: online,
      gps: online && (caneTelemetry.gps || deviceHasGps),
      obstacle: online ? caneTelemetry.obstacle : false,
      motion: online ? caneTelemetry.motion : false,
      fall: online ? caneTelemetry.fall : false,
      sos: sosActive,
      stolen: stolenLive,
      frontCm: caneTelemetry.frontCm,
      upperCm: caneTelemetry.upperCm,
      holeCm: caneTelemetry.holeCm,
      accel: caneTelemetry.accel,
      gyro: caneTelemetry.gyro,
      battery: Number.isFinite(caneTelemetry.battery)
        ? caneTelemetry.battery
        : cane.battery,
      routes,
    };
  });
}

function toCoords(point: RoutePoint): Location.LocationObjectCoords {
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    altitude: null,
    accuracy: 8,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  };
}

export function CaneStatusProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const onlineRef = useRef(isOnline);
  onlineRef.current = isOnline;
  const [userId, setUserId] = useState<string | null>(getCurrentUserId());
  const [storedCanes, setStoredCanes] = useState<CaneItem[]>([]);
  const [devices, setDevices] = useState<Record<string, CaneDeviceTelemetry>>({});
  const [selectedCane, setSelectedCane] = useState<CaneItem | null>(null);
  const [phoneLocation, setPhoneLocation] = useState<LatLng | null>(null);
  const [phoneTrail, setPhoneTrail] = useState<LatLng[]>([]);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [originTab, setOriginTab] = useState<TabKey>('home');
  const [nowTick, setNowTick] = useState(Date.now());
  const [placeByCoord, setPlaceByCoord] = useState<Record<string, string>>({});

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const canes = useMemo(
    () => mergeCanesWithDevices(storedCanes, devices, placeByCoord),
    [storedCanes, devices, nowTick, placeByCoord]
  );

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      if (!user) {
        setIsStatusOpen(false);
        setStoredCanes([]);
        setDevices({});
        setSelectedCane(null);
        setPhoneLocation(null);
        setPhoneTrail([]);
      }
    });
  }, []);

  const lastGeocodeAt = useRef(0);
  const lastAddress = useRef('');
  const fillingPlaces = useRef(false);
  const attemptedPlaceKeys = useRef<Set<string>>(new Set());
  const [caneAddress, setCaneAddress] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const obstacleAlerted = useRef<Set<string>>(new Set());
  const motionAlerted = useRef<Set<string>>(new Set());
  const fallAlerted = useRef<Set<string>>(new Set());
  const sosAlerted = useRef<Set<string>>(new Set());
  const sosHydrated = useRef(false);

  const openStatus = useCallback((fromTab: TabKey) => {
    setOriginTab(fromTab);
    setIsStatusOpen(true);
  }, []);

  const closeStatus = useCallback(() => {
    setIsStatusOpen(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void loadOfflineCaneSnapshot(userId).then((snap) => {
      if (cancelled || !snap) return;
      setStoredCanes((current) => (current.length > 0 ? current : snap.canes));
      setDevices((current) =>
        Object.keys(current).length > 0 ? current : snap.devices || {}
      );
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeUserCanes(userId, (next) => {
      setStoredCanes((current) => {
        if (next.length === 0 && current.length > 0 && !onlineRef.current) {
          return current;
        }
        return next;
      });
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeCaneDevices((next) => {
      setDevices((current) => {
        if (
          Object.keys(next).length === 0 &&
          Object.keys(current).length > 0 &&
          !onlineRef.current
        ) {
          return current;
        }
        return next;
      });
    });
  }, [userId]);

  useEffect(() => {
    setSelectedCane((prev) => {
      if (prev) {
        return canes.find((cane) => cane.id === prev.id) ?? canes[0] ?? null;
      }
      return canes[0] ?? null;
    });
  }, [canes]);

  useEffect(() => {
    if (!userId) return;
    void requestEmergencyNotificationPermission();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      sosHydrated.current = false;
      return;
    }

    // First load: remember already-active SOS so sticky Firebase flags
    // do not re-notify without a new rising edge (e.g. offline glasses).
    if (!sosHydrated.current) {
      canes.forEach((cane) => {
        if (cane.sos) sosAlerted.current.add(cane.id);
      });
      sosHydrated.current = true;
      return;
    }

    canes.forEach((cane) => {
      const latestRoute = cane.routes[0];
      const locationLabel = displayPlace(
        latestRoute?.address,
        'Cane location'
      );

      const decision = analyzeCaneEvent({
        obstacle: cane.obstacle,
        motion: Boolean(cane.motion),
        fall: Boolean(cane.fall),
        sos: Boolean(cane.sos),
        frontCm: cane.frontCm,
        upperCm: cane.upperCm,
        holeCm: cane.holeCm,
        accel: cane.accel,
        gyro: cane.gyro,
        gps: cane.gps,
      });

      if (decision.obstacle && !obstacleAlerted.current.has(cane.id)) {
        obstacleAlerted.current.add(cane.id);
        createAlert(userId, {
          username: cane.username,
          type: 'obstacle',
          message: decision.reason,
          location: locationLabel,
          active: true,
        }).catch((error) => console.log('Alert save error:', error));
      }
      if (!decision.obstacle && obstacleAlerted.current.has(cane.id)) {
        obstacleAlerted.current.delete(cane.id);
        deactivateAlerts(userId, {
          type: 'obstacle',
          username: cane.username,
        }).catch((error) => console.log('Alert clear error:', error));
      }

      if (decision.motion && !motionAlerted.current.has(cane.id)) {
        motionAlerted.current.add(cane.id);
        createAlert(userId, {
          username: cane.username,
          type: 'motion',
          message: 'Motion nearby',
          location: locationLabel,
          active: true,
        }).catch((error) => console.log('Alert save error:', error));
      }
      if (!decision.motion && motionAlerted.current.has(cane.id)) {
        motionAlerted.current.delete(cane.id);
        deactivateAlerts(userId, {
          type: 'motion',
          username: cane.username,
        }).catch((error) => console.log('Alert clear error:', error));
      }

      if (decision.fall && !fallAlerted.current.has(cane.id)) {
        fallAlerted.current.add(cane.id);
        createAlert(userId, {
          username: cane.username,
          type: 'fall',
          message: decision.reason,
          location: locationLabel,
          active: true,
        }).catch((error) => console.log('Alert save error:', error));
        void notifyEmergency('fall', cane.username);
      }
      if (!decision.fall && fallAlerted.current.has(cane.id)) {
        fallAlerted.current.delete(cane.id);
        deactivateAlerts(userId, {
          type: 'fall',
          username: cane.username,
        }).catch((error) => console.log('Alert clear error:', error));
      }

      if (cane.sos && !sosAlerted.current.has(cane.id)) {
        sosAlerted.current.add(cane.id);
        createAlert(userId, {
          username: cane.username,
          type: 'emergency',
          message: cane.stolen ? 'Cane reported stolen' : 'Emergency request',
          location: locationLabel,
          active: true,
        }).catch((error) => console.log('Alert save error:', error));
        void notifyEmergency(cane.stolen ? 'stolen' : 'emergency', cane.username);
      }
      if (!cane.sos && sosAlerted.current.has(cane.id)) {
        sosAlerted.current.delete(cane.id);
        deactivateAlerts(userId, {
          type: 'emergency',
          username: cane.username,
        }).catch((error) => console.log('Alert clear error:', error));
      }
    });
  }, [canes, userId]);

  const queueCaneSync = useCallback(
    (nextCanes: CaneItem[]) => {
      if (!userId || !isOnline) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        nextCanes.forEach((cane) => {
          syncCaneState(userId, cane.id, {
            routes: cane.routes.slice(0, MAX_ROUTE_POINTS),
            battery: cane.battery,
            connected: cane.connected,
            obstacle: cane.obstacle,
            gps: cane.gps,
          }).catch((error) => console.log('Cane sync error:', error));
        });
      }, ROUTE_SAVE_DEBOUNCE_MS);
    },
    [isOnline, userId]
  );

  useEffect(() => {
    if (!userId || storedCanes.length === 0) return;
    const snapshotCanes = mergeCanesWithDevices(
      storedCanes,
      devices,
      placeByCoord
    );
    void saveOfflineCaneSnapshot(userId, {
      canes: snapshotCanes,
      devices,
      savedAt: Date.now(),
    });
  }, [devices, storedCanes, userId, placeByCoord]);

  useEffect(() => {
    if (!userId || canes.length === 0) return;
    queueCaneSync(canes);
  }, [canes, queueCaneSync, userId]);

  // Reverse-geocode cane GPS into barangay + city (never store lat,lng as address).
  useEffect(() => {
    lastGeocodeAt.current = 0;
    lastAddress.current = '';
    setCaneAddress('');
  }, [selectedCane?.id]);

  useEffect(() => {
    if (!isOnline || fillingPlaces.current) return;
    const cane = selectedCane;
    if (!cane) return;

    const latest = cane.routes[0];
    if (latest?.address && !looksLikeCoordinates(latest.address)) {
      if (lastAddress.current !== latest.address) {
        lastAddress.current = latest.address;
        setCaneAddress(latest.address);
      }
    }

    const pending = cane.routes.slice(0, 8).filter((route) => {
      if (!hasValidCoords(route.latitude, route.longitude)) return false;
      if (route.address && !looksLikeCoordinates(route.address)) return false;
      const key = placeKey(route.latitude, route.longitude);
      if (placeByCoord[key] || attemptedPlaceKeys.current.has(key)) return false;
      return true;
    });
    if (pending.length === 0) return;

    const now = Date.now();
    const latestNeedsGeocode = Boolean(
      latest &&
        hasValidCoords(latest.latitude, latest.longitude) &&
        pending.some(
          (route) =>
            placeKey(route.latitude, route.longitude) ===
            placeKey(latest.latitude, latest.longitude)
        )
    );
    if (
      latestNeedsGeocode &&
      lastGeocodeAt.current > 0 &&
      now - lastGeocodeAt.current < GEOCODE_INTERVAL_MS &&
      pending.length === 1
    ) {
      return;
    }

    fillingPlaces.current = true;

    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const labels: Record<string, string> = {};
        for (const route of pending) {
          const key = placeKey(route.latitude, route.longitude);
          attemptedPlaceKeys.current.add(key);
          try {
            const geocode = await Location.reverseGeocodeAsync({
              latitude: route.latitude,
              longitude: route.longitude,
            });
            if (geocode[0]) {
              const label = formatBarangayCity(geocode[0]);
              if (label) labels[key] = label;
            }
          } catch {
            /* rate limit / offline lookup */
          }
        }

        lastGeocodeAt.current = Date.now();
        if (Object.keys(labels).length === 0) return;

        setPlaceByCoord((current) => ({ ...current, ...labels }));
        setStoredCanes((current) =>
          current.map((item) => {
            if (item.id !== cane.id) return item;
            return {
              ...item,
              routes: item.routes.map((route) => {
                const label = labels[placeKey(route.latitude, route.longitude)];
                if (!label) return route;
                if (route.address && !looksLikeCoordinates(route.address)) {
                  return route;
                }
                return { ...route, address: label };
              }),
            };
          })
        );

        if (latest) {
          const label = labels[placeKey(latest.latitude, latest.longitude)];
          if (label) {
            lastAddress.current = label;
            setCaneAddress(label);
          }
        }
      } finally {
        fillingPlaces.current = false;
      }
    })();
  }, [isOnline, placeByCoord, selectedCane]);

  // Track phone (CP) GPS for the red marker + path.
  useEffect(() => {
    if (!userId) return;

    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 3,
        },
        (next) => {
          const point = {
            latitude: next.coords.latitude,
            longitude: next.coords.longitude,
          };
          setPhoneLocation(point);
          setPhoneTrail((prev) => {
            const last = prev[prev.length - 1];
            if (last) {
              const dLat = last.latitude - point.latitude;
              const dLng = last.longitude - point.longitude;
              if (Math.sqrt(dLat * dLat + dLng * dLng) < PHONE_MOVE_THRESHOLD) {
                return [...prev.slice(0, -1), point];
              }
            }
            return [...prev, point].slice(-MAX_ROUTE_POINTS);
          });
        }
      );
    })();

    return () => {
      subscription?.remove();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [userId]);

  const location = useMemo(() => {
    const cane =
      selectedCane ??
      canes.find(
        (item) =>
          item.routes[0] &&
          hasValidCoords(item.routes[0].latitude, item.routes[0].longitude)
      ) ??
      null;

    if (!cane?.caneID) return null;

    const telemetry = getCaneTelemetry(cane.caneID, devices);
    if (telemetry && hasValidCoords(telemetry.latitude, telemetry.longitude)) {
      return toCoords({
        latitude: telemetry.latitude,
        longitude: telemetry.longitude,
        time: '',
        address: lastAddress.current,
      });
    }

    const route = cane.routes[0];
    if (route && hasValidCoords(route.latitude, route.longitude)) {
      return toCoords(route);
    }

    return null;
  }, [canes, devices, selectedCane, nowTick]);

  const handleAddCane = useCallback(
    async (cane: Omit<CaneItem, 'id' | 'routes'>) => {
      if (!userId) return false;
      try {
        await addUserCane(userId, cane, {
          knownDevices: devices,
          existingCanes: storedCanes,
        });
        return true;
      } catch (error: any) {
        const message = error.message || 'Could not save cane.';
        Alert.alert('Cannot add cane', message);
        return false;
      }
    },
    [devices, storedCanes, userId]
  );

  const handleRemoveCane = useCallback(
    async (id: string) => {
      if (!userId) return;
      try {
        await deleteUserCane(userId, id);
        setSelectedCane((prev) => (prev?.id === id ? null : prev));
        obstacleAlerted.current.delete(id);
        motionAlerted.current.delete(id);
        fallAlerted.current.delete(id);
        sosAlerted.current.delete(id);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Could not delete cane.');
      }
    },
    [userId]
  );

  const value = useMemo(
    () => ({
      canes,
      selectedCane,
      setSelectedCane,
      location,
      caneAddress,
      phoneLocation,
      phoneTrail,
      isOffline: !isOnline,
      isStatusOpen,
      originTab,
      openStatus,
      closeStatus,
      handleAddCane,
      handleRemoveCane,
    }),
    [
      canes,
      selectedCane,
      location,
      caneAddress,
      phoneLocation,
      phoneTrail,
      isOnline,
      isStatusOpen,
      originTab,
      openStatus,
      closeStatus,
      handleAddCane,
      handleRemoveCane,
    ]
  );

  return (
    <CaneStatusContext.Provider value={value}>
      {children}
      {userId ? (
        <StatusSheet
          visible={isStatusOpen}
          onClose={closeStatus}
          canes={canes}
          selectedCane={selectedCane}
          caneAddress={caneAddress}
          onSelectCane={setSelectedCane}
          onRemoveCane={handleRemoveCane}
          onAddCane={handleAddCane}
        />
      ) : null}
      {userId ? (
        <StatusTabOverlay
          visible={isStatusOpen}
          originTab={originTab}
          openStatus={openStatus}
          closeStatus={closeStatus}
        />
      ) : null}
    </CaneStatusContext.Provider>
  );
}

export function useCaneStatus() {
  const ctx = useContext(CaneStatusContext);
  if (!ctx) throw new Error('useCaneStatus must be used within CaneStatusProvider');
  return ctx;
}
