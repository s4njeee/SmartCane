import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { saveUserProfile } from '../firebase/appData';
import AppShell from '../components/ui/AppShell';
import ScreenLayout from '../components/ui/ScreenLayout';
import GlassCard from '../components/ui/GlassCard';
import ScreenHeader from '../components/ui/ScreenHeader';
import SectionLabel from '../components/ui/SectionLabel';
import AppButton from '../components/ui/AppButton';
import GlowPressable from '../components/ui/GlowPressable';
import {
  getImageUploadMeta,
  resolveStoredAvatarUrl,
  uploadAvatarFile,
  uriToArrayBuffer,
} from '../utils/uploadAvatar';
import { useTheme } from '../context/ThemeContext';
import { platformDesign } from '../constants/platformDesign';
import { radius, spacing } from '../constants/theme';

export default function Profile() {
  const router = useRouter();
  const { theme, isDark, setDarkMode } = useTheme();
  const { colors } = theme;
  const user = auth.currentUser;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState(user?.displayName || 'SmartCane User');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        const storedUrl = resolveStoredAvatarUrl(
          data.avatar_url,
          data.avatar_extension,
          user.uid
        );
        if (storedUrl) setAvatarUrl(storedUrl);
        if (data.displayName) setUsername(data.displayName);
        if (data.darkMode !== undefined) setDarkMode(data.darkMode);
      }
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  };

  const handleUploadAvatar = async () => {
    if (!user) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission denied', 'Please allow photo access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;

      setUploading(true);
      const asset = result.assets[0];
      const arrayBuffer = await uriToArrayBuffer(asset.uri);
      const { contentType, extension } = getImageUploadMeta(asset.mimeType);
      const publicUrl = await uploadAvatarFile(user.uid, arrayBuffer, contentType, extension);

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      await saveUserProfile(user.uid, {
        avatar_url: publicUrl,
        avatar_extension: extension,
        email: user.email,
        displayName: username,
      });
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error: any) {
      Alert.alert('Upload Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleDarkMode = async (value: boolean) => {
    setDarkMode(value);
    if (user) await saveUserProfile(user.uid, { darkMode: value });
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace('/login');
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  return (
    <AppShell active="profile">
      <ScreenLayout scroll withNav>
        <ScreenHeader title="Profile" showBack={false} subtitle="Account & preferences" />

        <GlassCard style={styles.profileCard}>
          <GlowPressable
            onPress={handleUploadAvatar}
            disabled={uploading}
            glowColor={colors.primary}
            style={[styles.avatarGlow, { borderRadius: 56 }]}
          >
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: avatarUrl || 'https://i.pravatar.cc/150?img=12' }}
                style={[styles.avatar, { borderColor: colors.primary }]}
              />
              <View
                style={[
                  styles.cameraBadge,
                  { backgroundColor: colors.success, borderColor: colors.surface },
                ]}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </View>
            </View>
          </GlowPressable>
          <Text style={[styles.name, { color: colors.text }]}>{username}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
        </GlassCard>

        <SectionLabel style={styles.firstSection}>Account</SectionLabel>
        <GlassCard elevated={false} style={styles.sectionCard}>
          <MenuItem
            icon="person-outline"
            title="Edit Profile"
            onPress={() => router.push('/editprofile')}
          />
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon="lock-closed-outline"
            title="Change Password"
            onPress={() => router.push('/changepassword')}
          />
        </GlassCard>

        <SectionLabel>Appearance</SectionLabel>
        <GlassCard elevated={false} style={styles.sectionCard}>
          <View style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="moon-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.menuCopy}>
                <Text style={[styles.menuText, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.menuSub, { color: colors.textMuted }]}>
                  {isDark ? 'On' : 'Off'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleToggleDarkMode}
              trackColor={{
                false: colors.border,
                true:
                  colors.primary +
                  (platformDesign.id === 'android' ? '99' : ''),
              }}
              thumbColor={
                platformDesign.id === 'android'
                  ? isDark
                    ? colors.primary
                    : '#F4F4F5'
                  : '#fff'
              }
              ios_backgroundColor={colors.border}
            />
          </View>
        </GlassCard>

        <AppButton title="Logout" variant="danger" onPress={handleLogout} style={styles.logout} />
      </ScreenLayout>
    </AppShell>
  );
}

function MenuItem({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        pressed && { opacity: 0.7, backgroundColor: colors.primary + '08' },
      ]}
      android_ripple={{ color: colors.primary + '18' }}
    >
      <View style={styles.menuLeft}>
        <View style={[styles.iconBox, { backgroundColor: colors.primary + '12' }]}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <Text style={[styles.menuText, { color: colors.text }]}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.lg,
  },
  avatarGlow: { marginBottom: spacing.md, padding: 4 },
  avatarWrapper: { position: 'relative' },
  sectionCard: { paddingVertical: spacing.xs, paddingHorizontal: spacing.xs },
  firstSection: { marginTop: spacing.sm },
  menuDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.sm },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3 },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 16,
    padding: 8,
    borderWidth: 2,
  },
  name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  email: { fontSize: 14, marginTop: 4, fontWeight: '500' },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    minHeight: 56,
    borderRadius: radius.md,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuCopy: { flex: 1 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuText: { fontSize: 16, fontWeight: '600' },
  menuSub: { fontSize: 12, marginTop: 2 },
  logout: { marginTop: spacing.xl, marginBottom: spacing.xxl },
});
