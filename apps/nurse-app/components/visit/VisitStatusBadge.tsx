import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { formatVisitStatus } from '@homecare/shared-utils';

interface VisitStatusBadgeProps {
  status: string;
}

const statusConfig: Record<
  string,
  { color: string; bg: string; style?: 'filled' | 'gradient' }
> = {
  scheduled: {
    color: Colors.primary,
    bg: Colors.visitStatus.scheduledBg,
  },
  en_route: {
    color: Colors.secondary,
    bg: Colors.visitStatus.en_routeBg,
  },
  checked_in: {
    color: '#FFFFFF',
    bg: Colors.visitStatus.checked_inBg,
    style: 'filled',
  },
  in_progress: {
    color: '#FFFFFF',
    bg: Colors.visitStatus.in_progressBg,
    style: 'gradient',
  },
  checked_out: {
    color: Colors.secondary,
    bg: Colors.visitStatus.completedBg,
  },
  completed: {
    color: Colors.secondary,
    bg: Colors.visitStatus.completedBg,
  },
  cancelled: {
    color: Colors.tertiary,
    bg: Colors.visitStatus.cancelledBg,
  },
  no_show: {
    color: Colors.redFlag.red,
    bg: Colors.visitStatus.no_showBg,
  },
};

export function VisitStatusBadge({ status }: VisitStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    color: Colors.onSurfaceVariant,
    bg: 'rgba(66, 71, 78, 0.10)',
  };

  return (
    <View style={[styles.base, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>
        {formatVisitStatus(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
