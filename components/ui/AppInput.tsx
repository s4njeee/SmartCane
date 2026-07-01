import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { radius } from '../../constants/theme';

type Props = TextInputProps & {
  label: string;
  secureToggle?: boolean;
  showSecure?: boolean;
  onToggleSecure?: () => void;
};

export default function AppInput({
  label,
  secureToggle,
  showSecure,
  onToggleSecure,
  value,
  onFocus,
  onBlur,
  onChangeText,
  ...rest
}: Props) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const floated = focused || !!value;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: floated ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [floated, anim]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.inputBg,
          borderColor: focused ? colors.primary + '55' : colors.border,
        },
      ]}
    >
      <Animated.Text
        pointerEvents="none"
        style={[
          styles.label,
          {
            top: anim.interpolate({ inputRange: [0, 1], outputRange: [22, 10] }),
            fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 12] }),
            color: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [colors.textMuted, colors.primary],
            }),
          },
        ]}
      >
        {label}
      </Animated.Text>

      <TextInput
        style={[
          styles.input,
          floated && styles.inputFloated,
          { color: colors.text },
          secureToggle && styles.inputWithToggle,
        ]}
        value={value}
        placeholder=""
        placeholderTextColor="transparent"
        onChangeText={onChangeText}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {secureToggle && (
        <Pressable
          onPress={onToggleSecure}
          hitSlop={8}
          style={styles.eyeBtn}
          accessibilityRole="button"
          accessibilityLabel={showSecure ? 'Hide password' : 'Show password'}
        >
          <Ionicons
            name={showSecure ? 'eye' : 'eye-off'}
            size={20}
            color={colors.primary}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 16,
    minHeight: 64,
    paddingHorizontal: 16,
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  label: {
    position: 'absolute',
    left: 16,
    fontWeight: '500',
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  input: {
    fontSize: 16,
    paddingVertical: 8,
    paddingRight: 4,
    minHeight: 40,
  },
  inputFloated: {
    paddingTop: 14,
  },
  inputWithToggle: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    bottom: 12,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
});