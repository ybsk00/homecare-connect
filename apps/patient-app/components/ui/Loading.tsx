import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function Loading({
  message = '불러오는 중...',
  size = 'large',
  fullScreen = false,
}: LoadingProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  message: {
    marginTop: spacing.md,
    ...typography.caption,
  },
});
