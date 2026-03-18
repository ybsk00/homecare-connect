import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '@/constants/theme';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message, fullScreen = true }: LoadingProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  message: {
    marginTop: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
});
