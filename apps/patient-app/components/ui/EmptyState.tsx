import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { colors, spacing, typography } from '@/constants/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} variant="secondary" size="sm" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.xl,
    opacity: 0.7,
  },
  title: {
    ...typography.subtitle,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.koreanCaption,
    textAlign: 'center',
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.xl,
  },
});
