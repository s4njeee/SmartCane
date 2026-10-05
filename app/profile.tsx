import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { signOut, updateProfile } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import AppButton from "../components/ui/AppButton";
import AppShell from "../components/ui/AppShell";
import GlassCard from "../components/ui/GlassCard";
import ScreenHeader from "../components/ui/ScreenHeader";
import ScreenLayout from "../components/ui/ScreenLayout";
import SectionLabel from "../components/ui/SectionLabel";
import { isAdminUser } from "../constants/admin";
import { radius, spacing } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { saveUserProfile } from "../firebase/appData";
import { auth, db } from "../firebase/firebaseConfig";
import { colorId, cx, isWeb, ui, webClassStyle } from "../utils/ui";
import {
  avatarBaseUrl,
  getImageUploadMeta,
  recallLocalAvatar,
  rememberLocalAvatar,
  resolveStoredAvatarUrl,
  uploadAvatarFile,
  uriToArrayBuffer,
} from "../utils/uploadAvatar";

/** Web-only demo identity — does not write to Firebase / Auth. */
const WEB_DEMO_PROFILE = isWeb
  ? { name: "Dirk", email: "dirk@demo.local" }
  : null;

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || "?").toUpperCase();
}

export default function Profile() {
  const router = useRouter();
  const { theme, isDark, setDarkMode } = useTheme();
  const { colors } = theme;
  const user = auth.currentUser;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState(
    user?.displayName || "SmartCane User",
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarScale = useRef(new Animated.Value(1)).current;
  const photoOpacity = useRef(new Animated.Value(1)).current;
  const fadeNextPhoto = useRef(false);

  const bounceAvatar = (pressed: boolean) => {
    Animated.spring(avatarScale, {
      toValue: pressed ? 0.96 : 1,
      friction: 7,
      tension: 160,
      useNativeDriver: true,
    }).start();
  };

  const loadUserData = useCallback(
    async (stillMounted?: () => boolean) => {
      if (!user) return;
      const canUpdate = () => stillMounted?.() !== false;
      try {
        const cached = await recallLocalAvatar(user.uid);
        if (!canUpdate()) return;
        if (cached) setAvatarUrl((current) => current || cached);

        const snap = await getDoc(doc(db, "users", user.uid));
        if (!canUpdate()) return;
        if (snap.exists()) {
          const data = snap.data();
          const storedUrl = resolveStoredAvatarUrl(
            data.avatar_url,
            data.avatar_extension,
            user.uid,
            data.avatar_updated_at,
          );
          if (storedUrl) {
            await rememberLocalAvatar(user.uid, storedUrl);
            if (!canUpdate()) return;
            setAvatarUrl((current) => {
              if (!current) return storedUrl;
              if (
                current.startsWith("file:") ||
                current.startsWith("content:")
              ) {
                return current;
              }
              return avatarBaseUrl(current) === avatarBaseUrl(storedUrl)
                ? current
                : storedUrl;
            });
          }
          if (data.displayName) setUsername(data.displayName);
          if (data.darkMode !== undefined) setDarkMode(data.darkMode);
          if (!canUpdate()) return;
          setIsAdmin(
            isAdminUser({
              role: typeof data.role === "string" ? data.role : null,
              email: user.email,
            }),
          );
        } else if (canUpdate()) {
          setIsAdmin(isAdminUser({ email: user.email }));
        }
      } catch (error) {
        console.log("Error loading user data:", error);
      }
    },
    [setDarkMode, user],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadUserData(() => active);
      return () => {
        active = false;
      };
    }, [loadUserData]),
  );

  const handleUploadAvatar = async () => {
    if (!user) return;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission denied", "Please allow photo access.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        ...(Platform.OS === "android" ? { exif: false } : null),
      });
      if (result.canceled) return;

      setUploading(true);
      const asset = result.assets[0];
      fadeNextPhoto.current = true;
      photoOpacity.setValue(0.4);
      setAvatarUrl(asset.uri);
      await rememberLocalAvatar(user.uid, asset.uri);
      const arrayBuffer = await uriToArrayBuffer(asset.uri);
      const { contentType, extension } = getImageUploadMeta(asset.mimeType);
      const publicUrl = await uploadAvatarFile(
        user.uid,
        arrayBuffer,
        contentType,
        extension,
      );
      const stamp = Date.now();
      const nextUrl = `${publicUrl}?t=${stamp}`;

      setAvatarUrl(nextUrl);
      await rememberLocalAvatar(user.uid, nextUrl);
      await updateProfile(user, { photoURL: publicUrl });
      await saveUserProfile(user.uid, {
        avatar_url: publicUrl,
        avatar_extension: extension,
        avatar_updated_at: stamp,
        email: user.email,
        displayName: username,
      });
      Alert.alert("Success", "Profile picture updated!");
    } catch (error: any) {
      Alert.alert("Upload Error", error.message);
      void loadUserData();
    } finally {
      setUploading(false);
    }
  };

  const handleToggleDarkMode = async (value: boolean) => {
    setDarkMode(value);
    if (user) await saveUserProfile(user.uid, { darkMode: value });
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
    <AppShell active="profile">
      <ScreenLayout scroll withNav>
        <ScreenHeader
          title="Profile"
          showBack={false}
          subtitle="Account & preferences"
        />

        <GlassCard
          className="profile-card is-profile"
          style={styles.profileCard}
        >
          <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
            <Pressable
              onPress={handleUploadAvatar}
              onPressIn={() => bounceAvatar(true)}
              onPressOut={() => bounceAvatar(false)}
              disabled={uploading}
              android_ripple={undefined}
              {...ui("profile-avatar-glow", styles.avatarGlow)}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <View {...ui("profile-avatar-wrap", styles.avatarWrapper)}>
                {avatarUrl ? (
                  <Animated.Image
                    source={{ uri: avatarUrl }}
                    onLoad={() => {
                      if (!fadeNextPhoto.current) return;
                      fadeNextPhoto.current = false;
                      Animated.timing(photoOpacity, {
                        toValue: 1,
                        duration: 240,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                      }).start();
                    }}
                    {...ui("profile-avatar")}
                    style={[
                      styles.avatar,
                      { borderColor: colors.primary, opacity: photoOpacity },
                    ]}
                  />
                ) : (
                  <View
                    {...ui("profile-avatar profile-avatar-fallback", [
                      styles.avatar,
                      styles.avatarFallback,
                      {
                        borderColor: colors.primary,
                        backgroundColor: colors.primary + "18",
                      },
                    ])}
                  >
                    <Text
                      {...ui("profile-avatar-initials", [
                        styles.avatarInitials,
                        { color: colors.primary },
                      ])}
                    >
                      {initialsFromName(username)}
                    </Text>
                  </View>
                )}
                <View
                  pointerEvents="none"
                  {...ui("profile-camera", [
                    styles.cameraBadge,
                    {
                      backgroundColor: colors.success,
                      borderColor: colors.surface,
                    },
                  ])}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons
                      name="camera"
                      size={15}
                      color={isWeb ? undefined : "#fff"}
                      style={
                        isWeb
                          ? webClassStyle("profile-camera-glyph")
                          : undefined
                      }
                    />
                  )}
                </View>
              </View>
            </Pressable>
          </Animated.View>
          <Text {...ui("profile-name", [styles.name, { color: colors.text }])}>
            {username}
          </Text>
          <Text
            {...ui("profile-email", [
              styles.email,
              { color: colors.textSecondary },
            ])}
          >
            {user?.email}
          </Text>
        </GlassCard>

        <SectionLabel
          className="section-label-row is-first is-account"
          style={styles.firstSection}
        >
          Account
        </SectionLabel>
        <GlassCard
          elevated={false}
          className="profile-section-card is-account"
          style={styles.sectionCard}
        >
          <MenuItem
            icon="person-outline"
            title="Edit Profile"
            variant="edit"
            onPress={() => router.push("/editprofile")}
          />
          <View
            {...ui(cx("profile-divider", colorId("account")), [
              styles.menuDivider,
              { backgroundColor: colors.border },
            ])}
          />
          <MenuItem
            icon="lock-closed-outline"
            title="Change Password"
            variant="password"
            onPress={() => router.push("/changepassword")}
          />
        </GlassCard>

        <SectionLabel className="is-appearance">Appearance</SectionLabel>
        <GlassCard
          elevated={false}
          className="profile-section-card is-appearance"
          style={styles.sectionCard}
        >
          <View {...ui(cx("menu-row", colorId("dark")), styles.menuRow)}>
            <View {...ui(cx("menu-left", colorId("dark")), styles.menuLeft)}>
              <View
                {...ui(cx("menu-icon", "is-dark"), [
                  styles.iconBox,
                  { backgroundColor: colors.primary + "15" },
                ])}
              >
                <Ionicons
                  name="moon-outline"
                  size={20}
                  color={isWeb ? undefined : colors.primary}
                  style={
                    isWeb
                      ? webClassStyle(cx("menu-glyph", "is-dark"))
                      : undefined
                  }
                />
              </View>
              <View {...ui("menu-copy", styles.menuCopy)}>
                <Text
                  {...ui(cx("menu-text", colorId("dark")), [
                    styles.menuText,
                    { color: colors.text },
                  ])}
                >
                  Dark Mode
                </Text>
                <Text
                  {...ui(cx("menu-sub", colorId("dark")), [
                    styles.menuSub,
                    { color: colors.textMuted },
                  ])}
                >
                  {isDark ? "On" : "Off"}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? colors.primary : "#F4F4F5"}
              ios_backgroundColor={colors.border}
            />
          </View>
        </GlassCard>

        <SectionLabel className="is-support">Support</SectionLabel>
        <GlassCard
          elevated={false}
          className="profile-section-card is-support"
          style={styles.sectionCard}
        >
          <MenuItem
            icon="warning-outline"
            title="Report Problem"
            variant="report"
            onPress={() => router.push("/reportproblem" as never)}
          />
          {isAdmin ? (
            <>
              <View
                {...ui(cx("profile-divider", colorId("support")), [
                  styles.menuDivider,
                  { backgroundColor: colors.border },
                ])}
              />
              <MenuItem
                icon="shield-checkmark-outline"
                title="Admin Inbox"
                variant="admin"
                onPress={() => router.push("/adminreports" as never)}
              />
            </>
          ) : null}
        </GlassCard>

        <AppButton
          title="Logout"
          variant="danger"
          onPress={handleLogout}
          className="btn-logout is-logout"
          style={styles.logout}
        />
      </ScreenLayout>
    </AppShell>
  );
}

