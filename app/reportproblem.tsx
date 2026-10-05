import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AppButton from '../components/ui/AppButton';
import AppInput from '../components/ui/AppInput';
import AppShell from '../components/ui/AppShell';
import GlassCard from '../components/ui/GlassCard';
import ScreenHeader from '../components/ui/ScreenHeader';
import ScreenLayout from '../components/ui/ScreenLayout';
import { spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { submitProblemReport } from '../firebase/appData';
import { auth } from '../firebase/firebaseConfig';
import { ui } from '../utils/ui';

export default function ReportProblem() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors } = theme;
  const user = auth.currentUser;

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    subject?: string;
    message?: string;
  }>({});

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to report a problem.');
      return;
    }

    const nextErrors: { subject?: string; message?: string } = {};
    if (!subject.trim()) nextErrors.subject = 'Enter a short subject.';
    if (!message.trim()) nextErrors.message = 'Describe the problem.';
    else if (message.trim().length < 10) {
      nextErrors.message = 'Please add a bit more detail (10+ characters).';
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await submitProblemReport(user.uid, {
        subject,
        message,
        email: user.email,
        displayName: user.displayName,
      });
      Alert.alert(
        'Sent to admin',
        'Your report was delivered to SmartGuide Admin (Reports).',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      setSubject('');
      setMessage('');
    } catch (error: any) {
      const denied =
        error?.code === 'permission-denied' ||
        String(error?.message ?? '').toLowerCase().includes('permission');
      Alert.alert(
        'Could not send',
        denied
          ? 'Firestore blocked this report. Publish rules from scripts/firestore-rules.txt, then try again.'
          : error?.message || 'Could not send the report. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell active="profile">
      <ScreenLayout scroll withNav>
        <ScreenHeader title="Report Problem" />

        <Text {...ui('form-hint is-report', [styles.hint, { color: colors.textSecondary }])}>
          Describe the issue with the app, cane, or eyeglass. Your report is sent
          to the SmartGuide Admin console for review.
        </Text>

        <GlassCard>
          <AppInput
            label="Subject"
            value={subject}
            error={fieldErrors.subject}
            onChangeText={(text) => {
              setSubject(text);
              if (fieldErrors.subject) {
                setFieldErrors((prev) => ({ ...prev, subject: undefined }));
              }
            }}
            maxLength={80}
          />
          <AppInput
            label="What went wrong?"
            value={message}
            error={fieldErrors.message}
            onChangeText={(text) => {
              setMessage(text);
              if (fieldErrors.message) {
                setFieldErrors((prev) => ({ ...prev, message: undefined }));
              }
            }}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1000}
          />
        </GlassCard>

        <View {...ui('report-meta', styles.meta)}>
          <Text {...ui('report-meta-text', [styles.metaText, { color: colors.textMuted }])}>
            Sent as {user?.email || user?.displayName || 'signed-in user'}
          </Text>
        </View>

        <AppButton
          title="Send to Admin"
          onPress={handleSubmit}
          loading={loading}
          className="form-save"
          style={styles.btn}
        />
      </ScreenLayout>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  meta: { marginTop: spacing.md },
  metaText: { fontSize: 12, fontWeight: '500' },
  btn: { marginTop: spacing.lg, marginBottom: spacing.xxl },
});
