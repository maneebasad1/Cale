import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { colors, fonts } from '../../constants/theme';
import { getUserAvatarUrl, getUserInitials } from '../../utils/authUser';

interface UserAvatarProps {
  user: User | null | undefined;
  size?: number;
  style?: ViewStyle;
}

export function UserAvatar({ user, size = 72, style }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = getUserAvatarUrl(user);
  const showImage = Boolean(avatarUrl) && !imageFailed;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}>
      {showImage ? (
        <Image
          source={{ uri: avatarUrl! }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
          {getUserInitials(user)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.nori,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: colors.noriMute,
  },
  initials: {
    color: colors.porcelain,
    fontFamily: fonts.bodyBold,
  },
});
