import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";

// ✅ AsyncStorage
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Firestore
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function Profile() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // =========================
  // LOAD THEME (LOCAL)
  // =========================
  useEffect(() => {
    loadThemeFromStorage();
    loadThemeFromFirebase();
  }, []);

  const loadThemeFromStorage = async () => {
    try {
      const saved = await AsyncStorage.getItem("darkMode");
      if (saved !== null) {
        setDarkMode(saved === "true");
      }
    } catch (error) {
      console.log("AsyncStorage error:", error);
    }
  };

  // =========================
  // LOAD THEME (FIREBASE)
  // =========================
  const loadThemeFromFirebase = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.darkMode !== undefined) {
          setDarkMode(data.darkMode);
        }
      }
    } catch (error) {
      console.log("Firebase load error:", error);
    }
  };

  // =========================
  // TOGGLE DARK MODE
  // =========================
  const handleToggleDarkMode = async (value: boolean) => {
    setDarkMode(value);

    // Save locally
    await AsyncStorage.setItem("darkMode", value.toString());

    // Save to Firebase
    const user = auth.currentUser;
    if (user) {
      await setDoc(
        doc(db, "users", user.uid),
        { darkMode: value },
        { merge: true }
      );
    }
  };

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("../login");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={[styles.container, darkMode && styles.darkBg]}>

      {/* BACK BUTTON */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.push("../home")}
      >
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      {/* PROFILE IMAGE */}
      <Image
        source={{ uri: "https://i.pravatar.cc/150?img=12" }}
        style={styles.avatar}
      />

      <Text style={[styles.name, darkMode && styles.darkText]}>
        SmartCane User
      </Text>

      <Text style={styles.email}>user@email.com</Text>

      {/* DARK MODE */}
      <View style={styles.row}>
        <Text style={[styles.label, darkMode && styles.darkText]}>
          Dark Mode
        </Text>

        <Switch
          value={darkMode}
          onValueChange={handleToggleDarkMode}
        />
      </View>

      {/* MENU */}
      <TouchableOpacity style={styles.item}>
        <Text style={styles.itemText}>Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item}>
        <Text style={styles.itemText}>Notifications</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item}>
        <Text style={styles.itemText}>About App</Text>
      </TouchableOpacity>

      {/* LOGOUT */}
      <TouchableOpacity style={styles.logout} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

    </View>
  );
}

// =========================
// STYLES
// =========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#fff",
  },

  darkBg: {
    backgroundColor: "#0B1220",
  },

  darkText: {
    color: "#fff",
  },

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

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 20,
  },

  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    color: "#000",
  },

  email: {
    color: "gray",
    marginBottom: 20,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginVertical: 20,
    alignItems: "center",
  },

  label: {
    fontSize: 16,
  },

  item: {
    width: "100%",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },

  itemText: {
    fontSize: 16,
  },

  logout: {
    marginTop: 30,
    backgroundColor: "red",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },

  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },
});