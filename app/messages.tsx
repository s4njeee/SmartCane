import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import {
  formatAlertTime,
  resolveAlert,
  subscribeUserAlerts,
  type AlertItem,
} from '../firebase/appData';
import { auth } from '../firebase/firebaseConfig';
import AppShell from '../components/ui/AppShell';
import ScreenLayout from '../components/ui/ScreenLayout';
import GlassCard from '../components/ui/GlassCard';
import ScreenHeader from '../components/ui/ScreenHeader';
import SectionLabel from '../components/ui/SectionLabel';
import AppButton from '../components/ui/AppButton';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../constants/theme';

function isEmergency(type: AlertItem['type'] | string) {
  return type === 'fall' || type === 'emergency';
}

function alertTitle(type: AlertItem['type'] | string) {
  if (type === 'fall') return 'Fall Detection Emergency';
  if (type === 'emergency') return 'Emergency Request';
  if (type === 'obstacle') return 'Ultrasonic: Obstacle Detected';
  if (type === 'motion') return 'PIR: Nearby Motion Detected';
  return 'Alert';
}

function alertIcon(type: AlertItem['type'] | string): keyof typeof Ionicons.glyphMap {
  if (type === 'fall') return 'warning';
  if (type === 'emergency') return 'alert-circle';
  if (type === 'obstacle') return 'radio-outline';
  if (type === 'motion') return 'walk-outline';
  return 'notifications-outline';
}

