import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  colors,
  fonts,
  getProgressTone,
  progressColor,
  spacing,
  typography,
} from '../constants/theme';

interface ProgressRingProps {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * Signature "portion ring" — thick circular progress that reads like
 * looking down into a filling bowl. Color: nori → saffron → chili.
 */
export function ProgressRing({
  consumed,
  target,
  size = 216,
  strokeWidth = 16,
}: ProgressRingProps) {
  const tone = getProgressTone(consumed, target);
  const ringColor = progressColor(tone);
  const rawProgress = target > 0 ? consumed / target : 0;
  const progress = Math.min(Math.max(rawProgress, 0), 1);
  const remaining = target - consumed;
  const isOver = consumed > target;

  const [reduceMotion, setReduceMotion] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (!mounted) {
        return;
      }
      setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(progress);
      return;
    }
    Animated.timing(anim, {
      toValue: progress,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [progress, reduceMotion, anim]);

  const half = size / 2;
  const rightRotate = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '180deg'],
  });
  const leftRotate = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '0deg', '180deg'],
  });

  const heroLabel = isOver
    ? Math.abs(remaining).toLocaleString()
    : remaining.toLocaleString();
  const heroSub = isOver ? 'kcal over' : 'kcal left';

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: target,
        now: consumed,
      }}>
      <View style={[styles.ringBox, { width: size, height: size }]}>
        {/* Track */}
        <View
          style={[
            styles.track,
            {
              width: size,
              height: size,
              borderRadius: half,
              borderWidth: strokeWidth,
            },
          ]}
        />

        {/* Right half */}
        <View
          style={[
            styles.halfClip,
            { width: half, height: size, left: half },
          ]}>
          <Animated.View
            style={[
              styles.halfPivot,
              {
                width: size,
                height: size,
                left: -half,
                transform: [{ rotate: rightRotate }],
              },
            ]}>
            <View
              style={[
                styles.halfFill,
                {
                  width: half,
                  height: size,
                  left: half,
                  borderTopRightRadius: half,
                  borderBottomRightRadius: half,
                  borderWidth: strokeWidth,
                  borderLeftWidth: 0,
                  borderColor: ringColor,
                },
              ]}
            />
          </Animated.View>
        </View>

        {/* Left half */}
        <View
          style={[
            styles.halfClip,
            { width: half, height: size, left: 0 },
          ]}>
          <Animated.View
            style={[
              styles.halfPivot,
              {
                width: size,
                height: size,
                left: 0,
                transform: [{ rotate: leftRotate }],
              },
            ]}>
            <View
              style={[
                styles.halfFill,
                {
                  width: half,
                  height: size,
                  left: 0,
                  borderTopLeftRadius: half,
                  borderBottomLeftRadius: half,
                  borderWidth: strokeWidth,
                  borderRightWidth: 0,
                  borderColor: ringColor,
                },
              ]}
            />
          </Animated.View>
        </View>

        {/* Inner porcelain disc */}
        <View
          style={[
            styles.inner,
            {
              width: size - strokeWidth * 2,
              height: size - strokeWidth * 2,
              borderRadius: (size - strokeWidth * 2) / 2,
            },
          ]}>
          <Text style={[styles.hero, { color: ringColor }]}>{heroLabel}</Text>
          <Text style={[styles.heroSub, { color: ringColor }]}>{heroSub}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {consumed.toLocaleString()} eaten
        </Text>
        <Text style={styles.footerDot}>·</Text>
        <Text style={styles.footerText}>
          {target.toLocaleString()} target
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  ringBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    borderColor: colors.border,
  },
  halfClip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  halfPivot: {
    position: 'absolute',
    top: 0,
  },
  halfFill: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'transparent',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  hero: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSub: {
    ...typography.label,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  footerText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footerDot: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
