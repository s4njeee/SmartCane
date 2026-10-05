import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { platformDesign } from '../../constants/platformDesign';
import { spacing } from '../../constants/theme';
import { cx, ui } from '../../utils/ui';

type Props = {
  children: string;
  style?: ViewStyle;
  className?: string;
  trailing?: React.ReactNode;
};

/** Shared uppercase section label used on Profile, Alerts, and Status. */
export default function SectionLabel({ children, style, className, trailing }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const letterSpacing = platformDesign.typography.sectionLabelLetterSpacing;
  const instance = String(className || '')
    .split(/\s+/)
    .find((name) => name.startsWith('is-') && name !== 'is-first');

  return (
    <View
      {...ui(
        cx('section-label-row', className),
        [styles.row, style],
        style,
      )}
    >
      <Text
        {...ui(cx('section-label', instance), [
          styles.label,
          { color: colors.textMuted, letterSpacing },
        ])}
      >
        {children}
      </Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginLeft: 4,
    marginTop: spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
