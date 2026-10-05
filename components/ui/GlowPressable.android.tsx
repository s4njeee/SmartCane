import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import { platformDesign } from "../../constants/platformDesign";
import { useTheme } from "../../context/ThemeContext";
import { pressRipple } from "../../utils/platformStyle";

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  disabled?: boolean;
  active?: boolean;
};

/** Android pressable — ripple, no glow. */
export default function GlowPressable({
  children,
  onPress,
  style,
  glowColor,
  disabled,
  active,
}: Props) {
  const { theme } = useTheme();
  const color = glowColor || theme.colors.primary;
  const d = platformDesign.pressable;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={disabled ? undefined : pressRipple(color + "22")}
      style={({ pressed }) => [
        {
          borderRadius: d.radius,
          overflow: "hidden",
          backgroundColor: active ? color + "14" : undefined,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
