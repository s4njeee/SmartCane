import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import GlowPressable from "./GlowPressable";

type RoutePoint = {
  latitude: number;
  longitude: number;
};

type Props = {
  location: { latitude: number; longitude: number };
  mapType: "standard" | "satellite";
  onToggleMapType: () => void;
  routePoints: RoutePoint[];
  onMapRef: (ref: MapView | null) => void;
  onMapPress?: () => void;
};

export default function CaneMap({
  location,
  mapType,
  onToggleMapType,
  routePoints,
  onMapRef,
  onMapPress,
}: Props) {
  return (
    <>
      <MapView
        ref={onMapRef}
        style={styles.map}
        showsUserLocation
        mapType={mapType}
        onPress={onMapPress}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {mapType === "standard" && (
          <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
        )}
        <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} />
        {routePoints.length > 1 && (
          <Polyline coordinates={routePoints} strokeWidth={5} strokeColor="#0057FF" />
        )}
      </MapView>

      <GlowPressable
        onPress={onToggleMapType}
        glowColor="#2563EB"
        style={[styles.mapFloatingButton, { borderRadius: 30 }]}
      >
        <Text style={styles.mapButtonText}>{mapType === "standard" ? "🗺️" : "🌍"}</Text>
      </GlowPressable>
    </>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  mapFloatingButton: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  mapButtonText: { fontSize: 24 },
});