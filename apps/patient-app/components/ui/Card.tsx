import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, radius, shadows } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  elevated?: boolean;
}

export function Card({ children, style, padded = true, elevated = false }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        elevated && shadows.ambient,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    // NO borders - tonal layering only
    // White card on #F7FAFC background provides enough definition
  },
  padded: {
    padding: spacing.lg,
  },
});
