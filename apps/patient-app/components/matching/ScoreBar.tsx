import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius } from '@/constants/theme';

interface ScoreBarProps {
  label: string;
  score: number; // 0 ~ 1
}

export function ScoreBar({ label, score }: ScoreBarProps) {
  const percent = Math.round(score * 100);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.barContainer}>
        <LinearGradient
          colors={[colors.primary, colors.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.bar, { width: `${percent}%` }]}
        />
      </View>
      <Text style={styles.value}>{percent}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    width: 76,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 3,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
  value: {
    width: 30,
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
    textAlign: 'right',
  },
});
