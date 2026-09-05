import React from 'react';
import { Keyboard, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { sheetScrollBottom } from '../../utils/layoutInsets';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  withNav?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

/** Flat screen shell — solid background. */
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
  const insets = useSafeAreaInsets();
  const bottomPad = withNav
    ? { paddingBottom: sheetScrollBottom(insets) }
    : { paddingBottom: Math.max(insets.bottom, 12) + 24 };

  const content = (
    <View style={[padded && styles.padded, bottomPad, contentStyle]}>{children}</View>
  );

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollGrow, bottomPad]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={Keyboard.dismiss}
    >
      <View style={[padded && styles.padded, contentStyle]}>{children}</View>
    </ScrollView>
  ) : (
    content
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }, style]}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        {body}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: 24, paddingBottom: 24 },
  scrollGrow: { flexGrow: 1 },
});
