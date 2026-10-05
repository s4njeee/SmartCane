import React from 'react';
import { Keyboard, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { sheetScrollBottom } from '../../utils/layoutInsets';
import { cx, ui, uiWeb } from '../../utils/ui';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  withNav?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

/** Flat screen shell — same padding and safe-area on Android and iOS. */
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
    <View
      {...uiWeb(
        cx(padded && 'screen-padded'),
        [bottomPad, contentStyle],
        [padded && styles.padded, bottomPad, contentStyle],
      )}
    >
      {children}
    </View>
  );

  return (
    <View
      {...ui(
        'screen',
        [styles.flex, { backgroundColor: colors.background }, style],
        style,
      )}
    >
      <SafeAreaView {...ui('screen-safe', styles.flex)} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollGrow, bottomPad]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={Keyboard.dismiss}
            nestedScrollEnabled
            overScrollMode="never"
            decelerationRate="normal"
          >
            <View
              {...uiWeb(
                cx(padded && 'screen-padded'),
                contentStyle,
                [padded && styles.padded, contentStyle],
              )}
            >
              {children}
            </View>
          </ScrollView>
        ) : (
          content
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: 20, paddingBottom: 20 },
  scrollGrow: { flexGrow: 1 },
});
