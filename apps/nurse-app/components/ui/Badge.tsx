import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Spacing, FontSize, BorderRadius, Colors } from '@/constants/theme';

type BadgeVariant = 'teal' | 'navy' | 'warm' | 'custom';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  /** For custom variant only */
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const variantColors: Record<string, { color: string; bg: string }> = {
  teal: {
    color: Colors.onSecondaryContainer,
    bg: 'rgba(0, 106, 99, 0.10)',
  },
  navy: {
    color: Colors.primary,
    bg: 'rgba(0, 32, 69, 0.10)',
  },
  warm: {
    color: Colors.tertiary,
    bg: 'rgba(50, 27, 0, 0.10)',
  },
};

export function Badge({
  label,
  variant = 'teal',
  color,
  backgroundColor,
  size = 'sm',
  style,
}: BadgeProps) {
  const resolvedColor =
    variant === 'custom' && color
      ? color
      : variantColors[variant]?.color ?? Colors.onSurfaceVariant;
  const resolvedBg =
    variant === 'custom' && backgroundColor
      ? backgroundColor
      : variantColors[variant]?.bg ?? 'rgba(66, 71, 78, 0.10)';

  return (
    <View
      style={[
        styles.base,
        sizeStyles[size],
        { backgroundColor: resolvedBg },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          sizeTextStyles[size],
          { color: resolvedColor },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
  },
  text: {
    fontWeight: '600',
  },
});

const sizeStyles: Record<string, ViewStyle> = {
  sm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  md: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  lg: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
};

const sizeTextStyles: Record<string, { fontSize: number }> = {
  sm: { fontSize: FontSize.xs },
  md: { fontSize: FontSize.sm },
  lg: { fontSize: FontSize.md },
};
