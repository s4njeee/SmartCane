import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  Keyboard,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import ScreenLayout from '../components/ui/ScreenLayout';
import GlassCard from '../components/ui/GlassCard';
import AppButton from '../components/ui/AppButton';
import AppInput from '../components/ui/AppInput';
import GoogleSignInButton from '../components/GoogleSignInButton';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors } = theme;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/home');
    } catch {
      Alert.alert('Login Failed', 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Enter Email', 'Please enter your email first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Password Reset', 'A reset link has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Reset Failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScreenLayout scroll contentStyle={styles.content}>
          <View style={styles.topRow}>
            <ThemeToggle />
          </View>

          <Image source={require('../assets/images/SmartGuide.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.text }]}>Sign in</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Access your SmartCane dashboard
          </Text>

          <GlassCard>
            <AppInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AppInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              secureToggle
              showSecure={showPassword}
              onToggleSecure={() => setShowPassword(!showPassword)}
              style={styles.passwordInput}
            />

            <Pressable onPress={handleForgotPassword} style={styles.forgotRow}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
            </Pressable>

            <AppButton title="Sign In" onPress={handleLogin} loading={loading} />

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.orText, { color: colors.textMuted }]}>or</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>

            <GoogleSignInButton
              label="Google"
              style={{ backgroundColor: colors.inputBg }}
              onSuccess={() => router.replace('/home')}
            />
          </GlassCard>

          <Pressable onPress={() => router.push('/signup')} style={styles.signupRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign up</Text>
            </Text>
          </Pressable>
        </ScreenLayout>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.md, paddingBottom: 48 },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm },
  logo: { width: 200, height: 100, alignSelf: 'center', marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: spacing.lg, marginTop: 4 },
  passwordInput: { marginBottom: 4 },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  forgotText: { fontSize: 14, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1 },
  orText: { marginHorizontal: 12, fontSize: 13 },
  signupRow: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  footerText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
