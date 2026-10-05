import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppShell from '../components/ui/AppShell';
import GlassCard from '../components/ui/GlassCard';
import ScreenHeader from '../components/ui/ScreenHeader';
import ScreenLayout from '../components/ui/ScreenLayout';
import SectionLabel from '../components/ui/SectionLabel';
import { radius, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import {
  ProblemReportItem,
  resolveProblemReport,
  subscribeProblemReports,
} from '../firebase/appData';
import { auth } from '../firebase/firebaseConfig';
import { cx, isWeb, ui, webClassStyle } from '../utils/ui';

function formatWhen(ms: number) {
  if (!ms) return 'Just now';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return 'Recently';
  }
}

export default function AdminReports() {
  const { theme } = useTheme();
  const { colors } = theme;
  const user = auth.currentUser;
  const [reports, setReports] = useState<ProblemReportItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeProblemReports(setReports);
  }, []);

  const openReports = useMemo(
    () => (reports ?? []).filter((report) => report.status === 'open'),
    [reports]
  );
  const resolvedReports = useMemo(
    () => (reports ?? []).filter((report) => report.status === 'resolved'),
    [reports]
  );

  const markResolved = (report: ProblemReportItem) => {
    if (!user) return;
    Alert.alert('Mark resolved?', report.subject, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolved',
        onPress: async () => {
          setBusyId(report.id);
          try {
            await resolveProblemReport(report.id, user.uid);
          } catch (error: any) {
            Alert.alert(
              'Update failed',
              error?.message ||
                'Make sure this account has role "admin" in Firestore.'
            );
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  return (
    <AppShell active="profile">
      <ScreenLayout scroll withNav>
        <ScreenHeader
          title="Admin Inbox"
          subtitle="Problem reports from users"
        />

        {reports == null ? (
          <View {...ui('admin-loading', styles.loading)}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : reports.length === 0 ? (
          <GlassCard elevated={false}>
            <Text {...ui('admin-empty-title', [styles.emptyTitle, { color: colors.text }])}>
              No reports yet
            </Text>
            <Text {...ui('admin-empty-body', [styles.emptyBody, { color: colors.textSecondary }])}>
              When a user sends Report Problem, it will show up here for the
              admin.
            </Text>
          </GlassCard>
        ) : (
          <>
            <SectionLabel>{`Open · ${openReports.length}`}</SectionLabel>
            {openReports.length === 0 ? (
              <Text {...ui('admin-empty-body', [styles.emptyBody, { color: colors.textMuted }])}>
                No open reports.
              </Text>
            ) : (
              openReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  busy={busyId === report.id}
                  onResolve={() => markResolved(report)}
                />
              ))
            )}

            {resolvedReports.length > 0 ? (
              <>
                <SectionLabel className="admin-resolved-label" style={styles.resolvedLabel}>
                  {`Resolved · ${resolvedReports.length}`}
                </SectionLabel>
                {resolvedReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScreenLayout>
    </AppShell>
  );
}

function ReportCard({
  report,
  busy,
  onResolve,
}: {
  report: ProblemReportItem;
  busy?: boolean;
  onResolve?: () => void;
}) {
  const { theme } = useTheme();
  const { colors } = theme;
  const open = report.status === 'open';
  const from =
    report.displayName || report.email || report.userId.slice(0, 8) || 'User';

  return (
    <GlassCard elevated={false} className="admin-card" style={styles.card}>
      <View {...ui('admin-card-top', styles.cardTop)}>
        <View
          {...ui(cx('admin-dot', open ? 'is-open' : 'is-done'), [
            styles.statusDot,
            { backgroundColor: open ? colors.danger : colors.success },
          ])}
        />
        <View {...ui('admin-copy', styles.cardCopy)}>
          <Text {...ui('admin-subject', [styles.subject, { color: colors.text }])}>
            {report.subject}
          </Text>
          <Text {...ui('admin-meta', [styles.meta, { color: colors.textMuted }])}>
            {from} · {formatWhen(report.createdAtMs)}
          </Text>
        </View>
        <Text
          {...ui(cx('admin-badge', open ? 'is-open' : 'is-done'), [
            styles.badge,
            { color: open ? colors.danger : colors.success },
          ])}
        >
          {open ? 'Open' : 'Done'}
        </Text>
      </View>

      <Text {...ui('admin-message', [styles.message, { color: colors.textSecondary }])}>
        {report.message}
      </Text>

      {report.email ? (
        <Text {...ui('admin-email', [styles.email, { color: colors.textMuted }])}>
          {report.email}
        </Text>
      ) : null}

      {open && onResolve ? (
        <Pressable
          onPress={onResolve}
          disabled={busy}
          {...(isWeb
            ? ui(cx('admin-resolve', busy && 'is-busy'), [
                styles.resolveBtn,
                {
                  backgroundColor: colors.primary + (busy ? '22' : '14'),
                  borderColor: colors.primary + '33',
                  opacity: busy ? 0.7 : 1,
                },
              ])
            : {
                style: ({ pressed }: { pressed: boolean }) => [
                  styles.resolveBtn,
                  {
                    backgroundColor: colors.primary + (pressed || busy ? '22' : '14'),
                    borderColor: colors.primary + '33',
                    opacity: busy ? 0.7 : 1,
                  },
                ],
              })}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={isWeb ? undefined : colors.primary}
                style={isWeb ? webClassStyle('admin-glyph') : undefined}
              />
              <Text {...ui('admin-resolve-text', [styles.resolveText, { color: colors.primary }])}>
                Mark resolved
              </Text>
            </>
          )}
        </Pressable>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyBody: { fontSize: 13, lineHeight: 19 },
  card: { marginBottom: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  cardCopy: { flex: 1 },
  subject: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 3, fontWeight: '500' },
  badge: { fontSize: 12, fontWeight: '800' },
  message: { fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
  email: { fontSize: 12, marginTop: 8, fontWeight: '500' },
  resolveBtn: {
    marginTop: spacing.md,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resolveText: { fontSize: 14, fontWeight: '700' },
  resolvedLabel: { marginTop: spacing.md },
});
