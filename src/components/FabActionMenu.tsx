import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '../constants/theme';
import { Icon, type IconName } from './Icon';

export interface FabAction {
  label: string;
  icon: IconName;
  onPress: () => void;
}

interface FabActionMenuProps {
  actions: FabAction[];
}

export function FabActionMenu({ actions }: FabActionMenuProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const handleAction = (action: FabAction) => {
    close();
    action.onPress();
  };

  return (
    <>
      {open ? (
        <Pressable
          style={styles.backdrop}
          onPress={close}
          accessibilityLabel="Close add menu"
          accessibilityRole="button"
        />
      ) : null}

      <View
        style={[styles.container, { bottom: spacing.lg + insets.bottom }]}
        pointerEvents="box-none">
        {open ? (
          <View style={styles.menu}>
            {actions.map(action => (
              <TouchableOpacity
                key={action.label}
                style={styles.menuItem}
                onPress={() => handleAction(action)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={action.label}>
                <Text style={styles.menuLabel}>{action.label}</Text>
                <View style={styles.menuIconWrap}>
                  <Icon name={action.icon} size={20} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setOpen(prev => !prev)}
          activeOpacity={0.8}
          accessibilityLabel={open ? 'Close add menu' : 'Add'}
          accessibilityRole="button">
          <Icon
            name={open ? 'close' : 'add'}
            size={open ? 28 : 32}
            color={colors.surface}
          />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 27, 25, 0.25)',
  },
  container: {
    position: 'absolute',
    right: spacing.lg,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  menu: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuLabel: {
    ...typography.label,
    color: colors.text,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
});
