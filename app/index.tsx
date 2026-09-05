import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenLayout from '../components/ui/ScreenLayout';
import GlassCard from '../components/ui/GlassCard';
import AppButton from '../components/ui/AppButton';
import GoogleSignInButton from '../components/ui/GoogleSignInButton';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../constants/theme';

export default function ChooseScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <ScreenLayout contentStyle={styles.content}>
      <View style={styles.topRow}>
        <ThemeToggle compact />
      </View>

      <View style={styles.hero}>
        <Image
          source={require('../assets/images/SmartGuide.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.text }]}>SmartGuide</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Track canes, routes, and alerts in one place.
        </Text>
      </View>

      <GlassCard style={styles.card} elevated={false}>
        <AppButton title="Log in" onPress={() => router.push('/login')} />
        <AppButton
          title="Create account"
          variant="secondary"
          onPress={() => router.push('/signup')}
          style={styles.gap}
        />
        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.orText, { color: colors.textMuted }]}>or</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </View>
        <GoogleSignInButton onSuccess={() => router.replace('/home')} />
      </GlassCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', paddingTop: spacing.md },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 220, height: 120, marginBottom: spacing.md },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  card: { marginTop: spacing.sm },
  gap: { marginTop: 10 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { marginHorizontal: 12, fontSize: 13 },
});
