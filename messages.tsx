import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

export default function Messages() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* BACK BUTTON */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.push("../home")}
      >
        <Text style={styles.backText}>
          ←
        </Text>
      </TouchableOpacity>

      {/* PAGE CONTENT */}
      <View style={styles.content}>
        <Text style={styles.title}>
          Emergency Messages
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },

  // SAME BACK BUTTON AS PROFILE
  backBtn: {
    alignSelf: "flex-start",
    marginTop: 20,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#eee",
  },

  backText: {
    fontSize: 16,
    fontWeight: "600",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0057FF",
  },
});