import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";

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

export default function CaneMap({
  caneLocation,
  phoneLocation,
  location,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const point = caneLocation || phoneLocation || location;

  return (
    <View style={[styles.mapPlaceholder, { backgroundColor: colors.cardAlt }]}>
      <View
        style={[styles.iconCircle, { backgroundColor: colors.primary + "18" }]}
      >
        <Ionicons name="map-outline" size={40} color={colors.primary} />
      </View>
      <Text style={[styles.mapTitle, { color: colors.text }]}>
        Map view is mobile-only
      </Text>
      <Text style={[styles.mapSubtitle, { color: colors.textSecondary }]}>
        Open this app in Expo Go on your phone. Tap the cane marker for
        Directions — Drive, Walk, or Cycle to the cane.
      </Text>
      {point && (
        <Text style={[styles.coords, { color: colors.textMuted }]}>
          Lat: {point.latitude.toFixed(5)} · Long: {point.longitude.toFixed(5)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  coords: { fontSize: 13, marginTop: 16, fontWeight: "500" },
});