export default function Messages() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors } = theme;
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeAlerts: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeAlerts?.();
      unsubscribeAlerts = undefined;

      if (!user) {
        setAlerts([]);
        setLoading(false);
        setError('Sign in to view alerts.');
        return;
      }

      setLoading(true);
      setError(null);
      unsubscribeAlerts = subscribeUserAlerts(
        user.uid,
        (items) => {
          setAlerts(items);
          setLoading(false);
          setError(null);
        },
        (message) => {
          setLoading(false);
          setError(
            message.includes('permission')
              ? 'Permission denied. Publish Firestore rules from scripts/firestore-rules.txt.'
              : message
          );
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeAlerts?.();
    };
  }, []);

  const dismissAlert = async (alertId: string) => {
    if (resolvingId) return;
    setResolvingId(alertId);
    try {
      await resolveAlert(alertId);
    } catch (err: any) {
      setError(err?.message || 'Could not dismiss alert.');
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <AppShell active="messages">
        <ScreenLayout withNav>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading alerts...
            </Text>
          </View>
        </ScreenLayout>
      </AppShell>
    );
  }

  const emergencies = alerts.filter((a) => isEmergency(a.type));
  const sensors = alerts.filter((a) => !isEmergency(a.type));
  const activeEmergencies = emergencies.filter((a) => a.active);
  const activeSensors = sensors.filter((a) => a.active);
  const emergencyHistory = emergencies.filter((a) => !a.active);
  const sensorHistory = sensors.filter((a) => !a.active);

  const renderActiveCard = (
    alert: AlertItem,
    tone: 'danger' | 'warning'
  ) => {
    const accent = tone === 'danger' ? colors.danger : colors.warning;
    return (
      <GlassCard
        key={alert.id}
        style={[styles.alertCard, { borderColor: accent + '35' }]}
        elevated={false}
      >
        <View style={styles.alertHeader}>
          <View style={styles.alertTitleRow}>
            <View style={[styles.alertIconWrap, { backgroundColor: accent + '15' }]}>
              <Ionicons name={alertIcon(alert.type)} size={18} color={accent} />
            </View>
            <Text style={[styles.alertTitle, { color: accent }]}>
              {alertTitle(alert.type)}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: accent }]}>
            <Text style={styles.badgeText}>ACTIVE</Text>
          </View>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>{alert.username}</Text>
        <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
          {alert.message}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {alert.location || 'Unknown location'}
          </Text>
        </View>
        <Text style={[styles.timeText, { color: colors.textMuted }]}>
          {formatAlertTime(alert.timestamp)}
        </Text>
        <View style={styles.actionRow}>
          <AppButton
            title="View Location"
            onPress={() => router.push('/home')}
            style={styles.actionBtn}
            fullWidth={false}
          />
          <AppButton
            title="Dismiss"
            variant="secondary"
            loading={resolvingId === alert.id}
            onPress={() => dismissAlert(alert.id)}
            style={styles.actionBtn}
            fullWidth={false}
          />
        </View>
      </GlassCard>
    );
  };

  const renderHistoryCard = (alert: AlertItem) => (
    <GlassCard key={alert.id} elevated={false} style={styles.historyCard}>
      <View
        style={[
          styles.historyIcon,
          {
            backgroundColor: isEmergency(alert.type)
              ? colors.danger + '12'
              : colors.primary + '12',
          },
        ]}
      >
        <Ionicons
          name={alertIcon(alert.type)}
          size={16}
          color={isEmergency(alert.type) ? colors.danger : colors.primary}
        />
      </View>
      <View style={styles.historyBody}>
        <Text style={[styles.historyTitle, { color: colors.text }]}>
          {alertTitle(alert.type)}
        </Text>
        <Text style={[styles.historyUser, { color: colors.textSecondary }]}>
          {alert.username}
        </Text>
      </View>
      <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
        {formatAlertTime(alert.timestamp)}
      </Text>
    </GlassCard>
  );

  return (
    <AppShell active="messages">
      <ScreenLayout scroll withNav>
        <ScreenHeader
          title="Alerts"
          showBack={false}
          subtitle={
            activeEmergencies.length > 0
              ? `${activeEmergencies.length} emergency active`
              : activeSensors.length > 0
                ? `${activeSensors.length} sensor alert active`
                : 'All clear for now'
          }
        />

        {error ? (
          <GlassCard elevated={false} style={[styles.errorCard, { borderColor: colors.danger + '40' }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </GlassCard>
        ) : null}

        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard} elevated={false}>
            <View style={[styles.statIcon, { backgroundColor: colors.danger + '15' }]}>
              <Ionicons name="warning" size={16} color={colors.danger} />
            </View>
            <Text style={[styles.statNum, { color: colors.danger }]}>
              {activeEmergencies.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Emergency</Text>
          </GlassCard>
          <GlassCard style={styles.statCard} elevated={false}>
            <View style={[styles.statIcon, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons name="radio-outline" size={16} color={colors.warning} />
            </View>
            <Text style={[styles.statNum, { color: colors.warning }]}>
              {activeSensors.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sensors</Text>
          </GlassCard>
        </View>

        <SectionLabel style={styles.firstSection}>Emergency Alerts</SectionLabel>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
          Fall detection and SOS (cane button pressed twice)
        </Text>

        {activeEmergencies.length > 0 ? (
          activeEmergencies.map((alert) => renderActiveCard(alert, 'danger'))
        ) : (
          <GlassCard elevated={false} style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No emergencies</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Fall detection and SOS requests will show here, with a phone notification.
            </Text>
          </GlassCard>
        )}

        {emergencyHistory.length > 0 ? (
          <>
            <SectionLabel>Emergency History</SectionLabel>
            {emergencyHistory.map(renderHistoryCard)}
          </>
        ) : null}

        <SectionLabel>Sensor Alerts</SectionLabel>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
          Ultrasonic obstacle and PIR motion
        </Text>

        {activeSensors.length > 0 ? (
          activeSensors.map((alert) => renderActiveCard(alert, 'warning'))
        ) : (
          <GlassCard elevated={false} style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No active sensor alerts.
            </Text>
          </GlassCard>
        )}

        {sensorHistory.length > 0 ? (
          <>
            <SectionLabel>Sensor History</SectionLabel>
            {sensorHistory.map(renderHistoryCard)}
          </>
        ) : null}
      </ScreenLayout>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  loadingText: { marginTop: 12, fontSize: 15, fontWeight: '500' },
  errorCard: { marginBottom: spacing.md, borderWidth: 1 },
  errorText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.sm },
  firstSection: { marginTop: spacing.sm },
  sectionHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNum: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 13, marginTop: 4, fontWeight: '600' },
  alertCard: { marginBottom: 12, borderWidth: 1 },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  alertIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  userName: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  alertDesc: { lineHeight: 20, marginBottom: 10, fontSize: 14 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: { fontSize: 13, flex: 1 },
  timeText: { fontSize: 12, marginBottom: 14, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1 },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
    gap: 12,
    minHeight: 64,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: { flex: 1 },
  historyTitle: { fontWeight: '700', fontSize: 15 },
  historyUser: { marginTop: 3, fontSize: 13 },
  timeAgo: { fontSize: 12, fontWeight: '500' },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.lg, marginBottom: 8 },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 20, paddingHorizontal: 8 },
});
