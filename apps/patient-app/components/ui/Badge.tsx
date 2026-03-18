import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';

type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

// Vitality chip colors aligned with The Curated Sanctuary palette
const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  info: { bg: 'rgba(0, 32, 69, 0.08)', text: colors.primary },
  success: { bg: colors.vital.normal.bg, text: colors.vital.normal.text },
  warning: { bg: colors.vital.warning.bg, text: colors.vital.warning.text },
  danger: { bg: colors.vital.critical.bg, text: colors.vital.critical.text },
  neutral: { bg: colors.surfaceContainerHigh, text: colors.onSurfaceVariant },
  primary: { bg: 'rgba(0, 32, 69, 0.08)', text: colors.primary },
};

export function Badge({ text, variant = 'neutral', size = 'sm' }: BadgeProps) {
  const badgeColors = BADGE_COLORS[variant];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: badgeColors.bg },
        size === 'md' && styles.badgeMd,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: badgeColors.text },
          size === 'md' && styles.textMd,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

export function getVisitStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'scheduled':
      return 'info';
    case 'en_route':
    case 'checked_in':
      return 'primary';
    case 'in_progress':
      return 'warning';
    case 'completed':
    case 'checked_out':
      return 'success';
    case 'cancelled':
    case 'no_show':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getRequestStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'matching':
      return 'info';
    case 'waiting_selection':
      return 'primary';
    case 'sent_to_org':
      return 'warning';
    case 'org_accepted':
    case 'assessment_scheduled':
    case 'service_started':
      return 'success';
    case 'org_rejected':
    case 'cancelled':
    case 'expired':
      return 'danger';
    default:
      return 'neutral';
  }
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  textMd: {
    fontSize: 14,
  },
});
