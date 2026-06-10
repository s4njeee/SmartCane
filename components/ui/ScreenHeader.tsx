import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { radius } from '../../constants/theme';
import GlowPressable from './GlowPressable';

type Props = {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
};

export default function ScreenHeader({ title, showBack = true, right }: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const router = useRouter();

  return (
    <View style={styles.row}>
      {showBack ? (
        <GlowPressable
          onPress={() => router.back()}
          glowColor={colors.primary}
          style={[
            styles.backBtn,
            { backgroundColor: colors.glass, borderRadius: radius.md },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </GlowPressable>
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {right ?? <View style={styles.placeholder} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  placeholder: { width: 44 },
});
