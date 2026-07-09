import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { BrandLogo } from './BrandLogo';
import { colors, spacing } from '../constants/theme';

/** Full-screen brand splash with a soft breathing pulse on the icon. */
export function BrandLoader() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.04],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  });

  return (
    <View style={styles.screen} accessibilityLabel="Loading">
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <BrandLogo size="lg" showTagline={false} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.lg,
  },
});
