import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreBar } from './ScoreBar';
import { colors, spacing, radius, shadows, typography } from '@/constants/theme';
import { formatDistance, formatOrgType, formatServiceType } from '@homecare/shared-utils';

interface OrgCardProps {
  orgId: string;
  orgName: string;
  orgType?: string;
  distanceKm: number;
  totalScore: number;
  serviceMatchScore?: number;
  capacityScore?: number;
  reputationScore?: number;
  responseScore?: number;
  services?: string[];
  ratingAvg?: number;
  reviewCount?: number;
  onPress: (orgId: string) => void;
}

export function OrgCard({
  orgId,
  orgName,
  orgType,
  distanceKm,
  totalScore,
  serviceMatchScore,
  capacityScore,
  reputationScore,
  responseScore,
  services,
  ratingAvg,
  reviewCount,
  onPress,
}: OrgCardProps) {
  const scorePercent = Math.round(totalScore * 100);

  return (
    <TouchableOpacity onPress={() => onPress(orgId)} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{orgName}</Text>
            {orgType && (
              <Text style={styles.type}>{formatOrgType(orgType)}</Text>
            )}
          </View>
          {/* Refined circular score indicator with gradient */}
          <LinearGradient
            colors={[colors.primary, colors.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scoreCircle}
          >
            <Text style={styles.scoreText}>{scorePercent}</Text>
            <Text style={styles.scoreLabel}>점</Text>
          </LinearGradient>
        </View>

        <View style={styles.infoRow}>
          {/* Distance in teal chip */}
          <View style={styles.distanceChip}>
            <Text style={styles.distanceText}>{formatDistance(distanceKm)}</Text>
          </View>
          {ratingAvg !== undefined && (
            <Text style={styles.ratingText}>
              {ratingAvg.toFixed(1)} ({reviewCount ?? 0}건)
            </Text>
          )}
        </View>

        {services && services.length > 0 && (
          <View style={styles.services}>
            {services.map((svc) => (
              <Badge key={svc} text={formatServiceType(svc)} variant="primary" />
            ))}
          </View>
        )}

        <View style={styles.scores}>
          {serviceMatchScore !== undefined && (
            <ScoreBar label="서비스 매칭" score={serviceMatchScore} />
          )}
          {capacityScore !== undefined && (
            <ScoreBar label="수용 가능" score={capacityScore} />
          )}
          {reputationScore !== undefined && (
            <ScoreBar label="평판" score={reputationScore} />
          )}
          {responseScore !== undefined && (
            <ScoreBar label="응답 속도" score={responseScore} />
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    ...shadows.ambient,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    ...typography.subtitle,
  },
  type: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  scoreLabel: {
    fontSize: 10,
    color: colors.onPrimary,
    opacity: 0.8,
    marginTop: -2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  distanceChip: {
    backgroundColor: colors.vital.normal.bg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  ratingText: {
    ...typography.caption,
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scores: {
    gap: spacing.sm,
  },
});
