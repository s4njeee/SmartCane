import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';
import { spacing } from '../../constants/theme';
import { cx, isWeb, ui } from '../../utils/ui';

type Variant = 'welcome' | 'auth';

type Props = {
  variant?: Variant;
  style?: StyleProp<ImageStyle>;
};

const source = require('../../assets/images/SmartGuide.png');

/** SmartGuide mark — gentle vertical float only. */
export default function BrandLogo({ variant = 'auth', style }: Props) {
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isWeb) return undefined;

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(lift, {
          toValue: -10,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(lift, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    float.start();
    return () => float.stop();
  }, [lift]);

  const className = cx(
    variant === 'welcome' ? 'welcome-logo' : 'auth-logo',
    'logo-anim',
  );
  const size = variant === 'welcome' ? styles.welcome : styles.auth;
  const stageClass = cx('logo-stage', variant === 'welcome' ? 'is-welcome' : 'is-auth');

  if (isWeb) {
    return (
      <View {...ui(stageClass, styles.stage)}>
        <Animated.Image
          source={source}
          accessibilityLabel="SmartGuide"
          resizeMode="contain"
          {...ui(className, [size, style], [size, style])}
        />
      </View>
    );
  }

  return (
    <View style={styles.stage}>
      <Animated.Image
        source={source}
        accessibilityLabel="SmartGuide"
        resizeMode="contain"
        style={[
          size,
          style,
          {
            transform: [{ translateY: lift }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  welcome: {
    width: 420,
    height: 210,
  },
  auth: {
    width: 400,
    height: 200,
  },
});
