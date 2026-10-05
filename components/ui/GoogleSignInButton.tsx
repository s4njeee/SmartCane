import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import GlowPressable from './GlowPressable';
import GoogleBrandIcon from './GoogleBrandIcon';
import GoogleSetupModal from './GoogleSetupModal';
import { useTheme } from '../../context/ThemeContext';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';
import { platformDesign } from '../../constants/platformDesign';
import { elevationStyle } from '../../utils/platformStyle';
import { cx, isWeb, ui } from '../../utils/ui';

type Props = {
  label?: string;
  onSuccess?: () => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

export default function GoogleSignInButton({
  label = 'Continue with Google',
  onSuccess,
  style,
  className,
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
        className={cx('btn-google', loading && 'is-loading', className)}
        style={
          isWeb
            ? style
            : [
                styles.button,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: platformDesign.button.radius,
                  ...elevationStyle(platformDesign.button.elevation),
                },
                style,
              ]
        }
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <GoogleBrandIcon />
            <Text {...ui('btn-google-label', [styles.label, { color: colors.text }])}>
              {label}
            </Text>
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
    borderWidth: 1,
    minHeight: 52,
  },
  label: { fontSize: 16, fontWeight: '600' },
});
