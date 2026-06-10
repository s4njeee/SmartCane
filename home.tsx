import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
} from "react-native";

import MapView, { Marker, UrlTile, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";
import Modal from "react-native-modal";

type RouteType = {
  latitude: number;
  longitude: number;
  time: string;
  address?: string;
};

type CaneType = {
  id: number;
  username: string;
  connected: boolean;
  battery: number;
  obstacle: boolean;
  gps: boolean;
  routes: RouteType[];
  number?: string;
  caneID?: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<any>(null);
  const [mapRef, setMapRef] = useState<MapView | null>(null);
  const [showStatus, setShowStatus] = useState(false);
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [scrollOffset, setScrollOffset] = useState(0);

  const [canes, setCanes] = useState<CaneType[]>([
    { id: 1, username: "Alice", connected: true, battery: 85, obstacle: false, gps: true, routes: [] },
    { id: 2, username: "Bob", connected: true, battery: 70, obstacle: true, gps: true, routes: [] },
  ]);

  const [selectedCane, setSelectedCane] = useState<CaneType | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newCaneID, setNewCaneID] = useState("");
  const [newNumber, setNewNumber] = useState("");

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission required");
        return;
      }

      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 1 },
        async (newLocation) => {
          const coords = newLocation.coords;
          setLocation(coords);

          // Reverse geocode to get readable address
          let address = "Locating...";
          try {
            const geocode = await Location.reverseGeocodeAsync({
              latitude: coords.latitude,
              longitude: coords.longitude,
            });
            if (geocode.length > 0) {
              const place = geocode[0];
              address = [place.name, place.street, place.city, place.region]
                .filter(Boolean)
                .join(", ");
            }
          } catch (error) {
            console.log("Reverse geocode error:", error);
          }

          setCanes(prev =>
            prev.map(cane => ({
              ...cane,
              routes: [
                { latitude: coords.latitude, longitude: coords.longitude, time: new Date().toLocaleTimeString(), address },
                ...cane.routes.slice(0, 19),
              ],
            }))
          );
        }
      );
    })();
  }, []);

  if (!location) return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#0057FF" />
      <Text style={styles.loadingText}>Loading SmartCane Map...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* MAP */}
      <MapView
        ref={(ref) => setMapRef(ref)}
        style={styles.map}
        showsUserLocation
        mapType={mapType}
        initialRegion={{ latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      >
        {mapType === "standard" && <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />}
        <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} />
        {selectedCane && selectedCane.routes.length > 1 && (
          <Polyline
            coordinates={selectedCane.routes.map(r => ({ latitude: r.latitude, longitude: r.longitude }))}
            strokeWidth={5} strokeColor="#0057FF"
          />
        )}
      </MapView>

      {/* MAP BUTTON */}
      <TouchableOpacity style={styles.mapFloatingButton} onPress={() => setMapType(mapType === "standard" ? "satellite" : "standard")}>
        <Text style={styles.mapButtonText}>{mapType === "standard" ? "🗺️" : "🌍"}</Text>
      </TouchableOpacity>

      {/* STATUS SHEET */}
      <Modal
        isVisible={showStatus}
        style={styles.bottomModal}
        swipeDirection="down"
        onSwipeComplete={() => setShowStatus(false)}
        onBackdropPress={() => setShowStatus(false)}
        propagateSwipe
        scrollOffset={scrollOffset}
        scrollOffsetMax={400}
      >
        <View style={styles.modalContent}>
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} pointerEvents="none" />
          </View>

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>SmartCane Status</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(!showAddForm)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 100 }} onScroll={e => setScrollOffset(e.nativeEvent.contentOffset.y)} scrollEventThrottle={16}>

            {/* Add Cane Form */}
            {showAddForm && (
              <View style={styles.addFormContainer}>
                <Text>Username</Text>
                <TextInput style={styles.input} value={newUsername} onChangeText={setNewUsername} placeholder="Enter username" />
                <Text>Cane ID</Text>
                <TextInput style={styles.input} value={newCaneID} onChangeText={setNewCaneID} placeholder="Enter Cane ID" />
                <Text>Number</Text>
                <TextInput style={styles.input} value={newNumber} onChangeText={setNewNumber} placeholder="Enter number" keyboardType="numeric" />
                <TouchableOpacity style={styles.addButtonFull} onPress={() => {
                  if (!newUsername || !newCaneID || !newNumber) return;
                  const newCane = {
                    id: Date.now(),
                    username: newUsername,
                    connected: true,
                    battery: 100,
                    obstacle: false,
                    gps: true,
                    routes: [],
                    caneID: newCaneID,
                    number: newNumber,
                  };
                  setCanes(prev => [...prev, newCane]);
                  setNewUsername(""); setNewCaneID(""); setNewNumber(""); setShowAddForm(false);
                }}>
                  <Text style={{ color: "#fff" }}>Add Cane</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.sectionTitle}>Cane Users</Text>
            {canes.map(cane => (
              <TouchableOpacity key={cane.id} style={styles.caneCard} onPress={() => setSelectedCane(cane)}>
                <View>
                  <Text style={styles.caneName}>{cane.username}</Text>
                  <Text>CaneID: {cane.caneID || "-"}</Text>
                  <Text>Number: {cane.number || "-"}</Text>
                  <Text>Battery: {cane.battery}%</Text>
                </View>
                <TouchableOpacity onPress={() => setCanes(prev => prev.filter(c => c.id !== cane.id))}>
                  <Ionicons name="trash" size={24} color="red" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {selectedCane && (
              <>
                <Text style={styles.sectionTitle}>{selectedCane.username}</Text>
                <View style={styles.statusRow}>
                  <Text>Connected</Text>
                  <Text>{selectedCane.connected ? "Yes" : "No"}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text>Battery</Text>
                  <Text>{selectedCane.battery}%</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text>Obstacle</Text>
                  <Text>{selectedCane.obstacle ? "Detected" : "Clear"}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text>GPS</Text>
                  <Text>{selectedCane.gps ? "Active" : "Offline"}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Text>Current Location</Text>
                  <Text style={{ flex: 1, textAlign: "right" }}>
                    {selectedCane.routes[0]?.address || "Locating..."}
                  </Text>
                </View>

                <Text style={styles.sectionTitle}>History</Text>
                {selectedCane.routes.map((route, index) => (
                  <View key={index} style={styles.historyCard}>
                    <Text>📍 Travel Route</Text>
                    <Text>{route.address || "Unknown location"}</Text>
                    <Text>Lat: {route.latitude.toFixed(5)}</Text>
                    <Text>Long: {route.longitude.toFixed(5)}</Text>
                    <Text>{route.time}</Text>
                  </View>
                ))}
              </>
            )}

          </ScrollView>
        </View>
      </Modal>

      {/* NAVIGATION */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => mapRef?.animateCamera({ center: { latitude: location.latitude, longitude: location.longitude }, zoom: 18 })}>
          <Ionicons name="home" size={24} color="#0057FF" />
          <Text style={{ color: "#0057FF" }}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("../messages")}>
          <Ionicons name="chatbubble-outline" size={22} />
          <Text>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setShowStatus(true)}>
          <Ionicons name="stats-chart-outline" size={22} />
          <Text>Status</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("../profile")}>
          <Ionicons name="person-outline" size={22} />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10 },
  mapFloatingButton: { position: "absolute", right: 20, bottom: 100, width: 55, height: 55, borderRadius: 30, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", elevation: 5 },
  mapButtonText: { fontSize: 24 },
  bottomModal: { justifyContent: "flex-end", margin: 0 },
  modalContent: { flex: 1, maxHeight: "75%", backgroundColor: "#fff", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  dragHandleContainer: { alignItems: "center", marginBottom: 10 },
  dragHandle: { width: 60, height: 6, backgroundColor: "#ccc", borderRadius: 10 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 22, fontWeight: "700" },
  addButton: { flexDirection: "row", backgroundColor: "#22C55E", borderRadius: 20, padding: 10, alignItems: "center" },
  addButtonText: { color: "#fff", marginLeft: 5 },
  addFormContainer: { backgroundColor: "#F4F7FF", padding: 15, borderRadius: 15, marginVertical: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 10, marginVertical: 5 },
  addButtonFull: { backgroundColor: "#22C55E", marginTop: 10, padding: 15, borderRadius: 15, alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginVertical: 10 },
  caneCard: { backgroundColor: "#EEF4FF", padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: "row", justifyContent: "space-between" },
  caneName: { fontWeight: "700", fontSize: 16 },
  statusRow: { backgroundColor: "#F8FAFC", padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: "row", justifyContent: "space-between" },
  historyCard: { backgroundColor: "#F4F7FF", padding: 15, borderRadius: 15, marginBottom: 10 },
  bottomNav: { position: "absolute", bottom: -20, width: "100%", height: 70, backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-evenly", alignItems: "center" },
  navItem: { alignItems: "center" },
});