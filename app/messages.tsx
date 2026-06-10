import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function Messages() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time Firestore listener
  useEffect(() => {
    const alertsQuery = query(
      collection(db, "alerts"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAlerts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0057FF" />
        <Text>Loading Alerts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("../home")}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>SmartCane Alerts</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ACTIVE ALERTS */}
        <Text style={styles.sectionTitle}>Emergency Alerts</Text>

        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>
                  {alert.type === "fall" ? "🚨 Fall Detected" : "🆘 Emergency Request"}
                </Text>
                {alert.active && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>ACTIVE</Text>
                  </View>
                )}
              </View>

              <Text style={styles.userName}>User: {alert.username}</Text>
              <Text style={styles.alertDescription}>{alert.message}</Text>
              <Text style={styles.location}>📍 {alert.location}</Text>
              <Text style={styles.time}>
                ⏰ {alert.timestamp ? new Date(alert.timestamp.seconds * 1000).toLocaleTimeString() : ""}
              </Text>

              <TouchableOpacity style={styles.locationBtn}>
                <Text style={styles.buttonText}>View Location</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.noAlertsText}>No alerts yet.</Text>
        )}

        {/* ALERT HISTORY */}
        <Text style={styles.sectionTitle}>Alert History</Text>

        {alerts
          .filter((a) => !a.active)
          .map((alert) => (
            <View key={alert.id} style={styles.historyCard}>
              <View>
                <Text style={styles.historyTitle}>
                  {alert.type === "fall" ? "🚨 Fall Detected" : "🆘 Emergency Request"}
                </Text>
                <Text style={styles.historyUser}>{alert.username}</Text>
              </View>
              <Text style={styles.timeAgo}>
                {alert.timestamp
                  ? new Date(alert.timestamp.seconds * 1000).toLocaleTimeString()
                  : ""}
              </Text>
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FC", paddingTop: 55, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 25 },
  backBtn: { backgroundColor: "#fff", width: 45, height: 45, borderRadius: 15, justifyContent: "center", alignItems: "center", elevation: 2 },
  backText: { fontSize: 22, fontWeight: "700" },
  headerTitle: { fontSize: 24, fontWeight: "bold", marginLeft: 15, color: "#111827" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 14, color: "#111827" },
  alertCard: { backgroundColor: "#fff", borderRadius: 25, padding: 22, borderWidth: 2, borderColor: "#FCA5A5", marginBottom: 25, elevation: 2 },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  alertTitle: { fontSize: 22, fontWeight: "700", color: "#DC2626" },
  badge: { backgroundColor: "#EF4444", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: "#fff", fontWeight: "700" },
  userName: { fontSize: 17, fontWeight: "700", marginBottom: 8, color: "#111827" },
  alertDescription: { color: "#4B5563", lineHeight: 21, marginBottom: 15 },
  location: { fontSize: 15, marginBottom: 6, color: "#111827" },
  time: { color: "#6B7280", marginBottom: 18 },
  locationBtn: { backgroundColor: "#0057FF", padding: 15, borderRadius: 15, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  noAlertsText: { textAlign: "center", marginTop: 20, color: "#6B7280" },
  historyCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 1 },
  historyTitle: { fontWeight: "700", fontSize: 16, color: "#111827" },
  historyUser: { color: "#6B7280", marginTop: 4 },
  timeAgo: { color: "#9CA3AF", fontSize: 13 },
});