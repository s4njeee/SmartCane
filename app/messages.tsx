import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
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
import { displayPlace } from '../utils/geoPlace';
import { colorId, cx, isWeb, ui, webClassStyle } from '../utils/ui';

function isEmergency(type: AlertItem['type'] | string) {
  return type === 'fall' || type === 'emergency';
}

function alertTitle(alert: AlertItem) {
  if (alert.type === 'fall') return 'Fall Detection';
  if (alert.type === 'emergency') {
    return alert.message?.toLowerCase().includes('stolen') ? 'Cane Stolen' : 'Emergency Request';
  }
  if (alert.type === 'obstacle') return 'Obstacle';
  if (alert.type === 'motion') return 'Motion';
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
  const [loading, setLoading] = useState(Platform.OS !== 'android');
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
        setError('Sign in to view alerts');
        return;
      }

      setLoading(Platform.OS !== 'android');
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
          setError(message.includes('permission') ? "Can't load alerts" : message);
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
      setError(err?.message || "Couldn't dismiss");
    } finally {
      setResolvingId(null);
    }
  };

  if (loading && Platform.OS !== 'android') {
    return (
      <AppShell active="messages">
        <ScreenLayout withNav>
          <View {...ui('alerts-loading', styles.loading)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text {...ui('alerts-loading-text', [styles.loadingText, { color: colors.textSecondary }])}>
              Loading…
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
  const emergencyHistory = emergencies.filter((a) => !a.active).slice(0, 8);
  const sensorHistory = sensors.filter((a) => !a.active).slice(0, 8);

  const renderActiveCard = (
    alert: AlertItem,
    tone: 'danger' | 'warning'
  ) => {
    const accent = tone === 'danger' ? colors.danger : colors.warning;
    return (
      <GlassCard
        key={alert.id}
        className={cx('alert-card', colorId(alert.id), tone === 'danger' ? 'is-danger' : 'is-warning')}
        style={[styles.alertCard, { borderColor: accent + '35' }]}
        elevated={false}
      >
        <View {...ui('alert-header', styles.alertHeader)}>
          <View {...ui('alert-title-row', styles.alertTitleRow)}>
            <View
              {...ui(
                cx('alert-icon-wrap', colorId(alert.id), tone === 'danger' ? 'is-danger' : 'is-warning'),
                [styles.alertIconWrap, { backgroundColor: accent + '15' }],
              )}
            >
              <Ionicons
                name={alertIcon(alert.type)}
                size={18}
                color={isWeb ? undefined : accent}
                style={
                  isWeb
                    ? webClassStyle(cx('alert-icon', colorId(alert.id), tone === 'danger' ? 'is-danger' : 'is-warning'))
                    : undefined
                }
              />
            </View>
            <Text
              {...ui(
                cx('alert-title', colorId(alert.id), tone === 'danger' ? 'is-danger' : 'is-warning'),
                [styles.alertTitle, { color: accent }],
              )}
            >
              {alertTitle(alert)}
            </Text>
          </View>
          <View
            {...ui(
              cx('alert-badge', colorId(alert.id), tone === 'danger' ? 'is-danger' : 'is-warning'),
              [styles.badge, { backgroundColor: accent }],
            )}
          >
            <Text {...ui('alert-badge-text', styles.badgeText)}>ACTIVE</Text>
          </View>
        </View>
        <Text {...ui(cx('alert-user', colorId(alert.id)), [styles.userName, { color: colors.text }])} numberOfLines={1}>
          {alert.username}
        </Text>
        <View {...ui('alert-meta-row', styles.metaRow)}>
          <Ionicons
            name="location-outline"
            size={14}
            color={isWeb ? undefined : colors.textMuted}
            style={isWeb ? webClassStyle(cx('alert-pin-glyph', colorId(alert.id))) : undefined}
          />
          <Text {...ui(cx('alert-meta', colorId(alert.id)), [styles.metaText, { color: colors.textMuted }])} numberOfLines={1}>
            {displayPlace(alert.location)}
          </Text>
        </View>
        <Text {...ui(cx('alert-time', colorId(alert.id)), [styles.timeText, { color: colors.textMuted }])}>
          {formatAlertTime(alert.timestamp)}
        </Text>
        <View {...ui('alert-actions', styles.actionRow)}>
          <AppButton
            title="Map"
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
    <GlassCard
      key={alert.id}
      elevated={false}
      className={cx('alert-history-card', colorId(alert.id))}
      style={styles.historyCard}
    >
      <View
        {...ui(
          cx('alert-history-icon', colorId(alert.id), isEmergency(alert.type) ? 'is-danger' : 'is-info'),
          [
            styles.historyIcon,
            {
              backgroundColor: isEmergency(alert.type)
                ? colors.danger + '12'
                : colors.primary + '12',
            },
          ],
        )}
      >
        <Ionicons
          name={alertIcon(alert.type)}
          size={16}
          color={isWeb ? undefined : isEmergency(alert.type) ? colors.danger : colors.primary}
          style={
            isWeb
              ? webClassStyle(
                  cx('alert-icon', colorId(alert.id), isEmergency(alert.type) ? 'is-danger' : 'is-info'),
                )
              : undefined
          }
        />
      </View>
      <View {...ui('alert-history-body', styles.historyBody)}>
        <Text {...ui(cx('alert-history-title', colorId(alert.id)), [styles.historyTitle, { color: colors.text }])}>
          {alertTitle(alert)}
        </Text>
        <Text {...ui(cx('alert-history-user', colorId(alert.id)), [styles.historyUser, { color: colors.textSecondary }])}>
          {alert.username}
        </Text>
      </View>
      <Text {...ui(cx('alert-time-ago', colorId(alert.id)), [styles.timeAgo, { color: colors.textMuted }])}>
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
              ? `${activeEmergencies.length} emergency`
              : activeSensors.length > 0
                ? `${activeSensors.length} sensor`
                : 'All clear'
          }
        />

        {error ? (
          <GlassCard elevated={false} className="alerts-error-card" style={[styles.errorCard, { borderColor: colors.danger + '40' }]}>
            <Text {...ui('text-error', [styles.errorText, { color: colors.danger }])}>{error}</Text>
          </GlassCard>
        ) : null}

        <View {...ui('alerts-stats', styles.statsRow)}>
          <GlassCard className="alerts-stat-card" style={styles.statCard} elevated={false}>
            <View {...ui('alerts-stat-icon is-danger', [styles.statIcon, { backgroundColor: colors.danger + '15' }])}>
              <Ionicons
                name="warning"
                size={16}
                color={isWeb ? undefined : colors.danger}
                style={isWeb ? webClassStyle('alert-icon is-stat-emergency') : undefined}
              />
            </View>
            <Text {...ui('alerts-stat-num is-danger', [styles.statNum, { color: colors.danger }])}>
              {activeEmergencies.length}
            </Text>
            <Text {...ui('alerts-stat-label', [styles.statLabel, { color: colors.textSecondary }])}>Emergency</Text>
          </GlassCard>
          <GlassCard className="alerts-stat-card" style={styles.statCard} elevated={false}>
            <View {...ui('alerts-stat-icon is-warning', [styles.statIcon, { backgroundColor: colors.warning + '15' }])}>
              <Ionicons
                name="radio-outline"
                size={16}
                color={isWeb ? undefined : colors.warning}
                style={isWeb ? webClassStyle('alert-icon is-stat-sensors') : undefined}
              />
            </View>
            <Text {...ui('alerts-stat-num is-warning', [styles.statNum, { color: colors.warning }])}>
              {activeSensors.length}
            </Text>
            <Text {...ui('alerts-stat-label', [styles.statLabel, { color: colors.textSecondary }])}>Sensors</Text>
          </GlassCard>
        </View>

        <SectionLabel className="section-label-row is-first" style={styles.firstSection}>Emergency</SectionLabel>

        {activeEmergencies.length > 0 ? (
          activeEmergencies.map((alert) => renderActiveCard(alert, 'danger'))
        ) : (
          <GlassCard elevated={false} className="alerts-empty-card is-emergency" style={styles.emptyCard}>
            <Text {...ui('alerts-empty-text is-emergency', [styles.emptyText, { color: colors.textMuted }])}>None</Text>
          </GlassCard>
        )}

        {emergencyHistory.length > 0 ? (
          <>
            <SectionLabel>History</SectionLabel>
            {emergencyHistory.map(renderHistoryCard)}
          </>
        ) : null}

        <SectionLabel>Sensors</SectionLabel>

        {activeSensors.length > 0 ? (
          activeSensors.map((alert) => renderActiveCard(alert, 'warning'))
        ) : (
          <GlassCard elevated={false} className="alerts-empty-card is-sensors" style={styles.emptyCard}>
            <Text {...ui('alerts-empty-text is-sensors', [styles.emptyText, { color: colors.textMuted }])}>None</Text>
          </GlassCard>
        )}

        {sensorHistory.length > 0 ? (
          <>
            <SectionLabel>History</SectionLabel>
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
  userName: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
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
  emptyCard: { alignItems: 'center', paddingVertical: spacing.md, marginBottom: 8 },
  emptyText: { textAlign: 'center', fontSize: 14, fontWeight: '600' },
});
