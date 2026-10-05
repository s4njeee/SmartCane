import React from 'react';
import { Platform, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { platformDesign } from '../../constants/platformDesign';
import { pressRipple } from '../../utils/platformStyle';
import { cx, isWeb, webClassStyle } from '../../utils/ui';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
  glowColor?: string;
  disabled?: boolean;
  active?: boolean;
};

/** Simple pressable — Android ripple, iOS opacity. */
export default function GlowPressable({
  children,
  onPress,
  style,
  className,
  glowColor,
  disabled,
  active,
}: Props) {
  const { theme } = useTheme();
  const color = glowColor || theme.colors.primary;
  const d = platformDesign.pressable;
  const webNames = cx('pressable', active && 'is-active', disabled && 'is-disabled', className);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={disabled ? undefined : pressRipple(color + '22')}
      className={isWeb ? webNames : undefined}
      style={
        isWeb
          ? // Web look comes from styles/index.css via className — do not inline theme colors.
            webClassStyle(webNames)
          : ({ pressed }) => [
              {
                borderRadius: d.radius,
                overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
                backgroundColor: active ? color + '14' : undefined,
                opacity: pressed ? 0.85 : 1,
              },
              style,
            ]
      }
    >
      {children}
    </Pressable>
  );
}
