import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { isWeb, ui, webClassStyle } from "../../utils/ui";
import GlowPressable from "./GlowPressable";
import OsmMapView from "./OsmMapView";

type RoutePoint = { latitude: number; longitude: number };

type Props = {
  caneLocation?: RoutePoint | null;
  phoneLocation?: RoutePoint | null;
  location?: RoutePoint | null;
  mapType?: "standard" | "satellite";
  onToggleMapType?: () => void;
  onMapRef?: (ref: unknown) => void;
  onMapPress?: () => void;
  caneName?: string;
};

/** Web uses Leaflet/OSM — react-native-maps (Google) has no browser SDK. */
export default function CaneMap({
  caneLocation,
  phoneLocation,
  location,
  mapType = "standard",
  onToggleMapType,
  onMapPress,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const point = caneLocation || phoneLocation || location;

  if (!point) {
    return (
      <View {...ui("map-placeholder", [styles.mapPlaceholder, { backgroundColor: colors.cardAlt }])}>
        <View
          {...ui("map-icon-circle", [styles.iconCircle, { backgroundColor: colors.primary + "18" }])}
        >
          <Ionicons
            name="map-outline"
            size={40}
            color={isWeb ? undefined : colors.primary}
            style={isWeb ? webClassStyle("map-wait-glyph") : undefined}
          />
        </View>
        <Text {...ui("map-title", [styles.mapTitle, { color: colors.text }])}>Waiting for GPS</Text>
        <Text {...ui("map-subtitle", [styles.mapSubtitle, { color: colors.textSecondary }])}>
          Add a cane or enable phone location to show the map.
        </Text>
      </View>
    );
  }

  return (
    <View {...ui("map-root", styles.root)}>
      <OsmMapView
        center={point}
        caneLocation={caneLocation}
        phoneLocation={phoneLocation}
        mapType={mapType}
        onMapPress={onMapPress}
      />
      {onToggleMapType ? (
        <View {...ui("map-fab", styles.fab)}>
          <GlowPressable onPress={onToggleMapType} className="map-fab-btn" style={styles.fabBtn}>
            <Ionicons
              name={mapType === "satellite" ? "map-outline" : "earth-outline"}
              size={20}
              color={isWeb ? undefined : colors.primary}
              style={isWeb ? webClassStyle("map-layer-glyph") : undefined}
            />
          </GlowPressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  mapTitle: { fontSize: 20, fontWeight: "800", marginTop: 16 },
  mapSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
  },
  fabBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
