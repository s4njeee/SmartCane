import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUserId, subscribeUserAlerts } from '../firebase/appData';
import AppShell from '../components/ui/AppShell';
import ScreenLayout from '../components/ui/ScreenLayout';
import GlassCard from '../components/ui/GlassCard';
import ScreenHeader from '../components/ui/ScreenHeader';
import AppButton from '../components/ui/AppButton';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../constants/theme';

export default function Messages() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors } = theme;
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeUserAlerts(userId, (items) => {
      setAlerts(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <AppShell active="messages">
        <ScreenLayout withNav>
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading alerts...</Text>
          </View>
        </ScreenLayout>
      </AppShell>
    );
  }

  const activeAlerts = alerts.filter((a) => a.active);
  const historyAlerts = alerts.filter((a) => !a.active);

  return (
    <AppShell active="messages">
    <ScreenLayout scroll withNav>
      <ScreenHeader title="Alerts" showBack={false} />

      <View style={[styles.statsRow]}>
        <GlassCard style={styles.statCard} elevated={false}>
          <Text style={[styles.statNum, { color: colors.danger }]}>{activeAlerts.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </GlassCard>
        <GlassCard style={styles.statCard} elevated={false}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{alerts.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </GlassCard>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Emergency Alerts</Text>

      {activeAlerts.length > 0 ? (
        activeAlerts.map((alert) => (
          <GlassCard
            key={alert.id}
            style={[styles.alertCard, { borderColor: colors.danger + '40' }]}
            elevated={false}
          >
            <View style={styles.alertHeader}>
              <View style={styles.alertTitleRow}>
                <Ionicons
                  name={alert.type === 'fall' ? 'warning' : 'alert-circle'}
                  size={22}
                  color={colors.danger}
                />
                <Text style={[styles.alertTitle, { color: colors.danger }]}>
                  {alert.type === 'fall'
                    ? 'Fall Detected'
                    : alert.type === 'obstacle'
                      ? 'Obstacle Detected'
                      : 'Emergency Request'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text style={styles.badgeText}>ACTIVE</Text>
              </View>
            </View>
            <Text style={[styles.userName, { color: colors.text }]}>{alert.username}</Text>
            <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>{alert.message}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{alert.location}</Text>
            </View>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {alert.timestamp
                ? new Date(alert.timestamp.seconds * 1000).toLocaleTimeString()
                : ''}
            </Text>
            <AppButton title="View Location" onPress={() => router.push('/home')} style={styles.alertBtn} />
          </GlassCard>
        ))
      ) : (
        <GlassCard elevated={false}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No active alerts right now.</Text>
        </GlassCard>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>Alert History</Text>

      {historyAlerts.length > 0 ? (
        historyAlerts.map((alert) => (
          <View
            key={alert.id}
            style={[styles.historyCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
          >
            <View>
              <Text style={[styles.historyTitle, { color: colors.text }]}>
                {alert.type === 'fall'
                  ? 'Fall Detected'
                  : alert.type === 'obstacle'
                    ? 'Obstacle Detected'
                    : 'Emergency Request'}
              </Text>
              <Text style={[styles.historyUser, { color: colors.textSecondary }]}>{alert.username}</Text>
            </View>
            <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
              {alert.timestamp
                ? new Date(alert.timestamp.seconds * 1000).toLocaleTimeString()
                : ''}
            </Text>
          </View>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No alert history yet.</Text>
      )}
    </ScreenLayout>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 },
  loadingText: { marginTop: 12, fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.lg },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  alertCard: { marginBottom: 14, borderWidth: 1 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertTitle: { fontSize: 17, fontWeight: '700' },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  userName: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  alertDesc: { lineHeight: 20, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { fontSize: 13 },
  timeText: { fontSize: 12, marginBottom: 14 },
  alertBtn: { marginTop: 4 },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 10,
  },
  historyTitle: { fontWeight: '700', fontSize: 15 },
  historyUser: { marginTop: 4, fontSize: 13 },
  timeAgo: { fontSize: 12 },
  emptyText: { textAlign: 'center', fontSize: 14, paddingVertical: 8 },
});