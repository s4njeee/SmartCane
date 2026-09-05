import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { platformDesign } from '../../constants/platformDesign';
import { radius, spacing } from '../../constants/theme';
import GlowPressable from './GlowPressable';

type Props = {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
  subtitle?: string;
};

export default function ScreenHeader({ title, showBack = true, right, subtitle }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {showBack ? (
          <GlowPressable
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              {
                backgroundColor: colors.cardAlt,
                borderRadius: radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </GlowPressable>
        ) : (
          <View style={styles.side} />
        )}
        <View style={styles.titleBlock}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontWeight: platformDesign.typography.screenTitleWeight,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ?? <View style={styles.side} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  side: { width: 44 },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
});
