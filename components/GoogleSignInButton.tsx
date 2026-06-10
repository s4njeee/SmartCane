import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import GlowPressable from './ui/GlowPressable';
import GoogleSetupModal from './GoogleSetupModal';
import { useTheme } from '../context/ThemeContext';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { radius } from '../constants/theme';

type Props = {
  label?: string;
  onSuccess?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function GoogleSignInButton({
  label = 'Continue with Google',
  onSuccess,
  style,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { signIn, loading, showSetup, closeSetup, onSetupSaved } = useGoogleSignIn();

  const handlePress = async () => {
    const ok = await signIn();
    if (ok) onSuccess?.();
  };

  const handleSaved = async (clientId: string) => {
    const ok = await onSetupSaved(clientId);
    if (ok) onSuccess?.();
  };

  return (
    <>
      <GlowPressable
        onPress={handlePress}
        disabled={loading}
        style={[
          styles.button,
          { backgroundColor: colors.surface, borderColor: colors.border },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Image
              source={require('../assets/images/google.png')}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          </>
        )}
      </GlowPressable>

      <GoogleSetupModal
        visible={showSetup}
        onClose={closeSetup}
        onSaved={handleSaved}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 52,
  },
  icon: { width: 28, height: 28, marginRight: 10 },
  label: { fontSize: 16, fontWeight: '600' },
});
