import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Switch, Text, View } from 'react-native';
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
import AppButton from '../components/ui/AppButton';
import GlowPressable from '../components/ui/GlowPressable';
import {
  getImageUploadMeta,
  resolveStoredAvatarUrl,
  uploadAvatarFile,
  uriToArrayBuffer,
} from '../utils/uploadAvatar';
import { useTheme } from '../context/ThemeContext';
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
      <ScreenHeader title="Profile" showBack={false} />

      <GlassCard style={styles.profileCard}>
        <GlowPressable
          onPress={handleUploadAvatar}
          disabled={uploading}
          glowColor={colors.primary}
          style={[styles.avatarGlow, { borderRadius: 54 }]}
        >
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: avatarUrl || 'https://i.pravatar.cc/150?img=12' }}
              style={[styles.avatar, { borderColor: colors.primary }]}
            />
            <View style={[styles.cameraBadge, { backgroundColor: colors.success }]}>
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
        <View style={[styles.planBadge, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
          <Text style={[styles.planText, { color: colors.primary }]}>SmartGuide Pro</Text>
        </View>
      </GlassCard>

      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ACCOUNT</Text>
      <GlassCard elevated={false} style={styles.sectionCard}>
        <MenuItem icon="person-outline" title="Edit Profile" onPress={() => router.push('/editprofile')} />
        <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
        <MenuItem icon="lock-closed-outline" title="Change Password" onPress={() => router.push('/changepassword')} />
      </GlassCard>

      <Text style={[styles.sectionLabel, styles.sectionLabelSpaced, { color: colors.textMuted }]}>APPEARANCE</Text>
      <GlassCard elevated={false} style={styles.sectionCard}>
        <View style={styles.menuRow}>
          <View style={styles.menuLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="moon-outline" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.menuText, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.menuSub, { color: colors.textMuted }]}>
                {isDark ? 'On' : 'Off'}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={handleToggleDarkMode}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
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
    <GlowPressable
      onPress={onPress}
      glowColor={colors.primary}
      style={[styles.menuGlow, { borderRadius: radius.md, borderColor: 'transparent' }]}
    >
      <View style={styles.menuRow}>
        <View style={styles.menuLeft}>
          <View style={[styles.iconBox, { backgroundColor: colors.primary + '12' }]}>
            <Ionicons name={icon} size={20} color={colors.primary} />
          </View>
          <Text style={[styles.menuText, { color: colors.text }]}>{title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </GlowPressable>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: 'center', marginBottom: spacing.xl, paddingVertical: spacing.lg },
  avatarGlow: { marginBottom: spacing.md, padding: 4 },
  avatarWrapper: { position: 'relative' },
  menuGlow: { marginVertical: 0 },
  sectionCard: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  sectionLabelSpaced: { marginTop: spacing.md },
  menuDivider: { height: 1, marginHorizontal: spacing.sm },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3 },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 16,
    padding: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: { fontSize: 24, fontWeight: '800' },
  email: { fontSize: 14, marginTop: 4 },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  planText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginLeft: 6 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    minHeight: 56,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
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
  logout: { marginTop: spacing.lg, marginBottom: spacing.xxl },
});