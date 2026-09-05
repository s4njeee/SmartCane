import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WHITE_MAP_STYLE } from "../../constants/mapStyles";
import { platformDesign } from "../../constants/platformDesign";
import { useNavigation } from "../../context/NavigationContext";
import { useCaneStatus } from "../../context/CaneStatusContext";
import { useTheme } from "../../context/ThemeContext";
import { formatDistance, haversineMeters } from "../../utils/geoDistance";
import { tabBarClearance } from "../../utils/layoutInsets";
import {
  fetchRoadRoute,
  formatDuration,
  pathMidpoint,
  routeFetchKey,
} from "../../utils/osrmRoute";
import DirectionsSheet from "./DirectionsSheet";
import GlowPressable from "./GlowPressable";

type RoutePoint = {
  latitude: number;
  longitude: number;
};

type Props = {
  caneLocation?: RoutePoint | null;
  phoneLocation?: RoutePoint | null;
  mapType: "standard" | "satellite";
  onToggleMapType: () => void;
  onMapRef: (ref: MapView | null) => void;
  onMapPress?: () => void;
  caneName?: string;
};

const DEFAULT_DELTA = 0.008;
/** Route line uses theme primary blue */
const ROUTE_BLUE = "#2563EB";
const ROUTE_OUTLINE = "#1D4ED8";
const YOU_RED = "#EF4444";

/** My location — red pin */
function YouRedPin() {
  return (
    <View style={styles.pinWrap}>
      <View style={styles.redPinHead}>
        <Ionicons name="phone-portrait" size={14} color="#fff" />
      </View>
      <View style={styles.redPinTail} />
    </View>
  );
}

/** Cane location — blue dot */
function CaneBlueDot({ active }: { active?: boolean }) {
  return (
    <View style={[styles.caneOuter, active && styles.caneOuterActive]}>
      <View style={styles.caneInner}>
        <Ionicons name="accessibility" size={14} color="#fff" />
      </View>
    </View>
  );
}

function EtaBubble({ label }: { label: string }) {
  return (
    <View style={styles.etaBubble}>
      <Text style={styles.etaBubbleText}>{label}</Text>
    </View>
  );
}

