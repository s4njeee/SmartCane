import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { androidDesign } from '../../constants/platformDesign/android';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
};

/** Simple Android card — flat surface + light border. */
export default function GlassCard({ children, style, elevated = true }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const d = androidDesign.card;

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
          elevation: elevated ? d.elevationElevated : d.elevationFlat,
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
