import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebase/firebaseConfig';
import { createUserProfileOnSignup } from '../../firebase/appData';
import ScreenLayout from './ScreenLayout';
import GlassCard from './GlassCard';
import AppButton from './AppButton';
import AppInput from './AppInput';
import BrandLogo from './BrandLogo';
import GoogleSignInButton from './GoogleSignInButton';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';
import { isWeb, ui, webClassStyle } from '../../utils/ui';

export type AuthPanel = 'welcome' | 'login' | 'signup';

type Props = {
  initialPanel?: AuthPanel;
};

const PANEL_ORDER: AuthPanel[] = ['welcome', 'login', 'signup'];
const SWITCH_MS = 340;

/** Single-screen auth: panel crossfade in place — logo keeps animating, no route refresh. */
export default function AuthFlow({ initialPanel = 'welcome' }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [panel, setPanel] = useState<AuthPanel>(initialPanel);
  const panelRef = useRef<AuthPanel>(initialPanel);
  const busyRef = useRef(false);

  const opacities = useMemo(() => {
    const map = {} as Record<AuthPanel, Animated.Value>;
    for (const name of PANEL_ORDER) {
      map[name] = new Animated.Value(name === initialPanel ? 1 : 0);
    }
    return map;
  }, [initialPanel]);

  const shifts = useMemo(() => {
    const map = {} as Record<AuthPanel, Animated.Value>;
    for (const name of PANEL_ORDER) {
      map[name] = new Animated.Value(name === initialPanel ? 0 : 16);
    }
    return map;
  }, [initialPanel]);

  const goTo = useCallback(
    (next: AuthPanel) => {
      const prev = panelRef.current;
      if (next === prev || busyRef.current) return;
      busyRef.current = true;
      panelRef.current = next;
      setPanel(next);

      opacities[next].setValue(0);
      shifts[next].setValue(14);

      Animated.parallel([
        Animated.timing(opacities[prev], {
          toValue: 0,
          duration: SWITCH_MS,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(shifts[prev], {
          toValue: -10,
          duration: SWITCH_MS,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(opacities[next], {
          toValue: 1,
          duration: SWITCH_MS,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(shifts[next], {
          toValue: 0,
          duration: SWITCH_MS,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]).start(() => {
        shifts[prev].setValue(16);
        busyRef.current = false;
      });
    },
    [opacities, shifts],
  );

  const body = (
    <ScreenLayout scroll contentClassName="auth-flow-content" contentStyle={styles.content}>
      <View {...ui('auth-top-row', styles.topRow)}>
        {panel !== 'welcome' ? (
          <Pressable
            onPress={() => goTo('welcome')}
            accessibilityRole="button"
            accessibilityLabel="Back"
            {...ui('auth-back', styles.backBtn)}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={isWeb ? undefined : colors.text}
              style={isWeb ? webClassStyle('auth-back-icon') : undefined}
            />
          </Pressable>
        ) : (
          <View />
        )}
        <ThemeToggle compact />
      </View>

      <BrandLogo variant="auth" />

      <View {...ui('auth-panel-stack', styles.stack)}>
        <Animated.View
          pointerEvents={panel === 'welcome' ? 'auto' : 'none'}
          style={[
            styles.layer,
            panel === 'welcome' ? styles.layerActive : styles.layerIdle,
            { opacity: opacities.welcome, transform: [{ translateY: shifts.welcome }] },
          ]}
        >
          <WelcomePanel colors={colors} onLogin={() => goTo('login')} onSignup={() => goTo('signup')} />
        </Animated.View>

        <Animated.View
          pointerEvents={panel === 'login' ? 'auto' : 'none'}
          style={[
            styles.layer,
            panel === 'login' ? styles.layerActive : styles.layerIdle,
            { opacity: opacities.login, transform: [{ translateY: shifts.login }] },
          ]}
        >
          <LoginPanel colors={colors} onSignup={() => goTo('signup')} />
        </Animated.View>

        <Animated.View
          pointerEvents={panel === 'signup' ? 'auto' : 'none'}
          style={[
            styles.layer,
            panel === 'signup' ? styles.layerActive : styles.layerIdle,
            { opacity: opacities.signup, transform: [{ translateY: shifts.signup }] },
          ]}
        >
          <SignupPanel colors={colors} onLogin={() => goTo('login')} />
        </Animated.View>
      </View>
    </ScreenLayout>
  );

  if (Platform.OS === 'android') {
    return <View {...ui('flex-1', styles.flex)}>{body}</View>;
  }

  return (
    <KeyboardAvoidingView {...ui('flex-1', styles.flex)} behavior="padding">
      {body}
    </KeyboardAvoidingView>
  );
}

function WelcomePanel({
  colors,
  onLogin,
  onSignup,
}: {
  colors: { text: string; textSecondary: string; textMuted: string; border: string; primary: string };
  onLogin: () => void;
  onSignup: () => void;
}) {
  const router = useRouter();

  return (
    <View {...ui('welcome-hero', styles.hero)}>
      <Text {...ui('text-title is-welcome', [styles.welcomeTitle, { color: colors.text }])}>
        SmartGuide
      </Text>
      <Text
        {...ui('text-subtitle is-welcome', [styles.welcomeSubtitle, { color: colors.textSecondary }])}
      >
        Track canes, routes, and alerts in one place.
      </Text>

      <GlassCard
        className="welcome-card"
        style={isWeb ? undefined : styles.card}
        elevated={false}
      >
        <AppButton title="Log in" onPress={onLogin} />
        <AppButton
          title="Create account"
          variant="secondary"
          className="btn-gap"
          onPress={onSignup}
          style={isWeb ? undefined : styles.gap}
        />
        <View {...ui('divider-row', styles.dividerRow)}>
          <View {...ui('divider', [styles.divider, { backgroundColor: colors.border }])} />
          <Text {...ui('or-text is-welcome', [styles.orText, { color: colors.textMuted }])}>or</Text>
          <View {...ui('divider', [styles.divider, { backgroundColor: colors.border }])} />
        </View>
        <GoogleSignInButton onSuccess={() => router.replace('/home')} />
      </GlassCard>
    </View>
  );
}

function LoginPanel({
  colors,
  onSignup,
}: {
  colors: { text: string; textSecondary: string; textMuted: string; border: string; primary: string };
  onSignup: () => void;
}) {
  const router = useRouter();
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
    <View>
      <Text {...ui('text-title-lg is-login', [styles.formTitle, { color: colors.text }])}>
        Sign in
      </Text>
      <Text {...ui('auth-subtitle is-login', [styles.formSubtitle, { color: colors.textSecondary }])}>
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

        <Pressable onPress={handleForgotPassword} {...ui('forgot-row', styles.forgotRow)}>
          <Text {...ui('forgot-text', [styles.forgotText, { color: colors.primary }])}>
            Forgot password?
          </Text>
        </Pressable>

        <AppButton title="Sign In" onPress={handleLogin} loading={loading} />

        <View {...ui('divider-row is-auth', styles.dividerRowLg)}>
          <View {...ui('divider is-thick', [styles.dividerThick, { backgroundColor: colors.border }])} />
          <Text {...ui('or-text is-login', [styles.orText, { color: colors.textMuted }])}>or</Text>
          <View {...ui('divider is-thick', [styles.dividerThick, { backgroundColor: colors.border }])} />
        </View>

        <GoogleSignInButton
          label="Continue with Google"
          onSuccess={() => router.replace('/home')}
        />
      </GlassCard>

      <Pressable onPress={onSignup} {...ui('auth-footer-row', styles.footerRow)}>
        <Text {...ui('auth-footer-text', [styles.footerText, { color: colors.textSecondary }])}>
          Don't have an account?{' '}
          <Text {...ui('auth-footer-link', { color: colors.primary, fontWeight: '700' })}>Sign up</Text>
        </Text>
      </Pressable>
    </View>
  );
}

function SignupPanel({
  colors,
  onLogin,
}: {
  colors: { text: string; textSecondary: string; textMuted: string; border: string; primary: string };
  onLogin: () => void;
}) {
  const router = useRouter();
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
    <View>
      <Text {...ui('text-title-lg is-signup', [styles.formTitle, { color: colors.text }])}>
        Create account
      </Text>
      <Text {...ui('auth-subtitle is-signup', [styles.formSubtitle, { color: colors.textSecondary }])}>
        Set up your SmartGuide profile
      </Text>

      <GlassCard>
        <AppInput label="Full name" value={fullName} onChangeText={setFullName} />
        <AppInput
          label="Phone number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
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

        <View {...ui('divider-row is-auth', styles.dividerRowLg)}>
          <View {...ui('divider is-thick', [styles.dividerThick, { backgroundColor: colors.border }])} />
          <Text {...ui('or-text is-signup', [styles.orText, { color: colors.textMuted }])}>or</Text>
          <View {...ui('divider is-thick', [styles.dividerThick, { backgroundColor: colors.border }])} />
        </View>

        <GoogleSignInButton
          label="Continue with Google"
          onSuccess={() => router.replace('/home')}
        />
      </GlassCard>

      <Pressable onPress={onLogin} {...ui('auth-footer-row', styles.footerRow)}>
        <Text {...ui('auth-footer-text', [styles.footerText, { color: colors.textSecondary }])}>
          Already have an account?{' '}
          <Text {...ui('auth-footer-link', { color: colors.primary, fontWeight: '700' })}>Log in</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.md, paddingBottom: 48 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    minHeight: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    width: '100%',
    position: 'relative',
  },
  layer: {
    width: '100%',
  },
  layerActive: {
    position: 'relative',
    zIndex: 2,
  },
  layerIdle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1,
  },
  hero: { alignItems: 'stretch', marginBottom: spacing.lg, width: '100%' },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    alignSelf: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
  },
  card: { marginTop: spacing.sm, width: '100%' },
  gap: { marginTop: 10 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerRowLg: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerThick: { flex: 1, height: 1 },
  orText: { marginHorizontal: 12, fontSize: 13 },
  formTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  formSubtitle: { fontSize: 15, textAlign: 'center', marginBottom: spacing.lg, marginTop: 4 },
  passwordInput: { marginBottom: 4 },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 12,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  forgotText: { fontSize: 14, fontWeight: '600' },
  footerRow: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    alignSelf: 'center',
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  footerText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
