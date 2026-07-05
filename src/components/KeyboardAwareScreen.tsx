import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface KeyboardAwareScreenProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentContainerStyle?: ViewStyle;
  keyboardVerticalOffset?: number;
}

export function KeyboardAwareScreen({
  children,
  footer,
  contentContainerStyle,
  keyboardVerticalOffset = 0,
}: KeyboardAwareScreenProps) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}>
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={Platform.OS === 'ios' ? 24 : 48}
        keyboardOpeningTime={0}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </KeyboardAwareScrollView>
      {footer}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
