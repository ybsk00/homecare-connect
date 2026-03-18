import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTodayVisits } from '@/hooks/useTodayVisits';
import { useRedFlags } from '@/hooks/useRedFlags';
import { TodayVisitCard } from '@/components/visit/TodayVisitCard';
import { RedFlagBanner } from '@/components/alert/RedFlagBanner';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
import { formatDateWithDay, formatDuration } from '@homecare/shared-utils';

export default function TodayScreen() {
  const {
    visits,
    isLoading,
    isRefetching,
    refetch,
    totalCount,
    completedCount,
    totalEstimatedMin,
  } = useTodayVisits();

  const { activeAlerts } = useRedFlags();
  const [showCompleted, setShowCompleted] = useState(false);

  if (isLoading) {
    return <Loading message={'\uC624\uB298 \uBC29\uBB38 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...'} />;
  }

  const latestRedAlert =
    activeAlerts.find((a: { severity: string }) => a.severity === 'red') ??
    activeAlerts[0];

  const pendingVisits = visits.filter(
    (v) =>
      v.status !== 'completed' &&
      v.status !== 'checked_out' &&
      v.status !== 'cancelled',
  );
  const completedVisits = visits.filter(
    (v) => v.status === 'completed' || v.status === 'checked_out',
  );
  const displayedVisits = showCompleted ? visits : pendingVisits;

  const remainingCount = totalCount - completedCount;
  // Estimated completion time
  const now = new Date();
  const estCompletionTime = new Date(
    now.getTime() + (totalEstimatedMin ?? 0) * 60000,
  );
  const estTimeStr = `${String(estCompletionTime.getHours()).padStart(2, '0')}:${String(estCompletionTime.getMinutes()).padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={displayedVisits}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TodayVisitCard visit={item} index={index} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* Glassmorphism date header */}
            <View style={styles.header}>
              <Text style={styles.dateText}>{formatDateWithDay(new Date())}</Text>
              <TouchableOpacity
                style={styles.routeButton}
                onPress={() => router.push('/route')}
                activeOpacity={0.8}
              >
                <Text style={styles.routeIcon}>{'\uD83D\uDDFA\uFE0F'}</Text>
                <Text style={styles.routeText}>{'\uB3D9\uC120 \uBCF4\uAE30'}</Text>
              </TouchableOpacity>
            </View>

            {/* Red flag alert */}
            {latestRedAlert && (
              <View style={styles.alertSection}>
                <RedFlagBanner
                  severity={latestRedAlert.severity}
                  title={latestRedAlert.title}
                  patientName={(latestRedAlert as any).patient?.full_name}
                />
              </View>
            )}

            {/* Headline with completion badges */}
            <View style={styles.headlineRow}>
              <Text style={styles.headline}>
                {'\uC624\uB298\uC758 \uBC29\uBB38 \uC77C\uC815'}
              </Text>
              <View style={styles.chipRow}>
                <Badge
                  label={`\uC644\uB8CC ${completedCount}`}
                  variant="teal"
                  size="md"
                />
                <Badge
                  label={`\uC794\uC5EC ${remainingCount}`}
                  variant="navy"
                  size="md"
                />
              </View>
            </View>

            {/* Map preview card (placeholder) */}
            <View style={styles.mapCard}>
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapIcon}>{'\uD83D\uDDFA\uFE0F'}</Text>
                <Text style={styles.mapText}>
                  {'\uC624\uB298\uC758 \uBC29\uBB38 \uB3D9\uC120'}
                </Text>
              </View>
              <View style={styles.mapAccent} />
            </View>

            {/* Stats card — navy gradient */}
            <LinearGradient
              colors={[Colors.gradient.primaryStart, Colors.gradient.primaryEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsCard}
            >
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>12.4 km</Text>
                  <Text style={styles.statLabel}>
                    {'\uCD1D \uC774\uB3D9 \uAC70\uB9AC'}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{estTimeStr}</Text>
                  <Text style={styles.statLabel}>
                    {'\uC608\uC0C1 \uC644\uB8CC \uC2DC\uAC04'}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Next visit section header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {'\uB2E4\uC74C \uBC29\uBB38 \uC608\uC815'}
              </Text>
              <Badge
                label="LIVE UPDATES"
                variant="teal"
                size="sm"
              />
            </View>
          </>
        }
        ListFooterComponent={
          completedVisits.length > 0 ? (
            <TouchableOpacity
              style={styles.showCompletedButton}
              onPress={() => setShowCompleted(!showCompleted)}
              activeOpacity={0.8}
            >
              <Text style={styles.showCompletedText}>
                {showCompleted
                  ? '\uC644\uB8CC\uB41C \uBC29\uBB38 \uC228\uAE30\uAE30'
                  : `\uC644\uB8CC\uB41C \uBC29\uBB38 ${completedVisits.length}\uAC74 \uBCF4\uAE30`}
              </Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {'\uC624\uB298 \uC608\uC815\uB41C \uBC29\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {'\uBC29\uBB38 \uC77C\uC815\uC740 \uAE30\uAD00 \uAD00\uB9AC\uC790\uAC00 \uBC30\uC815\uD569\uB2C8\uB2E4.'}
            </Text>
          </View>
        }
      />

      {/* Floating Action Button — teal circle */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/route')}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[Colors.gradient.tealStart, Colors.gradient.tealEnd]}
          style={styles.fabGradient}
        >
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 120,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  dateText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0, 32, 69, 0.06)',
    borderRadius: BorderRadius.full,
  },
  routeIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  routeText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  // Alert
  alertSection: {
    marginBottom: Spacing.sm,
  },
  // Headline
  headlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headline: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.onSurface,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  // Map card
  mapCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surfaceContainerLow,
    position: 'relative',
  },
  mapPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapIcon: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  mapText: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  mapAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.secondary,
  },
  // Stats card
  statsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  // Show completed
  showCompletedButton: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  showCompletedText: {
    fontSize: FontSize.md,
    color: Colors.secondary,
    fontWeight: '600',
  },
  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    ...Shadow.elevated,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: FontSize['2xl'],
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