export default function CaneMap({
  caneLocation,
  phoneLocation,
  mapType,
  onToggleMapType,
  onMapRef,
  onMapPress,
  caneName,
}: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { colors } = theme;
  const {
    setFollowDirection,
    directionsOpen,
    openDirections,
    closeDirections,
    travelMode,
    setDestinationName,
    setRouteMetrics,
    setEndpoints,
    setSavedRoute,
    savedRoutePoints,
    routeDistanceMeters,
    routeDurationSeconds,
    isNavigating,
  } = useNavigation();
  const { closeStatus } = useCaneStatus();

  const mapRef = useRef<MapView | null>(null);
  const [tracksViews, setTracksViews] = useState(true);
  const didInitialCenter = useRef(false);
  const userPanning = useRef(false);
  const lastRouteKey = useRef("");
  const didFitRoute = useRef(false);
  const lastFetchedFrom = useRef<RoutePoint | null>(null);
  const lastFetchedTo = useRef<RoutePoint | null>(null);
  const lastFetchedMode = useRef(travelMode);
  const ignoreMapPress = useRef(false);
  const roadPathRef = useRef<RoutePoint[]>([]);
  const [mapHeading, setMapHeading] = useState(0);

  const [roadPath, setRoadPath] = useState<RoutePoint[]>(
    () => (savedRoutePoints.length > 2 ? savedRoutePoints : [])
  );
  roadPathRef.current = roadPath.length > 2 ? roadPath : savedRoutePoints;
  const [roadDistance, setRoadDistance] = useState(
    () => (routeDistanceMeters > 0 ? routeDistanceMeters : 0)
  );
  const [roadDuration, setRoadDuration] = useState(
    () => (routeDurationSeconds > 0 ? routeDurationSeconds : 0)
  );
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState(false);

  const focusPoint = caneLocation || phoneLocation;
  const bothReady = Boolean(caneLocation && phoneLocation);
  const showRoute = isNavigating || directionsOpen;

  const straightLineMeters = useMemo(() => {
    if (!caneLocation || !phoneLocation) return 0;
    return haversineMeters(phoneLocation, caneLocation);
  }, [
    caneLocation?.latitude,
    caneLocation?.longitude,
    phoneLocation?.latitude,
    phoneLocation?.longitude,
  ]);

  const displayPath =
    savedRoutePoints.length > 2 ? savedRoutePoints : roadPath;

  const displayDistance =
    showRoute && (roadDistance > 0 || routeDistanceMeters > 0)
      ? roadDistance || routeDistanceMeters
      : straightLineMeters;
  const distanceLabel = formatDistance(displayDistance);
  const durationLabel =
    (roadDuration || routeDurationSeconds) > 0
      ? formatDuration(roadDuration || routeDurationSeconds)
      : "—";

  const etaMid = useMemo(() => pathMidpoint(displayPath), [displayPath]);

  useEffect(() => {
    setDestinationName(caneName || "SmartCane");
  }, [caneName, setDestinationName]);

  useEffect(() => {
    setEndpoints(phoneLocation ?? null, caneLocation ?? null);
  }, [phoneLocation, caneLocation, setEndpoints]);

  useEffect(() => {
    if (savedRoutePoints.length > 2) return;
    setRouteMetrics(
      showRoute && roadDistance > 0 ? roadDistance : straightLineMeters,
      roadDuration
    );
  }, [
    showRoute,
    roadDistance,
    roadDuration,
    straightLineMeters,
    savedRoutePoints.length,
    setRouteMetrics,
  ]);

  const fetchKey =
    phoneLocation && caneLocation
      ? routeFetchKey(phoneLocation, caneLocation, travelMode)
      : "";

  const openCaneDirections = () => {
    closeStatus();
    ignoreMapPress.current = true;
    setTimeout(() => {
      ignoreMapPress.current = false;
    }, Platform.OS === "android" ? 1200 : 600);
    if (bothReady) {
      setFollowDirection(true);
    }
    openDirections();
  };

  useEffect(() => {
    if (!showRoute) {
      if (!isNavigating) {
        setRoadPath((prev) => (prev.length > 2 ? prev : []));
        setRouteError(false);
        lastRouteKey.current = "";
        lastFetchedFrom.current = null;
        lastFetchedTo.current = null;
      }
      return;
    }
    if (!caneLocation || !phoneLocation || !fetchKey) return;

    const hasRoadGeometry =
      savedRoutePoints.length > 2 || roadPathRef.current.length > 2;
    const modeChanged = lastFetchedMode.current !== travelMode;

    if (isNavigating && hasRoadGeometry && !modeChanged) {
      return;
    }
    if (!modeChanged && fetchKey === lastRouteKey.current && hasRoadGeometry) {
      return;
    }

    let cancelled = false;
    setRouting(true);
    setRouteError(false);

    (async () => {
      try {
        const result = await fetchRoadRoute(
          phoneLocation,
          caneLocation,
          travelMode
        );
        if (cancelled) return;
        const points = result?.points ?? [];
        if (points.length > 2) {
          lastRouteKey.current = fetchKey;
          lastFetchedFrom.current = phoneLocation;
          lastFetchedTo.current = caneLocation;
          lastFetchedMode.current = travelMode;
          setRoadPath(points);
          setRoadDistance(result!.distanceMeters);
          setRoadDuration(result!.durationSeconds);
          setSavedRoute(points, result!.distanceMeters, result!.durationSeconds);
          setRouteError(false);
        } else {
          lastRouteKey.current = fetchKey;
          setRouteError(true);
        }
      } catch {
        if (!cancelled) setRouteError(true);
      } finally {
        if (!cancelled) setRouting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    showRoute,
    isNavigating,
    fetchKey,
    travelMode,
    savedRoutePoints.length,
    setSavedRoute,
  ]);

  useEffect(() => {
    setTracksViews(true);
    const timer = setTimeout(
      () => setTracksViews(false),
      platformDesign.map.tracksViewChangesMs || 600
    );
    return () => clearTimeout(timer);
  }, [showRoute]);

  useEffect(() => {
    if (!mapRef.current || !focusPoint || didInitialCenter.current) return;
    didInitialCenter.current = true;
    mapRef.current.animateToRegion(
      {
        latitude: focusPoint.latitude,
        longitude: focusPoint.longitude,
        latitudeDelta: DEFAULT_DELTA,
        longitudeDelta: DEFAULT_DELTA,
      },
      400
    );
  }, [!!focusPoint]);

  useEffect(() => {
    if (!showRoute) {
      didFitRoute.current = false;
      return;
    }
    if (didFitRoute.current || userPanning.current || !mapRef.current) return;
    const ready = displayPath.length > 2;
    if (!ready) return;

    didFitRoute.current = true;
    mapRef.current.fitToCoordinates(displayPath, {
      edgePadding: {
        top: 140,
        right: 48,
        bottom: tabBarClearance(insets, 200),
        left: 48,
      },
      animated: true,
    });
  }, [showRoute, displayPath, routing, insets]);

  const resetNorth = async () => {
    try {
      const camera = await mapRef.current?.getCamera();
      if (!camera || !mapRef.current) return;
      await mapRef.current.animateCamera(
        { ...camera, heading: 0, pitch: 0 },
        { duration: 300 }
      );
      setMapHeading(0);
    } catch {
      /* ignore */
    }
  };

  if (!focusPoint) return null;

  const fabBottom = tabBarClearance(insets, 12) + platformDesign.map.fabExtraClearance;
  // Keep legend on the same bottom line as the satellite / map FAB
  const legendBottom = fabBottom;

  return (
    <>
      <MapView
        ref={(ref) => {
          mapRef.current = ref;
          onMapRef(ref);
        }}
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass
        showsBuildings
        showsIndoors
        rotateEnabled
        pitchEnabled
        scrollEnabled
        zoomEnabled
        zoomTapEnabled
        zoomControlEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        mapType={mapType}
        customMapStyle={mapType === "standard" ? WHITE_MAP_STYLE : undefined}
        userInterfaceStyle="light"
        onPress={() => {
          if (ignoreMapPress.current) return;
          if (directionsOpen && !isNavigating) closeDirections();
          onMapPress?.();
        }}
        onMarkerPress={(event) => {
          const id = String(event.nativeEvent?.id ?? "");
          if (id === "phone" || id === "eta") return;
          if (id === "cane") {
            openCaneDirections();
            return;
          }
          const coord = event.nativeEvent?.coordinate;
          if (!coord || !caneLocation) return;
          const nearCane =
            Math.abs(coord.latitude - caneLocation.latitude) < 0.00025 &&
            Math.abs(coord.longitude - caneLocation.longitude) < 0.00025;
          if (nearCane) openCaneDirections();
        }}
        onPanDrag={() => {
          userPanning.current = true;
        }}
        onRegionChangeComplete={async () => {
          try {
            const camera = await mapRef.current?.getCamera();
            if (camera?.heading != null) setMapHeading(camera.heading);
          } catch {
            /* ignore */
          }
        }}
        initialRegion={{
          latitude: focusPoint.latitude,
          longitude: focusPoint.longitude,
          latitudeDelta: DEFAULT_DELTA,
          longitudeDelta: DEFAULT_DELTA,
        }}
      >
        {/* Primary route */}
        {showRoute && displayPath.length > 2 && (
          <>
            <Polyline
              key={`route-outline-${displayPath.length}`}
              coordinates={displayPath}
              strokeWidth={Platform.OS === "android" ? 12 : 10}
              strokeColor={ROUTE_OUTLINE}
              geodesic={false}
              tappable={false}
              zIndex={1}
              lineCap="round"
              lineJoin="round"
            />
            <Polyline
              key={`route-fill-${displayPath.length}`}
              coordinates={displayPath}
              strokeWidth={Platform.OS === "android" ? 8 : 6}
              strokeColor={ROUTE_BLUE}
              geodesic={false}
              tappable={false}
              zIndex={2}
              lineCap="round"
              lineJoin="round"
            />
          </>
        )}

        {showRoute &&
          etaMid &&
          (roadDuration > 0 || routeDurationSeconds > 0) &&
          !routing && (
          <Marker
            identifier="eta"
            coordinate={etaMid}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={4}
          >
            <EtaBubble
              label={formatDuration(roadDuration || routeDurationSeconds)}
            />
          </Marker>
        )}

        {caneLocation && (
          <Marker
            identifier="cane"
            coordinate={caneLocation}
            title={caneName || "SmartCane"}
            description="Tap for Directions"
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={tracksViews}
            stopPropagation
            tappable
            onPress={(event) => {
              event.stopPropagation?.();
              openCaneDirections();
            }}
            zIndex={3}
          >
            <CaneBlueDot active={showRoute} />
          </Marker>
        )}

        {phoneLocation && (
          <Marker
            identifier="phone"
            coordinate={phoneLocation}
            title="My Location"
            description="Start"
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={tracksViews}
            tappable={false}
            zIndex={2}
          >
            <YouRedPin />
          </Marker>
        )}
      </MapView>

      <DirectionsSheet
        bothReady={bothReady}
        routing={routing}
        routeError={routeError}
        distanceLabel={distanceLabel}
        durationLabel={durationLabel}
        caneName={caneName}
      />

      {!showRoute && !directionsOpen && (
        <View
          style={[
            styles.legend,
            {
              bottom: legendBottom,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={styles.legendYou} />
              <Text style={[styles.legendText, { color: colors.text }]}>You</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendCane} />
              <Text style={[styles.legendText, { color: colors.text }]}>Cane</Text>
            </View>
          </View>
          <Text style={[styles.legendHint, { color: colors.textMuted }]} numberOfLines={1}>
            Tap blue cane for Directions
          </Text>
        </View>
      )}

      <View style={[styles.fabColumn, { bottom: fabBottom }]}>
        {Math.abs(mapHeading) > 2 && (
          <GlowPressable
            onPress={resetNorth}
            glowColor={colors.primary}
            style={[
              styles.mapFloatingButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: 12,
                elevation: 2,
              },
            ]}
          >
            <Ionicons
              name="compass"
              size={24}
              color={colors.primary}
              style={{ transform: [{ rotate: `${-mapHeading}deg` }] }}
            />
          </GlowPressable>
        )}
        <GlowPressable
          onPress={onToggleMapType}
          glowColor={colors.primary}
          style={[
            styles.mapFloatingButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 12,
              elevation: 2,
            },
          ]}
        >
          <Ionicons
            name={mapType === "standard" ? "map" : "globe"}
            size={22}
            color={colors.primary}
          />
        </GlowPressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  pinWrap: { alignItems: "center" },
  redPinHead: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: YOU_RED,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 4,
  },
  redPinTail: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: YOU_RED,
  },
  caneOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ROUTE_OUTLINE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 4,
  },
  caneOuterActive: {
    borderColor: "#34A853",
  },
  caneInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ROUTE_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  etaBubble: {
    backgroundColor: ROUTE_BLUE,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 4,
  },
  etaBubbleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  legend: {
    position: "absolute",
    left: 16,
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    elevation: 2,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendYou: {
    width: 10,
    height: 14,
    borderRadius: 4,
    backgroundColor: YOU_RED,
  },
  legendCane: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ROUTE_BLUE,
    borderWidth: 2,
    borderColor: ROUTE_OUTLINE,
  },
  legendText: { fontSize: 12, fontWeight: "700" },
  legendHint: {
    fontSize: 11,
    fontWeight: "600",
  },
  fabColumn: {
    position: "absolute",
    right: 20,
    gap: 12,
    alignItems: "center",
  },
  mapFloatingButton: {
    width: 48,
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
});
