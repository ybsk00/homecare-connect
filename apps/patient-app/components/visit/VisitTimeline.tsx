import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Badge, getVisitStatusVariant } from '@/components/ui/Badge';
import { colors, spacing, radius, typography } from '@/constants/theme';
import { formatVisitStatus, formatDateWithDay } from '@homecare/shared-utils';

interface TimelineVisit {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  nurse?: {
    id: string;
    staff_type: string;
    user: { full_name: string; avatar_url: string | null } | null;
  } | null;
  visit_record?: {
    id: string;
    nurse_note: string | null;
    message_to_guardian: string | null;
  }[] | null;
}

interface VisitTimelineProps {
  visits: TimelineVisit[];
  onVisitPress?: (visitId: string) => void;
}

export function VisitTimeline({ visits, onVisitPress }: VisitTimelineProps) {
  if (visits.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>방문 기록이 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {visits.map((visit, index) => {
        const isLast = index === visits.length - 1;
        const statusLabel = formatVisitStatus(visit.status);
        const statusVariant = getVisitStatusVariant(visit.status);
        const isCompleted = visit.status === 'completed' || visit.status === 'checked_out';
        const nurseName = visit.nurse?.user?.full_name;
        const record =
          visit.visit_record && visit.visit_record.length > 0
            ? visit.visit_record[0]
            : null;

        return (
          <TouchableOpacity
            key={visit.id}
            style={styles.item}
            onPress={() => onVisitPress?.(visit.id)}
            activeOpacity={0.7}
          >
            {/* Timeline: vertical line + primary dots */}
            <View style={styles.timeline}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: isCompleted ? colors.primary : colors.outlineVariant },
                ]}
              />
              {!isLast && <View style={styles.line} />}
            </View>

            {/* Content card with tonal background */}
            <View style={styles.content}>
              <View style={styles.contentCard}>
                <View style={styles.contentHeader}>
                  <Text style={styles.dateText}>
                    {formatDateWithDay(visit.scheduled_date)}
                    {visit.scheduled_time ? ` ${visit.scheduled_time}` : ''}
                  </Text>
                  <Badge text={statusLabel} variant={statusVariant} />
                </View>
                {nurseName && (
                  <Text style={styles.nurseText}>{nurseName}</Text>
                )}
                {record?.message_to_guardian && (
                  <View style={styles.messageBubble}>
                    <Text style={styles.messageText} numberOfLines={2}>
                      {record.message_to_guardian}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: spacing.xs,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.caption,
  },
  item: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timeline: {
    width: 28,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: spacing.lg,
  },
  line: {
    width: 2,
    flex: 1,
    // outlineVariant at 20% opacity
    backgroundColor: 'rgba(196, 198, 207, 0.2)',
    marginVertical: spacing.xs,
  },
  content: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.lg,
  },
  contentCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dateText: {
    ...typography.label,
  },
  nurseText: {
    ...typography.small,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  messageBubble: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  messageText: {
    fontSize: 13,
    color: colors.primary,
    lineHeight: 20,
  },
});
