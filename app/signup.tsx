import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { createUserProfileOnSignup } from '../firebase/appData';
import ScreenLayout from '../components/ui/ScreenLayout';
import GlassCard from '../components/ui/GlassCard';
import AppButton from '../components/ui/AppButton';
import AppInput from '../components/ui/AppInput';
import GoogleSignInButton from '../components/ui/GoogleSignInButton';
import ThemeToggle from '../components/ui/ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { colors } = theme;
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !phoneNumber || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserProfileOnSignup(credential.user.uid, {
        displayName: fullName,
        email,
        phoneNumber,
      });
      Alert.alert('Success', `Welcome ${fullName}!`);
      router.replace('/home');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
    } finally {
      setLoading(false);
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
          <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Set up your SmartGuide profile
          </Text>

          <GlassCard>
            <AppInput label="Full name" value={fullName} onChangeText={setFullName} />
            <AppInput label="Phone number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
            <AppInput label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <AppInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              secureToggle
              showSecure={showPassword}
              onToggleSecure={() => setShowPassword(!showPassword)}
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

            <AppButton title="Sign Up" onPress={handleSignup} loading={loading} />

            <GoogleSignInButton
              label="Sign up with Google"
              style={{ marginTop: 16, backgroundColor: colors.inputBg }}
              onSuccess={() => router.replace('/home')}
            />
          </GlassCard>

          <Pressable onPress={() => router.replace('/login')} style={styles.loginRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Log in</Text>
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
  logo: { width: 180, height: 90, alignSelf: 'center', marginBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: spacing.lg, marginTop: 4 },
  loginRow: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  footerText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});