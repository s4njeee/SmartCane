import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { platformDesign } from '../../constants/platformDesign';
import { elevationStyle } from '../../utils/platformStyle';
import { cx, ui } from '../../utils/ui';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  elevated?: boolean;
};

/** Simple card — border + light shadow on both Android and iOS. */
export default function GlassCard({ children, style, className, elevated = true }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const d = platformDesign.card;

  return (
    <View
      {...ui(
        cx('card', !elevated && 'card-flat', className),
        [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: d.radius,
            borderWidth: d.borderWidth,
            padding: d.padding,
            ...elevationStyle(elevated ? 2 : 0, colors.shadow),
          },
          style,
        ],
      )}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
});
