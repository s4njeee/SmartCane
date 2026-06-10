import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { updatePassword } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import AppShell from '../components/AppShell';
import ScreenLayout from '../components/ui/ScreenLayout';
import GlassCard from '../components/ui/GlassCard';
import ScreenHeader from '../components/ui/ScreenHeader';
import AppInput from '../components/ui/AppInput';
import AppButton from '../components/ui/AppButton';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../constants/theme';

export default function ChangePassword() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors } = theme;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'No user logged in.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(user, newPassword);
      Alert.alert('Success', 'Password updated successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell active="profile">
    <ScreenLayout scroll withNav>
      <ScreenHeader title="Change Password" />

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Choose a strong password with at least 6 characters.
      </Text>

      <GlassCard>
        <AppInput
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNew}
          secureToggle
          showSecure={showNew}
          onToggleSecure={() => setShowNew(!showNew)}
        />
        <AppInput
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          secureToggle
          showSecure={showConfirm}
          onToggleSecure={() => setShowConfirm(!showConfirm)}
        />
      </GlassCard>

      <AppButton title="Update Password" onPress={handleChangePassword} loading={loading} style={styles.btn} />
    </ScreenLayout>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  btn: { marginTop: spacing.lg, marginBottom: spacing.xxl },
});
