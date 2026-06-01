import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MapView, { Marker, UrlTile } from "react-native-maps";

import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  const [location, setLocation] = useState<any>(null);

  const [mapRef, setMapRef] = useState<MapView | null>(null);

  const [isFollowing, setIsFollowing] = useState(true);

  // MAP TYPE
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");

  // TEMP STATUS
  const [smartCaneStatus] = useState({
    connected: true,
    battery: 85,
    obstacle: false,
    gps: true,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 1,
        },
        (newLocation) => {
          const coords = newLocation.coords;

          setLocation(coords);

          // Follow user
          if (mapRef && isFollowing) {
            mapRef.animateCamera({
              center: {
                latitude: coords.latitude,
                longitude: coords.longitude,
              },
            });
          }
        },
      );
    })();
  }, [mapRef, isFollowing]);

  if (!location) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0057FF" />
        <Text style={styles.loadingText}>Loading SmartCane Map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* MAP */}
      <MapView
        ref={(ref) => setMapRef(ref)}
        style={styles.map}
        showsUserLocation
        mapType={mapType}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPanDrag={() => setIsFollowing(false)}
      >
        {mapType === "standard" && (
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
          />
        )}

        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="SmartCane User"
        />
      </MapView>

      {/* STATUS CARD */}
      <BlurView intensity={25} tint="light" style={styles.statusCard}>
        <Text style={styles.statusTitle}>SmartCane Status</Text>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Connection</Text>

          <Text
            style={[
              styles.statusValue,
              {
                color: smartCaneStatus.connected ? "#22C55E" : "#EF4444",
              },
            ]}
          >
            {smartCaneStatus.connected ? "Connected" : "Disconnected"}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Battery</Text>

          <Text style={styles.statusValue}>{smartCaneStatus.battery}%</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Obstacle</Text>

          <Text
            style={[
              styles.statusValue,
              {
                color: smartCaneStatus.obstacle ? "#EF4444" : "#22C55E",
              },
            ]}
          >
            {smartCaneStatus.obstacle ? "Detected" : "Clear"}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>GPS</Text>

          <Text
            style={[
              styles.statusValue,
              {
                color: smartCaneStatus.gps ? "#22C55E" : "#EF4444",
              },
            ]}
          >
            {smartCaneStatus.gps ? "Active" : "Offline"}
          </Text>
        </View>
      </BlurView>

      {/* MAP SWITCHER */}
      <BlurView intensity={20} tint="light" style={styles.mapSwitcher}>
        <TouchableOpacity
          style={[
            styles.mapButton,
            mapType === "standard" && styles.activeMapButton,
          ]}
          onPress={() => setMapType("standard")}
        >
          <Text style={styles.mapButtonText}>Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mapButton,
            mapType === "satellite" && styles.activeMapButton,
          ]}
          onPress={() => setMapType("satellite")}
        >
          <Text style={styles.mapButtonText}>Satellite</Text>
        </TouchableOpacity>
      </BlurView>

      {/* BOTTOM NAV */}
      <BlurView intensity={30} tint="light" style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("../messages")}
        >
          <Text style={styles.navLabel}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeButton}>
          <Text style={styles.homeText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("../profile")}
        >
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  map: {
    flex: 1,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },

  statusCard: {
    position: "absolute",
    top: 10,
    left: 20,
    right: 20,
    borderRadius: 30,
    padding: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  statusTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#0057FF",
    marginBottom: 10,
  },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },

  statusLabel: {
    fontWeight: "600",
  },

  statusValue: {
    fontWeight: "700",
  },

  mapSwitcher: {
    position: "absolute",
    top: 200,
    alignSelf: "center",
    flexDirection: "row",
    borderRadius: 20,
    overflow: "hidden",
  },

  mapButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  activeMapButton: {
    backgroundColor: "#0057FF",
  },

  mapButtonText: {
    color: "#fff",
    fontWeight: "600",
  },

  bottomNav: {
    position: "absolute",
    bottom: 10,
    left: 20,
    right: 20,
    height: 75,

    borderRadius: 35,
    overflow: "hidden",

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    paddingHorizontal: 20,

    backgroundColor: "rgba(255,255,255,0.15)",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowRadius: 10,
    elevation: 10,
  },

  navItem: {
    width: 80,
    alignItems: "center",
  },

  navLabel: {
    color: "#fff",
    fontWeight: "600",
  },

  homeButton: {
    backgroundColor: "#0057FF",

    width: 95,
    height: 45,

    borderRadius: 25,

    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#0057FF",
    shadowOpacity: 0.3,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 8,
    elevation: 6,
  },

  homeText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