function MenuItem({
  icon,
  title,
  variant,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  variant: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <Pressable
      onPress={onPress}
      {...(isWeb
        ? ui(cx("menu-row", colorId(variant)), styles.menuRow)
        : {
            style: ({ pressed }: { pressed: boolean }) => [
              styles.menuRow,
              Platform.OS === "android"
                ? { overflow: "hidden" }
                : pressed && {
                    opacity: 0.7,
                    backgroundColor: colors.primary + "08",
                  },
            ],
          })}
      android_ripple={{ color: colors.primary + "18" }}
    >
      <View {...ui(cx("menu-left", colorId(variant)), styles.menuLeft)}>
        <View
          {...ui(cx("menu-icon", `is-${variant}`), [
            styles.iconBox,
            { backgroundColor: colors.primary + "12" },
          ])}
        >
          <Ionicons
            name={icon}
            size={20}
            color={isWeb ? undefined : colors.primary}
            style={
              isWeb
                ? webClassStyle(cx("menu-glyph", `is-${variant}`))
                : undefined
            }
          />
        </View>
        <Text
          {...ui(cx("menu-text", colorId(variant)), [
            styles.menuText,
            { color: colors.text },
          ])}
        >
          {title}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={isWeb ? undefined : colors.textMuted}
        style={
          isWeb
            ? webClassStyle(cx("menu-chevron", colorId(variant)))
            : undefined
        }
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: "center",
    marginBottom: spacing.sm,
    paddingVertical: spacing.lg,
    overflow: "visible",
  },
  avatarGlow: { marginBottom: spacing.md, overflow: "visible" },
  avatarWrapper: {
    position: "relative",
    width: 100,
    height: 100,
    overflow: "visible",
  },
  sectionCard: { paddingVertical: spacing.xs, paddingHorizontal: spacing.xs },
  firstSection: { marginTop: spacing.sm },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.sm,
  },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 32, fontWeight: "800" },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
    elevation: 6,
    overflow: "hidden",
  },
  name: { fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  email: { fontSize: 14, marginTop: 4, fontWeight: "500" },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    minHeight: 56,
    borderRadius: radius.md,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  menuCopy: { flex: 1 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuText: { fontSize: 16, fontWeight: "600" },
  menuSub: { fontSize: 12, marginTop: 2 },
  logout: { marginTop: spacing.xl, marginBottom: spacing.xxl },
});
