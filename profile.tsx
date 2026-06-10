import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../firebase/supabase";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function Profile() {
  const router = useRouter();
  const user = auth.currentUser;

  const [darkMode, setDarkMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState(user?.displayName || "SmartCane User");

  useEffect(() => {
    loadThemeFromStorage();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
        if (data.displayName) setUsername(data.displayName);
        if (data.darkMode !== undefined) setDarkMode(data.darkMode);
      }
    } catch (error) {
      console.log("Error loading user data:", error);
    }
  };

  const loadThemeFromStorage = async () => {
    const saved = await AsyncStorage.getItem("darkMode");
    if (saved !== null) setDarkMode(saved === "true");
  };

  const handleUploadAvatar = async () => {
    if (!user) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission denied", "Please allow photo access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // correct for your version
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const fileName = `${user.uid}.jpg`;

      try {
        await supabase.storage.from("avatars").remove([fileName]);
      } catch (e) {
        console.log("No previous avatar to delete");
      }

      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const publicUrl = publicUrlData.publicUrl;
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);

      await setDoc(doc(db, "users", user.uid), { avatar_url: publicUrl }, { merge: true });

      Alert.alert("Success", "Profile picture updated!");
    } catch (error: any) {
      console.log(error);
      Alert.alert("Upload Error", error.message);
    }
  };

  const handleToggleDarkMode = async (value: boolean) => {
    setDarkMode(value);
    await AsyncStorage.setItem("darkMode", value.toString());
    if (user) await setDoc(doc(db, "users", user.uid), { darkMode: value }, { merge: true });
  };

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace("/login");
          } catch (error: any) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, darkMode && styles.darkBg]} showsVerticalScrollIndicator={false}>
      {/* TOP NAV */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0057FF" />
        </TouchableOpacity>
        <Text style={[styles.navTitle, darkMode && styles.darkText]}>Profile</Text>
        <View style={{ width: 45 }} />
      </View>

      {/* PROFILE HEADER */}
      <View style={styles.profileSection}>
        <TouchableOpacity onPress={handleUploadAvatar} style={styles.avatarWrapper}>
          <Image
            source={{ uri: avatarUrl || "https://i.pravatar.cc/150?img=12" }}
            style={styles.avatar}
          />
          <View style={styles.uploadIconWrapper}>
            <Ionicons name="camera" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={[styles.name, darkMode && styles.darkText]}>{username}</Text>
        <Text style={[styles.email, darkMode && styles.darkText]}>{user?.email}</Text>
      </View>

      {/* ACCOUNT */}
      <View style={[styles.card, darkMode && styles.darkCard]}>
        <Text style={[styles.cardTitle, darkMode && styles.darkText]}>Account</Text>
        <MenuItem icon="person-outline" title="Edit Profile" onPress={() => router.push("../editprofile")} />
        <MenuItem icon="lock-closed-outline" title="Change Password" onPress={() => router.push("/changepassword")} />
      </View>

      {/* SETTINGS */}
      <View style={[styles.card, darkMode && styles.darkCard]}>
        <Text style={[styles.cardTitle, darkMode && styles.darkText]}>Settings</Text>
        <View style={styles.menuRow}>
          <View style={styles.menuLeft}>
            <Ionicons name="moon-outline" size={22} color={darkMode ? "#fff" : "#333"} />
            <Text style={[styles.menuText, darkMode && styles.darkText]}>Dark Mode</Text>
          </View>
          <Switch value={darkMode} onValueChange={handleToggleDarkMode} />
        </View>
      </View>

      {/* LOGOUT */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MenuItem({ icon, title, onPress }: any) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={22} color="#333" />
        <Text style={styles.menuText}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#999" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 20 },
  darkBg: { backgroundColor: "#111827" },
  darkText: { color: "#fff" },
  topNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 55, marginBottom: 10 },
  navBtn: { width: 45, height: 45, borderRadius: 22, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  navTitle: { fontSize: 24, fontWeight: "700" },
  profileSection: { alignItems: "center", marginTop: 20, marginBottom: 30 },
  avatarWrapper: { position: "relative" },
  avatar: { width: 110, height: 110, borderRadius: 55 },
  uploadIconWrapper: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#16A34A", borderRadius: 20, padding: 7, borderWidth: 2, borderColor: "#fff" },
  name: { fontSize: 30, fontWeight: "700", marginTop: 15 },
  email: { color: "#777", marginTop: 5, fontSize: 15 },
  card: { backgroundColor: "#F3F4F6", borderRadius: 25, padding: 20, marginBottom: 20 },
  darkCard: { backgroundColor: "#1F2937" },
  cardTitle: { fontSize: 24, fontWeight: "700", marginBottom: 15 },
  menuRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16 },
  menuLeft: { flexDirection: "row", alignItems: "center" },
  menuText: { fontSize: 18, marginLeft: 15 },
  logoutBtn: { backgroundColor: "#EF4444", borderRadius: 20, paddingVertical: 18, alignItems: "center", flexDirection: "row", justifyContent: "center", marginBottom: 40 },
  logoutText: { color: "#fff", fontSize: 18, fontWeight: "700", marginLeft: 10 },
});