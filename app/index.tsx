import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenLayout from '../components/ui/ScreenLayout';
import GlassCard from '../components/ui/GlassCard';
import AppButton from '../components/ui/AppButton';
import GoogleSignInButton from '../components/GoogleSignInButton';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../constants/theme';

export default function ChooseScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <ScreenLayout contentStyle={styles.content}>
      <View style={styles.topRow}>
        <ThemeToggle />
      </View>
      <View style={styles.hero}>
        <View style={[styles.logoGlow, { backgroundColor: colors.primary + '18' }]} />
        <Image
          source={require('../assets/images/SmartGuide.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.badge, { color: colors.primary, backgroundColor: colors.glass }]}>
          Smart Mobility Platform
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>Welcome to SmartGuide</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Monitor canes, track routes, and respond to alerts — all in one place.
        </Text>
      </View>

      <GlassCard style={styles.card}>
        <AppButton title="Log in" onPress={() => router.push('/login')} />
        <AppButton
          title="Create account"
          variant="secondary"
          onPress={() => router.push('/signup')}
          style={styles.gap}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.orText, { color: colors.textMuted }]}>or continue with</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </View>

        <GoogleSignInButton onSuccess={() => router.replace('/home')} />
      </GlassCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', paddingTop: spacing.lg },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  logoGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: 20,
  },
  logo: { width: 280, height: 160, marginBottom: spacing.md },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  card: { marginTop: spacing.sm },
  gap: { marginTop: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1 },
  orText: { marginHorizontal: 12, fontSize: 13, fontWeight: '500' },
});
