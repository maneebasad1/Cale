import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  colors,
  fonts,
  getProgressTone,
  progressColor,
  spacing,
  typography,
} from '../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const [reduceMotion, setReduceMotion] = useState(false);
  const anim = useRef(new Animated.Value(progress)).current;

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
      useNativeDriver: false,
    }).start();
  }, [progress, reduceMotion, anim]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const heroLabel = isOver
    ? Math.abs(remaining).toLocaleString()
    : remaining.toLocaleString();
  const heroSub = isOver ? 'kcal over' : 'kcal left';
  const heroFontSize =
    heroLabel.length > 6 ? 28 : heroLabel.length > 5 ? 32 : 40;

  const innerSize = size - strokeWidth * 2;

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
        <Svg width={size} height={size} style={styles.svg}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {progress > 0 ? (
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke={ringColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="butt"
              rotation={-90}
              origin={`${center}, ${center}`}
            />
          ) : null}
        </Svg>

        <View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}>
          <Text
            style={[
              styles.hero,
              { color: ringColor, fontSize: heroFontSize, lineHeight: heroFontSize + 6 },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}>
            {heroLabel}
          </Text>
          <Text style={[styles.heroSub, { color: ringColor }]}>{heroSub}</Text>

          <View style={styles.stats}>
            <Text style={styles.statLine}>
              <Text
                style={[
                  styles.statValue,
                  { color: isOver ? colors.chili : colors.text },
                ]}>
                {consumed.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}> eaten</Text>
            </Text>
            <Text style={styles.statLine}>
              <Text style={[styles.statValue, styles.statTarget]}>
                {target.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}> target</Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  ringBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
  },
  hero: {
    fontFamily: fonts.displayBold,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSub: {
    ...typography.label,
    marginTop: 2,
  },
  stats: {
    marginTop: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  statLine: {
    ...typography.caption,
    textAlign: 'center',
  },
  statLabel: {
    color: colors.textSecondary,
  },
  statValue: {
    fontFamily: fonts.bodySemiBold,
  },
  statTarget: {
    color: colors.saffron,
  },
});
