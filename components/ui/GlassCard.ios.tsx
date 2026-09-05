import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { iosDesign } from '../../constants/platformDesign/ios';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
};

/** Simple iOS card — flat surface + border. */
export default function GlassCard({ children, style, elevated = true }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const d = iosDesign.card;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: d.radius,
          borderWidth: d.borderWidth,
          padding: d.padding,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: elevated ? 1 : 0 },
          shadowOpacity: elevated ? 0.06 : 0,
          shadowRadius: elevated ? 3 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
