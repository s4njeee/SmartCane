import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  withNav?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

export default function ScreenLayout({
  children,
  scroll = false,
  padded = true,
  withNav = false,
  style,
  contentStyle,
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const navPadding = withNav ? styles.navPadding : undefined;

  const content = (
    <View style={[padded && styles.padded, navPadding, contentStyle]}>{children}</View>
  );

  return (
    <LinearGradient
      colors={[...colors.backgroundGradient]}
      style={[styles.flex, style]}
    >
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollGrow, withNav && styles.navPadding]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[padded && styles.padded, contentStyle]}>{children}</View>
          </ScrollView>
        ) : (
          content
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: 24, paddingBottom: 24 },
  navPadding: { paddingBottom: 110 },
  scrollGrow: { flexGrow: 1 },
});
