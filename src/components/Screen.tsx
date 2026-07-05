import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import {
  Edge,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

interface ScreenProps {
  children: React.ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
}

export function Screen({
  children,
  edges = ['top', 'bottom'],
  style,
}: ScreenProps) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
