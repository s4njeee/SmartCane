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
  CaneItem,
  createAlert,
  deleteUserCane,
  getCurrentUserId,
  subscribeUserCanes,
  syncCaneState,
} from '../firebase/appData';
import StatusSheet from '../components/StatusSheet';
import { TabKey } from '../components/ui/BottomTabBar';

const GEOCODE_INTERVAL_MS = 60000;
const ROUTE_SAVE_DEBOUNCE_MS = 8000;

type CaneStatusContextValue = {
  canes: CaneItem[];
  selectedCane: CaneItem | null;
  setSelectedCane: (cane: CaneItem | null) => void;
  location: Location.LocationObjectCoords | null;
  isStatusOpen: boolean;
  originTab: TabKey;
  openStatus: (fromTab: TabKey) => void;
  closeStatus: () => void;
  handleAddCane: (cane: Omit<CaneItem, 'id' | 'routes'>) => Promise<void>;
  handleRemoveCane: (id: string) => Promise<void>;
};

const CaneStatusContext = createContext<CaneStatusContextValue | null>(null);

export function CaneStatusProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(getCurrentUserId());
  const [canes, setCanes] = useState<CaneItem[]>([]);
  const [selectedCane, setSelectedCane] = useState<CaneItem | null>(null);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [originTab, setOriginTab] = useState<TabKey>('home');

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      if (!user) {
        setIsStatusOpen(false);
        setCanes([]);
        setSelectedCane(null);
        setLocation(null);
      }
    });
  }, []);

  const lastGeocodeAt = useRef(0);
  const lastAddress = useRef('Locating...');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const obstacleAlerted = useRef<Set<string>>(new Set());

  const openStatus = useCallback((fromTab: TabKey) => {
    setOriginTab(fromTab);
    setIsStatusOpen(true);
  }, []);

  const closeStatus = useCallback(() => {
    setIsStatusOpen(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    return subscribeUserCanes(userId, (loaded) => {
      setCanes(loaded);
      setSelectedCane((prev) => {
        if (!prev) return null;
        return loaded.find((cane) => cane.id === prev.id) ?? null;
      });
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    canes.forEach((cane) => {
      if (cane.obstacle && !obstacleAlerted.current.has(cane.id)) {
        obstacleAlerted.current.add(cane.id);
        const latestRoute = cane.routes[0];
        createAlert(userId, {
          username: cane.username,
          type: 'obstacle',
          message: `Obstacle detected for ${cane.username}`,
          location: latestRoute?.address || 'Current location',
          active: true,
        }).catch((error) => console.log('Alert save error:', error));
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
            routes: cane.routes.slice(0, 20),
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
    if (!userId) return;

    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        async (newLocation) => {
          const coords = newLocation.coords;
          setLocation(coords);

          const now = Date.now();
          if (now - lastGeocodeAt.current >= GEOCODE_INTERVAL_MS) {
            try {
              const geocode = await Location.reverseGeocodeAsync({
                latitude: coords.latitude,
                longitude: coords.longitude,
              });
              if (geocode.length > 0) {
                const place = geocode[0];
                lastAddress.current = [place.name, place.street, place.city, place.region]
                  .filter(Boolean)
                  .join(', ');
              }
              lastGeocodeAt.current = now;
            } catch {
              /* rate limit */
            }
          }

          const address = lastAddress.current;
          const routePoint = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            time: new Date().toLocaleTimeString(),
            address,
          };

          setCanes((prev) => {
            if (prev.length === 0) return prev;
            const next = prev.map((cane) => ({
              ...cane,
              gps: true,
              routes: [routePoint, ...cane.routes.slice(0, 19)],
            }));
            queueCaneSync(next);
            return next;
          });
        }
      );
    })();

    return () => {
      subscription?.remove();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [queueCaneSync, userId]);

  const handleAddCane = useCallback(
    async (cane: Omit<CaneItem, 'id' | 'routes'>) => {
      if (!userId) return;
      try {
        await addUserCane(userId, cane);
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Could not save cane.');
      }
    },
    [userId]
  );

  const handleRemoveCane = useCallback(
    async (id: string) => {
      if (!userId) return;
      try {
        await deleteUserCane(userId, id);
        setSelectedCane((prev) => (prev?.id === id ? null : prev));
        obstacleAlerted.current.delete(id);
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
