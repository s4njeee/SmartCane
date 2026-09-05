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
import { TabKey } from '../components/ui/BottomTabBar';
import {
  notifyEmergency,
  requestEmergencyNotificationPermission,
} from '../utils/emergencyNotifications';
import { formatBarangayCity } from '../utils/geoPlace';

const GEOCODE_INTERVAL_MS = 60000;
const ROUTE_SAVE_DEBOUNCE_MS = 8000;
/** Device is offline if no telemetry heartbeat within this window */
const DEVICE_STALE_SECONDS = 30;
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

function isDeviceOnline(telemetry: CaneDeviceTelemetry, nowSec: number) {
  if (telemetry.updatedAt > 0) {
    const updatedSec =
      telemetry.updatedAt > 1e12
        ? telemetry.updatedAt / 1000
        : telemetry.updatedAt;
    return nowSec - updatedSec < DEVICE_STALE_SECONDS;
  }
  // No heartbeat — do not treat leftover GPS coords as "online"
  return false;
}

function mergeCanesWithDevices(
  stored: CaneItem[],
  devices: Record<string, CaneDeviceTelemetry>
): CaneItem[] {
  const nowSec = Date.now() / 1000;

  return stored.map((cane) => {
    const telemetry = cane.caneID
      ? devices[cane.caneID] || devices[cane.caneID.toLowerCase()]
      : undefined;

    if (!telemetry) {
      return {
        ...cane,
        connected: false,
        gps: false,
        obstacle: false,
        motion: false,
        fall: false,
        sos: false,
      };
    }

    const online = isDeviceOnline(telemetry, nowSec);
    const deviceHasGps = hasValidCoords(telemetry.latitude, telemetry.longitude);

    let routes = cane.routes;
    // Only append live GPS points while the device is online
    if (online && deviceHasGps) {
      if (movedEnough(routes[0], telemetry.latitude, telemetry.longitude)) {
        routes = [
          {
            latitude: telemetry.latitude,
            longitude: telemetry.longitude,
            time: new Date().toLocaleTimeString(),
            address: `${telemetry.latitude.toFixed(5)}, ${telemetry.longitude.toFixed(5)}`,
          },
          ...routes.slice(0, MAX_ROUTE_POINTS - 1),
        ];
      } else if (routes[0]) {
        routes = [
          {
            ...routes[0],
            latitude: telemetry.latitude,
            longitude: telemetry.longitude,
          },
          ...routes.slice(1),
        ];
      } else {
        routes = [
          {
            latitude: telemetry.latitude,
            longitude: telemetry.longitude,
            time: new Date().toLocaleTimeString(),
            address: `${telemetry.latitude.toFixed(5)}, ${telemetry.longitude.toFixed(5)}`,
          },
        ];
      }
    }

    return {
      ...cane,
      connected: online,
      // GPS Active only when cane is online AND has a fix
      gps: online && (telemetry.gps || deviceHasGps),
      obstacle: online ? telemetry.obstacle : false,
      motion: online ? telemetry.motion : false,
      fall: online ? telemetry.fall : false,
      sos: online ? telemetry.sos : false,
      battery: Number.isFinite(telemetry.battery)
        ? telemetry.battery
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
  const [userId, setUserId] = useState<string | null>(getCurrentUserId());
  const [storedCanes, setStoredCanes] = useState<CaneItem[]>([]);
  const [devices, setDevices] = useState<Record<string, CaneDeviceTelemetry>>({});
  const [selectedCane, setSelectedCane] = useState<CaneItem | null>(null);
  const [phoneLocation, setPhoneLocation] = useState<LatLng | null>(null);
  const [phoneTrail, setPhoneTrail] = useState<LatLng[]>([]);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [originTab, setOriginTab] = useState<TabKey>('home');
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const canes = useMemo(
    () => mergeCanesWithDevices(storedCanes, devices),
    [storedCanes, devices, nowTick]
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
  const [caneAddress, setCaneAddress] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const obstacleAlerted = useRef<Set<string>>(new Set());
  const motionAlerted = useRef<Set<string>>(new Set());
  const fallAlerted = useRef<Set<string>>(new Set());
  const sosAlerted = useRef<Set<string>>(new Set());

  const openStatus = useCallback((fromTab: TabKey) => {
    setOriginTab(fromTab);
    setIsStatusOpen(true);
  }, []);

  const closeStatus = useCallback(() => {
    setIsStatusOpen(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    return subscribeUserCanes(userId, setStoredCanes);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeCaneDevices(setDevices);
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
    if (!userId) return;

    canes.forEach((cane) => {
      const latestRoute = cane.routes[0];
      const locationLabel = latestRoute?.address || 'Cane location';

      if (cane.obstacle && !obstacleAlerted.current.has(cane.id)) {
        obstacleAlerted.current.add(cane.id);
        createAlert(userId, {
          username: cane.username,
          type: 'obstacle',
          message: `Ultrasonic sensor: obstacle detected for ${cane.username}`,
          location: locationLabel,
          active: true,
        }).catch((error) => console.log('Alert save error:', error));
      }
      if (!cane.obstacle && obstacleAlerted.current.has(cane.id)) {
        obstacleAlerted.current.delete(cane.id);
        deactivateAlerts(userId, {
          type: 'obstacle',
          username: cane.username,
        }).catch((error) => console.log('Alert clear error:', error));
      }

      if (cane.motion && !motionAlerted.current.has(cane.id)) {
        motionAlerted.current.add(cane.id);
        createAlert(userId, {
          username: cane.username,
          type: 'motion',
          message: `PIR motion sensor: nearby motion detected for ${cane.username}`,
          location: locationLabel,
          active: true,
        }).catch((error) => console.log('Alert save error:', error));
      }
      if (!cane.motion && motionAlerted.current.has(cane.id)) {
        motionAlerted.current.delete(cane.id);
        deactivateAlerts(userId, {
          type: 'motion',
          username: cane.username,
        }).catch((error) => console.log('Alert clear error:', error));
      }

      if (cane.fall && !fallAlerted.current.has(cane.id)) {
        fallAlerted.current.add(cane.id);
        createAlert(userId, {
          username: cane.username,
          type: 'fall',
          message: `Fall detection emergency for ${cane.username}`,
          location: locationLabel,
          active: true,
        }).catch((error) => console.log('Alert save error:', error));
        void notifyEmergency('fall', cane.username);
      }
      if (!cane.fall && fallAlerted.current.has(cane.id)) {
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
          message: `Emergency request: SOS button pressed twice on ${cane.username}'s cane`,
          location: locationLabel,
          active: true,
        }).catch((error) => console.log('Alert save error:', error));
        void notifyEmergency('emergency', cane.username);
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
      if (!userId) return;
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
    [userId]
  );

  useEffect(() => {
    if (!userId || canes.length === 0) return;
    queueCaneSync(canes);
  }, [canes, queueCaneSync, userId]);

  // Reverse-geocode the cane GPS for barangay + city.
  useEffect(() => {
    lastGeocodeAt.current = 0;
    lastAddress.current = '';
    setCaneAddress('');
  }, [selectedCane?.id]);

  useEffect(() => {
    const point = selectedCane?.routes[0];
    if (!point || !hasValidCoords(point.latitude, point.longitude)) return;

    const now = Date.now();
    if (now - lastGeocodeAt.current < GEOCODE_INTERVAL_MS) return;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const geocode = await Location.reverseGeocodeAsync({
          latitude: point.latitude,
          longitude: point.longitude,
        });
        if (geocode.length > 0) {
          const label = formatBarangayCity(geocode[0]);
          if (label) {
            lastAddress.current = label;
            setCaneAddress(label);
          }
        }
        lastGeocodeAt.current = now;
      } catch {
        /* rate limit */
      }
    })();
  }, [selectedCane?.id, selectedCane?.routes]);

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

    const telemetry = devices[cane.caneID] || devices[cane.caneID.toLowerCase()];
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
          onSelectCane={setSelectedCane}
          onRemoveCane={handleRemoveCane}
          onAddCane={handleAddCane}
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
