import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { platformDesign } from '../../constants/platformDesign';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  fullWidth?: boolean;
};

/** Simple flat button — ripple on Android, no glow/sheen. */
export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading,
  icon,
  style,
  fullWidth = true,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const btn = platformDesign.button;

  const variantStyles = {
    primary: {
      bg: colors.primary,
      text: '#FFFFFF',
      border: colors.primary,
    },
    secondary: {
      bg: colors.cardAlt,
      text: colors.primary,
      border: colors.border,
    },
    ghost: {
      bg: 'transparent',
      text: colors.textSecondary,
      border: 'transparent',
    },
    danger: {
      bg: colors.danger,
      text: '#FFFFFF',
      border: colors.danger,
    },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      android_ripple={
        platformDesign.pressable.useRipple
          ? { color: '#ffffff33' }
          : undefined
      }
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: variantStyles.bg,
          borderColor: variantStyles.border,
          borderRadius: btn.radius,
          elevation: btn.elevation,
          opacity: loading ? 0.7 : pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={variantStyles.text}
              style={styles.icon}
            />
          ) : null}
          <Text style={[styles.text, { color: variantStyles.text }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    overflow: 'hidden',
  },
  fullWidth: { width: '100%' },
  text: { fontSize: 15, fontWeight: '700' },
  icon: { marginRight: 8 },
});
