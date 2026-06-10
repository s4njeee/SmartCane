import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const EXPANDED_WIDTH = SCREEN_WIDTH - 32;
const COLLAPSED_SIZE = 38;

type Props = {
  expanded: boolean;
  onToggle: () => void;
  navy: string;
  success: string;
};

export default function LiveTrackingBanner({ expanded, onToggle, navy, success }: Props) {
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(expanded ? 1 : 0, {
      damping: 20,
      stiffness: 200,
      mass: 0.8,
    });
  }, [expanded, progress]);

  const containerStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [COLLAPSED_SIZE, EXPANDED_WIDTH], Extrapolation.CLAMP),
    height: interpolate(progress.value, [0, 1], [COLLAPSED_SIZE, 72], Extrapolation.CLAMP),
    borderRadius: interpolate(progress.value, [0, 1], [COLLAPSED_SIZE / 2, radius.lg], Extrapolation.CLAMP),
    paddingHorizontal: interpolate(progress.value, [0, 1], [0, 16], Extrapolation.CLAMP),
    paddingVertical: interpolate(progress.value, [0, 1], [0, 14], Extrapolation.CLAMP),
    backgroundColor: navy,
  }));

  const contentOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [0, 0, 1], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [12, 0], Extrapolation.CLAMP) }],
  }));

  const pillOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 0.6], Extrapolation.CLAMP) }],
  }));

  return (
    <Animated.View style={[styles.wrapper, containerStyle]}>
      <Pressable onPress={onToggle} style={styles.pressable}>
        <Animated.View style={[styles.pillContent, pillOpacity]} pointerEvents={expanded ? 'none' : 'auto'}>
          <View style={[styles.liveDot, { backgroundColor: success }]} />
        </Animated.View>

        <Animated.View style={[styles.fullContent, contentOpacity]} pointerEvents={expanded ? 'auto' : 'none'}>
          <View style={styles.textBlock}>
            <Text style={styles.mapHeaderLabel}>Live tracking</Text>
            <Text style={styles.mapHeaderTitle}>SmartCane Dashboard</Text>
          </View>
          <View style={[styles.liveBadge, { backgroundColor: success + '30' }]}>
            <View style={[styles.liveDot, { backgroundColor: success }]} />
            <Text style={[styles.liveText, { color: success }]}>Live</Text>
          </View>
        </Animated.View>

        {expanded && (
          <Pressable onPress={onToggle} style={styles.collapseBtn} hitSlop={8}>
            <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.7)" />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  pressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingRight: 28,
  },
  textBlock: { flex: 1 },
  mapHeaderLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mapHeaderTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 13, fontWeight: '700', marginLeft: 6 },
  collapseBtn: {
    position: 'absolute',
    top: 8,
    right: 10,
    padding: 4,
  },
});
