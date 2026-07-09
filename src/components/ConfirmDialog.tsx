import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fonts, radii, spacing, typography } from '../constants/theme';

export type DialogTone = 'default' | 'destructive';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel: string;
  tone?: DialogTone;
  loading?: boolean;
  /** When false, only the confirm button is shown (info / error). Default true. */
  showCancel?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel = 'Cancel',
  confirmLabel,
  tone = 'default',
  loading = false,
  showCancel = true,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const isDestructive = tone === 'destructive';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}>
      <Pressable
        style={styles.backdrop}
        onPress={loading ? undefined : onCancel}
        accessibilityRole="none">
        <Pressable
          style={styles.card}
          onPress={e => e.stopPropagation()}
          accessibilityRole="none">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {showCancel ? (
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={onCancel}
                disabled={loading}
                activeOpacity={0.8}
                accessibilityRole="button">
                <Text style={styles.btnSecondaryText}>{cancelLabel}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[
                styles.btn,
                isDestructive ? styles.btnDestructive : styles.btnPrimary,
                loading && styles.btnDisabled,
                !showCancel && styles.btnFull,
              ]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button">
              {loading ? (
                <ActivityIndicator color={colors.porcelain} />
              ) : (
                <Text
                  style={
                    isDestructive
                      ? styles.btnDestructiveText
                      : styles.btnPrimaryText
                  }>
                  {confirmLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 27, 25, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.porcelain,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  title: {
    fontFamily: fonts.displayMedium,
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.stone,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  btnFull: {
    flex: 1,
  },
  btnPrimary: {
    backgroundColor: colors.nori,
  },
  btnSecondary: {
    backgroundColor: colors.porcelain,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  btnDestructive: {
    backgroundColor: colors.chili,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.porcelain,
  },
  btnSecondaryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  btnDestructiveText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.porcelain,
  },
});
