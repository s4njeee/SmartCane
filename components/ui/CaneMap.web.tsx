import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

type Props = {
  location: { latitude: number; longitude: number };
  mapType?: "standard" | "satellite";
  onToggleMapType?: () => void;
  routePoints?: { latitude: number; longitude: number }[];
  onMapRef?: (ref: unknown) => void;
  onMapPress?: () => void;
};

export default function CaneMap({ location }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.mapPlaceholder, { backgroundColor: colors.cardAlt }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
        <Ionicons name="map-outline" size={40} color={colors.primary} />
      </View>
      <Text style={[styles.mapTitle, { color: colors.text }]}>Map view is mobile-only</Text>
      <Text style={[styles.mapSubtitle, { color: colors.textSecondary }]}>
        Open this app in Expo Go on your phone for the full map experience.
      </Text>
      <Text style={[styles.coords, { color: colors.textMuted }]}>
        Lat: {location.latitude.toFixed(5)} · Long: {location.longitude.toFixed(5)}
      </Text>
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
  mapSubtitle: { fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20, paddingHorizontal: 20 },
  coords: { fontSize: 13, marginTop: 16, fontWeight: "500" },
});